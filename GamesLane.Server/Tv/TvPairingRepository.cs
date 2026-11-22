using GamesLane.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace GamesLane.Server.Tv;

/// <summary>
/// Keeps the TVs paired with users in the database. Each call uses its own database context, so it can be used by
/// services that live as long as the server.
/// </summary>
public class TvPairingRepository(IServiceScopeFactory scopeFactory) : ITvPairingRepository
{
    /// <inheritdoc />
    public Task SaveAsync(Guid userId, string tvId, string tvName, DateTimeOffset now) =>
        Use(db => db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "TvPairings" ("UserId", "TvId", "TvName", "PairedAt", "LastActiveAt")
            VALUES ({userId}, {tvId}, {tvName}, {now}, {now})
            ON CONFLICT ("UserId", "TvId")
            DO UPDATE SET "TvName" = EXCLUDED."TvName", "LastActiveAt" = EXCLUDED."LastActiveAt"
            """));

    /// <inheritdoc />
    public async Task<bool> TouchAsync(Guid userId, string tvId, DateTimeOffset now) =>
        await Use(db => db.TvPairings.Where(p => p.UserId == userId && p.TvId == tvId)
            .ExecuteUpdateAsync(set => set.SetProperty(p => p.LastActiveAt, now))) > 0;

    /// <inheritdoc />
    public async Task<IReadOnlyList<TvPairing>> GetForUserAsync(Guid userId) =>
        await Use(db => db.TvPairings.AsNoTracking().Where(p => p.UserId == userId).OrderBy(p => p.TvName).ToListAsync());

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> GetUserNamesAsync(string tvId) =>
        await Use(db => db.TvPairings.Where(p => p.TvId == tvId)
            .Join(db.Users, p => p.UserId, u => u.Id, (p, u) => u.DisplayName)
            .OrderBy(name => name)
            .ToListAsync());

    /// <inheritdoc />
    public Task DeleteAsync(Guid userId, string tvId) =>
        Use(db => db.TvPairings.Where(p => p.UserId == userId && p.TvId == tvId).ExecuteDeleteAsync());

    /// <inheritdoc />
    public Task<int> DeleteUnusedAsync(DateTimeOffset before) =>
        Use(db => db.TvPairings.Where(p => p.LastActiveAt < before).ExecuteDeleteAsync());

    private async Task<T> Use<T>(Func<GamesLaneDbContext, Task<T>> action)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<GamesLaneDbContext>());
    }
}
