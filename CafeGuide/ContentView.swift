import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            NavigationStack {
                CafeListView()
            }
            .tabItem {
                Label("List", systemImage: "list.bullet")
            }

            NavigationStack {
                CafeMapScreen()
            }
            .tabItem {
                Label("Map", systemImage: "map")
            }

            NavigationStack {
                AboutView()
            }
            .tabItem {
                Label("About", systemImage: "info.circle")
            }
        }
        .tint(.accentCoffee)
    }
}

#Preview {
    ContentView()
        .environmentObject(CafeListViewModel.preview)
}
