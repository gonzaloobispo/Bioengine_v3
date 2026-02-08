# 🎯 BioEngine V4.2: Guía de Funcionalidades y Protocolos de Testeo

Este documento centraliza todas las capacidades del ecosistema BioEngine. Es una **herramienta viva** diseñada para que tanto el usuario como los agentes de IA puedan validar el funcionamiento y los resultados del sistema.

---

## 🧩 1. Dashboard de Control (Frontend)

### 📊 Salud Articular & ACWR
- **Descripción:** Monitorización del ratio de carga aguda vs. crónica para prevenir lesiones.
- **Ubicación:** Sección superior del Dashboard (Vista Overview).
- **Funcionalidad:** Muestra 3 métricas: Global, Asfalto (Road) y Montaña (Trail). Cambia de color (Verde/Amarillo/Rojo) según el riesgo.
- **Cómo Testear:** 
    - *Manual:* Filtrar actividades por los últimos 7 días y verificar que el ACWR responda al cambio de volumen.
    - *IA:* "Analiza mi carga de esta semana y dime si el ACWR de Trail es seguro".

### 🛡️ Panel HITL (Supervisión Humana)
- **Descripción:** Panel de aprobación para decisiones críticas de la IA.
- **Ubicación:** Lateral superior del Dashboard ("Solicitudes de Especialista").
- **Funcionalidad:** Permite Aprobar o Rechazar cambios de fase de entreno o alertas críticas propuestas por el Coach.
- **Cómo Testear:** 
    - *Manual:* En el backend, crear una acción pendiente (POST `/hitl/pending`) y verificar que aparezca en el panel. Probar botones de pulgar arriba/abajo.

### 🦴 PainTracker (Seguimiento de Dolor)
- **Descripción:** Registro visual de niveles de dolor en zonas específicas (ej. Rodilla).
- **Ubicación:** Tarjeta dedicada en Overview.
- **Funcionalidad:** Selector 0-10 y notas. Persiste en la DB.
- **Cómo Testear:** 
    - *Manual:* Registrar un dolor "4" y verificar en "Ver Historial" que aparezca correctamente.

---

## 🤖 2. BioEngine Coach (Inteligencia)

### 💬 Chat Dinámico & Streaming
- **Descripción:** Interfaz de comunicación con el Coach con respuestas en tiempo real.
- **Ubicación:** Sidebar derecha o Vista de Chat.
- **Funcionalidad:** Streaming de texto (SSE) y trazabilidad de razonamiento (System 2).
- **Cómo Testear:** 
    - *Manual:* Preguntar "¿Cómo va mi rodilla?" y verificar que la respuesta fluya sin cortes.
    - *Resultados:* Verificar que incluya la sección "⚙️ RAZONAMIENTO" (CoT).

### 📚 Citación de Manuales (Master 49+)
- **Descripción:** El Coach fundamenta sus consejos en el manual de fisioterapia y entrenamiento.
- **Ubicación:** Respuestas del Chat.
- **Funcionalidad:** Referencia protocolos específicos (ej. "Protocolo de 9 días").
- **Cómo Testear:** 
    - *Manual:* "Pregunta sobre la fase de fortalecimiento" y verificar que mencione el manual.

---

## 🚲 3. Gestión de Inventario & Sincronización

### 👟 Odómetros de Equipamiento
- **Descripción:** Seguimiento de desgaste de calzado y bicicletas.
- **Ubicación:** Vista "Equipos y Dispositivos".
- **Funcionalidad:** Calcula km totales dinámicamente desde la DB + base de sincronización. Alerta de mantenimiento (>2500km).
- **Cómo Testear:** 
    - *Manual:* Revisar que la Trek FX marque los km reconciliados (2510km+).
    - *Resultados:* Verificar alerta visual de "MANTENIMIENTO REQUERIDO".

---

## ⚙️ 4. Servicios del Backend (API & Admin)

### 🔃 Sincronización Global
- **Descripción:** Importación de datos de Garmin/Excel/Manuales.
- **Endpoint:** `POST /sync/all`
- **Uso:** Presionar botón "Sincronizar" en el sidebar.
- **Cómo Testear:** 
    - *Manual:* Verificar logs de consola para asegurar que las 19 carreras de `Carreras.xlsx` se procesen.

### 🛠️ Estatus del Sistema
- **Endpoint:** `GET /system/status`
- **Funcionalidad:** Reporta salud de la BD, conexión con Gemini y NotebookLM.
- **Cómo Testear:** 
    - *Manual:* Acceder vía navegador/Postman y verificar `notebooklm_connected: true`.

---

## 📝 Registro de Evolución (Log de Funcionalidades)

| Fecha | Funcionalidad | Estado | Ref. Test |
| :--- | :--- | :--- | :--- |
| 2026-02-08 | ACWR Dual (Road/Trail) | ✅ Operativo | Dashboard OK |
| 2026-02-08 | Panel HITL v1 | ✅ Operativo | Mock Action OK |
| 2026-02-08 | Razonamiento CoT (IA) | ✅ Operativo | Chat Log OK |
| 2026-02-08 | Saneo Unicode BIOS | ✅ Operativo | Backend Windows OK |

---
*Este documento es la brújula de BioEngine. Actualizar con cada nueva Skill o Endpoint.*
