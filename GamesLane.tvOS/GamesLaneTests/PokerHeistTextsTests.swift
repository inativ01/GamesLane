import XCTest
@testable import GamesLane

final class PokerHeistTextsTests: XCTestCase {
    private func session(_ changes: [String: Any] = [:]) throws -> SessionState {
        var value: [String: Any] = [
            "sessionId": "ABC234", "gameType": "PokerHeist", "phase": "Playing", "minSeats": 3, "maxSeats": 8,
            "seats": [seat("p1", "Ada"), seat("p2", "Ben"), seat("p1", "Ada"), NSNull()],
            "gameNumber": 1, "isPublic": false, "hostPlayerId": NSNull(), "notice": NSNull(), "observerCount": 1,
        ]
        value.merge(changes) { $1 }
        return try SignalRProtocol.decode(SessionState.self, from: value)
    }

    private func seat(_ playerId: String, _ name: String) -> [String: Any] {
        ["playerId": playerId, "name": name, "icon": "🦊", "status": "Present"]
    }

    private func game(_ changes: [String: Any] = [:]) throws -> PokerHeistState {
        var value: [String: Any] = [
            "mode": "Advanced", "cards": [], "newCards": [], "preparingCard": NSNull(), "redrawnSeat": NSNull(),
            "redrawConfirmed": false, "skippedStages": [], "lockedChips": [], "announcements": [], "decisions": [],
            "results": [], "pendingSeat": NSNull(), "pendingStep": "None", "shownFromSeat": NSNull(), "shownToSeat": NSNull(),
            "succeeded": NSNull(), "heist": 1, "stage": 1, "phase": "Betting", "vaults": 0, "alarms": 0,
            "communityCards": [["9♥"], ["K♠"], ["2♦"]], "jokerSwaps": [], "jokerSeats": [],
            "chips": [[1, 3, 2, NSNull()], [NSNull(), 2, NSNull(), NSNull()], [NSNull(), NSNull(), NSNull(), NSNull()], [NSNull(), NSNull(), NSNull(), NSNull()]],
            "middleChips": [1, 3], "readySeats": [], "preparedSeats": [], "playingSeats": [0, 1, 2], "revealOrder": [],
            "revealed": [], "shuffles": 1,
        ]
        value.merge(changes) { $1 }
        return try SignalRProtocol.decode(PokerHeistState.self, from: value)
    }

    private func texts(_ game: PokerHeistState, _ state: SessionState? = nil) throws -> PokerHeistTexts {
        PokerHeistTexts(game: game, state: try state ?? session(), texts: .english)
    }

    func testStatusAsAnObserverSeesIt() throws {
        XCTAssertEqual(try texts(game()).status, "Yellow chips")
        XCTAssertEqual(try texts(game(["redrawnSeat": 1])).status, "Yellow chips · Waiting for Ben to confirm new cards")
        XCTAssertEqual(try texts(game(["phase": "Preparing", "preparingCard": "coordinator", "preparedSeats": [1]])).status,
                       "Coordinator: pass on a card · Waiting for Ada")
        XCTAssertEqual(try texts(game(["phase": "Reveal"])).status, "🃏 Revealing, lowest red chip first…")
        XCTAssertEqual(try texts(game(["phase": "HeistOver", "succeeded": true, "vaults": 1])).status, "💰 The vault is open!")
        XCTAssertEqual(try texts(game(["phase": "HeistOver", "succeeded": false, "alarms": 3])).status, "🚨 Three alarms: game over")
    }

    func testChipTableCells() throws {
        let heist = try texts(game(["redrawnSeat": 0, "skippedStages": [2]]))

        XCTAssertEqual(heist.cell(0, 0), .chip(1, void: true))
        XCTAssertEqual(heist.cell(0, 1), .chip(3, void: false))
        XCTAssertEqual(heist.cell(1, 0), .dash)
        XCTAssertEqual(heist.cell(2, 0), .empty)
        XCTAssertEqual(heist.cell(3, 0), .empty)
        XCTAssertEqual(try texts(game(["cards": [card("blackout", "Challenge")], "chips": [[], [], [], []]])).cell(0, 0), .removed)
        XCTAssertEqual(heist.playerNumber(2), 3)
        XCTAssertEqual(heist.userNames([0, 1, 2]), ["Ada", "Ben"])
    }

