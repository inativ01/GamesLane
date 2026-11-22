import SwiftUI

/// SVG path data (the `d` of the cards' shapes and roads in common.js) as a SwiftUI path, in the SVG's own units:
/// the commands M, L, H, V, C and Z, absolute or relative, with implicit repeats.
enum SVGPath {
    static func path(_ data: String) -> Path {
        var path = Path()
        var tokens = tokenize(data)[...]
        var command: Character = "M"
        var current = CGPoint.zero
        var start = CGPoint.zero
        func number() -> CGFloat {
            guard case .number(let value)? = tokens.first else {
                return 0
            }
            tokens.removeFirst()
            return value
        }
        func point(_ relative: Bool) -> CGPoint {
            let x = number(), y = number()
            return relative ? CGPoint(x: current.x + x, y: current.y + y) : CGPoint(x: x, y: y)
        }
        while let token = tokens.first {
            if case .command(let c) = token {
                command = c
                tokens.removeFirst()
                if c == "Z" || c == "z" {
                    path.closeSubpath()
                    current = start
                    continue
                }
            }
            let relative = command.isLowercase
            switch command.uppercased() {
            case "M":
                current = point(relative)
                start = current
                path.move(to: current)
                // Further pairs after a move are lines.
                command = relative ? "l" : "L"
            case "L":
                current = point(relative)
                path.addLine(to: current)
            case "H":
                current.x = relative ? current.x + number() : number()
                path.addLine(to: current)
            case "V":
                current.y = relative ? current.y + number() : number()
                path.addLine(to: current)
            case "C":
                let c1 = point(relative), c2 = point(relative), end = point(relative)
                path.addCurve(to: end, control1: c1, control2: c2)
                current = end
            default:
                // An unsupported command: skip its numbers.
                while case .number? = tokens.first {
                    tokens.removeFirst()
                }
            }
        }
        return path
    }

    enum Token: Equatable {
        case command(Character)
        case number(CGFloat)
    }

    static func tokenize(_ data: String) -> [Token] {
        var tokens: [Token] = []
        var number = ""
        func flush() {
            if let value = Double(number) {
                tokens.append(.number(CGFloat(value)))
            }
            number = ""
        }
        for character in data {
            if character.isLetter && character != "e" {
                flush()
                tokens.append(.command(character))
            } else if character == "-" {
                flush()
                number = "-"
            } else if character == "." && number.contains(".") {
                flush()
                number = "."
            } else if character.isNumber || character == "." {
                number.append(character)
            } else {
                flush()
            }
        }
        flush()
        return tokens
    }
}

/// A shape drawn from SVG path data in a `viewBox` (x, y, width, height), scaled to fill its frame.
struct SVGShape: Shape {
    let data: String
    let viewBox: CGRect

    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width / viewBox.width, rect.height / viewBox.height)
        let transform = CGAffineTransform(translationX: rect.midX, y: rect.midY)
            .scaledBy(x: scale, y: scale)
            .translatedBy(x: -viewBox.midX, y: -viewBox.midY)
        return SVGPath.path(data).applying(transform)
    }
}
