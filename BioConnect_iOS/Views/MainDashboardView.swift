import SwiftUI

struct MainDashboardView: View {
    var body: some View {
        NavigationStack {
            ZStack {
            // Background Futurista con Gradiente
            LinearGradient(gradient: Gradient(colors: [Color(red: 0.1, green: 0.1, blue: 0.2), Color.black]), 
                           startPoint: .topLeading, 
                           endPoint: .bottomTrailing)
                .ignoresSafeArea()
            
            VStack(spacing: 25) {
                // Header
                HStack {
                    VStack(alignment: .leading) {
                        Text("BIOENGINE V4")
                            .font(.caption)
                            .tracking(4)
                            .foregroundColor(.green)
                        Text("Hola, Gonzalo")
                            .font(.largeTitle)
                            .bold()
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 40, height: 40)
                        .foregroundColor(.green)
                }
                .padding(.horizontal)
                
                // Status Cardiovascular (Glassmorphism)
                NavigationLink(destination: RecoveryView()) {
                    GlassCardView {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: "heart.fill")
                                    .foregroundColor(.red)
                                Text("RITMO CARDÍACO")
                                    .font(.headline)
                                    .foregroundColor(.gray)
                            }
                            HStack(alignment: .bottom) {
                                Text("52")
                                    .font(.system(size: 48, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                                Text("bpm")
                                    .font(.title3)
                                    .foregroundColor(.gray)
                                    .padding(.bottom, 8)
                                Spacer()
                                Text("RECUPERACIÓN: 92%")
                                    .font(.caption)
                                    .padding(6)
                                    .background(Color.green.opacity(0.2))
                                    .cornerRadius(8)
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.horizontal)

                // Carga de Entrenamiento (Ring simulated)
                HStack(spacing: 20) {
                    SmallGlassCard(title: "CARGA", value: "Optimal", icon: "bolt.fill", color: .yellow)
                    SmallGlassCard(title: "RECUPERACIÓN", value: "92%", icon: "leaf.fill", color: .green)
                }
                .padding(.horizontal)

                // Botón Acción Crítica
                Button(action: {
                    // Acción de sincronización
                }) {
                    Text("SYNC BIOENGINE")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(15)
                        .shadow(color: Color.green.opacity(0.4), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal)
                .padding(.top, 20)
                
                Spacer()
            }
        }
      }
    }
}

// Estilo Glassmorphism
struct GlassCardView<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(20)
            .background(.ultraThinMaterial)
            .cornerRadius(25)
            .overlay(
                RoundedRectangle(cornerRadius: 25)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

struct SmallGlassCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .background(.ultraThinMaterial)
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.05), lineWidth: 1)
        )
    }
}

#Preview {
    MainDashboardView()
}
