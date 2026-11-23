using System.Text.Json;
using System.Text.RegularExpressions;
using GamesLane.Server.Sessions;

namespace GamesLane.Server.Notifications;

/// <summary>
/// The texts of turn notifications in each language: the game's name as the title and "Your turn" as the text. They
/// come from the site's translations (<c>wwwroot/lang/&lt;code&gt;.js</c>, see i18n.js), whose English texts are the keys,
/// so the notifications say what the pages say. A text without a translation stays in English.
/// </summary>
public partial class NotificationTexts
{
    /// <summary>
    /// The language of the site's texts, and of notifications in a language that has no translations.
    /// </summary>
    public const string English = "en";

    /// <summary>
    /// The text of a turn notification, in English.
    /// </summary>
    public const string YourTurn = "Your turn";

    /// <summary>
    /// Each game's name, in English, as the pages show it.
    /// </summary>
    public static readonly IReadOnlyDictionary<GameType, string> GameNames = new Dictionary<GameType, string>
    {
        [GameType.TicTacToe] = "Tic-tac-toe",
        [GameType.PokerHeist] = "Poker Heist",
        [GameType.Backgammon] = "Backgammon",
        [GameType.RichManPoorMan] = "Rich man, poor man",
        [GameType.Wazoo] = "Wazoo",
        [GameType.FinalCard] = "Final Card",
        [GameType.Yaniv] = "Yaniv",
        [GameType.Hearts] = "Hearts",
        [GameType.Spades] = "Spades",
        [GameType.Dominoes] = "Dominoes",
    };

    private readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> _translations;

    /// <summary>
    /// Texts with <paramref name="translations"/>: per language code, each English text's translation.
    /// </summary>
    public NotificationTexts(IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> translations)
    {
        _translations = translations;
    }

    [GeneratedRegex(@"""((?:[^""\\]|\\.)*)""\s*:\s*""((?:[^""\\]|\\.)*)""")]
    private static partial Regex Entry();

    /// <summary>
    /// Reads the translations of the notifications' texts from the site's <c>lang</c> folder in <paramref name="webRoot"/>.
    /// </summary>
    public static NotificationTexts Load(string webRoot)
    {
        var keys = GameNames.Values.Append(YourTurn).ToHashSet();
        return new NotificationTexts(ReadTranslations(webRoot).ToDictionary(language => language.Key,
            language => (IReadOnlyDictionary<string, string>)language.Value.Where(text => keys.Contains(text.Key)).ToDictionary()));
    }

    /// <summary>
    /// Every translation in the site's <c>lang</c> folder in <paramref name="webRoot"/>: per language code, each English
    /// text's translation.
    /// </summary>
    public static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> ReadTranslations(string webRoot)
    {
        var translations = new Dictionary<string, IReadOnlyDictionary<string, string>>();
        var folder = Path.Combine(webRoot, "lang");
        foreach (var file in Directory.Exists(folder) ? Directory.GetFiles(folder, "*.js") : [])
        {
            var texts = new Dictionary<string, string>();
            foreach (Match match in Entry().Matches(File.ReadAllText(file)))
            {
                texts[Unescape(match.Groups[1].Value)] = Unescape(match.Groups[2].Value);
            }

            translations[Path.GetFileNameWithoutExtension(file)] = texts;
        }

        return translations;
    }

    /// <summary>
    /// <paramref name="code"/> if notifications can be in that language, otherwise <see cref="English"/>.
    /// </summary>
    public string Language(string? code) =>
        code is not null && (code == English || _translations.ContainsKey(code)) ? code : English;

    /// <summary>
    /// The title (the game's name) and text of the notification that it is the user's turn in <paramref name="game"/>.
    /// </summary>
    public (string Title, string Body) Turn(GameType game, string language) =>
        (Translate(GameNames[game], language), Translate(YourTurn, language));

    private string Translate(string text, string language) =>
        _translations.TryGetValue(language, out var texts) && texts.TryGetValue(text, out var translated) ? translated : text;

    private static string Unescape(string text) => JsonSerializer.Deserialize<string>($"\"{text}\"")!;
}
