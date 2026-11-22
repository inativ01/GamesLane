import SwiftUI

/// The GamesLane app for Apple TV: shows the games of the user who links the TV (Watch on TV), as an observer.
@main
struct GamesLaneApp: App {
    @State private var model = TvModel()

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .task { await model.start() }
        }
    }
}
