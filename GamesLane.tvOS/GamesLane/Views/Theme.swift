import SwiftUI

/// The site's colors (`:root` in styles.css), taken from the GamesLane logo.
enum Theme {
    static let background = Color(hex: 0xF5F1EA)
    static let surface = Color.white
    static let surfaceSoft = Color(hex: 0xEFE7DB)
    static let ink = Color(hex: 0x1F1A15)
    static let muted = Color(hex: 0x6B6258)
    static let line = Color(hex: 0xE3D9CB)
    static let gold = Color(hex: 0xE6A93C)
    static let primary = Color(hex: 0xC2561A)
    static let primaryDark = Color(hex: 0x9F4413)
    static let red = Color(hex: 0xA8321F)
    static let green = Color(hex: 0x2F7D45)
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255, opacity: opacity)
    }
}

/// A user's icon: an emoji, or a picture on the server (an address starting with `/`).
struct IconView: View {
    let icon: String?
    let server: URL
    var size: CGFloat = 40

    var body: some View {
        if let url = ServerAddress.iconURL(server, icon: icon) {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Color.clear
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            Text(icon ?? "")
                .font(.system(size: size * 0.85))
                .frame(width: size, height: size)
        }
    }
}

/// A seat's icon and name, with "(away)" and a spinner while its holder is disconnected (see `seatLabel` in
/// common.js).
struct SeatLabel: View {
    let seat: SeatInfo?
    let fallback: String
    let texts: Texts
    let server: URL
    var size: CGFloat = 34

    var body: some View {
        HStack(spacing: size * 0.3) {
            if let seat {
                IconView(icon: seat.icon, server: server, size: size)
            }
            Text(name)
                .lineLimit(1)
            if let seat, seat.status != "Present" {
                ProgressView()
                    .scaleEffect(0.6)
                    .frame(width: size * 0.7, height: size * 0.7)
            }
        }
    }

    private var name: String {
        guard let seat else {
            return fallback
        }
        return seat.status == "Away" ? "\(seat.name) \(texts.t("(away)"))" : seat.name
    }
}

/// The splash picture filling the screen, with `content` on a panel near the bottom.
struct SplashScreen<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack(alignment: .bottom) {
            Image("Splash")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
            LinearGradient(colors: [.clear, .black.opacity(0.55)], startPoint: .center, endPoint: .bottom)
                .ignoresSafeArea()
            content
                .padding(.bottom, 40)
        }
    }
}

/// A rounded, slightly see-through panel in the site's colors.
struct Panel<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(36)
            .background(Theme.background.opacity(0.94), in: RoundedRectangle(cornerRadius: 28))
            .foregroundStyle(Theme.ink)
            .shadow(color: .black.opacity(0.35), radius: 20, y: 8)
    }
}
