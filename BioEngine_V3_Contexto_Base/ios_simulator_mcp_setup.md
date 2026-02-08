# Guía de Configuración: iOS Simulator MCP en Google Antigravity

Instalar y configurar el **ios-simulator-mcp** en Google Antigravity es el paso crítico para que tu agente no solo escriba código, sino que realmente "vea" y pruebe tu app *BioConnect* en un iPhone virtual.

### Prerrequisitos Críticos
Antes de tocar Antigravity, asegúrate de tener esto en tu Mac (el simulador de iOS solo funciona en macOS):
1.  **Xcode:** Debe estar instalado y haber ejecutado un simulador al menos una vez.
2.  **Herramientas de Línea de Comandos:** Ejecuta `xcode-select --install` en tu terminal.
3.  **Facebook IDB (Opcional pero recomendado):** Para que el agente pueda hacer "taps" y "swipes" (no solo abrir la app), el servidor MCP suele requerir `idb`. Instálalo con `brew tap facebook/fb && brew install idb-companion`.

---

### Método 1: Instalación vía MCP Store (Recomendado)
Antigravity tiene una tienda integrada para servidores MCP comunes. Esta es la ruta más rápida.

1.  Abre Antigravity y ve al **Agent Manager** (Gestor de Agentes).
2.  Busca el panel lateral del Agente (generalmente a la derecha) y haz clic en el menú de **"Additional options"** (los tres puntos `...`).
3.  Selecciona **"MCP Servers"** y luego haz clic en **"Manage MCP Servers"**.
4.  En la tienda que aparece, busca **"iOS Simulator"** o "Simulator".
5.  Haz clic en **Install**. Antigravity intentará configurar las rutas automáticamente.

### Método 2: Configuración Manual
Si necesitas usar una versión específica, edita el archivo de configuración JSON.

```json
{
  "mcpServers": {
    "ios-simulator": {
      "command": "npx",
      "args": [
        "-y",
        "ios-simulator-mcp"
      ],
      "env": {}
    }
  }
}
```

### Uso en el proyecto BioConnect
Una vez activo, puedes pedir al agente:
*   *"Lista los simuladores de iOS disponibles en mi máquina."*
*   *"Abre el simulador del iPhone 15 Pro, navega a google.com en Safari y toma una captura de pantalla."*
*   *"Instala la compilación actual de BioConnect en el simulador."*
