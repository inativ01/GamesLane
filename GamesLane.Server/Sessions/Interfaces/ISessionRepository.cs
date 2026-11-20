using GamesLane.Server.Data;

namespace GamesLane.Server.Sessions;

/// <summary>
/// A game in a user's Saved games: its session code, its game (as saved, e.g. "Backgammon") and when the session was
/// last saved, i.e. its last activity.
/// </summary>
public record SavedGameRow(string SessionId, string GameType, DateTimeOffset LastActivity);

/// <summary>
/// Where sessions, and the games users saved, are saved (the database). Codes are in upper case. A session a user saved
/// is not deleted while it is saved.
/// </summary>
public interface ISessionRepository
{
    /// <summary>
    /// The saved session with this code, or null.
    /// </summary>
    Task<SavedSession?> FindAsync(string id);

    /// <summary>
    /// Whether a session with this code is saved.
    /// </summary>
    Task<bool> ExistsAsync(string id);

    /// <summary>
    /// Saves a session, replacing its previous save.
    /// </summary>
    Task SaveAsync(SavedSession session);

    /// <summary>
    /// Deletes the saved session with this code, if any, unless a user saved it. Returns false if it is kept because a
    /// user saved it.
    /// </summary>
    Task<bool> DeleteAsync(string id);

    /// <summary>
    /// Deletes the sessions last saved before <paramref name="cutoff"/> that no user saved, and those last saved before
    /// <paramref name="savedCutoff"/> even if users saved them (with their place in those users' Saved games). Returns
    /// how many sessions were deleted.
    /// </summary>
    Task<int> DeleteOlderThanAsync(DateTimeOffset cutoff, DateTimeOffset savedCutoff);

    /// <summary>
    /// The games the user saved, most recently active first.
    /// </summary>
    Task<IReadOnlyList<SavedGameRow>> GetSavedGamesAsync(Guid userId);

    /// <summary>
    /// How many saved games that can be opened the user may keep (<c>User.SavedGameLimit</c>); 0 if there is no such user.
    /// </summary>
    Task<int> GetSavedGameLimitAsync(Guid userId);

    /// <summary>
    /// Adds the session to the user's saved games (nothing changes if it is there already). Returns false if there is
    /// no saved session with this code.
    /// </summary>
    Task<bool> AddSavedGameAsync(Guid userId, string id, DateTimeOffset savedAt);

    /// <summary>
    /// Removes the session from the user's saved games, if it is there.
    /// </summary>
    Task RemoveSavedGameAsync(Guid userId, string id);
}
