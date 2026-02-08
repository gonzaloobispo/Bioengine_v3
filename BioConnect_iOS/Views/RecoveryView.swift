import SwiftUI

struct RecoveryView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 25) {
                    // Header
                    VStack(alignment: .leading) {
                        Text("PROTOCOLO DE RECUPERACIÓN")
                            .font(.caption)
                            .tracking(2)
                            .foregroundColor(.red)
                        Text("Isometría Analgésica")
                            .font(.largeTitle)
                            .bold()
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal)
                    
                    // Alerta de Estado Master
                    HStack {
                        Image(systemName: "exclamationmark.shield.fill")
                            .foregroundColor(.yellow)
                        Text("Protocolo Fase 0: Tendinopatía Master 49+")
                            .font(.subheadline)
                            .foregroundColor(.white)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.yellow.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Ejercicio Principal Card
                    GlassCardView {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("Sentadilla Española (Spanish Squat)")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            HStack {
                                StatBadge(label: "Series", value: "5")
                                StatBadge(label: "Tiempo", value: "45s")
                                StatBadge(label: "Esfuerzo", value: "70%")
                            }
                            
                            Text("Instrucciones:")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                                .padding(.top, 5)
                            
                            Text("Mantén la posición de sentadilla a 90º usando una banda tras las rodillas. La contracción debe ser constante y sin dolor agudo.")
                                .font(.body)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    .padding(.horizontal)

                    // Nota Clínica (Grounding)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Fundamentación Clínica")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        Text("Este ejercicio reduce la inhibición cortical y proporciona un efecto analgésico inmediato por 45 minutos. Ideal como pre-calentamiento o sesión de alivio.")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal)
                    
                    // Botón Log
                    Button(action: {
                        // Log recovery session
                    }) {
                        Text("REGISTRAR SESIÓN")
                            .font(.headline)
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .cornerRadius(15)
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                }
                .padding(.vertical)
            }
        }
    }
}

struct StatBadge: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack {
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.05))
        .cornerRadius(10)
    }
}

#Preview {
    RecoveryView()
}