    private func card(_ key: String, _ kind: String, name: String? = nil) -> [String: Any] {
        ["key": key, "name": name ?? key, "kind": kind, "text": "", "choice": "None"]
    }

    private func decision(_ card: String, seat: Any = NSNull(), value: Any = NSNull(), done: Bool, open: Bool = false) -> [String: Any] {
        ["card": card, "choice": "Player", "seat": seat, "value": value, "voters": [0, 1, 2], "agreed": [1], "isOpen": open,
         "isDone": done, "isSkipped": false]
    }

    func testFactsAndNotes() throws {
        let heist = try texts(game([
            "cards": [card("retina-scan", "Challenge", name: "Retina Scan"), card("mastermind", "Specialist", name: "Mastermind"),
                      card("getaway-driver", "Specialist", name: "Getaway Driver")],
            "decisions": [decision("retina-scan", value: "K", done: true), decision("mastermind", seat: 1, value: "9", done: true),
                          decision("getaway-driver", seat: 2, done: false, open: true)],
            "results": [["seat": 2, "card": "retina-scan", "text": "guessed K: right", "passed": true],
                        ["seat": 1, "card": "mastermind", "text": "2 9s", "passed": NSNull()]],
        ]))

        XCTAssertEqual(heist.facts(2), [PokerHeistTexts.Fact(text: "Retina Scan: guessed K", passed: true)])
        XCTAssertEqual(heist.facts(1), [PokerHeistTexts.Fact(text: "Mastermind: 2 9s", passed: nil)])
        XCTAssertEqual(heist.notes, ["Getaway Driver: deciding, 1 of 2 agreed (Ben)"])
        XCTAssertFalse(heist.isUnused(heist.game.cards[1]))
        XCTAssertTrue(heist.isUnused(heist.game.cards[2]))
    }

    func testMotionDetectorIsUnusedOnceTheFirstSharedCardsShowNoOneWasRedrawn() throws {
        let heist = try texts(game(["cards": [card("motion-detector", "Challenge", name: "Motion Detector")]]))

        XCTAssertEqual(heist.redrawCardName, "Motion Detector")
        XCTAssertTrue(heist.isUnused(heist.game.cards[0]))
        XCTAssertFalse(try texts(game(["cards": [card("motion-detector", "Challenge", name: "Motion Detector")], "redrawnSeat": 0]))
            .isUnused(heist.game.cards[0]))
    }

    func testCountTexts() throws {
        let heist = try texts(game())

        XCTAssertEqual(heist.countText("no Ks"), "no Ks")
        XCTAssertEqual(heist.countText("one K"), "one K")
        XCTAssertEqual(heist.countText("2 9s"), "2 9s")
    }

    func testLobbyStatus() throws {
        XCTAssertEqual(try session(["phase": "Lobby"]).lobbyStatus(.english), "Ready to start.")
        XCTAssertEqual(try session(["phase": "Lobby", "minSeats": 4]).lobbyStatus(.english), "Waiting for players (3/4 needed)…")
        XCTAssertEqual(try session(["phase": "Lobby", "isPublic": true, "hostPlayerId": "p2", "notice": "Ada left the game."]).lobbyStatus(.english),
                       "Ada left the game. Waiting for more players to join, or for Ben to start the game.")
        XCTAssertEqual(try session(["phase": "Lobby", "isPublic": true, "hostPlayerId": "p2", "maxSeats": 3]).lobbyStatus(.english),
                       "Waiting for Ben to start the game.")
        XCTAssertEqual(try session(["phase": "Lobby"]).lobbySeats, [0, 1, 2, 3])
        XCTAssertEqual(try session(["phase": "Lobby", "isPublic": true]).lobbySeats, [0, 1, 2])
    }
}
