import SwiftUI

@main
struct CafeGuideApp: App {
    @StateObject private var cafeListViewModel = CafeListViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(cafeListViewModel)
        }
    }
}
