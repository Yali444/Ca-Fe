import Foundation

enum CafeDataService {
    static func loadCafes() -> [Cafe] {
        guard let url = Bundle.main.url(forResource: "cafes", withExtension: "json") else {
            print("⚠️ cafes.json not found")
            return []
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            return try decoder.decode([Cafe].self, from: data)
        } catch {
            print("⚠️ Failed to decode cafes.json: \(error.localizedDescription)")
            return []
        }
    }
}
