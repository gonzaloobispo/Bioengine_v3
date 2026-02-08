import Foundation

struct BiometricData: Codable, Identifiable {
    var id = UUID()
    let type: String
    let value: Double
    let unit: String
    let timestamp: Date
    let source: String
}

struct UserStatus: Codable {
    let athlete_identity: String
    let injury_risk: Double
    let primary_focus: String
}
