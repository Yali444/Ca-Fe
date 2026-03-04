import SwiftUI
import UIKit

struct AboutView: View {
    private let description = "A curated guide to specialty coffee across Israel. Discover independent cafés, thoughtful roasting programs, and unique brew bars starting in Tel Aviv + Jaffa."

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("About the Project")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.coffeeText)
                    Text(description)
                        .font(.body)
                        .foregroundStyle(.coffeeText.opacity(0.9))
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Roadmap")
                        .font(.headline)
                    Label("Expand coverage to Jerusalem, Haifa, North", systemImage: "mappin.circle")
                    Label("Add Firestore/Supabase sync", systemImage: "cloud")
                    Label("Community submissions & favorites", systemImage: "heart")
                }
                .foregroundStyle(.secondary)

                Button(action: suggestCafe) {
                    Label("Suggest a Café", systemImage: "paperplane")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.coffeeAccent)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }
            }
            .padding()
            .background(Color.coffeeBackground)
        }
        .navigationTitle("About")
        .background(Color.coffeeBackground.ignoresSafeArea())
    }

    private func suggestCafe() {
        let email = "hello@cafe.guide"
        let subject = "Suggest a Café"
        let body = "Shalom! I'd love to suggest..."
        guard let subjectEncoded = subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let bodyEncoded = body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "mailto:\(email)?subject=\(subjectEncoded)&body=\(bodyEncoded)") else {
            return
        }
        UIApplication.shared.open(url)
    }
}

#Preview {
    NavigationStack {
        AboutView()
    }
}
