# BioEngine V3: Guía de Integración para el Bot y Optimización Móvil

Esta guía está diseñada para ser entregada a la instancia de BioEngine que trabajará de forma independiente. Define cómo debe comportarse el backend para servir al bot de OpenGravity y cómo debe estructurarse la nueva visualización móvil.

## 1. Instrucciones de Ejecución Independiente

Para trabajar con BioEngine por separado de OpenGravity:

### Backend (Python/FastAPI)
- **Directorio:** `C:\BioEngine_V3\backend`
- **Comando:** `python -m uvicorn main:app --reload --port 8001`
- **Requisito:** Asegurarse de tener instalado `fastapi`, `uvicorn`, `pydantic`, `sqlite3`, `google-generativeai`.

### Frontend (Vite/React)
- **Directorio:** `C:\APP\BioEngine` (o donde se encuentre el código de la UI V3)
- **Comando:** `npm run dev`
- **Nota:** La configuración de V4 en este repo redirige al Login. Para modo puramente independiente V3, se puede usar una rama `legacy` o el backup original de V3.

---

## 2. API de Conexión para el Bot

El Bot (OpenGravity) utilizará los siguientes endpoints para interactuar con BioEngine:

### A. Consultar Sesiones de la Semana
- **Endpoint:** `GET /plans/active`
- **Respuesta:** Objeto JSON con el plan actual y el listado de sesiones.
- **Uso:** El bot usará esto para responder "Qué tengo que entrenar esta semana?".

### B. Modificar/Reprogramar una Sesión
- **Endpoint:** `PATCH /plans/{plan_id}/sessions/{session_idx}`
- **Body:**
  ```json
  {
    "date": "2026-03-10",
    "title": "Ciclismo Adaptado (Movido)",
    "description": "Sesión movida por petición del usuario"
  }
  ```
- **Uso:** Cuando el usuario diga "mueve esta sesión al martes", el bot calculará el `session_idx` y enviará la nueva fecha.

### C. Consultar Historial y Salud
- **Endpoints:** `GET /activities`, `GET /biometrics`, `GET /health/daily`
- **Uso:** Para análisis profundos de recuperación.

---

## 3. Visualización Móvil (Mobile-First UX)

BioEngine debe implementar una visualización específica para móviles que priorice:

1.  **DASHBOARD COMPACTO:**
    - Widgets de "Próximo Entrenamiento" en formato card grande arriba.
    - Anillos de progreso para Carga Semanal y Adherencia.
2.  **CALENDARIO TIPO LISTA:**
    - En móvil, evitar cuadrículas. Usar un scroll vertical de "Timeline" (Agenda).
3.  **INTERACCIONES TÁCTILES:**
    - Botones de "Completado" y "Registrar Dolor" grandes y accesibles con el pulgar.
    - Uso de `framer-motion` para gestos (swipe para descartar/mover).
4.  **REDUCCIÓN DE DATOS:**
    - Ocultar tablas complejas. Mostrar solo KPIs clave (FC Media, Distancia, RPE) con opción a "Ver detalles".

---

## 4. Lógica de Sincronización

BioEngine es el **dueño de la verdad** sobre el entrenamiento físico. 
- OpenGravity (Bot) actúa como el **interfaz conversacional**.
- Cualquier cambio realizado por el Bot via API debe verse reflejado instantáneamente en la UI de BioEngine.

---

> [!IMPORTANT]
> El backend ya ha sido actualizado con los endpoints `/plans/active` y `PATCH /plans/...` para soportar esta integración.
