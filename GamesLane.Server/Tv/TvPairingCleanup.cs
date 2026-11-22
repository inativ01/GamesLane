namespace GamesLane.Server.Tv;

/// <summary>
/// Unpairs the TVs a user has not paired again or watched their games on for <see cref="UnusedLimit"/>. Runs shortly
/// after the server starts, then every few hours.
/// </summary>
public class TvPairingCleanup(
    ITvPairingRepository pairings,
    TimeProvider timeProvider,
    ILogger<TvPairingCleanup> logger) : BackgroundService
{
    /// <summary>
    /// How long a pairing is kept without use.
    /// </summary>
    public static readonly TimeSpan UnusedLimit = TimeSpan.FromDays(90);

    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(6);

    /// <summary>
    /// Deletes unused pairings now and then on every interval, until the server stops.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(FirstRunDelay, timeProvider, stoppingToken);
        using var timer = new PeriodicTimer(RunInterval, timeProvider);
        do
        {
            try
            {
                var deleted = await pairings.DeleteUnusedAsync(timeProvider.GetUtcNow() - UnusedLimit);
                if (deleted > 0)
                {
                    logger.LogInformation("Unpaired {Count} unused TVs.", deleted);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Could not unpair unused TVs.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
