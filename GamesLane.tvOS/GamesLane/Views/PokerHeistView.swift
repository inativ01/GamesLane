import SwiftUI

/// Poker Heist as observers see it on the page (poker-heist.js): the score, the status, the shared cards, the chips in
/// the middle, the hands revealed so far, the chip table and the heist's cards, scaled down to fit the screen.
struct PokerHeistView: View {
    let game: PokerHeistState
    let state: SessionState
    let texts: Texts
    let server: URL

    var body: some View {
        let heist = PokerHeistTexts(game: game, state: state, texts: texts)
        ZStack {
            Theme.background.ignoresSafeArea()
            FitToScreen {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    Text(heist.status)
                        .font(.system(size: 34, weight: .semibold))
                        .padding(.horizontal, 28)
                        .padding(.vertical, 14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.surfaceSoft, in: RoundedRectangle(cornerRadius: 18))
                    HStack(alignment: .top, spacing: 44) {
                        VStack(alignment: .leading, spacing: 28) {
                            HStack(spacing: 16) {
                                ForEach(0..<5, id: \.self) { i in
                                    CardSlotView(cards: i < game.communityCards.count ? game.communityCards[i] : nil, size: 54)
                                }
                            }
                            if game.phase == "Betting" {
                                middle
                            }
                            if !game.revealed.isEmpty {
                                RevealedHandsView(heist: heist, server: server)
                            }
                        }
                        .frame(width: 820, alignment: .leading)
                        VStack(alignment: .leading, spacing: 24) {
                            ChipTableView(heist: heist, server: server)
                            if !game.cards.isEmpty {
                                HeistCardsView(heist: heist)
                            }
                        }
                        .frame(width: 900, alignment: .leading)
                    }
                }
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 20)
            }
            .animation(.easeInOut(duration: 0.3), value: game)
        }
    }

    private var header: some View {
        HStack(spacing: 24) {
            Image("Games/poker-heist").resizable().scaledToFit().frame(width: 72, height: 72)
            Text(texts.t("Poker Heist")).font(.system(size: 52, weight: .heavy))
            Spacer()
            HStack(spacing: 40) {
                Text("\(texts.t("Heist")) \(game.heist)")
                Text("💰 \(game.vaults)/\(PokerHeistTexts.toFinish)")
                Text("🚨 \(game.alarms)/\(PokerHeistTexts.toFinish)")
            }
            .font(.system(size: 40, weight: .bold).monospacedDigit())
        }
    }

    // The chips not taken yet in the current stage.
    private var middle: some View {
        HStack(spacing: 14) {
            Text(texts.t("Middle:")).font(.system(size: 30, weight: .semibold))
            if game.middleChips.isEmpty {
                Text(texts.t("none")).font(.system(size: 30)).foregroundStyle(Theme.muted)
            }
            ForEach(game.middleChips, id: \.self) { number in
                ChipView(stage: game.stage, label: String(number), size: 28)
            }
        }
    }
}

/// The hands revealed so far, from the lowest red chip: the red chip, the player, the pocket cards and the hand's
/// ranking and five card values; a hand weaker than the one before it is marked, with the first reason in red.
struct RevealedHandsView: View {
    let heist: PokerHeistTexts
    let server: URL

    var body: some View {
        let texts = heist.texts
        VStack(alignment: .leading, spacing: 14) {
            ForEach(heist.game.revealed, id: \.seat) { hand in
                HStack(spacing: 18) {
                    ChipView(stage: 3, label: heist.game.chip(3, hand.seat).map(String.init) ?? "", size: 24)
                    SeatLabel(seat: heist.state.seat(hand.seat), fallback: heist.seatName(hand.seat), texts: texts, server: server, size: 34)
                        .font(.system(size: 26, weight: .semibold))
                        .frame(width: 220, alignment: .leading)
                    HStack(spacing: 6) {
                        ForEach(Array(hand.cards.enumerated()), id: \.offset) { _, card in
                            CardView(text: card, size: 22)
                        }
                    }
                    handName(hand, texts)
                        .font(.system(size: 24, weight: .bold))
                    if heist.hasMuscle(hand.seat) {
                        Text("💪 \(heist.cardName("muscle"))").font(.system(size: 22))
                    }
                }
                .padding(10)
                .background(hand.inOrder ? Theme.surface : Color(hex: 0xFBE9E6), in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(hand.inOrder ? Theme.line : Theme.red, lineWidth: 2))
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    // "Two pair: 9, 9, 5, 5, K", with the first reason the hand is weaker than the one before it in red.
    private func handName(_ hand: PokerHeistState.RevealedHand, _ texts: Texts) -> Text {
        func part(_ text: String, wrong: Bool = false) -> AttributedString {
            var part = AttributedString(text)
            part.foregroundColor = wrong ? Color(hex: 0xD32F2F) : Theme.ink
            return part
        }
        var name = part(texts.server(hand.ranking), wrong: hand.wrongRanking) + part(": ")
        for (index, value) in hand.values.enumerated() {
            name += part(index == 0 ? "" : ", ") + part(value, wrong: hand.wrongValues.contains(index))
        }
        return Text(name)
    }
}

/// Scales its content down, never up, so it fits the space it is given.
struct FitToScreen<Content: View>: View {
    @ViewBuilder let content: Content
    @State private var contentSize = CGSize.zero

    var body: some View {
        GeometryReader { geometry in
            let scale = contentSize.width > 0 && contentSize.height > 0
                ? min(1, geometry.size.width / contentSize.width, geometry.size.height / contentSize.height)
                : 1
            content
                .fixedSize()
                .onGeometryChange(for: CGSize.self) { $0.size } action: { contentSize = $0 }
                .scaleEffect(scale, anchor: .top)
                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .top)
        }
    }
}
