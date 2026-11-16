using System.Security.Cryptography;
using System.Text.Json;
using GamesLane.Server.Data;
using GamesLane.Server.Users;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace GamesLane.Server.Auth;

/// <summary>
/// The Apple settings (the <c>Apple</c> configuration section): the developer team, the iPhone app's bundle ID, the
/// Services ID that signs in on the website, and the key (ID, and the <c>.p8</c> file at <c>KeyPath</c>, on Render a
/// secret file) that Sign in with Apple on the website needs. <see cref="PrivateKey"/> is the key file's text, or null
/// if there is none.
/// </summary>
public record AppleSettings(string TeamId, string BundleId, string ServicesId, string? KeyId, string? PrivateKey)
{
    /// <summary>
    /// Reads the settings, and the key file if it exists.
    /// </summary>
    public static AppleSettings From(IConfiguration configuration)
    {
        var section = configuration.GetSection("Apple");
        var keyPath = section["KeyPath"];
        var privateKey = !string.IsNullOrEmpty(keyPath) && File.Exists(keyPath) ? File.ReadAllText(keyPath) : null;
        return new AppleSettings(section["TeamId"] ?? "", section["BundleId"] ?? "", section["ServicesId"] ?? "",
            string.IsNullOrEmpty(section["KeyId"]) ? null : section["KeyId"], privateKey);
    }

    /// <summary>
    /// The iPhone app's ID with its team, e.g. <c>7Z69JFQYCV.com.gameslane.app</c>.
    /// </summary>
    public string AppId => $"{TeamId}.{BundleId}";

    /// <summary>
    /// Whether the server can call Apple on the team's behalf: the team and the key are set.
    /// </summary>
    public bool HasKey => TeamId.Length > 0 && KeyId is not null && !string.IsNullOrWhiteSpace(PrivateKey);

    /// <summary>
    /// Whether Sign in with Apple can be offered on the website: the key and the Services ID are set.
    /// </summary>
    public bool CanSignInOnWebsite => HasKey && ServicesId.Length > 0;

    /// <summary>
    /// The site's <c>/.well-known/apple-app-site-association</c>: join links (<c>/join/...</c>) open the iPhone app, and
    /// the app may end its sign-in window at an address on the site (<c>webcredentials</c>).
    /// </summary>
    public object SiteAssociation() => new
    {
        applinks = new
        {
            details = new[]
            {
                new { appIDs = new[] { AppId }, components = new[] { new Dictionary<string, string> { ["/"] = "/join/*" } } },
            },
        },
        webcredentials = new { apps = new[] { AppId } },
    };
}

/// <summary>
/// The body of <c>POST /auth/apple-app</c>: the identity token from Sign in with Apple in the iPhone app, the nonce whose
/// SHA-256 hash (see <see cref="AuthSetup.AppSignInChallenge"/>) the app asked Apple to put in it, the user's name,
/// which Apple gives only on the first sign-in, and the authorization code, redeemed for a refresh token to revoke when
/// the account is deleted (see <see cref="AppleAccountTokens"/>).
/// </summary>
public record AppleAppSignInRequest(string? IdentityToken, string? Nonce, string? Name, string? AuthorizationCode);

/// <summary>
/// Checks the identity tokens from Sign in with Apple in the iPhone app: signed by Apple (its keys are fetched from
/// Apple and cached), for the app's bundle ID, not expired, with the hash of the sign-in's nonce, and used only once.
/// </summary>
public class AppleIdentityTokens(AppleSettings settings, UsedAppSignInCodes used,
    IConfigurationManager<OpenIdConnectConfiguration>? keys = null)
{
    /// <summary>
    /// The issuer of Apple's identity tokens.
    /// </summary>
    public const string Issuer = "https://appleid.apple.com";

    private readonly IConfigurationManager<OpenIdConnectConfiguration> _keys = keys
        ?? new ConfigurationManager<OpenIdConnectConfiguration>($"{Issuer}/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });

    private readonly JsonWebTokenHandler _handler = new();

    /// <summary>
    /// The Apple user ID (the token's subject) in a valid <paramref name="token"/> made for <paramref name="nonce"/>, or
    /// null if the token is not valid, has expired, was already used, or was made for another nonce.
    /// </summary>
    public async Task<string?> ValidateAsync(string? token, string? nonce)
    {
        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(nonce) || settings.BundleId.Length == 0)
        {
            return null;
        }

        var result = await ValidateWithAppleKeysAsync(token);
        if (result.Exception is SecurityTokenSignatureKeyNotFoundException)
        {
            // Apple may have changed its keys since they were fetched.
            _keys.RequestRefresh();
            result = await ValidateWithAppleKeysAsync(token);
        }

        if (!result.IsValid || result.SecurityToken is not JsonWebToken jwt
            || !jwt.TryGetPayloadValue<string>("nonce", out var tokenNonce) || tokenNonce != AuthSetup.AppSignInChallenge(nonce)
            || string.IsNullOrEmpty(jwt.Subject))
        {
            return null;
        }

        return used.TryUse(token, new DateTimeOffset(jwt.ValidTo, TimeSpan.Zero)) ? jwt.Subject : null;
    }

    /// <summary>
    /// Validates <paramref name="token"/> with Apple's current keys; invalid if they cannot be fetched.
    /// </summary>
    private async Task<TokenValidationResult> ValidateWithAppleKeysAsync(string token)
    {
        OpenIdConnectConfiguration configuration;
        try
        {
            configuration = await _keys.GetConfigurationAsync(CancellationToken.None);
        }
        catch (Exception ex) when (ex is InvalidOperationException or HttpRequestException or IOException)
        {
            return new TokenValidationResult { IsValid = false, Exception = ex };
        }

        return await _handler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = Issuer,
            ValidAudience = settings.BundleId,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidateLifetime = true,
        });
    }
}

