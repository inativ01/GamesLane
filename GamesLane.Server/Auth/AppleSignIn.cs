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
    /// Whether Sign in with Apple can be offered on the website: the team, Services ID and key are all set.
    /// </summary>
    public bool CanSignInOnWebsite =>
        TeamId.Length > 0 && ServicesId.Length > 0 && KeyId is not null && !string.IsNullOrWhiteSpace(PrivateKey);

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
/// SHA-256 hash (see <see cref="AuthSetup.AppSignInChallenge"/>) the app asked Apple to put in it, and the user's name,
/// which Apple gives only on the first sign-in.
/// </summary>
public record AppleAppSignInRequest(string? IdentityToken, string? Nonce, string? Name);

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

        var configuration = await _keys.GetConfigurationAsync(CancellationToken.None);
        var result = await _handler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = Issuer,
            ValidAudience = settings.BundleId,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidateLifetime = true,
        });
        if (!result.IsValid || result.SecurityToken is not JsonWebToken jwt
            || !jwt.TryGetPayloadValue<string>("nonce", out var tokenNonce) || tokenNonce != AuthSetup.AppSignInChallenge(nonce)
            || string.IsNullOrEmpty(jwt.Subject))
        {
            return null;
        }

        return used.TryUse(token, new DateTimeOffset(jwt.ValidTo, TimeSpan.Zero)) ? jwt.Subject : null;
    }
}
