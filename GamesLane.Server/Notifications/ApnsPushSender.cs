using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GamesLane.Server.Auth;
using GamesLane.Server.Data;
using Microsoft.IdentityModel.Tokens;

namespace GamesLane.Server.Notifications;

/// <summary>
/// Sends notifications through Apple's push notification service (APNs), over HTTP/2, to the production servers or,
/// for an app built for development, the sandbox. Authenticates with a token signed by the team's key (the one Sign in
/// with Apple uses, see <see cref="AppleSettings"/>), made again every <see cref="TokenLifetime"/> as Apple asks.
/// </summary>
public class ApnsPushSender(
    AppleSettings settings,
    IHttpClientFactory httpClientFactory,
    TimeProvider timeProvider,
    ILogger<ApnsPushSender> logger) : IPushSender
{
    /// <summary>The name of the <see cref="HttpClient"/> used for Apple's servers.</summary>
    public const string HttpClientName = "APNs";

    /// <summary>Apple's production servers.</summary>
    public const string ProductionHost = "https://api.push.apple.com";

    /// <summary>Apple's development servers.</summary>
    public const string SandboxHost = "https://api.sandbox.push.apple.com";

    /// <summary>How long a signed token is reused: Apple refuses one older than an hour, or made more often than every 20 minutes.</summary>
    public static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(40);

    /// <summary>How long Apple keeps trying to deliver a notification to a device that is off or offline.</summary>
    public static readonly TimeSpan DeliveryLimit = TimeSpan.FromHours(1);

    private readonly Lock _tokenLock = new();
    private (string Token, DateTimeOffset MadeAt)? _token;

    /// <inheritdoc />
    public bool IsConfigured => settings.HasKey && settings.BundleId.Length > 0;

    /// <inheritdoc />
    public async Task<PushResult> SendAsync(DeviceToken device, PushNotification notification)
    {
        if (!IsConfigured)
        {
            return PushResult.Failed;
        }

        var host = device.IsSandbox ? SandboxHost : ProductionHost;
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{host}/3/device/{device.Token}")
        {
            Version = HttpVersion.Version20,
            VersionPolicy = HttpVersionPolicy.RequestVersionExact,
            Content = JsonContent.Create(new Dictionary<string, object>
            {
                ["aps"] = new Dictionary<string, object>
                {
                    ["alert"] = new { title = notification.Title, body = notification.Body },
                    ["sound"] = "default",
                    ["thread-id"] = notification.SessionId,
                },
                ["path"] = notification.Path,
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("bearer", ProviderToken());
        request.Headers.Add("apns-topic", settings.BundleId);
        request.Headers.Add("apns-push-type", "alert");
        request.Headers.Add("apns-priority", "10");
        request.Headers.Add("apns-expiration", (timeProvider.GetUtcNow() + DeliveryLimit).ToUnixTimeSeconds().ToString());
        request.Headers.Add("apns-collapse-id", notification.SessionId);

        try
        {
            using var client = httpClientFactory.CreateClient(HttpClientName);
            client.Timeout = TimeSpan.FromSeconds(15);
            using var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                return PushResult.Sent;
            }

            var reason = await ReasonAsync(response);
            if (response.StatusCode == HttpStatusCode.Gone || reason is "BadDeviceToken" or "Unregistered")
            {
                return PushResult.Unregistered;
            }

            if (reason is "ExpiredProviderToken" or "InvalidProviderToken")
            {
                lock (_tokenLock)
                {
                    _token = null;
                }
            }

            logger.LogWarning("Apple refused a notification ({Status} {Reason}).", (int)response.StatusCode, reason);
            return PushResult.Failed;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Could not reach Apple's notification service.");
            return PushResult.Failed;
        }
    }

    /// <summary>
    /// The token that authenticates the server to Apple: a JSON web token naming the team and the key, signed with the
    /// key (ES256). Reused for <see cref="TokenLifetime"/>.
    /// </summary>
    public string ProviderToken()
    {
        lock (_tokenLock)
        {
            var now = timeProvider.GetUtcNow();
            if (_token is { } token && now - token.MadeAt < TokenLifetime)
            {
                return token.Token;
            }

            var header = Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "ES256", kid = settings.KeyId }));
            var payload = Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(new { iss = settings.TeamId, iat = now.ToUnixTimeSeconds() }));
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportFromPem(settings.PrivateKey);
            var signature = ecdsa.SignData(Encoding.ASCII.GetBytes($"{header}.{payload}"), HashAlgorithmName.SHA256);
            var made = $"{header}.{payload}.{Base64UrlEncoder.Encode(signature)}";
            _token = (made, now);
            return made;
        }
    }

    /// <summary>
    /// The reason Apple gives for refusing a notification (e.g. <c>BadDeviceToken</c>), or null.
    /// </summary>
    private static async Task<string?> ReasonAsync(HttpResponseMessage response)
    {
        try
        {
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            return json.RootElement.TryGetProperty("reason", out var reason) ? reason.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
