import SwiftUI
import MapKit

struct CafeDetailView: View {
    let cafe: Cafe

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                PhotoHeaderView(photoURL: cafe.photos.first.flatMap(URL.init(string:)))

                VStack(alignment: .leading, spacing: 16) {
                    header
                    descriptionSection
                    brewSection
                    vibeSection
                    openingHoursSection
                    linkSection
                }
                .padding()
                .background(Color.coffeeBackground)
                .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                .padding(.top, -28)
            }
        }
        .background(Color.coffeeBackground.ignoresSafeArea())
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: openInMaps) {
                    Label("Open in Maps", systemImage: "map")
                }
            }
        }
        .navigationTitle(cafe.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(cafe.name)
                .font(.title.weight(.bold))
                .foregroundStyle(.coffeeText)

            Text(cafe.address)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                TagPill(text: cafe.roaster, style: .accent)
                TagPill(text: cafe.displayPrice)
            }
        }
    }

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About")
                .font(.headline)
                .foregroundStyle(.coffeeText)
            Text(cafe.description)
                .foregroundStyle(.coffeeText.opacity(0.9))
        }
    }

    private var brewSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Brew Methods")
                .font(.headline)
            FlexibleView(data: cafe.brewMethods, spacing: 8) { method in
                TagPill(text: method, style: .accent)
            }
        }
    }

    private var vibeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Vibe")
                .font(.headline)
            FlexibleView(data: cafe.vibeTags, spacing: 8) { tag in
                TagPill(text: tag)
            }
        }
    }

    private var openingHoursSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Opening Hours")
                .font(.headline)
            Text(cafe.openingHours)
                .font(.body.monospaced())
        }
    }

    private var linkSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: openInMaps) {
                Label("Open in Apple Maps", systemImage: "location")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.coffeeAccent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            HStack {
                if let instagram = cafe.instagramHandle, let url = URL(string: "https://instagram.com/\(instagram)") {
                    Link(destination: url) {
                        Label("Instagram", systemImage: "camera")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.coffeeCard)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }

                if let website = cafe.website, let url = URL(string: website) {
                    Link(destination: url) {
                        Label("Website", systemImage: "safari")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.coffeeCard)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
            .foregroundStyle(.coffeeText)
        }
    }

    private func openInMaps() {
        let placemark = MKPlacemark(coordinate: cafe.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = cafe.name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
    }
}

#Preview {
    NavigationStack {
        CafeDetailView(cafe: CafeDataService.loadCafes().first!)
    }
}
