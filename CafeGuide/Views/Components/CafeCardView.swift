import SwiftUI
import UIKit

struct CafeCardView: View {
    let cafe: Cafe

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            AsyncImage(url: cafe.photos.first.flatMap(URL.init(string:))) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .frame(height: 160)
                        .frame(maxWidth: .infinity)
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(height: 160)
                        .frame(maxWidth: .infinity)
                        .clipped()
                case .failure:
                    placeholder
                @unknown default:
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                Text(cafe.name)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Color.coffeeText)

                Text("\(cafe.neighborhood), \(cafe.city)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack {
                    Label(cafe.roaster, systemImage: "leaf")
                    Spacer()
                    Text(cafe.displayPrice)
                        .font(.footnote.monospacedDigit())
                }
                .font(.footnote)
                .foregroundStyle(.secondary)

                TagsGrid(tags: cafe.vibeTags)
            }
        }
        .padding(16)
    }

    private var placeholder: some View {
        ZStack {
            Color.coffeeTag.opacity(0.1)
            Image(systemName: "camera")
                .foregroundStyle(.coffeeAccent)
        }
        .frame(height: 160)
        .frame(maxWidth: .infinity)
    }
}

private struct TagsGrid: View {
    let tags: [String]

    var body: some View {
        FlexibleView(data: tags, spacing: 8) { tag in
            TagPill(text: tag)
        }
    }
}

struct FlexibleView<Data: Collection, Content: View>: View where Data.Element: Hashable {
    let data: Data
    let spacing: CGFloat
    let alignment: HorizontalAlignment
    let content: (Data.Element) -> Content

    init(data: Data, spacing: CGFloat = 8, alignment: HorizontalAlignment = .leading, content: @escaping (Data.Element) -> Content) {
        self.data = data
        self.spacing = spacing
        self.alignment = alignment
        self.content = content
    }

    var body: some View {
        VStack(alignment: alignment, spacing: spacing) {
            ForEach(rows.indices, id: \.self) { index in
                HStack(spacing: spacing) {
                    ForEach(rows[index], id: \.self) { element in
                        content(element)
                    }
                }
            }
        }
    }

    private var rows: [[Data.Element]] {
        guard !data.isEmpty else { return [] }
        var rows: [[Data.Element]] = [[]]
        var currentRowWidth: CGFloat = 0
        let maxWidth = UIScreen.main.bounds.width - 48

        for element in data {
            let elementWidth = elementWidthEstimate(for: element)
            if currentRowWidth + elementWidth > maxWidth {
                rows.append([element])
                currentRowWidth = elementWidth
            } else {
                rows[rows.count - 1].append(element)
                currentRowWidth += elementWidth
            }
        }
        return rows
    }

    private func elementWidthEstimate(for element: Data.Element) -> CGFloat {
        let text = String(describing: element)
        let font = UIFont.preferredFont(forTextStyle: .caption2)
        let attributes = [NSAttributedString.Key.font: font]
        let size = (text as NSString).size(withAttributes: attributes)
        return size.width + 32
    }
}

#Preview {
    CafeCardView(cafe: CafeDataService.loadCafes().first!)
        .background(Color.coffeeBackground)
}
