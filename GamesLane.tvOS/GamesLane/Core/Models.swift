import Foundation

/// What the TV shows (`TvStatus` on the server): its pairing code and when it expires, the users paired with it, and
/// the user whose games it shows, or nil.
struct TvStatus: Decodable, Equatable {
    let code: String
    let codeExpiresAt: Date
    let pairedWith: [String]
    let viewer: TvViewer?
}

/// The user whose games the TV shows: their name, icon (an emoji, or a picture's address starting with `/`), language,
/// and the session they have open and its game, or nil.
struct TvViewer: Decodable, Equatable {
    let name: String
    let icon: String
    let language: String
    let sessionId: String?
    let gameType: String?
}

/// A seat of a session: its holder's player ID, name, icon and connection (`Present`, `Reconnecting` or `Away`).
struct SeatInfo: Decodable, Equatable {
    let playerId: String
    let name: String
    let icon: String
    let status: String
}

/// The public session state (see "Session state" in the developer guide), without the game's own state, which is read
/// separately for the games the TV can show.
struct SessionState: Decodable, Equatable {
    let sessionId: String
    let gameType: String
    let phase: String
    let minSeats: Int
    let maxSeats: Int
    let seats: [SeatInfo?]
    let gameNumber: Int
    let isPublic: Bool
    let hostPlayerId: String?
    let notice: String?

    var inLobby: Bool { phase == "Lobby" }

    /// The seat's holder's name, or nil for an empty seat.
    func name(_ seat: Int) -> String? {
        seat >= 0 && seat < seats.count ? seats[seat]?.name : nil
    }

    func seat(_ seat: Int) -> SeatInfo? {
        seat >= 0 && seat < seats.count ? seats[seat] : nil
    }
}

/// The game's own state in a session state, as `T`.
struct GameEnvelope<T: Decodable>: Decodable {
    let game: T?
}

/// The answer to `EnterSession`; the TV only reads the state.
struct SessionEntry<State: Decodable>: Decodable {
    let state: State
}

/// The games, by the server's `GameType`: their English names (keys of the translations) and their pictures
/// (`wwwroot/images/games/<name>.svg`, in the asset catalog's Games folder).
enum Games {
    static let names: [String: String] = [
        "TicTacToe": "Tic-tac-toe",
        "PokerHeist": "Poker Heist",
        "Backgammon": "Backgammon",
        "RichManPoorMan": "Rich man, poor man",
        "Wazoo": "Wazoo",
        "FinalCard": "Final Card",
        "Yaniv": "Yaniv",
        "Hearts": "Hearts",
        "Spades": "Spades",
        "Dominoes": "Dominoes",
    ]

    static let pictures: [String: String] = [
        "TicTacToe": "tictactoe",
        "PokerHeist": "poker-heist",
        "Backgammon": "backgammon",
        "RichManPoorMan": "rich-man-poor-man",
        "Wazoo": "wazoo",
        "FinalCard": "final-card",
        "Yaniv": "yaniv",
        "Hearts": "hearts",
        "Spades": "spades",
        "Dominoes": "dominoes",
    ]

    /// The games the TV can show during a game; the others show their lobby, then the splash picture.
    static let shown: Set<String> = ["PokerHeist"]
}
