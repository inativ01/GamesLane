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
        "A": "M4 74C19 50 33 22 42 6C41 28 43 52 46 74M17 48C28 44 40 46 49 42",
        "2": "M16 22C20 10 31 4 41 6C52 8 54 22 43 34C33 46 16 58 4 72C19 66 28 71 39 68",
        "3": "M17 16C25 6 42 2 48 12C52 22 39 34 27 36C41 36 51 46 44 60C37 74 14 78 4 68",
        "4": "M33 76C37 56 43 30 51 6C36 22 18 38 4 52C18 50 36 50 52 48",
        "5": "M57 6C46 8 34 8 26 8C22 18 18 28 14 38C30 30 49 34 46 52C42 70 20 78 6 70",
        "6": "M52 10C46 2 29 4 20 18C12 32 8 52 11 64C15 76 35 76 42 62C48 48 38 40 28 42C17 44 12 52 10 58",
        "7": "M14 10C26 8 46 8 61 6C45 24 28 48 17 74",
        "8": "M34 40C15 34 16 8 35 4C52 0 53 24 30 40C10 52 5 76 23 74C44 72 50 48 34 40",
        "9": "M48 22C48 8 29 4 21 16C12 28 18 40 30 38C41 36 46 28 48 22C45 44 35 66 15 74",
        "10": "M11 26C16 20 21 12 24 6C18 30 12 54 7 76M48 6C40 6 32 28 30 42C26 60 27 76 34 76C41 76 47 58 51 40C55 22 55 6 48 6Z",
        "J": "M32 10C41 4 53 4 54 8C48 32 38 58 26 70C16 80 3 76 3 64",
        "Q": "M37 6C21 6 10 28 8 42C4 60 12 72 24 72C38 72 49 56 52 40C56 22 51 6 37 6ZM20 60C27 64 34 72 45 76",
        "K": "M25 6C20 28 14 52 5 74M57 6C44 20 29 34 15 44C27 44 33 56 39 74",
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
