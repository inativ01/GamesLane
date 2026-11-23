import AVFoundation

/// The sounds the TV plays, always on (the TV has no profile): the same notes as `GAME_SOUNDS` and `playFanfare` in
/// common.js, built once and played on an audio engine, several at a time.
@MainActor
final class GameSounds {
    enum Sound: CaseIterable {
        case card, chip, shuffle, fanfare
    }

    static let shared = GameSounds()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var next = 0
    private var buffers: [Sound: AVAudioPCMBuffer] = [:]
    private let format = AVAudioFormat(standardFormatWithSampleRate: SoundSynth.sampleRate, channels: 1)!

    private init() {
        try? AVAudioSession.sharedInstance().setCategory(.ambient)
        for _ in 0..<6 {
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)
            players.append(player)
        }
        for sound in Sound.allCases {
            buffers[sound] = buffer(Self.samples(sound))
        }
    }

    func play(_ sound: Sound) {
        guard let buffer = buffers[sound] else {
            return
        }
        if !engine.isRunning {
            try? engine.start()
        }
        let player = players[next]
        next = (next + 1) % players.count
        player.stop()
        player.scheduleBuffer(buffer)
        player.play()
    }

    /// The sound's samples (see `GAME_SOUNDS` and `playFanfare` in common.js).
    nonisolated static func samples(_ sound: Sound) -> [Float] {
        var synth = SoundSynth()
        switch sound {
        case .card:
            // A card turned: a low, round "tock-tuck".
            synth.tone(0, 440, 0.06, volume: 0.035, to: 220)
            synth.tone(0.06, 330, 0.08, volume: 0.03, to: 165)
        case .chip:
            // A chip taken: a light clink.
            synth.tone(0, 2400, 0.12, volume: 0.1, wave: .triangle)
            synth.tone(0.05, 3200, 0.1, volume: 0.07, wave: .triangle)
        case .shuffle:
            // A riffle: many quick card flicks, then the deck squared with a soft thud.
            for i in 0..<28 {
                synth.noise(Double(i) * 0.032 + Double.random(in: 0...0.01), 0.03, volume: 0.22, frequency: 2800 + Double.random(in: 0...1600), q: 0.8)
            }
            synth.noise(1.0, 0.14, volume: 0.35, filter: .lowpass, frequency: 700)
        case .fanfare:
            // A rising C major arpeggio, its last note held.
            for (frequency, delay, length) in [(523.0, 0.0, 0.18), (659, 0.12, 0.18), (784, 0.24, 0.18), (1047, 0.36, 0.6)] {
                synth.tone(delay, frequency, length, volume: 0.3, wave: .triangle)
            }
        }
        return synth.samples
    }

    private func buffer(_ samples: [Float]) -> AVAudioPCMBuffer? {
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count)),
              let channel = buffer.floatChannelData?[0] else {
            return nil
        }
        buffer.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { channel.update(from: $0.baseAddress!, count: samples.count) }
        return buffer
    }
}
