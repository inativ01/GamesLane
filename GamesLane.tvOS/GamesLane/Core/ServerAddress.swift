import Foundation

/// The server the app talks to, chosen when the app is built, as for the iPhone app: the `GAMESLANE_SERVER` build
/// setting (`GamesLaneServer` in Info.plist) is empty for production, a pull request's number (e.g. 42) for its preview
/// server, or a full address such as http://192.168.1.20:5171 for a server running locally.
enum ServerAddress {
    static let production = URL(string: "https://gameslane.onrender.com")!

    /// The server for the build setting's value.
    static func resolve(_ value: String?) -> URL {
        var server = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if server.isEmpty || server.hasPrefix("$(") {
            return production
        }
        if server.allSatisfy({ $0.isASCII && $0.isNumber }) {
            return URL(string: "https://gameslane-pr-\(server).onrender.com")!
        }
        while server.hasSuffix("/") {
            server.removeLast()
        }
        return URL(string: server) ?? production
    }

    /// The server this build talks to.
    static let current = resolve(Bundle.main.object(forInfoDictionaryKey: "GamesLaneServer") as? String)

    /// The game hub's WebSocket address on `server`.
    static func hubURL(_ server: URL) -> URL {
        var parts = URLComponents(url: server.appendingPathComponent("hubs/game"), resolvingAgainstBaseURL: false)!
        parts.scheme = parts.scheme == "http" ? "ws" : "wss"
        return parts.url!
    }

    /// The address the TV's QR code opens: the site's main screen with the pairing code, which opens the profile with
    /// the code filled in.
    static func pairingURL(_ server: URL, code: String) -> URL {
        var parts = URLComponents(url: server, resolvingAgainstBaseURL: false)!
        parts.path = "/"
        parts.queryItems = [URLQueryItem(name: "tv", value: code)]
        return parts.url!
    }

    /// A user's icon picture (an address starting with `/`) on `server`, or nil for an emoji.
    static func iconURL(_ server: URL, icon: String?) -> URL? {
        guard let icon, icon.hasPrefix("/") else {
            return nil
        }
        return URL(string: icon, relativeTo: server)?.absoluteURL
    }
}
