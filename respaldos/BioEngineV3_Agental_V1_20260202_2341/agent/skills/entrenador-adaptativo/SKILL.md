---
name: entrenador-adaptativo
description: Analiza la carga reciente y adapta dinámicamente la rutina de entrenamiento según estado físico, lesiones y equipo disponible.
---

# Entrenador Adaptativo BioEngine

## 🔍 Cuándo usar este skill
- Cuando el usuario reporte haber realizado una actividad (planificada o improvisada).
- Cuando el usuario solicite "mi rutina para hoy/mañana".
- Cuando se detecte (vía biometría) una fatiga inusual o dolor reportado.
- Cuando el usuario pida replanificar la semana por falta de tiempo o cambio de equipo.

## 📥 Inputs Necesarios
1.  **Historial Reciente:** Últimas 72hs de actividad (Carga Aguda).
2.  **Estado Físico:** Nivel de energía o dolor (Escala 1-10) y lesiones activas (DB: `active_injuries`).
3.  **Equipamiento Disponible:** Referencia al archivo `docs/equipamiento.md`.
4.  **Plan Original:** Sesión planificada para la fecha (si existe).

## ⚙️ Workflow

### Fase 1: Análisis de Contexto
1.  **Consultar Carga:** Verificar en DB las actividades de los últimos 3-7 días. ¿Hay sobrecarga (ACWR > 1.3)?
2.  **Verificar Lesiones:** Leer tabla `injuries` o consultar NotebookLM sobre restricciones activas (ej. "rodilla izquierda").
3.  **Inventario:** Leer `docs/equipamiento.md` para confirmar qué herramientas tiene el usuario (ej. ¿Tiene bici? ¿Pesas?).

### Fase 2: Evaluación de la Sesión
1.  **Si ya entrenó:**
    - ¿Coincidió con lo planeado?
    - Si fue improvisado ("Salí a correr 10k"), ¿cómo afecta al resto de la semana? (Ej. Eliminar la sesión de cardio de mañana).
2.  **Si va a entrenar:**
    - ¿Es viable la sesión planeada con el nivel de fatiga actual?
    - Si hay dolor > 3/10, activar `skill-emergency-protocol` o sugerir descanso activo.

### Fase 3: Adaptación y Generación
1.  Generar la rutina modificada respetando las **Restricciones de Equipo**.
    - *Ejemplo:* Si toca "Strength" pero no hay pesas -> Convertir a "Calistenia" o "Bandas elásticas".
2.  **Validación Clínica:** Consultar a NotebookLM si la adaptación es segura para la lesión actual.
    - *Prompt interno:* "Usuario con condromalacia rotuliana nivel 2. Propongo cambiar sentadillas por puente de glúteos isométrico. ¿Es seguro?"

## 📤 Output (Formato Estandarizado)

El resultado debe ser un bloque Markdown estructurado:

### 🧠 Análisis de Estado
> "Has acumulado mucha carga en carrera (30km en 3 días). Tu rodilla reporta molestia leve."

### 📅 Rutina Adaptada: [Nombre Sesión]
- **Enfoque:** (Recuperación / Carga / Fuerza)
- **Duración:** XX min
- **Ejercicios:**
  1. [Nombre Ejercicio] - [Series]x[Reps] (Adaptación: Usar bandas elásticas por falta de pesas)
  2. ...

### ⚠️ Notas del Coach
- Advertencias específicas sobre lesiones o técnica.
- Justificación del cambio (ej. "Cambié impacto por bici para proteger rodilla").

## 🛠️ Manejo de Errores
- Si falta información sobre el equipo, asume "Peso Corporal" y pide confirmar.
- Si NotebookLM desaconseja la rutina, abortar y sugerir "Día de Descanso Total".
