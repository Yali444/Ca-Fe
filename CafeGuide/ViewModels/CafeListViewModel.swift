import Foundation
import Combine
import MapKit

final class CafeListViewModel: ObservableObject {
    @Published private(set) var cafes: [Cafe] = []
    @Published var searchText: String = ""
    @Published var selectedQuickFilter: QuickFilter = .all
    @Published var mapRegion: MKCoordinateRegion = Self.defaultRegion
    @Published var selectedCafe: Cafe?

    private var cancellables = Set<AnyCancellable>()

    init(loadImmediately: Bool = true) {
        if loadImmediately {
            cafes = CafeDataService.loadCafes()
        }

        $selectedQuickFilter
            .combineLatest($searchText)
            .sink { [weak self] _, _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
    }

    var filteredCafes: [Cafe] {
        cafes.filter { cafe in
            matchesSearch(cafe) && matchesFilter(cafe)
        }
    }

    func cafes(near region: MKCoordinateRegion, maxDistance: CLLocationDistance = 5000) -> [Cafe] {
        let center = CLLocation(latitude: region.center.latitude, longitude: region.center.longitude)
        return filteredCafes.filter { cafe in
            let cafeLocation = CLLocation(latitude: cafe.latitude, longitude: cafe.longitude)
            return cafeLocation.distance(from: center) <= maxDistance
        }
    }

    func updateRegion(for cafe: Cafe) {
        mapRegion = MKCoordinateRegion(center: cafe.coordinate, span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02))
        selectedCafe = cafe
    }

    func select(_ cafe: Cafe) {
        selectedCafe = cafe
    }

    func clearSelection() {
        selectedCafe = nil
    }

    private func matchesSearch(_ cafe: Cafe) -> Bool {
        guard !searchText.isEmpty else { return true }
        return [
            cafe.name,
            cafe.city,
            cafe.neighborhood,
            cafe.brewMethods.joined(separator: " "),
            cafe.vibeTags.joined(separator: " ")
        ]
        .joined(separator: " ")
        .localizedCaseInsensitiveContains(searchText)
    }

    private func matchesFilter(_ cafe: Cafe) -> Bool {
        switch selectedQuickFilter {
        case .all:
            return true
        case .filterCoffee:
            return cafe.brewMethods.contains { $0.localizedCaseInsensitiveContains("filter") }
        case .espressoBar:
            return cafe.brewMethods.contains { $0.localizedCaseInsensitiveContains("espresso") }
        case .budgetFriendly:
            return cafe.priceLevel <= 2
        }
    }
}

extension CafeListViewModel {
    static var preview: CafeListViewModel {
        let viewModel = CafeListViewModel(loadImmediately: false)
        viewModel.cafes = CafeDataService.loadCafes()
        return viewModel
    }
}

enum QuickFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case filterCoffee = "Filter"
    case espressoBar = "Espresso"
    case budgetFriendly = "Budget"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .all: return "sparkles"
        case .filterCoffee: return "drop"
        case .espressoBar: return "cup.and.saucer"
        case .budgetFriendly: return "shekelsign.circle"
        }
    }
}

private extension CafeListViewModel {
    static let defaultRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 32.0809, longitude: 34.7806),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
}
