namespace GamesLane.Server.Data;

/// <summary>
/// An iPhone running the app, which gets a notification when it is its user's turn: Apple's device token for the app,
/// the user (a saved user or a guest), and the language of the notifications. Deleted after 30 days without use.
/// </summary>
public class DeviceToken
{
    /// <summary>
    /// The device token Apple gave the app, in hexadecimal.
    /// </summary>
    public required string Token { get; set; }

    /// <summary>
    /// The user the device belongs to, as the game hub knows them, e.g. <c>user:guest:...</c>.
    /// </summary>
    public required string UserKey { get; set; }

    /// <summary>
    /// Whether the token is for Apple's development (sandbox) servers: an app built for development, not TestFlight or
    /// the App Store.
    /// </summary>
    public bool IsSandbox { get; set; }

    /// <summary>
    /// The language of the notifications, a code from i18n.js such as <c>he</c>.
    /// </summary>
    public required string Language { get; set; }

    /// <summary>
    /// When the app last registered the device.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
