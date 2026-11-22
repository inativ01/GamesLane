import Foundation

/// The texts in one of the site's languages, used like `t()` in i18n.js: the English text is the key, and varying parts
/// are written `{name}`. The translations come from the server (`GET /api/tv/texts/{language}`), so they stay in
/// wwwroot/lang with the site's.
struct Texts {
    /// The site's languages (`LANGUAGES` in i18n.js).
    static let codes = ["en", "he", "es", "fr", "pt", "zh-CN", "zh-TW"]

    let code: String
    let table: [String: String]
    private let patterns: [(key: String, names: [String], regex: NSRegularExpression)]

    init(code: String, table: [String: String] = [:]) {
        self.code = code
        self.table = table
        patterns = Self.serverPatterns(table)
    }

    static let english = Texts(code: "en")

    var isRightToLeft: Bool { code == "he" }

    /// `text` in this language (the English text when it has no translation), with its `{name}` parts filled in.
    func t(_ text: String, _ values: [String: Any] = [:]) -> String {
        Self.fill(table[text] ?? text, values)
    }

    /// A text from the server (a card's name, a hand ranking, a fact) in this language, as `translateServerText` in
    /// i18n.js: a translation with varying parts also matches the server's text with any value in them.
    func server(_ text: String?) -> String {
        guard let text, !text.isEmpty else {
            return text ?? ""
        }
        if let translated = table[text] {
            return translated
        }
        let range = NSRange(text.startIndex..., in: text)
        for pattern in patterns {
            guard let match = pattern.regex.firstMatch(in: text, range: range) else {
                continue
            }
            var values: [String: Any] = [:]
            for (i, name) in pattern.names.enumerated() {
                if let part = Range(match.range(at: i + 1), in: text) {
                    values[name] = String(text[part])
                }
            }
            return t(pattern.key, values)
        }
        return text
    }

    /// The site's code for a device's language tag, as `languageCode` in i18n.js: "fr" for "fr-CA", "zh-TW" for
    /// Traditional Chinese or Taiwan, Hong Kong or Macau, "zh-CN" for other Chinese.
    static func languageCode(_ tag: String) -> String {
        let parts = tag.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).map(String.init)
        guard let first = parts.first else {
            return ""
        }
        guard first == "zh" else {
            return first
        }
        let traditional = !parts.contains("hans") && parts.contains { ["hant", "tw", "hk", "mo"].contains($0) }
        return traditional ? "zh-TW" : "zh-CN"
    }

    /// The first of the device's languages that the site offers, otherwise English.
    static func deviceLanguage(_ preferred: [String] = Locale.preferredLanguages) -> String {
        preferred.map(languageCode).first(where: codes.contains) ?? "en"
    }

    private static func fill(_ text: String, _ values: [String: Any]) -> String {
        guard !values.isEmpty, let regex = try? NSRegularExpression(pattern: #"\{(\w+)\}"#) else {
            return text
        }
        var result = text
        for match in regex.matches(in: text, range: NSRange(text.startIndex..., in: text)).reversed() {
            guard let whole = Range(match.range, in: result), let name = Range(match.range(at: 1), in: text),
                  let value = values[String(text[name])] else {
                continue
            }
            result.replaceSubrange(whole, with: String(describing: value))
        }
        return result
    }

    // Keys with varying parts, as patterns that match a text with any value in them. Keys that are mostly varying parts
    // (fewer than 4 letters besides them) are left out, so they do not match unrelated texts.
    private static func serverPatterns(_ table: [String: String]) -> [(key: String, names: [String], regex: NSRegularExpression)] {
        let placeholder = try! NSRegularExpression(pattern: #"\{(\w+)\}"#)
        return table.keys.sorted().compactMap { key in
            guard key.contains("{") else {
                return nil
            }
            let letters = placeholder.stringByReplacingMatches(in: key, range: NSRange(key.startIndex..., in: key), withTemplate: "")
                .filter { $0.isASCII && $0.isLetter }
            guard letters.count >= 4 else {
                return nil
            }
            var source = "^"
            var names: [String] = []
            var rest = key
            while let match = placeholder.firstMatch(in: rest, range: NSRange(rest.startIndex..., in: rest)),
                  let whole = Range(match.range, in: rest), let name = Range(match.range(at: 1), in: rest) {
                source += NSRegularExpression.escapedPattern(for: String(rest[..<whole.lowerBound])) + "(.+?)"
                names.append(String(rest[name]))
                rest = String(rest[whole.upperBound...])
            }
            source += NSRegularExpression.escapedPattern(for: rest) + "$"
            guard let regex = try? NSRegularExpression(pattern: source) else {
                return nil
            }
            return (key, names, regex)
        }
    }
}
