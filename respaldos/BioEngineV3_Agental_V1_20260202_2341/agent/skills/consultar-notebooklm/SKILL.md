---
name: consultar-notebooklm
description: Gateway técnico para consultar la base de conocimiento del proyecto (NotebookLM) vía MCP.
---

# Consultar NotebookLM (Puente Técnico)

## 🔍 Cuándo usar este skill
- Cuando un agente o skill necesite validar una decisión clínica o técnica contra la documentación oficial.
- Cuando se requiera recuperar un protocolo específico (ej. "Protocolo de recuperación de rodilla").
- Cuando se necesite "grounding" (anclaje) para evitar alucinaciones en respuestas médicas.

## 📥 Inputs Necesarios
1.  **Consulta (Query):** La pregunta específica a realizar al cuaderno.
    - *Ejemplo:* "¿Cuál es el ACWR máximo seguro para un corredor tras 3 semanas de inactividad?"
2.  **Contexto (Opcional):** Datos relevantes para afinar la búsqueda.
    - *Ejemplo:* "Usuario varón, 35 años, historial de condromalacia."

## ⚙️ Workflow

### Paso 1: Verificación de Conexión
1.  Verificar que el servidor MCP `notebooklm` está activo y respondiendo.
2.  Confirmar que el cuaderno activo es el correcto (ID maestro: `...836d`).

### Paso 2: Ejecución de Consulta
1.  Utilizar la herramienta MCP `chat_with_notebook` (o `send_chat_message`).
2.  **Prompt Engineering Automático:**
    - Antes de enviar, envolver la consulta en un "System Prompt" ligero para forzar brevedad y citación.
    - *Formato:* `[Consulta de Sistema BioEngine] Responde basándote SOLO en tus fuentes. Cita el documento específico. Pregunta: {QUERY}`

### Paso 3: Procesamiento de Respuesta
1.  Recibir la respuesta de NotebookLM.
2.  Validar si contiene "No encuentro información" o similar.
3.  Si es válida, extraer las **Citas/Fuentes** (si el formato lo permite).

## 📤 Output (Formato Estandarizado)

```json
{
  "status": "success",
  "answer": "El ACWR seguro debe mantenerse entre 0.8 y 1.3...",
  "sources": ["Protocolo_Retorno_Running.pdf", "Paper_Gabbett_2016"],
  "confidence": "high"
}
```

## 🛠️ Manejo de Errores
- **Error de Conexión:** Si el MCP falla, devolver `status: "error"` y un mensaje de "Servicio de Memoria No Disponible". El agente llamador debe decidir si degrada la respuesta (fallback a lógica interna) o aborta.
- **Respuesta Vacía:** Si NotebookLM no sabe, devolver explícitamente "Información no encontrada en base de conocimiento".
