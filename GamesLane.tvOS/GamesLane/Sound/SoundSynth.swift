import Foundation

/// Builds sounds as samples, the way common.js builds them with the browser's Web Audio: `tone` plays a note and
/// `noise` a burst of filtered noise, each with the same volume envelope as there. The TV cannot decode the site's
/// recorded sounds (Ogg Vorbis), so it uses these, as a browser that cannot decode them does.
struct SoundSynth {
    enum Wave {
        case sine, triangle, square, sawtooth
    }

    enum Filter {
        case bandpass, lowpass
    }

    static let sampleRate = 44_100.0
    private(set) var samples: [Float] = []
    private var random = SystemRandomNumberGenerator()

    /// A note of `frequency` at `at` seconds for `length` seconds, gliding to `to` if given: up to `volume` in 10 ms,
    /// then fading out exponentially.
    mutating func tone(_ at: Double, _ frequency: Double, _ length: Double, volume: Double = 0.2, wave: Wave = .sine, to: Double? = nil) {
        let start = Int(at * Self.sampleRate)
        let count = Int((length + 0.02) * Self.sampleRate)
        grow(start + count)
        var phase = 0.0
        for i in 0..<count {
            let time = Double(i) / Self.sampleRate
            let f = to.map { frequency * pow($0 / frequency, min(time / length, 1)) } ?? frequency
            phase += f / Self.sampleRate
            let p = phase - floor(phase)
            let value: Double = switch wave {
            case .sine: sin(2 * .pi * p)
            case .triangle: 1 - 4 * abs(p - 0.5)
            case .square: p < 0.5 ? 1 : -1
            case .sawtooth: 2 * p - 1
            }
            let gain = time < 0.01 ? ramp(0.0001, volume, time / 0.01) : time < length ? ramp(volume, 0.0001, (time - 0.01) / (length - 0.01)) : 0
            samples[start + i] += Float(value * gain)
        }
    }

    /// A burst of white noise through a band-pass or low-pass filter at `frequency`, starting at `volume` and fading
    /// out exponentially over `length` seconds.
    mutating func noise(_ at: Double, _ length: Double, volume: Double = 0.3, filter: Filter = .bandpass, frequency: Double = 2000, q: Double = 1) {
        let start = Int(at * Self.sampleRate)
        let count = Int((length + 0.02) * Self.sampleRate)
        grow(start + count)
        let w = 2 * .pi * frequency / Self.sampleRate
        // Web Audio's low-pass Q is in decibels; its band-pass Q is the plain quality factor (RBJ's cookbook filters).
        let quality = filter == .lowpass ? pow(10, q / 20) : max(q, 0.0001)
        let alpha = sin(w) / (2 * quality)
        let (b0, b1, b2): (Double, Double, Double) = filter == .bandpass
            ? (alpha, 0, -alpha)
            : ((1 - cos(w)) / 2, 1 - cos(w), (1 - cos(w)) / 2)
        let a0 = 1 + alpha, a1 = -2 * cos(w), a2 = 1 - alpha
        var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
        for i in 0..<count {
            let time = Double(i) / Self.sampleRate
            let x = Double.random(in: -1...1, using: &random)
            let y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
            (x2, x1, y2, y1) = (x1, x, y1, y)
            let gain = time < length ? ramp(volume, 0.0001, time / length) : 0
            samples[start + i] += Float(y * gain)
        }
    }

    private mutating func grow(_ count: Int) {
        if samples.count < count {
            samples += Array(repeating: 0, count: count - samples.count)
        }
    }

    // An exponential ramp from `from` to `to`, `progress` (0 to 1) of the way.
    private func ramp(_ from: Double, _ to: Double, _ progress: Double) -> Double {
        from * pow(to / from, min(max(progress, 0), 1))
    }
}
