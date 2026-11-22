import Foundation

extension PokerHeistTexts {
    /// What the heist's cards did to or showed about one player, one line each starting with the card's name (see
    /// `playerFacts` in poker-heist.js).
    func facts(_ seat: Int) -> [Fact] {
        var facts: [Fact] = []
        func fact(_ text: String, _ passed: Bool? = nil) {
            facts.append(Fact(text: text, passed: passed))
        }
        if game.redrawnSeat == seat {
            fact("\(texts.server(redrawCardName)): \(texts.t("new pocket cards were dealt"))")
        }
        for announcement in game.announcements where announcement.seat == seat {
            fact("\(cardName(announcement.card)): \(texts.server(announcement.text))")
        }
        let discarding = game.pendingSeat == seat && game.pendingStep == "Discard"
        for decision in game.decisions where decision.isDone {
            let name = cardName(decision.card)
            switch decision.card {
            case "informant":
                if decision.seat == seat {
                    let shown = game.shownFromSeat == nil
                        ? texts.t("choosing a card to show")
                        : texts.t("showed a card to {name}", ["name": game.shownToSeat.map(seatName) ?? ""])
                    fact("\(name): \(shown)")
                }
            case "hacker":
                if decision.seat == seat {
                    fact("\(name): \(texts.t(discarding ? "drew a card, choosing one to discard" : "drew a card and discarded one"))")
                }
            case "jack":
                if decision.seat == seat {
                    fact("\(name): \(texts.t(discarding ? "got the Jack card, choosing one to discard" : "got the Jack card and discarded one"))")
                }
            case "muscle":
                if decision.seat == seat {
                    fact("\(name): \(texts.t("beats every hand of the same ranking"))")
                }
            default:
                guard let result = game.results.first(where: { $0.card == decision.card }), result.seat == seat else {
                    break
                }
                if let passed = result.passed {
                    fact("\(name): \(texts.t("guessed {value}", ["value": texts.server(decision.value)]))", passed)
                } else {
                    fact("\(name): \(decision.card == "mastermind" ? countText(result.text) : texts.server(result.text))")
                }
            }
        }
        return facts
    }

    /// The lines under the chip table: the group decisions under way.
    var notes: [String] {
        game.decisions.filter { $0.isOpen && ($0.agreed.count > 0 || $0.seat != nil || $0.value != nil) }.map { decision in
            let names = userNames(decision.agreed)
            let line = texts.t("{card}: deciding, {agreed} of {total} agreed", [
                "card": cardName(decision.card),
                "agreed": names.count,
                "total": userNames(decision.voters).count,
            ])
            return names.isEmpty ? line : "\(line) (\(names.joined(separator: ", ")))"
        }
    }

    /// The marks after a player's name for the jokers they swapped (🃏 each), and "…" while they are choosing.
    func jokerMark(_ seat: Int) -> String {
        String(repeating: "🃏", count: game.jokerSwaps.filter { $0 == seat }.count) + (game.jokerSeats.contains(seat) ? "…" : "")
    }

    /// What a chip table cell shows: the chip, a removed chip ("?", Blackout), "–" for a stage under way or over without
    /// a chip, or nothing.
    enum Cell: Equatable {
        case chip(Int, void: Bool)
        case removed
        case dash
        case empty
    }

    func cell(_ stage: Int, _ seat: Int) -> Cell {
        let skipped = game.skippedStages.contains(stage)
        if let chip = game.chip(stage, seat) {
            return .chip(chip, void: isVoidChip(stage, seat))
        }
        if blackout && stage < game.stage && !skipped {
            return .removed
        }
        return !skipped && stage <= game.stage ? .dash : .empty
    }
}
