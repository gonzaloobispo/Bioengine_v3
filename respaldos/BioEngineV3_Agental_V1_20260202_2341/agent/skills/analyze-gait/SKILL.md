---
name: analyze-gait
description: Analiza métricas de carrera (cadencia, tiempo de contacto, oscilación) para detectar ineficiencias o riesgos de lesión.
---

# Análisis de Pisada y Biomecánica

## 🔍 Cuándo usar este skill
- Cuando el usuario suba datos de una carrera (CSV, JSON o texto).
- Cuando el Entrenador Adaptativo detecte una sesión de "Run" reciente y quiera validar la técnica.
- Cuando el usuario pregunte explícitamente: "¿Cómo estuvo mi técnica hoy?" o "¿Tengo asimetría?".

## 📥 Inputs Necesarios
1.  **Datos de Actividad:**
    - Cadencia promedio (spm).
    - Tiempo de contacto con el suelo (GCT - ms).
    - Oscilación vertical (cm).
    - Balance I/D (opcional).
    - Ritmo (min/km).
2.  **Contexto de Usuario:**
    - Altura (para calcular longitud de zancada ideal).
    - Historial de lesiones (ej. rodilla izquierda).

## ⚙️ Workflow

### Paso 1: Extracción y Normalización
1.  Si los datos vienen en texto ("corrí a 170ppm con 250ms de contacto"), estructurarlos en JSON.
2.  Si faltan datos críticos (Cadencia), solicitar estimación o reloj.

### Paso 2: Ejecución de Script de Análisis
1.  Invocar `scripts/analyze_gait.py` con los parámetros.
2.  El script evalúa:
    - **Cadencia:** < 165 spm (Riesgo alto de impacto).
    - **GCT:** > 250ms (Pisada pesada).
    - **Asimetría:** Desviación > 1.5% entre piernas (Alerta temprana de lesión).

### Paso 3: Generación de Recomendaciones
1.  Mapear resultados a "Drills" (Ejercicios de técnica):
    - *Baja Cadencia* -> Sugerir uso de metrónomo a +5% spm.
    - *Asimetría* -> Sugerir ejercicios unilaterales de fuerza.

## 📤 Output (Formato Estandarizado)

El resultado debe ser un bloque Markdown:

### 👣 Reporte de Biomecánica
- **Eficiencia Mecánica:** [Alta/Media/Baja]
- **Semáforo de Riesgo:** 🟢 / 🟡 / 🔴

#### Hallazgos:
1.  **Cadencia:** 160 spm (⚠️ Baja - Aumenta impacto en rodilla).
2.  **Contacto:** 240 ms (🟢 Bueno - Reactivo).
3.  **Simetría:** Desviación 3% Izquierda (⚠️ Posible compensación por lesión previa).

#### 🛠️ Plan de Corrección:
- **Próxima sesión:** Usar metrónomo a 168 spm.
- **Drill recomendado:** "Saltos a la pata coja" (3x15 seg) antes de correr.

## 🛠️ Manejo de Errores
- Si no hay datos de oscilación/contacto (relojes básicos), el análisis se limita a **Cadencia y Ritmo**.
- Indicar claramente "Análisis parcial por falta de sensores avanzados".
