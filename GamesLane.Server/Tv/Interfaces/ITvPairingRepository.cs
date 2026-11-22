using GamesLane.Server.Data;

namespace GamesLane.Server.Tv;

/// <summary>
/// Where the TVs paired with users are kept (the database).
/// </summary>
public interface ITvPairingRepository
{
    /// <summary>
    /// Pairs the TV <paramref name="tvId"/>, named <paramref name="tvName"/>, with the user, or pairs it again, and marks
    /// the pairing used at <paramref name="now"/>.
    /// </summary>
    Task SaveAsync(Guid userId, string tvId, string tvName, DateTimeOffset now);

    /// <summary>
    /// Marks the user's pairing with the TV used at <paramref name="now"/>. Returns false if they are not paired.
    /// </summary>
    Task<bool> TouchAsync(Guid userId, string tvId, DateTimeOffset now);

    /// <summary>
    /// The TVs paired with the user, by name.
    /// </summary>
    Task<IReadOnlyList<TvPairing>> GetForUserAsync(Guid userId);

    /// <summary>
    /// The display names of the users paired with the TV, in alphabetical order.
    /// </summary>
    Task<IReadOnlyList<string>> GetUserNamesAsync(string tvId);

    /// <summary>
    /// Unpairs the TV from the user.
    /// </summary>
    Task DeleteAsync(Guid userId, string tvId);

    /// <summary>
    /// Deletes the pairings not used since <paramref name="before"/>, and returns how many.
    /// </summary>
    Task<int> DeleteUnusedAsync(DateTimeOffset before);
}
