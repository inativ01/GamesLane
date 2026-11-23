import SwiftUI

/// A playing card such as "10♥" in the new GamesLane style (`cardElement` in common.js): rank and suit in block letters
/// in the top left and bottom right corners, the suit's faint silhouette with the rank drawn as a road in the middle,
/// all in the suit's color. "JOKER" is the joker; nil is a face-down card. Everything is sized from `size`, the card's
/// font size (the card is 2.6 × 3.9 of it).
struct CardView: View {
    let text: String?
    var size: CGFloat = 30

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 0.3 * size)
        ZStack {
            if let text {
                shape.fill(LinearGradient(stops: [.init(color: .white, location: 0.6), .init(color: Color(hex: 0xF3EEE6), location: 1)],
                                          startPoint: UnitPoint(x: 0.33, y: 0), endPoint: UnitPoint(x: 0.67, y: 1)))
                if text == "JOKER" {
                    joker
                } else {
                    face(text)
                }
            } else {
                Image("CardBack").resizable().scaledToFill()
            }
        }
        .frame(width: 2.6 * size, height: 3.9 * size)
        .clipShape(shape)
        .overlay(shape.stroke(.black.opacity(text == nil ? 0 : 0.1), lineWidth: 1))
        .shadow(color: .black.opacity(0.3), radius: 2.5, y: 2)
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityLabel(text ?? "")
    }

    private func face(_ text: String) -> some View {
        let suit = text.last ?? " "
        let rank = String(text.dropLast())
        let color = CardShapes.suitColors[suit] ?? CardShapes.ink
        return ZStack {
            if CardShapes.suit(suit) != nil {
                SuitShape(suit: suit).fill(color.opacity(0.2)).frame(width: 2.5 * size, height: 2.5 * size)
            }
            if let road = CardShapes.roadRanks[rank] {
                RoadView(data: road, color: color, width: 1.8 * size)
            } else {
                Text(rank).font(.system(size: 1.4 * size, weight: .black)).foregroundStyle(color)
            }
            corner(rank, suit, color)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(0.2 * size)
            corner(rank, suit, color)
                .rotationEffect(.degrees(180))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(0.2 * size)
        }
    }

    private func corner(_ rank: String, _ suit: Character, _ color: Color) -> some View {
        let font = 0.6 * size
        return VStack(spacing: 0.06 * font) {
            Text(rank)
                .font(.system(size: font, weight: .black))
                .kerning(-0.06 * font)
            if CardShapes.suit(suit) != nil {
                SuitShape(suit: suit).frame(width: 0.8 * font, height: 0.8 * font)
            } else {
                Text(String(suit)).font(.system(size: 0.8 * font, weight: .black))
            }
        }
        .foregroundStyle(color)
        .fixedSize()
    }

    // A faint octagon in the four suit colors with the GamesLane logo on it, and JOKER written downwards in the top left
    // and (upside down) bottom right corners, each letter in a suit color in turn.
    private var joker: some View {
        ZStack {
            Octagon().opacity(0.28).frame(width: 2.6 * size, height: 2.6 * size)
            Image("Logo").resizable().scaledToFit().frame(width: 2.15 * size, height: 2.15 * size)
            jokerWord
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.top, 0.22 * size).padding(.leading, 0.2 * size)
            jokerWord
                .rotationEffect(.degrees(180))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(.bottom, 0.22 * size).padding(.trailing, 0.2 * size)
        }
    }

    private var jokerWord: some View {
        let colors: [Color] = [Color(hex: 0xD62828), Color(hex: 0x23913A), Color(hex: 0xE5A400), Color(hex: 0x1D5BD6)]
        return VStack(spacing: -0.05 * 0.34 * size) {
            ForEach(Array("JOKER".enumerated()), id: \.offset) { index, letter in
                Text(String(letter))
                    .font(.system(size: 0.34 * size, weight: .black))
                    .foregroundStyle(colors[index % 4])
            }
        }
        .fixedSize()
    }
}

/// Eight slices from the middle in the four suit colors in turn (the joker's silhouette).
struct Octagon: View {
    var body: some View {
        Canvas { context, size in
            let colors: [Color] = [Color(hex: 0xD62828), Color(hex: 0x23913A), Color(hex: 0xE5A400), Color(hex: 0x1D5BD6)]
            let scale = min(size.width, size.height) / 100
            func corner(_ i: Int) -> CGPoint {
                let angle = (22.5 + 45 * Double(i)) * .pi / 180
                return CGPoint(x: (50 + 48 * cos(angle)) * scale, y: (50 + 48 * sin(angle)) * scale)
            }
            for i in 0..<8 {
                var slice = Path()
                slice.move(to: CGPoint(x: 50 * scale, y: 50 * scale))
                slice.addLine(to: corner(i))
                slice.addLine(to: corner(i + 1))
                slice.closeSubpath()
                context.fill(slice, with: .color(colors[i % 4]))
            }
        }
    }
}

/// A shared slot: one card, or the 2 or 3 cards that replaced a joker, stacked in one column in a gold frame, each
/// covering the one before it except its top, at a slight angle.
struct CardSlotView: View {
    let cards: [String]?
    var size: CGFloat = 30

    var body: some View {
        if let cards, cards.count > 1 {
            VStack(spacing: -2.4 * size) {
                ForEach(Array(cards.enumerated()), id: \.offset) { index, card in
                    CardView(text: card, size: size).rotationEffect(.degrees(index == 0 ? 0 : index == 1 ? 5 : -5))
                }
            }
            .padding(0.15 * size)
            .background(Theme.gold.opacity(0.25), in: RoundedRectangle(cornerRadius: 0.4 * size))
            .overlay(RoundedRectangle(cornerRadius: 0.4 * size).stroke(Theme.gold, lineWidth: 2))
        } else {
            CardView(text: cards?.first, size: size)
        }
    }
}
