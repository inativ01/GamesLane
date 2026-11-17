using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using GamesLane.Server.Auth;
using GamesLane.Server.Hubs;

namespace GamesLane.Server.Notifications;

/// <summary>
/// The body of <c>POST /api/notifications/device</c>: the device token Apple gave the iPhone app (hexadecimal), whether
/// it is for Apple's development servers, and the language of the notifications (a code from i18n.js).
/// </summary>
public record DeviceRequest(string? Token, bool Sandbox, string? Language);

/// <summary>
/// Turn notifications in the iPhone app (see <see cref="TurnNotifier"/>): the services, and the endpoint where the app
/// registers the device for the logged-in user.
/// </summary>
public static partial class NotificationEndpoints
{
    /// <summary>
    /// The rate limit for registering devices: at most <see cref="DevicesPerHour"/> per address in an hour, so made-up
    /// tokens cannot fill the database (anyone can become a guest).
    /// </summary>
    public const string DeviceRateLimit = "devices";

    private const int DevicesPerHour = 60;

    [GeneratedRegex("^[0-9a-fA-F]{64,200}$")]
    private static partial Regex DeviceTokenFormat();

    /// <summary>
    /// Registers the devices, Apple's notification service, the texts, the notifier, the cleanup of unused devices,
    /// and the registrations' rate limit.
    /// </summary>
    public static void AddGamesLaneNotifications(this WebApplicationBuilder builder)
    {
        builder.Services.AddRateLimiter(options => options.AddPolicy(DeviceRateLimit, context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = DevicesPerHour, Window = TimeSpan.FromHours(1) })));
        builder.Services.AddHttpClient(ApnsPushSender.HttpClientName);
        builder.Services.AddSingleton<IDeviceTokenRepository, DeviceTokenRepository>();
        builder.Services.AddSingleton<IPushSender, ApnsPushSender>();
        builder.Services.AddSingleton(services =>
            NotificationTexts.Load(services.GetRequiredService<IWebHostEnvironment>().WebRootPath ?? ""));
        builder.Services.AddSingleton<ITurnNotifier, TurnNotifier>();
        builder.Services.AddHostedService<DeviceTokenCleanup>();
    }

    /// <summary>
    /// Whether <paramref name="token"/> looks like a device token from Apple: 64 to 200 hexadecimal digits.
    /// </summary>
    public static bool IsDeviceToken(string? token) => token is not null && DeviceTokenFormat().IsMatch(token);

    /// <summary>
    /// Maps <c>/api/notifications/device</c>.
    /// </summary>
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        // The app registers the device every time it opens the site, so the device follows the user who is logged in
        // and is kept as long as it is used.
        app.MapPost("/api/notifications/device", async (DeviceRequest request, HttpContext context,
            IDeviceTokenRepository devices, NotificationTexts texts, TimeProvider timeProvider) =>
        {
            if (AuthSetup.GetUserId(context.User) is null)
            {
                return Results.Unauthorized();
            }

            if (!IsDeviceToken(request.Token))
            {
                return Results.BadRequest(new { error = "That is not a device token." });
            }

            await devices.SaveAsync(request.Token!.ToLowerInvariant(), GameHub.GetUserKey(context.User, ""), request.Sandbox,
                texts.Language(request.Language), timeProvider.GetUtcNow());
            return Results.NoContent();
        }).RequireRateLimiting(DeviceRateLimit);
    }
}
