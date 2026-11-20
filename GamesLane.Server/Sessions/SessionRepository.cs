using GamesLane.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace GamesLane.Server.Sessions;

/// <summary>
/// Saves sessions, and the games users saved, in the database. Each call uses its own database context, so it can be used by the session store,
/// which lives as long as the server.
/// </summary>
public class SessionRepository(IServiceScopeFactory scopeFactory) : ISessionRepository
{
    /// <inheritdoc />
    public Task<SavedSession?> FindAsync(string id) =>
        Use(db => db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id));

    /// <inheritdoc />
    public Task<bool> ExistsAsync(string id) => Use(db => db.Sessions.AnyAsync(s => s.Id == id));

    /// <inheritdoc />
    public Task SaveAsync(SavedSession session) => Use(async db =>
    {
        var saved = await db.Sessions.FirstOrDefaultAsync(s => s.Id == session.Id);
        if (saved is null)
        {
            db.Sessions.Add(session);
        }
        else
        {
            saved.GameType = session.GameType;
            saved.Version = session.Version;
            saved.Data = session.Data;
            saved.UpdatedAt = session.UpdatedAt;
        }

        return await db.SaveChangesAsync();
    });

    /// <inheritdoc />
    public Task<bool> DeleteAsync(string id) => Use(async db =>
    {
        var deleted = await db.Sessions
            .Where(s => s.Id == id && !db.SavedGames.Any(g => g.SessionId == s.Id))
            .ExecuteDeleteAsync();
        return deleted > 0 || !await db.Sessions.AnyAsync(s => s.Id == id);
    });

    /// <inheritdoc />
    public Task<int> DeleteOlderThanAsync(DateTimeOffset cutoff, DateTimeOffset savedCutoff) => Use(async db =>
    {
        await db.SavedGames
            .Where(g => db.Sessions.Any(s => s.Id == g.SessionId && s.UpdatedAt < savedCutoff))
            .ExecuteDeleteAsync();
        return await db.Sessions
            .Where(s => s.UpdatedAt < cutoff && !db.SavedGames.Any(g => g.SessionId == s.Id))
            .ExecuteDeleteAsync();
    });

    /// <inheritdoc />
    public Task<IReadOnlyList<SavedGameRow>> GetSavedGamesAsync(Guid userId) => Use<IReadOnlyList<SavedGameRow>>(async db =>
        await (from g in db.SavedGames
               where g.UserId == userId
               join s in db.Sessions on g.SessionId equals s.Id
               orderby s.UpdatedAt descending
               select new SavedGameRow(s.Id, s.GameType, s.UpdatedAt))
            .ToListAsync());

    /// <inheritdoc />
    public Task<bool> AddSavedGameAsync(Guid userId, string id, DateTimeOffset savedAt) => Use(async db =>
    {
        if (await db.SavedGames.AnyAsync(g => g.UserId == userId && g.SessionId == id))
        {
            return true;
        }

        if (!await db.Sessions.AnyAsync(s => s.Id == id))
        {
            return false;
        }

        db.SavedGames.Add(new SavedGame { UserId = userId, SessionId = id, SavedAt = savedAt });
        try
        {
            await db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // Saved at the same time from another page, or the session was deleted meanwhile.
            return await db.SavedGames.AnyAsync(g => g.UserId == userId && g.SessionId == id);
        }
    });

    /// <inheritdoc />
    public Task RemoveSavedGameAsync(Guid userId, string id) =>
        Use(db => db.SavedGames.Where(g => g.UserId == userId && g.SessionId == id).ExecuteDeleteAsync());

    private async Task<T> Use<T>(Func<GamesLaneDbContext, Task<T>> action)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<GamesLaneDbContext>());
    }
}
