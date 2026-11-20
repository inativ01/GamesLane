namespace GamesLane.Server.Data;

/// <summary>
/// A private game a saved user keeps in their Saved games. A session saved by anyone is not deleted until it has had no
/// activity for 90 days; a user's saved games are deleted with the user.
/// </summary>
public class SavedGame
{
    /// <summary>
    /// The user who saved the game.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// The session's code, in upper case (see <see cref="SavedSession.Id"/>).
    /// </summary>
    public required string SessionId { get; set; }

    /// <summary>
    /// When the user saved it.
    /// </summary>
    public DateTimeOffset SavedAt { get; set; }
}
