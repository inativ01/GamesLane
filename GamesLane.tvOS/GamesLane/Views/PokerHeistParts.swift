import SwiftUI

/// A chip of a stage (white, yellow, orange, red) with its number (or "?" for one removed by Blackout); a chip that no
/// longer counts is faded and crossed out in red.
struct ChipView: View {
    static let colors: [(Color, Color)] = [
        (Color(hex: 0xFBFAF7), Theme.ink),
        (Color(hex: 0xF2CF4A), Theme.ink),
        (Color(hex: 0xEC8A2C), Theme.ink),
        (Color(hex: 0xB3261E), .white),
    ]

    let stage: Int
    let label: String
    var size: CGFloat = 26
    var void = false

    var body: some View {
        let (background, ink) = Self.colors[min(max(stage, 0), 3)]
        Text(label)
            .font(.system(size: size, weight: .heavy))
            .foregroundStyle(ink)
            .frame(width: 2.1 * size, height: 2.1 * size)
            .background(background, in: Circle())
            .overlay(Circle().strokeBorder(.black.opacity(0.28), style: StrokeStyle(lineWidth: 3, dash: [6, 4])))
            .overlay {
                if void {
                    Capsule().fill(Color(hex: 0xD32F2F)).frame(width: 2.4 * size, height: 0.18 * size).rotationEffect(.degrees(-45))
                }
            }
            .opacity(void ? 0.6 : 1)
            .environment(\.layoutDirection, .leftToRight)
    }
}

/// Every playing seat's chips from all stages, with 👍 for the players ready in the current stage, what the heist's
/// cards did to each player, and the group decisions under way above it. Skipped stages are struck out.
struct ChipTableView: View {
    let heist: PokerHeistTexts
    let server: URL

    var body: some View {
        let game = heist.game
        let texts = heist.texts
        VStack(alignment: .leading, spacing: 14) {
            ForEach(heist.notes, id: \.self) { note in
                Text(note).font(.system(size: 24, weight: .semibold)).foregroundStyle(Theme.primaryDark)
            }
            Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 12) {
                GridRow {
                    Text(texts.t("Player"))
                    ForEach(0..<4, id: \.self) { stage in
                        Text(texts.t(PokerHeistTexts.stages[stage]))
                            .strikethrough(game.skippedStages.contains(stage))
                            .foregroundStyle(game.skippedStages.contains(stage) ? Theme.muted : Theme.ink)
                            .gridColumnAlignment(.center)
                    }
                }
                .font(.system(size: 24, weight: .bold))
                Divider().gridCellUnsizedAxes(.horizontal)
                ForEach(game.playingSeats, id: \.self) { seat in
                    GridRow(alignment: .center) {
                        player(seat)
                        ForEach(0..<4, id: \.self) { stage in
                            cell(stage, seat)
                        }
                    }
                }
            }
            .padding(20)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.line, lineWidth: 2))
        }
    }

    private func player(_ seat: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                Text(String(heist.playerNumber(seat)))
                    .font(.system(size: 20, weight: .heavy))
                    .frame(width: 34, height: 34)
                    .background(Theme.ink, in: Circle())
                    .foregroundStyle(Theme.background)
                SeatLabel(seat: heist.state.seat(seat), fallback: heist.seatName(seat), texts: heist.texts, server: server, size: 36)
                    .font(.system(size: 26, weight: .semibold))
                let joker = heist.jokerMark(seat)
                if !joker.isEmpty {
                    Text(joker).font(.system(size: 22))
                }
            }
            ForEach(Array(heist.facts(seat).enumerated()), id: \.offset) { _, fact in
                HStack(spacing: 8) {
                    Text(fact.text)
                    if let passed = fact.passed {
                        Text(heist.texts.t(passed ? "PASS" : "FAIL"))
                            .font(.system(size: 16, weight: .heavy))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(passed ? Theme.green : Theme.red, in: Capsule())
                            .foregroundStyle(.white)
                    }
                }
                .font(.system(size: 19))
                .foregroundStyle(Theme.muted)
            }
        }
        .frame(width: 400, alignment: .leading)
    }

    @ViewBuilder
    private func cell(_ stage: Int, _ seat: Int) -> some View {
        let game = heist.game
        let ready = stage == game.stage && game.phase == "Betting" && game.readySeats.contains(seat)
        HStack(spacing: 4) {
            switch heist.cell(stage, seat) {
            case .chip(let number, let void):
                ChipView(stage: stage, label: String(number), size: 20, void: void)
                    .transition(.scale.combined(with: .opacity))
            case .removed:
                ChipView(stage: stage, label: "?", size: 20)
            case .dash:
                Text("–").font(.system(size: 26)).foregroundStyle(Theme.muted)
            case .empty:
                Color.clear.frame(width: 42, height: 42)
            }
            if ready {
                Text("👍").font(.system(size: 22))
            }
        }
        .frame(minWidth: 90)
    }
}
