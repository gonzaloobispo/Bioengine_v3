# Configuración de Base de Datos vía MCP

Para conectar Google Antigravity con bases de datos corporativas o locales, utiliza el Model Context Protocol (MCP).

### Opción 1: Instalación vía MCP Store (Recomendado para Google Cloud)
1.  En el **Agent Manager**, ve a **"MCP Servers"** > **"Manage MCP Servers"**.
2.  Busca servicios como **BigQuery**, **Cloud SQL**, o **AlloyDB**.
3.  Ingresa el **Project ID**, Región y configura el uso de credenciales **IAM** para evitar exponer secretos en el chat.

### Opción 2: Configuración Manual (JSON)
Para instancias locales (PostgreSQL, MySQL), edita el JSON de configuración:

```json
{
  "mcpServers": {
    "postgres-database": {
      "command": "uv",
      "args": [
        "run",
        "mcp-server-postgres",
        "--db-url",
        "postgresql://usuario:password@localhost:5432/mi_base_datos"
      ]
    }
  }
}
```

### ¿Qué permite hacer esto?
*   **Exploración de esquemas:** El agente entiende tus tablas mediante `get_table_schema`.
*   **Consultas SQL:** El agente ejecuta queries para validar datos o generar reportes directamente desde el chat.
*   **Validación contra Looker:** Los agentes verifican métricas contra la "fuente de la verdad" del negocio.
