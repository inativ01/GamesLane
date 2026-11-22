import SwiftUI

extension SessionState {
    /// The lobby's status line (see `lobbyStatus` in common.js, as an observer sees it), after the session's notice.
    func lobbyStatus(_ texts: Texts) -> String {
        let taken = seats.compactMap { $0 }.count
        let status: String
        if taken < minSeats {
            status = texts.t("Waiting for players ({taken}/{needed} needed)…", ["taken": taken, "needed": minSeats])
        } else if isPublic {
            let host = seats.compactMap { $0 }.first { $0.playerId == hostPlayerId }
            status = texts.t("Waiting for {name} to start the game.", ["name": host?.name ?? ""])
        } else {
            status = texts.t("Ready to start.")
        }
        return [notice.map(texts.server), status].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
    }

    /// The seats shown in the lobby: the taken ones, and the next empty one while there is room.
    var lobbySeats: [Int] {
        let next = seats.prefix(maxSeats).firstIndex { $0 == nil }
        return seats.indices.filter { seats[$0] != nil || $0 == next }
    }
}

/// The session lobby: the game's picture and name, the seats (names and icons) and the lobby's status.
struct LobbyView: View {
    let state: SessionState
    let texts: Texts
    let server: URL

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            VStack(spacing: 36) {
                HStack(spacing: 28) {
                    if let picture = Games.pictures[state.gameType] {
                        Image("Games/\(picture)").resizable().scaledToFit().frame(width: 120, height: 120)
                    }
                    Text(texts.t(Games.names[state.gameType] ?? state.gameType))
                        .font(.system(size: 72, weight: .heavy))
                }
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text(texts.t("Players")).font(.title2.bold())
                        Spacer()
                        Text("\(state.seats.compactMap { $0 }.count) / \(state.maxSeats)")
                            .font(.title2.monospacedDigit())
                            .foregroundStyle(Theme.muted)
                    }
                    Text(state.lobbyStatus(texts))
                        .font(.title3)
                        .foregroundStyle(Theme.primaryDark)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 380), spacing: 20)], alignment: .leading, spacing: 20) {
                        ForEach(state.lobbySeats, id: \.self) { seat in
                            SeatLabel(seat: state.seat(seat), fallback: texts.t("Empty seat"), texts: texts, server: server, size: 54)
                                .font(.title3)
                                .foregroundStyle(state.seat(seat) == nil ? Theme.muted : Theme.ink)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 16)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
                                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.line, lineWidth: 2))
                        }
                    }
                }
                .padding(40)
                .frame(maxWidth: 1400)
                .background(Theme.surfaceSoft, in: RoundedRectangle(cornerRadius: 28))
            }
            .foregroundStyle(Theme.ink)
            .padding(60)
        }
    }
}
