# Documento Base: Proyecto BioConnect iOS

## 1. Visión del Proyecto (The Vibe)
Crear una aplicación nativa para **iOS (iPhone)** que funcione como una interfaz personal para el usuario. La app tiene dos propósitos centrales:
1.  **Canal de Contacto Directo:** Permitir que la app "contacte" al usuario (notificaciones, alertas críticas o mensajería).
2.  **Integración BioEngine:** Servir como el host móvil para el sistema "BioEngine", visualizando sus datos o ejecutando sus funciones directamente desde el celular.

**Estilo Visual:** Futurista, minimalista, "High-Tech Health/Data Dashboard". Uso de transparencias (Glassmorphism) y modo oscuro por defecto.

## 2. Arquitectura Técnica & Stack
*   **Plataforma:** iOS 17+ (SwiftUI nativo).
*   **Lenguaje:** Swift.
*   **Arquitectura:** MVVM (Model-View-ViewModel) para separar la lógica de BioEngine de la UI.
*   **Backend/Sincronización:** Firebase (Firestore/Cloud Functions) para la transmisión de datos en tiempo real entre BioEngine y el iPhone.

## 3. Definición de Roles de Agentes (Antigravity Swarm)
Instrucciones para la orquestación de agentes dentro del IDE:

*   **@Design-Lead:** Encargado de construir vistas en SwiftUI que sean responsivas. Debe priorizar la usabilidad en pantallas de iPhone.
*   **@Logic-Architect:** Encargado de la integración del módulo `BioEngine`. Debe crear una capa de servicio (`BioEngineService.swift`) que simule o conecte con la API real.
*   **@QA-Specialist:** Encargado de verificar la app usando el **iOS Simulator MCP**. Debe probar flujos de navegación y alertas.

## 4. Requerimientos Funcionales (Skills & Tasks)

### A. Módulo BioEngine (Core)
*   Implementar una estructura de datos que represente las métricas o estados de "BioEngine".
*   Crear un Dashboard principal con gráficos o indicadores de estado en tiempo real.
*   **Regla:** Si BioEngine es una librería externa o API, generar un archivo de configuración para las *API Keys* o *Endpoints*.

### B. Módulo de Contacto (Alertas)
*   Integrar **Push Notifications** (vía Firebase Cloud Messaging) para que la app "busque" al usuario.
*   Botón de acción rápida: "Sincronizar Estado" o "Enviar Reporte".

## 5. Reglas de Desarrollo & Verificación (Rules)
*   **Uso de MCP:** Utilizar el servidor `ios-simulator-mcp` para compilar y lanzar la app en un simulador de iPhone localmente para verificar cada iteración visual.
*   **Generación de Artefactos:** Antes de escribir código, generar un *Implementation Plan* detallado. Al finalizar una *feature*, generar una grabación de pantalla del simulador.
*   **Seguridad:** No hardcodear credenciales. Usar variables de entorno o archivos de configuración seguros (ignorados por git).
