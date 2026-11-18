namespace GamesLane.Server.Games.PokerHeist;

/// <summary>
/// The rules a game of Poker Heist is played with, from its options: the mode, how many challenge cards the first heist
/// gets, which challenge and specialist cards (keys from <see cref="PokerHeistCards"/>) can be drawn, whether cards that
/// cancel each other are kept apart, and whether the deck has two jokers. Cards are only drawn in
/// <see cref="PokerHeistMode.Advanced"/> mode; jokers can be used in both modes. One option only changes the pages: whether
/// each player sees the ranking of their own hand next to their cards.
/// </summary>
public record PokerHeistRules(
    PokerHeistMode Mode,
    int FirstHeistChallenges,
    IReadOnlyList<string> Challenges,
    IReadOnlyList<string> Specialists,
    bool AvoidClashes = false,
    bool Jokers = false,
    bool ShowHandRanking = false)
{
    /// <summary>
    /// The basic game, without cards.
    /// </summary>
    public static PokerHeistRules Basic { get; } = new(PokerHeistMode.Basic, 0, [], []);

    /// <summary>
    /// The rules for the chosen options (as kept by the session, with every option present and valid).
    /// </summary>
    public static PokerHeistRules FromOptions(IReadOnlyDictionary<string, string> options)
    {
        var option = (string key) => PokerHeistOptions.All.First(o => o.Key == key);
        return new PokerHeistRules(
            PokerHeistOptions.ModeOf(options),
            int.TryParse(options.GetValueOrDefault(PokerHeistOptions.FirstChallenges), out var count) ? count : 0,
            GameOptions.TurnedOn(option(PokerHeistOptions.Challenges), options),
            GameOptions.TurnedOn(option(PokerHeistOptions.Specialists), options),
            options.GetValueOrDefault(PokerHeistOptions.AvoidClashes) == PokerHeistOptions.Yes,
            options.GetValueOrDefault(PokerHeistOptions.Jokers) == PokerHeistOptions.Yes,
            options.GetValueOrDefault(PokerHeistOptions.ShowHandRanking) == PokerHeistOptions.Yes);
    }
}
