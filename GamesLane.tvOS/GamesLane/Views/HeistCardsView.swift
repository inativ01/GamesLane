import SwiftUI

/// The heist's challenge (red) and specialist (green) cards, as small cards lying on the table: the picture, the kind,
/// the name and what the card does. Cards added for this heist are marked "New"; cards not used (yet) are faded.
struct HeistCardsView: View {
    let heist: PokerHeistTexts

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 18), GridItem(.flexible(), spacing: 18)], alignment: .leading, spacing: 18) {
            ForEach(Array(heist.game.cards.enumerated()), id: \.element.key) { index, card in
                item(card)
                    .rotationEffect(.degrees(index.isMultiple(of: 2) ? -1 : 1))
            }
        }
    }

    private func item(_ card: PokerHeistState.Card) -> some View {
        let texts = heist.texts
        let specialist = card.kind == "Specialist"
        let color = specialist ? Theme.green : Theme.red
        return HStack(alignment: .top, spacing: 14) {
            Image("PokerHeist/\(card.key)")
                .resizable()
                .scaledToFit()
                .padding(6)
                .frame(width: 84, height: 84)
                .background(specialist ? Color(hex: 0xE6F3E9) : Color(hex: 0xFBE9E6), in: RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    badge(texts.t(specialist ? "Specialist" : "Challenge"), background: color, ink: .white)
                    if heist.game.newCards.contains(card.key) {
                        badge(texts.t("New"), background: Theme.gold, ink: .black)
                    }
                }
                Text(texts.server(card.name))
                    .font(.system(size: 24, weight: .bold))
                Text(texts.server(card.text))
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(stops: [.init(color: .white, location: 0.55), .init(color: Color(hex: 0xF6EFE3), location: 1)],
                                   startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).inset(by: 1.5).stroke(color, lineWidth: 3))
        .shadow(color: .black.opacity(0.3), radius: 4, y: 3)
        .opacity(heist.isUnused(card) ? 0.45 : 1)
    }

    private func badge(_ text: String, background: Color, ink: Color) -> some View {
        Text(text.uppercased())
            .font(.system(size: 14, weight: .heavy))
            .kerning(0.8)
            .padding(.horizontal, 10)
            .padding(.vertical, 3)
            .background(background, in: Capsule())
            .foregroundStyle(ink)
    }
}
