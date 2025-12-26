import SwiftUI

struct CafeListView: View {
    @EnvironmentObject private var viewModel: CafeListViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                quickFilters
                cafeList
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
        .background(Color.coffeeBackground.ignoresSafeArea())
        .navigationTitle("Specialty Cafés")
        .searchable(text: $viewModel.searchText, placement: .navigationBarDrawer(displayMode: .always))
    }

    private var quickFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(QuickFilter.allCases) { filter in
                    Button {
                        viewModel.selectedQuickFilter = filter
                    } label: {
                        Label(filter.rawValue, systemImage: filter.icon)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(filterBackground(for: filter))
                            .foregroundStyle(filter == viewModel.selectedQuickFilter ? .white : .coffeeText)
                            .clipShape(Capsule())
                            .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }

    private func filterBackground(for filter: QuickFilter) -> some ShapeStyle {
        filter == viewModel.selectedQuickFilter ? Color.coffeeAccent : Color.coffeeCard
    }

    private var cafeList: some View {
        LazyVStack(spacing: 16) {
            ForEach(viewModel.filteredCafes) { cafe in
                NavigationLink(value: cafe) {
                    CafeCardView(cafe: cafe)
                        .background(Color.coffeeCard)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .shadow(color: .black.opacity(0.08), radius: 12, y: 8)
                }
            }
        }
        .navigationDestination(for: Cafe.self) { cafe in
            CafeDetailView(cafe: cafe)
        }
    }
}

#Preview {
    NavigationStack {
        CafeListView()
            .environmentObject(CafeListViewModel.preview)
    }
}
