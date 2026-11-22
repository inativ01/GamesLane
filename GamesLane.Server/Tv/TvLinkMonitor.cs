namespace GamesLane.Server.Tv;

/// <summary>
/// Every few seconds, ends the Watch on TV links whose TV or user has been gone too long (see <see cref="TvLinks"/>).
/// </summary>
public class TvLinkMonitor(TvService tvs, TimeProvider timeProvider, ILogger<TvLinkMonitor> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Ends expired links on every interval, until the server stops.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval, timeProvider);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await tvs.ExpireAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not end expired TV links.");
            }
        }
    }
}
