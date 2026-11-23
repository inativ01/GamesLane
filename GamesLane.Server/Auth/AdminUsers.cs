using System.Security.Claims;
using GamesLane.Server.Sessions;

namespace GamesLane.Server.Auth;

/// <summary>
/// The saved users who may open the admin page, by user ID, from the <c>Admin:UserIds</c> setting (in
/// <c>appsettings.json</c>). Their accounts are never deleted for inactivity.
/// </summary>
public class AdminUsers(IEnumerable<Guid> ids)
{
    /// <summary>
    /// The admins' user IDs.
    /// </summary>
    public IReadOnlySet<Guid> Ids { get; } = ids.ToHashSet();

    /// <summary>
    /// The admins from configuration. IDs that are not GUIDs are ignored.
    /// </summary>
    public static AdminUsers From(IConfiguration configuration) =>
        new(configuration.GetSection("Admin:UserIds").Get<string[]>()?
            .Select(id => Guid.TryParse(id, out var guid) ? guid : (Guid?)null)
            .OfType<Guid>() ?? []);

    /// <summary>
    /// Whether the logged-in user is an admin.
    /// </summary>
    public bool IsAdmin(ClaimsPrincipal? user) => AuthSetup.GetSavedUserId(user) is { } id && Ids.Contains(id);

    /// <summary>
    /// The games only admins can find: they are not in the others' list of games, and only admins can start one or join
    /// one as a public game. Anyone can join one by its code or invite link.
    /// </summary>
    public static IReadOnlySet<GameType> AdminOnlyGames { get; } = new HashSet<GameType> { GameType.Spades, GameType.Dominoes };

    /// <summary>
    /// Whether the logged-in user can start a game of this type, or join one as a public game.
    /// </summary>
    public bool CanStart(ClaimsPrincipal? user, GameType gameType) => !AdminOnlyGames.Contains(gameType) || IsAdmin(user);
}
