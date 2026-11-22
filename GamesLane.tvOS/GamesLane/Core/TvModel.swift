import Foundation
import Observation

/// The TV app's state (see "Apple TV app" in the developer guide): registers the TV, connects to the hub, keeps the
/// TV's status (`TvConnect`, `TvUpdated`) and follows the session of the user whose games it shows, as an observer.
@MainActor
@Observable
final class TvModel {
    /// What the screen shows.
    enum Screen: Equatable {
        case connecting, pairing, waiting, lobby, game, unsupported
    }

    let server: URL
    private(set) var status: TvStatus?
    private(set) var texts = Texts(code: Texts.deviceLanguage())
    private(set) var state: SessionState?
    private(set) var heist: PokerHeistState?
    private(set) var connected = false
    /// Changes each time the crew opens a vault (confetti), and each time the cards are shuffled.
    private(set) var celebration = 0
    private(set) var shuffle = 0

    @ObservationIgnored private var hub: HubConnection!
    @ObservationIgnored private var token: String?
    @ObservationIgnored private var session: String?
    @ObservationIgnored private var tracker = ChangeTracker()
    @ObservationIgnored private var celebrated = Set<String>()
    @ObservationIgnored private var codeRefresh: Task<Void, Never>?
    @ObservationIgnored private var translations: [String: [String: String]] = [:]

    init(server: URL = ServerAddress.current) {
        self.server = server
        hub = HubConnection(url: ServerAddress.hubURL(server)) { [weak self] in self?.token }
        hub.onConnected = { [weak self] in self?.hubConnected() }
        hub.onDisconnected = { [weak self] in self?.connected = false }
        hub.onUnauthorized = { [weak self] in self?.tokenRefused() }
        hub.on("TvUpdated") { [weak self] arguments in
            guard let value = arguments.first, let status = try? SignalRProtocol.decode(TvStatus.self, from: value) else {
                return
            }
            self?.apply(status)
        }
        hub.on("StateUpdated") { [weak self] arguments in
            if let value = arguments.first {
                self?.receive(value)
            }
        }
    }

    var screen: Screen {
        guard let status else {
            return .connecting
        }
        guard let viewer = status.viewer else {
            return .pairing
        }
        guard viewer.sessionId != nil, let state else {
            return .waiting
        }
        if state.inLobby {
            return .lobby
        }
        return state.gameType == "PokerHeist" && heist != nil ? .game : .unsupported
    }

    /// Registers the TV if it has no token yet (trying again every 5 seconds), then connects.
    func start() async {
        token = TvAccount.load(for: server)
        while token == nil {
            token = try? await TvAccount.register(with: server)
            if token == nil {
                try? await Task.sleep(for: .seconds(5))
            }
        }
        hub.start()
    }

    private func tokenRefused() {
        TvAccount.forget(server)
        token = nil
        status = nil
        Task { await start() }
    }

    private func hubConnected() {
        connected = true
        // The server forgot which session the TV watched: it enters it again once it knows the TV's status.
        session = nil
        Task { await tvConnect() }
    }

    private func tvConnect() async {
        guard let value = try? await hub.invoke("TvConnect"), let status = try? SignalRProtocol.decode(TvStatus.self, from: value) else {
            return
        }
        apply(status)
    }

    private func apply(_ status: TvStatus) {
        self.status = status
        codeRefresh?.cancel()
        codeRefresh = Task { [weak self] in
            try? await Task.sleep(for: .seconds(max(status.codeExpiresAt.timeIntervalSinceNow, 1)))
            guard !Task.isCancelled else {
                return
            }
            await self?.tvConnect()
        }
        Task { await useLanguage(status.viewer?.language ?? Texts.deviceLanguage()) }
        Task { await follow(status.viewer?.sessionId) }
    }

    /// The texts in `code`, from the server (once per language).
    private func useLanguage(_ code: String) async {
        let code = Texts.codes.contains(code) ? code : "en"
        guard code != texts.code || translations[code] == nil else {
            return
        }
        if code != "en", translations[code] == nil,
           let answer = try? await URLSession.shared.data(from: server.appendingPathComponent("api/tv/texts/\(code)")),
           (answer.1 as? HTTPURLResponse)?.statusCode == 200 {
            translations[code] = try? JSONDecoder().decode([String: String].self, from: answer.0)
        }
        texts = Texts(code: code, table: translations[code] ?? [:])
    }

    /// Watches `sessionId` (the session the user has open), leaving the one watched before.
    private func follow(_ sessionId: String?) async {
        guard sessionId != session else {
            return
        }
        let old = session
        session = sessionId
        if state?.sessionId != sessionId {
            state = nil
            heist = nil
            tracker.reset()
        }
        if let old {
            _ = try? await hub.invoke("LeaveSession", old)
        }
        guard let sessionId, session == sessionId else {
            return
        }
        do {
            let entry = try await hub.invoke("EnterSession", sessionId) as? [String: Any]
            if let value = entry?["state"] {
                receive(value)
            }
        } catch {
            // No such game (any more): the waiting screen shows until the user opens another.
            if session == sessionId {
                state = nil
                heist = nil
            }
        }
    }

    /// A new public state of the session watched.
    private func receive(_ value: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: value),
              let state = try? JSONDecoder.gamesLane.decode(SessionState.self, from: data),
              state.sessionId == session else {
            return
        }
        self.state = state
        if state.inLobby {
            heist = nil
            tracker.lobby()
            return
        }
        heist = state.gameType == "PokerHeist"
            ? (try? JSONDecoder.gamesLane.decode(GameEnvelope<PokerHeistState>.self, from: data))?.game
            : nil
        if let heist {
            notice(heist, state)
        }
        tracker.rendered()
    }

    @ObservationIgnored private var chipsKey = ""

    /// Sounds and confetti for what changed, as poker-heist.js plays them for everyone: the shuffle, a chip taken or
    /// returned, shared cards turned, a hand revealed, and the fanfare with confetti each time the crew opens a vault.
    private func notice(_ game: PokerHeistState, _ state: SessionState) {
        let sounds = GameSounds.shared
        if tracker.changed("shuffles", "\(state.gameNumber):\(game.shuffles)") {
            shuffle += 1
            sounds.play(.shuffle)
        }
        let key = "\(game.heist):\(game.stage)"
        let chips = game.stage < game.chips.count ? game.chips[game.stage] : []
        if tracker.changed("chips", ChipsSnapshot(key: key, chips: chips)) && chipsKey == key {
            sounds.play(.chip)
        }
        chipsKey = key
        if tracker.changed("community", "\(game.heist):\(game.communityCards.count)") && !game.communityCards.isEmpty {
            sounds.play(.card)
        }
        if tracker.changed("revealed", "\(game.heist):\(game.revealed.count)") && !game.revealed.isEmpty {
            sounds.play(.card)
        }
        let success = "\(state.sessionId):\(state.gameNumber):heist-\(game.heist)"
        if game.phase == "HeistOver" && game.succeeded == true && celebrated.insert(success).inserted {
            celebration += 1
            sounds.play(.fanfare)
        }
    }

    private struct ChipsSnapshot: Encodable {
        let key: String
        let chips: [Int?]
    }
}

