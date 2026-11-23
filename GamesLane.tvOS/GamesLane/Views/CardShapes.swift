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
        "A": "M14 74C19 50 25 26 30 6C35 26 41 50 46 74M19 52C26 50 34 50 41 52",
        "2": "M16 24C9 21 10 7 24 4C40 2 52 14 42 30C34 42 16 52 10 70C22 62 32 72 44 68C50 66 50 60 46 61",
        "3": "M16 18C8 16 12 4 28 4C44 4 50 18 42 28C38 32 32 34 26 34C42 34 54 44 50 58C46 74 22 78 12 68C6 62 12 54 18 60",
        "4": "M42 76C42 54 43 28 46 6C34 18 20 34 6 50C18 46 38 50 54 46",
        "5": "M58 8C54 2 46 6 40 8C32 10 24 8 18 8C16 18 14 28 12 36C26 28 50 34 48 54C46 74 20 78 10 68C4 62 10 54 16 60",
        "6": "M50 12C54 6 46 0 36 2C18 6 10 26 10 44C10 64 22 76 34 74C48 72 50 54 40 46C30 38 16 44 14 54",
        "7": "M14 9C24 13 38 8 54 6C42 24 30 46 26 74",
        "8": "M34 40C14 34 10 8 28 4C44 0 50 24 30 40C12 52 12 76 30 74C50 72 52 48 34 40",
        "9": "M46 28C40 42 12 44 12 24C12 6 44 0 46 22C48 46 42 70 22 74C10 76 6 66 14 64",
        "10": "M8 32C11 26 14 20 17 12C17 36 17 56 17 76M39 6C30 6 30 76 39 76C48 76 48 6 39 6Z",
        "J": "M15 14C9 8 17 2 25 6C35 10 49 12 61 6M45 10C47 32 47 56 35 70C25 80 7 74 11 62C13 56 21 56 21 62",
        "Q": "M30 6C10 8 6 44 14 60C24 78 50 72 52 44C54 18 42 4 30 6ZM26 56C34 60 38 70 46 76",
        "K": "M18 6C16 26 16 52 14 72C12 80 4 76 6 70M54 6C58 2 52 0 48 6C38 18 28 34 18 44C30 46 34 60 42 72",
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
