import Foundation

/// What the Poker Heist screen says, as an observer sees it on the page (`poker-heist.js` is the reference): the
/// status, what the heist's cards did to each player, the notes under the chip table, and which cards are not used.
struct PokerHeistTexts {
    static let stages = ["White", "Yellow", "Orange", "Red"]
    static let toFinish = 3

    /// A line about a player, starting with the card's name; `passed` gives a scan's PASS or FAIL badge.
    struct Fact: Equatable {
        let text: String
        let passed: Bool?
    }

    let game: PokerHeistState
    let state: SessionState
    let texts: Texts

    /// A playing seat's player number (1 to 8), in seat order.
    func playerNumber(_ seat: Int) -> Int {
        (game.playingSeats.firstIndex(of: seat) ?? -1) + 1
    }

    func seatName(_ seat: Int) -> String {
        state.name(seat) ?? texts.t("Player {n}", ["n": playerNumber(seat)])
    }

    /// The names of the different users holding these seats, in seat order (each user votes once).
    func userNames(_ seats: [Int]) -> [String] {
        var seen = Set<String>()
        return seats.compactMap { state.seat($0) }.filter { seen.insert($0.playerId).inserted }.map(\.name)
    }

    var awaitsScan: Bool {
        game.decisions.contains { $0.isOpen && ($0.choice == "Rank" || $0.choice == "Ranking") }
    }

    var awaitsRedraw: Bool { game.redrawnSeat != nil && !game.redrawConfirmed }

    var blackout: Bool { game.cards.contains { $0.key == "blackout" } }

    var status: String {
        switch game.phase {
        case "Preparing":
            let waiting = userNames(game.playingSeats.filter { !game.preparedSeats.contains($0) })
            let step = ["jokers": "Jokers: swap your jokers", "coordinator": "Coordinator: pass on a card"][game.preparingCard ?? ""]
                ?? "Con Artist: look at your cards"
            return "\(texts.t(step)) · \(texts.t("Waiting for {name}", ["name": waiting.joined(separator: ", ")]))"
        case "Betting":
            let stage = texts.t("\(Self.stages[min(max(game.stage, 0), 3)]) chips")
            guard awaitsRedraw, let seat = game.redrawnSeat else {
                return stage
            }
            return "\(stage) · \(texts.t("Waiting for {name} to confirm new cards", ["name": state.name(seat) ?? ""]))"
        case "Reveal":
            return awaitsScan
                ? "🔍 \(texts.t("Agree on the guess before the strongest hand is revealed"))"
                : "🃏 \(texts.t("Revealing, lowest red chip first…"))"
        default:
            if game.vaults >= Self.toFinish {
                return "🎉 \(texts.t("Three vaults: the crew wins!"))"
            }
            if game.alarms >= Self.toFinish {
                return "🚨 \(texts.t("Three alarms: game over"))"
            }
            return game.succeeded == true ? "💰 \(texts.t("The vault is open!"))" : "🚨 \(texts.t("The alarm went off!"))"
        }
    }

    /// Motion Detector if the first 3 shared cards include a J, Q or K, otherwise Laser Tripwires.
    var redrawCardName: String {
        let hasFace = game.communityCards.prefix(3).joined().contains { ["J", "Q", "K"].contains($0.first.map(String.init) ?? "") }
        return hasFace ? "Motion Detector" : "Laser Tripwires"
    }

    /// Whether the white chip of `seat` no longer counts (it got new pocket cards).
    func isVoidChip(_ stage: Int, _ seat: Int) -> Bool {
        stage == 0 && seat == game.redrawnSeat
    }

    func hasMuscle(_ seat: Int) -> Bool {
        game.decisions.contains { $0.card == "muscle" && $0.isDone && $0.seat == seat }
    }

    /// Whether a card is not used (yet) in this heist (see `isUnused` in poker-heist.js).
    func isUnused(_ card: PokerHeistState.Card) -> Bool {
        if card.key == "motion-detector" || card.key == "laser-tripwires" {
            let decided = game.communityCards.count >= 3 || game.cards.contains { $0.key == "quick-access" }
            return decided && !(game.redrawnSeat != nil && redrawCardName == card.name)
        }
        guard let decision = game.decisions.first(where: { $0.card == card.key }) else {
            return false
        }
        return card.kind == "Specialist" ? !decision.isDone : decision.isSkipped
    }

    /// A card's name in the language.
    func cardName(_ key: String) -> String {
        texts.server(game.cards.first { $0.key == key }?.name ?? key)
    }

    /// Mastermind's result, e.g. "no Ks", "one K" or "2 Ks", in the language.
    func countText(_ text: String) -> String {
        let parts = text.split(separator: " ", maxSplits: 1).map(String.init)
        if parts.count == 2, parts[0] == "no", parts[1].hasSuffix("s") {
            return texts.t("no {value}s", ["value": String(parts[1].dropLast())])
        }
        if parts.count == 2, parts[0] == "one" {
            return texts.t("one {value}", ["value": parts[1]])
        }
        if parts.count == 2, Int(parts[0]) != nil, parts[1].hasSuffix("s") {
            return texts.t("{n} {value}s", ["n": parts[0], "value": String(parts[1].dropLast())])
        }
        return texts.server(text)
    }
}
