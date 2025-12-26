import SwiftUI
import MapKit

struct CafeMapScreen: View {
    @EnvironmentObject private var viewModel: CafeListViewModel
    @State private var bottomSheetOffset: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(coordinateRegion: $viewModel.mapRegion, annotationItems: viewModel.filteredCafes) { cafe in
                MapAnnotation(coordinate: cafe.coordinate) {
                    Button {
                        viewModel.select(cafe)
                    } label: {
                        VStack(spacing: 4) {
                            Text("☕️")
                            Text(cafe.name)
                                .font(.caption2)
                                .padding(4)
                                .background(Color.coffeeCard)
                                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                        }
                    }
                }
            }
            .ignoresSafeArea()

            bottomSheet
        }
        .navigationTitle("Map")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $viewModel.selectedCafe) { cafe in
            NavigationStack {
                CafeDetailView(cafe: cafe)
            }
        }
    }

    private var bottomSheet: some View {
        VStack(alignment: .leading, spacing: 12) {
            Capsule()
                .frame(width: 40, height: 5)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)

            Text("Nearby Cafés")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.cafes(near: viewModel.mapRegion)) { cafe in
                        Button {
                            viewModel.select(cafe)
                            viewModel.updateRegion(for: cafe)
                        } label: {
                            CafeCardMini(cafe: cafe)
                                .frame(width: 240)
                        }
                    }
                }
            }
            .padding(.bottom, 8)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.coffeeBackground)
                .shadow(color: .black.opacity(0.1), radius: 20, y: -4)
        )
        .padding()
    }
}

private struct CafeCardMini: View {
    let cafe: Cafe

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(cafe.name)
                .font(.headline)
                .foregroundStyle(.coffeeText)
            Text(cafe.neighborhood)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack {
                Label("\(cafe.brewMethods.first ?? "")", systemImage: "drop")
                Spacer()
                Text(cafe.displayPrice)
                    .font(.footnote.monospacedDigit())
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.coffeeCard)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

#Preview {
    NavigationStack {
        CafeMapScreen()
            .environmentObject(CafeListViewModel.preview)
    }
}
