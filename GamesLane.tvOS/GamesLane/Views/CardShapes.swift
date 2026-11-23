import SwiftUI

/// The shapes of the GamesLane cards, from common.js: the suits in a 100 × 100 box (`SUIT_SHAPES`), and the ranks as
/// script roads in a 60 × 80 box (`ROAD_RANKS`).
enum CardShapes {
    static let suitColors: [Character: Color] = [
        "♥": Color(hex: 0xD62828),
        "♣": Color(hex: 0x23913A),
        "♦": Color(hex: 0xE5A400),
        "♠": Color(hex: 0x1D5BD6),
    ]

    static let ink = Color(hex: 0x1D1A17)

    static let roadRanks: [String: String] = [
        "A": "M1 68C2 76 8 76 11 70C21 50 32 24 42 6C41 28 43 52 46 74M19 48C28 44 40 46 49 42",
        "2": "M19 24C13 26 10 18 18 12C25 6 33 4 41 6C52 8 54 22 43 34C33 46 16 58 4 72C19 66 28 71 39 68",
        "3": "M20 20C14 20 16 12 21 9C29 4 42 2 48 12C52 22 39 34 27 36C41 36 51 46 44 60C37 74 14 78 4 68C1 64 4 58 10 60",
        "4": "M27 76C30 78 34 74 34 68C37 54 43 30 51 6C36 22 18 38 4 52C18 50 36 50 52 48",
        "5": "M60 10C63 4 57 4 53 6C44 8 34 8 26 8C22 18 18 28 14 38C30 30 49 34 46 52C42 70 20 78 6 70C1 66 4 60 10 62",
        "6": "M49 14C54 12 55 6 49 5C40 2 26 8 20 18C12 32 8 52 11 64C15 76 35 76 42 62C48 48 38 40 28 42C17 44 12 52 10 58",
        "7": "M16 12C23 6 28 12 36 10C44 8 52 8 61 6C45 24 28 48 18 70C14 78 6 78 8 72",
        "8": "M34 40C15 34 16 8 35 4C52 0 53 24 30 40C10 52 5 76 23 74C44 72 50 48 34 40",
        "9": "M48 22C48 8 29 4 21 16C12 28 18 40 30 38C41 36 46 28 48 22C45 44 35 66 15 74C7 77 2 72 7 66",
        "10": "M7 30C6 26 10 22 12 24C16 20 21 12 24 6C18 30 12 54 7 76M48 6C40 6 32 28 30 42C26 60 27 76 34 76C41 76 47 58 51 40C55 22 55 6 48 6Z",
        "J": "M28 12C25 6 34 2 39 6C44 9 53 4 54 8C48 32 38 58 26 70C16 80 3 76 3 64C4 58 11 56 12 60",
        "Q": "M37 6C21 6 10 28 8 42C4 60 12 72 24 72C38 72 49 56 52 40C56 22 51 6 37 6ZM16 58C23 56 26 62 28 68C31 74 37 76 45 74",
        "K": "M28 6C23 28 17 52 10 70C6 78 -1 78 1 72M63 10C66 4 61 2 58 6C47 20 32 34 18 44C30 44 36 56 42 74",
    ]

    /// The road's box: the ranks' 60 × 80 box with room for the road's width.
    static let roadBox = CGRect(x: -6, y: -6, width: 72, height: 92)

    /// A suit's shape in its 100 × 100 box, or nil for a suit without one (e.g. Poker Heist's suitless "★").
    static func suit(_ suit: Character) -> Path? {
        switch suit {
        case "♥":
            return SVGPath.path("M50 92C22 70 4 52 4 31C4 15 16 5 30 5C40 5 47 11 50 19C53 11 60 5 70 5C84 5 96 15 96 31C96 52 78 70 50 92Z")
        case "♦":
            return SVGPath.path("M50 3L88 50L50 97L12 50Z")
        case "♠":
            return SVGPath.path("M50 3C34 28 6 42 6 64C6 78 17 86 29 86C37 86 44 82 47 75L40 97H60L53 75C56 82 63 86 71 86C83 86 94 78 94 64C94 42 66 28 50 3Z")
        case "♣":
            var path = SVGPath.path("M46 52H54L62 96H38Z")
            for (x, y, r) in [(50.0, 29.0, 21.0), (27, 60, 21), (73, 60, 21), (50, 52, 14)] {
                path.addEllipse(in: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
            }
            return path
        default:
            return nil
        }
    }
}

/// A suit's shape scaled to its frame, filled in the current color.
struct SuitShape: Shape {
    let suit: Character

    func path(in rect: CGRect) -> Path {
        guard let path = CardShapes.suit(suit) else {
            return Path()
        }
        let scale = min(rect.width, rect.height) / 100
        return path.applying(CGAffineTransform(translationX: rect.midX - 50 * scale, y: rect.midY - 50 * scale).scaledBy(x: scale, y: scale))
    }
}

/// A rank drawn as a road (see `roadRank` in common.js): a dark kerb, a rim in the suit's color, black asphalt and a
/// dashed yellow centre line, sized to `width` (the road's box is 72 × 92).
struct RoadView: View {
    let data: String
    let color: Color
    let width: CGFloat

    var body: some View {
        let scale = width / CardShapes.roadBox.width
        let shape = SVGShape(data: data, viewBox: CardShapes.roadBox)
        ZStack {
            shape.stroke(Color(hex: 0x3A2A10), style: StrokeStyle(lineWidth: 14 * scale, lineCap: .round, lineJoin: .round))
            shape.stroke(color, style: StrokeStyle(lineWidth: 12 * scale, lineCap: .round, lineJoin: .round))
            shape.stroke(Color(hex: 0x1B1B1B), style: StrokeStyle(lineWidth: 7.5 * scale, lineCap: .round, lineJoin: .round))
            shape.stroke(Color(hex: 0xF5C518), style: StrokeStyle(lineWidth: 1.2 * scale, lineCap: .butt, dash: [3 * scale, 2.6 * scale]))
        }
        .frame(width: width, height: width * CardShapes.roadBox.height / CardShapes.roadBox.width)
        .shadow(color: .black.opacity(0.4), radius: 0.04 * width / 1.8, y: 0.03 * width / 1.8)
    }
}