/// <summary>
/// Apple's refresh tokens for Sign in with Apple accounts, which Apple requires an app to revoke when the user deletes
/// their account: redeems the authorization code from the iPhone app for one, encrypts them for the database, and
/// revokes them. Calling Apple needs the team's key (see <see cref="AppleSettings.HasKey"/>).
/// </summary>
public class AppleAccountTokens(AppleSettings settings, IHttpClientFactory httpClientFactory,
    IDataProtectionProvider dataProtection, TimeProvider timeProvider, ILogger<AppleAccountTokens> logger)
{
    private const string TokenEndpoint = "https://appleid.apple.com/auth/token";
    private const string RevokeEndpoint = "https://appleid.apple.com/auth/revoke";

    private IDataProtector Protector => dataProtection.CreateProtector("GamesLane.AppleRefreshToken");

    /// <summary>
    /// <paramref name="refreshToken"/>, issued to <paramref name="clientId"/>, encrypted to keep with the account.
    /// </summary>
    public ExternalLoginToken Protect(string clientId, string refreshToken) => new(clientId, Protector.Protect(refreshToken));

    /// <summary>
    /// Redeems the authorization code Sign in with Apple gave the iPhone app for a refresh token, encrypted; null if
    /// there is no code or key, or Apple refused.
    /// </summary>
    public async Task<ExternalLoginToken?> RedeemAppCodeAsync(string? authorizationCode)
    {
        if (string.IsNullOrEmpty(authorizationCode) || !settings.HasKey)
        {
            return null;
        }

        using var response = await PostAsync(TokenEndpoint, settings.BundleId, new()
        {
            ["code"] = authorizationCode,
            ["grant_type"] = "authorization_code",
        });
        if (response?.IsSuccessStatusCode != true)
        {
            logger.LogWarning("Apple did not redeem a Sign in with Apple authorization code ({Status}).", response?.StatusCode);
            return null;
        }

        using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return json.RootElement.TryGetProperty("refresh_token", out var token) && token.GetString() is { Length: > 0 } refreshToken
            ? Protect(settings.BundleId, refreshToken)
            : null;
    }

    /// <summary>
    /// Revokes the refresh token kept with <paramref name="login"/>, if any. Returns false if Apple could not be told.
    /// </summary>
    public async Task<bool> RevokeAsync(ExternalLogin login)
    {
        if (login.Provider != AuthSetup.Apple || login.RefreshToken is null || login.TokenClientId is null)
        {
            return true;
        }

        string refreshToken;
        try
        {
            refreshToken = Protector.Unprotect(login.RefreshToken);
        }
        catch (CryptographicException)
        {
            return false;
        }

        using var response = settings.HasKey
            ? await PostAsync(RevokeEndpoint, login.TokenClientId, new()
            {
                ["token"] = refreshToken,
                ["token_type_hint"] = "refresh_token",
            })
            : null;
        if (response?.IsSuccessStatusCode != true)
        {
            logger.LogWarning("Could not revoke a Sign in with Apple token ({Status}).", response?.StatusCode);
            return false;
        }

        return true;
    }

    /// <summary>
    /// The client secret Apple asks for: a short-lived token for <paramref name="clientId"/>, signed with the team's key.
    /// </summary>
    public string ClientSecret(string clientId)
    {
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(settings.PrivateKey);
        var key = new ECDsaSecurityKey(ecdsa)
        {
            KeyId = settings.KeyId,
            CryptoProviderFactory = new CryptoProviderFactory { CacheSignatureProviders = false },
        };
        var now = timeProvider.GetUtcNow().UtcDateTime;
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = settings.TeamId,
            Audience = AppleIdentityTokens.Issuer,
            Claims = new Dictionary<string, object> { ["sub"] = clientId },
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(5),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256),
        });
    }

    /// <summary>
    /// Posts a form to Apple as <paramref name="clientId"/>; null if Apple could not be reached.
    /// </summary>
    private async Task<HttpResponseMessage?> PostAsync(string url, string clientId, Dictionary<string, string> form)
    {
        form["client_id"] = clientId;
        form["client_secret"] = ClientSecret(clientId);
        try
        {
            using var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            return await client.PostAsync(url, new FormUrlEncodedContent(form));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Could not reach Apple.");
            return null;
        }
    }
}
