import SwiftUI

struct TagPill: View {
    let text: String
    var style: Style = .standard

    var body: some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(style.background)
            .foregroundStyle(style.foreground)
            .clipShape(Capsule())
    }

    enum Style {
        case standard
        case accent

        var background: Color {
            switch self {
            case .standard:
                return Color.coffeeTag.opacity(0.15)
            case .accent:
                return Color.coffeeAccent.opacity(0.15)
            }
        }

        var foreground: Color {
            switch self {
            case .standard:
                return .coffeeText
            case .accent:
                return .coffeeAccent
            }
        }
    }
}

#Preview {
    TagPill(text: "Filter")
        .padding()
        .background(Color.coffeeBackground)
}
