namespace GamesLane.Server.Games.PokerHeist;

/// <summary>
/// Basic rules, or advanced rules with challenge cards.
/// </summary>
public enum PokerHeistMode
{
    Basic,
    Advanced,
}

/// <summary>
/// The options of Poker Heist.
/// </summary>
public static class PokerHeistOptions
{
    /// <summary>
    /// The key of the <see cref="PokerHeistMode"/> option.
    /// </summary>
    public const string Mode = "mode";

    /// <summary>
    /// The key of the option for how many challenge cards the first heist gets (0 to 3).
    /// </summary>
    public const string FirstChallenges = "firstChallenges";

    /// <summary>
    /// The key of the set of challenge cards that can be drawn.
    /// </summary>
    public const string Challenges = "challenges";

    /// <summary>
    /// The key of the set of specialist cards that can be drawn.
    /// </summary>
    public const string Specialists = "specialists";

    /// <summary>
    /// The key of the option that keeps cards which cancel each other out of the same heist (off by default).
    /// </summary>
    public const string AvoidClashes = "avoidClashes";

    /// <summary>
    /// The key of the option that adds two jokers to the deck (off by default), in both modes.
    /// </summary>
    public const string Jokers = "jokers";

    /// <summary>
    /// The key of the option that shows each player the ranking of their own hand next to their cards (off by default).
    /// </summary>
    public const string ShowHandRanking = "showHandRanking";

    /// <summary>
    /// The values of yes/no options.
    /// </summary>
    public const string Yes = "Yes";

    /// <summary>
    /// The values of yes/no options.
    /// </summary>
    public const string No = "No";

    private static readonly GameOptionCondition WhenAdvanced = new(Mode, nameof(PokerHeistMode.Advanced));

    /// <summary>
    /// All options, in the order they are shown. The card options only apply in Advanced mode.
    /// </summary>
    public static IReadOnlyList<GameOption> All { get; } =
    [
        new GameOption(
            Mode,
            "Mode",
            [
                new GameOptionChoice(nameof(PokerHeistMode.Basic), "Basic", "The standard rules."),
                new GameOptionChoice(nameof(PokerHeistMode.Advanced), "Advanced",
                    "With challenge and specialist cards: after a successful heist, a challenge card is added; after a failed one, a specialist card. Cards stay for the rest of the game."),
            ],
            nameof(PokerHeistMode.Basic)),
        new GameOption(
            Jokers,
            "Jokers",
            [
                new GameOptionChoice(No, "Without jokers", "The standard 52-card deck."),
                new GameOptionChoice(Yes, "With 2 jokers",
                    "A joker in your hand is swapped: choose one of two new cards. A joker on the table becomes two cards stacked in one column; each hand uses one of them."),
            ],
            No),
        new GameOption(
            ShowHandRanking,
            "My hand's ranking",
            [
                new GameOptionChoice(No, "Hidden", "As in the original game: players work out their hands themselves."),
                new GameOptionChoice(Yes, "Shown",
                    "Each player sees the ranking their own cards make with the shared cards so far (e.g. Two pair), next to their cards."),
            ],
            No),
        new GameOption(
            FirstChallenges,
            "Challenge cards on the first heist",
            [.. Enumerable.Range(0, 4).Select(n => new GameOptionChoice(n.ToString(), n.ToString()))],
            "1",
            ShownWhen: WhenAdvanced),
        new GameOption(Challenges, "Challenge cards", CardChoices(PokerHeistCards.Challenges), "", GameOptionKind.Set, WhenAdvanced),
        new GameOption(Specialists, "Specialist cards", CardChoices(PokerHeistCards.Specialists), "", GameOptionKind.Set, WhenAdvanced),
        new GameOption(
            AvoidClashes,
            "Cards that cancel each other",
            [
                new GameOptionChoice(No, "Allow", "As in the original game. E.g. with Quick Access, Motion Detector and Laser Tripwires have no effect."),
                new GameOptionChoice(Yes, "Avoid", "Never draw them for the same heist."),
            ],
            No,
            ShownWhen: WhenAdvanced),
    ];

    /// <summary>
    /// One choice per card, with its name, what it does, and its picture (<c>/images/poker-heist/{key}.svg</c>).
    /// </summary>
    private static GameOptionChoice[] CardChoices(IEnumerable<PokerHeistCard> cards) =>
        [.. cards.Select(c => new GameOptionChoice(c.Key, c.Name, c.Text, $"/images/poker-heist/{c.Key}.svg"))];

    /// <summary>
    /// The mode in <paramref name="options"/>, Basic if it is missing or unknown.
    /// </summary>
    public static PokerHeistMode ModeOf(IReadOnlyDictionary<string, string> options) =>
        Enum.TryParse<PokerHeistMode>(options.GetValueOrDefault(Mode), out var mode) && Enum.IsDefined(mode) ? mode : PokerHeistMode.Basic;
}
