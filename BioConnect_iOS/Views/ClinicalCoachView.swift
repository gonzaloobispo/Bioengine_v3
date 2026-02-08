import SwiftUI

struct ClinicalCoachView: View {
    @State private var reasoning: String = "Analizando datos de HRV y carga de entrenamiento..."
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header con badge de System 2
                    HStack {
                        Text("SYSTEM 2 COACH")
                            .font(.caption)
                            .padding(6)
                            .background(Color.purple.opacity(0.2))
                            .foregroundColor(.purple)
                            .cornerRadius(5)
                        Spacer()
                    }
                    .padding(.horizontal)
                    
                    Text("Análisis Deliberativo")
                        .font(.largeTitle)
                        .bold()
                        .foregroundColor(.white)
                        .padding(.horizontal)

                    // Reasoning Box
                    GlassCardView {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Proceso de Pensamiento", systemImage: "brain.head.profile)
                                .font(.headline)
                                .foregroundColor(.purple)
                            
                            Text(reasoning)
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }
                    .padding(.horizontal)

                    // Recomendación Final
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Decisión Estratégica")
                            .font(.title2)
                            .bold()
                            .foregroundColor(.white)
                        
                        DecisionCard(title: "Mantener Intensidad", description: "Tus niveles de glucosa son estables y el HRV muestra una recuperación completa (+12%).", type: .positive)
                        
                        DecisionCard(title: "Protocolo Pre-Carga", description: "Consumir 40g de proteína de alta calidad 2h antes de la sesión de tenis.", type: .neutral)
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

enum DecisionType {
    case positive, neutral, negative
}

struct DecisionCard: View {
    let title: String
    let description: String
    let type: DecisionType
    
    var color: Color {
        switch type {
        case .positive: return .green
        case .neutral: return .blue
        case .negative: return .red
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.headline)
                .foregroundColor(color)
            Text(description)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1))
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

#Preview {
    ClinicalCoachView()
}
