import Foundation
import CoreLocation

struct Cafe: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let city: String
    let neighborhood: String
    let address: String
    let latitude: Double
    let longitude: Double
    let openingHours: String
    let photos: [String]
    let description: String
    let roaster: String
    let brewMethods: [String]
    let vibeTags: [String]
    let priceLevel: Int
    let instagramHandle: String?
    let website: String?
}

extension Cafe {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var displayPrice: String {
        String(repeating: "₪", count: max(1, min(priceLevel, 4)))
    }
}
