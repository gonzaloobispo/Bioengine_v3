import Foundation
import Combine

class DashboardViewModel: ObservableObject {
    @Published var heartRate: Int = 52
    @Published var hrv: Int = 78
    @Published var recoveryStatus: String = "HIGH"
    @Published var isSyncing: Bool = false
    
    private var cancellables = Set<AnyCancellable>()
    
    func syncData() {
        isSyncing = true
        // Simular llamada a BioEngine API (V4 Standard)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.isSyncing = false
            // Aquí se integraría la respuesta del router agéntico
        }
    }
}
