namespace GamesLane.Server.Sessions;

/// <summary>
/// A game in a user's Saved games, as the main screen shows it. <see cref="CanOpen"/> is false for a game saved by a
/// version of GamesLane that can no longer load it (see <see cref="SessionSnapshot.Version"/>); such a game has no
/// <see cref="Phase"/> or <see cref="Players"/>. <see cref="DaysLeft"/> is the number of days until the game is deleted
/// for lack of activity, within <see cref="SavedGameService.NoticePeriod"/> of it; otherwise null.
/// </summary>
public record SavedGameInfo(
    string SessionId,
    GameType? GameType,
    bool CanOpen,
    SessionPhase? Phase,
    IReadOnlyList<string> Players,
    int? DaysLeft);

/// <summary>
/// Saved users' Saved games: private games, in any state, kept until they have had no activity for
/// <see cref="ExpiredSessionCleanup.SavedExpiry"/>. A user has at most <see cref="Limit"/> saved games that can be opened.
/// </summary>
public class SavedGameService(ISessionRepository repository, IGameSessionStore store, TimeProvider timeProvider)
{
    /// <summary>
    /// How many saved games that can be opened a user may have.
    /// </summary>
    public const int Limit = 2;

    /// <summary>
    /// How long before a saved game is deleted the main screen tells how many days it has left.
    /// </summary>
    public static readonly TimeSpan NoticePeriod = TimeSpan.FromDays(30);

    /// <summary>
    /// The error when the user already has <see cref="Limit"/> saved games that can be opened.
    /// </summary>
    public const string LimitReached =
        "You reached your saved games limit. Please delete one of your existing saved games to save a new one.";

    /// <summary>
    /// The user's saved games, most recently active first.
    /// </summary>
    public async Task<IReadOnlyList<SavedGameInfo>> GetAsync(Guid userId)
    {
        var now = timeProvider.GetUtcNow();
        var games = new List<SavedGameInfo>();
        foreach (var row in await repository.GetSavedGamesAsync(userId))
        {
            GameType? type = Enum.TryParse<GameType>(row.GameType, out var parsed) ? parsed : null;
            var daysLeft = DaysLeft(row.LastActivity, now);
            if (await store.PeekAsync(row.SessionId) is not { } session)
            {
                games.Add(new SavedGameInfo(row.SessionId, type, false, null, [], daysLeft));
                continue;
            }

            var state = session.GetPublicState();
            var players = state.Seats.OfType<SeatInfo>().Select(s => s.Name).Distinct().ToArray();
            games.Add(new SavedGameInfo(row.SessionId, session.Type, true, state.Phase, players, daysLeft));
        }

        return games;
    }

    /// <summary>
    /// Adds a private game to the user's saved games. Returns an error if it cannot be saved: a public game, or the user
    /// already has <see cref="Limit"/> other saved games that can be opened.
    /// </summary>
    public async Task<string?> SaveAsync(Guid userId, IGameSession session)
    {
        if (session.IsPublic)
        {
            return "Only private games can be saved.";
        }

        var id = session.Id.ToUpperInvariant();
        var saved = await GetAsync(userId);
        if (saved.Any(g => g.SessionId == id))
        {
            return null;
        }

        if (saved.Count(g => g.CanOpen) >= Limit)
        {
            return LimitReached;
        }

        return await repository.AddSavedGameAsync(userId, id, timeProvider.GetUtcNow()) ? null : "The game could not be saved.";
    }

    /// <summary>
    /// Removes a game from the user's saved games. Once nobody has it saved, it is deleted as usual after
    /// <see cref="ExpiredSessionCleanup.Expiry"/> without activity.
    /// </summary>
    public Task RemoveAsync(Guid userId, string sessionId) =>
        repository.RemoveSavedGameAsync(userId, sessionId.ToUpperInvariant());

    /// <summary>
    /// Whole days (rounded up, at least 1) until a game last active at <paramref name="lastActivity"/> is deleted, if that
    /// is within <see cref="NoticePeriod"/>; otherwise null.
    /// </summary>
    public static int? DaysLeft(DateTimeOffset lastActivity, DateTimeOffset now)
    {
        var left = lastActivity + ExpiredSessionCleanup.SavedExpiry - now;
        return left > NoticePeriod ? null : Math.Max(1, (int)Math.Ceiling(left.TotalDays));
    }
}
