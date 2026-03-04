import SwiftUI

struct PhotoHeaderView: View {
    let photoURL: URL?

    var body: some View {
        AsyncImage(url: photoURL) { phase in
            switch phase {
            case .empty:
                ProgressView()
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                placeholder
            @unknown default:
                placeholder
            }
        }
        .frame(height: 260)
        .frame(maxWidth: .infinity)
        .clipped()
        .overlay(alignment: .topTrailing) {
            Label("Specialty", systemImage: "star.fill")
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial, in: Capsule())
                .padding()
        }
    }

    private var placeholder: some View {
        ZStack {
            Color.coffeeTag.opacity(0.2)
            Image(systemName: "photo")
                .font(.title)
                .foregroundStyle(.coffeeAccent)
        }
    }
}

#Preview {
    PhotoHeaderView(photoURL: URL(string: "https://images.unsplash.com/photo-1511920170033-f8396924c348"))
}
