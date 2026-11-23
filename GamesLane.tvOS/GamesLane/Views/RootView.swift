import SwiftUI

/// The screen for the TV's state: connecting, the pairing code, waiting for the user to open a game, the session lobby,
/// the game, or the splash picture for a game the TV cannot show yet; with confetti and the shuffle on top.
struct RootView: View {
    let model: TvModel

    var body: some View {
        let texts = model.texts
        ZStack {
            switch model.screen {
            case .connecting:
                SplashScreen {
                    Panel { Text(texts.t("Connecting…")).font(.title2) }
                }
            case .pairing:
                PairingView(status: model.status!, texts: texts, server: model.server)
            case .waiting:
                WaitingView(viewer: model.status!.viewer!, texts: texts, server: model.server)
            case .lobby:
                LobbyView(state: model.state!, texts: texts, server: model.server)
            case .game:
                PokerHeistView(game: model.heist!, state: model.state!, texts: texts, server: model.server)
            case .unsupported:
                UnsupportedGameView(gameType: model.state?.gameType ?? "", texts: texts)
            }
            ShuffleView(trigger: model.shuffle)
            ConfettiView(trigger: model.celebration)
            if model.status != nil && !model.connected {
                VStack {
                    Text(texts.t("Reconnecting…"))
                        .font(.headline)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(.black.opacity(0.7), in: Capsule())
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.top, 20)
            }
        }
        .environment(\.layoutDirection, texts.isRightToLeft ? .rightToLeft : .leftToRight)
        .environment(\.locale, Locale(identifier: texts.code))
        .onChange(of: model.screen, initial: true) { _, screen in
            // The screen saver stays away while a game or its lobby is on screen.
            UIApplication.shared.isIdleTimerDisabled = screen == .lobby || screen == .game
        }
    }
}

/// Not linked: the splash picture with the QR code of the site's address with the pairing code, the code in large
/// letters, and the users already paired with the TV.
struct PairingView: View {
    let status: TvStatus
    let texts: Texts
    let server: URL

    var body: some View {
        SplashScreen {
            Panel {
                HStack(spacing: 48) {
                    QRCodeView(text: ServerAddress.pairingURL(server, code: status.code).absoluteString)
                        .frame(width: 300, height: 300)
                    VStack(alignment: .leading, spacing: 18) {
                        Text(texts.t("Scan the QR code with your phone, or enter this code in your GamesLane profile."))
                            .font(.title3)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(status.code)
                            .font(.system(size: 110, weight: .heavy, design: .monospaced))
                            .kerning(18)
                            .foregroundStyle(Theme.primaryDark)
                            .environment(\.layoutDirection, .leftToRight)
                        Text(server.host() ?? "")
                            .font(.headline)
                            .foregroundStyle(Theme.muted)
                        if !status.pairedWith.isEmpty {
                            Text(texts.t("Paired with {names}", ["names": status.pairedWith.joined(separator: ", ")]))
                                .font(.headline)
                                .foregroundStyle(Theme.muted)
                        }
                    }
                    .frame(maxWidth: 900, alignment: .leading)
                }
            }
        }
    }
}

/// Linked, no game open: the splash picture with the user's icon and "Waiting for {name} to open a game…".
struct WaitingView: View {
    let viewer: TvViewer
    let texts: Texts
    let server: URL

    var body: some View {
        SplashScreen {
            Panel {
                HStack(spacing: 28) {
                    IconView(icon: viewer.icon, server: server, size: 90)
                    Text(texts.t("Waiting for {name} to open a game…", ["name": viewer.name]))
                        .font(.title2)
                }
            }
        }
    }
}

/// A game the TV cannot show yet: the splash picture with the game's name and a note.
struct UnsupportedGameView: View {
    let gameType: String
    let texts: Texts

    var body: some View {
        SplashScreen {
            Panel {
                HStack(spacing: 28) {
                    if let picture = Games.pictures[gameType] {
                        Image("Games/\(picture)").resizable().scaledToFit().frame(width: 90, height: 90)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text(texts.t(Games.names[gameType] ?? gameType)).font(.title2.bold())
                        Text(texts.t("This game cannot be shown on the TV yet.")).font(.title3)
                    }
                }
            }
        }
    }
}
