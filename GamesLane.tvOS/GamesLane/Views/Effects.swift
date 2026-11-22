import SwiftUI

/// Confetti over the screen for about 5 seconds each time `trigger` changes (see `celebrate` in common.js): 140
/// pieces in the logo's colors falling from the top, drifting and spinning.
struct ConfettiView: View {
    let trigger: Int

    private struct Piece {
        let x: Double
        let drift: Double
        let spin: Double
        let delay: Double
        let duration: Double
        let color: Color
    }

    private static let colors: [Color] = [0xE6A93C, 0xC2561A, 0x2F7D45, 0x3F6FD8, 0xC0281B, 0x8A4FD8, 0xF4EFE6].map { Color(hex: $0) }
    @State private var pieces: [Piece] = []
    @State private var started = Date.distantPast

    var body: some View {
        TimelineView(.animation(paused: pieces.isEmpty)) { timeline in
            Canvas { context, size in
                let elapsed = timeline.date.timeIntervalSince(started)
                for piece in pieces {
                    let progress = (elapsed - piece.delay) / piece.duration
                    guard progress > 0, progress < 1 else {
                        continue
                    }
                    let x = (piece.x + piece.drift * progress) * size.width
                    let y = -20 + (size.height + 40) * progress
                    var pieceContext = context
                    pieceContext.translateBy(x: x, y: y)
                    pieceContext.rotate(by: .degrees(piece.spin * progress))
                    pieceContext.fill(Path(CGRect(x: -7, y: -11, width: 14, height: 22)), with: .color(piece.color))
                }
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
        .onChange(of: trigger) {
            started = Date()
            pieces = (0..<140).map { i in
                Piece(x: .random(in: 0...1), drift: .random(in: -0.2...0.2), spin: .random(in: -720...720),
                      delay: .random(in: 0...0.8), duration: 2.4 + .random(in: 0...1.8), color: Self.colors[i % Self.colors.count])
            }
            Task {
                try? await Task.sleep(for: .seconds(5.2))
                if Date().timeIntervalSince(started) >= 5.1 {
                    pieces = []
                }
            }
        }
    }
}

/// Card backs riffled together in the middle of the screen for about 2 seconds each time `trigger` changes (see
/// `showShuffle` in common.js).
struct ShuffleView: View {
    let trigger: Int
    @State private var shown = false
    @State private var together = false

    var body: some View {
        ZStack {
            if shown {
                ForEach(0..<12, id: \.self) { i in
                    let side: CGFloat = i.isMultiple(of: 2) ? -1 : 1
                    CardView(text: nil, size: 50)
                        .rotationEffect(.degrees(together ? 0 : Double(side) * 12))
                        .offset(x: together ? side * 4 : side * 170, y: CGFloat(i / 2) * -3)
                        .animation(.easeInOut(duration: 0.35).delay(Double(i / 2) * 0.12), value: together)
                }
                .transition(.opacity)
            }
        }
        .allowsHitTesting(false)
        .onChange(of: trigger) {
            together = false
            withAnimation { shown = true }
            Task {
                try? await Task.sleep(for: .milliseconds(100))
                together = true
                try? await Task.sleep(for: .seconds(2.2))
                withAnimation { shown = false }
            }
        }
    }
}
