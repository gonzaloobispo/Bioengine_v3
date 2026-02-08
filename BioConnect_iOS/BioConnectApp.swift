import SwiftUI

@main
struct BioConnectApp: App {
    var body: some Scene {
        WindowGroup {
            MainDashboardView()
                .preferredColorScheme(.dark)
        }
    }
}
