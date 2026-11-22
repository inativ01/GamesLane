import Foundation

/// Tells whether something the screen plays a sound for changed since the last update, as `view.changed` in common.js:
/// never on the first update when the TV opens a game already under way, always on the first one after the lobby.
struct ChangeTracker {
    private var seen: [String: String] = [:]
    private var afterLobby = false

    /// Whether `value` differs from the one given for `name` at the last update.
    mutating func changed<T: Encodable>(_ name: String, _ value: T) -> Bool {
        let now = (try? JSONEncoder().encode(value)).map { String(decoding: $0, as: UTF8.self) } ?? ""
        let before = seen[name] ?? (afterLobby ? nil : now)
        seen[name] = now
        return before != now
    }

    /// The session is in its lobby: the next game's first update counts as changed.
    mutating func lobby() {
        seen.removeAll()
        afterLobby = true
    }

    /// A game update was handled.
    mutating func rendered() {
        afterLobby = false
    }

    /// Another session: as if the TV had just opened it.
    mutating func reset() {
        seen.removeAll()
        afterLobby = false
    }
}
