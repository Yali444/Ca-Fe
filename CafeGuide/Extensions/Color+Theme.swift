import SwiftUI

extension Color {
    static let backgroundCoffee = Color(red: 0.96, green: 0.92, blue: 0.87)
    static let accentCoffee = Color(red: 0.45, green: 0.28, blue: 0.18)
    static let cardCoffee = Color(red: 0.98, green: 0.95, blue: 0.90)
    static let textPrimaryCoffee = Color(red: 0.20, green: 0.12, blue: 0.08)
    static let tagCoffee = Color(red: 0.77, green: 0.58, blue: 0.43)
}

extension ShapeStyle where Self == Color {
    static var coffeeBackground: Color { .backgroundCoffee }
    static var coffeeAccent: Color { .accentCoffee }
    static var coffeeCard: Color { .cardCoffee }
    static var coffeeText: Color { .textPrimaryCoffee }
    static var coffeeTag: Color { .tagCoffee }
}
