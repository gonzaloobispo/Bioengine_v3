# Optimización de Tokens y Gestión de Cuota en Antigravity

Para optimizar el consumo de tokens en Google Antigravity y evitar agotar la cuota prematuramente, sigue estas estrategias de "Arquitectura de Orquestación".

### 1. Gestión Inteligente de Modelos
*   **Modo Planning vs. Fast:** Usa el modo **Planning** solo para arquitectura compleja. Cambia al modo **Fast** para tareas rutinarias o comandos de terminal.
*   **Selección Manual:** No uses siempre Gemini 3 Pro (High). Para UI/CSS o tareas directas, **Claude 3.5 Sonnet** suele ser más eficiente en tokens.

### 2. Higiene del Contexto (Context Hygiene)
*   **Uso de Skills:** Implementa la lógica en archivos `SKILL.md`. Esto permite el **Progressive Disclosure**: las instrucciones solo se cargan cuando la tarea las invoca, ahorrando miles de tokens de sistema.
*   **Evita Monolitos:** Divide archivos grandes. El agente consume más tokens intentando digerir archivos de 2000 líneas que archivos modulares de 200.
*   **Token-Dense Priming:** Si la sesión se alarga, pide al agente un "resumen denso" y reinicia el chat para limpiar el historial innecesario.

### 3. Disciplina en el Prompting (R.A.P.S.)
*   **Batching:** Agrupa tus instrucciones en un solo prompt estructurado ("Super-Prompt") para evitar múltiples viajes de ida y vuelta.
*   **HITL (Human-In-The-Loop):** Detén al agente cuando el código esté generado. Prueba localmente antes de pedir la siguiente iteración.

### 4. Monitoreo
Utiliza herramientas como **vscode-antigravity-cockpit** para ver tu consumo en tiempo real y evitar sorpresas de facturación.
