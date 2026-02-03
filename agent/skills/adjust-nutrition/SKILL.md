---
name: adjust-nutrition
description: Calcula ajustes calóricos diarios basándose en la carga de entrenamiento aguda (ACWR) y el plan base del nutricionista.
---

# Nutrición Adaptativa

## 🔍 Cuándo usar este skill
- Al inicio del día, para planificar la ingesta según el entrenamiento agendado.
- Después de una sesión muy intensa (RPE > 8) o inesperadamente larga.
- Cuando el usuario pregunte "¿Qué debo comer hoy?" o "¿Merezco pizza?".

## 📥 Inputs Necesarios
1.  **Carga del Día (Load):** Duración * RPE (Session RPE).
2.  **ACWR Actual:** Ratio de Carga Aguda/Crónica (si disponible).
3.  **Plan Base:** Calorías de mantenimiento definidas en `resources/Plan de Alimentación...pdf`.
    - *Valor por defecto:* 2400 kcal (Hipotético, ajustar según PDF).

## ⚙️ Workflow

### Paso 1: Determinar Demanda
1.  Calcular el gasto energético de la actividad (METs * peso * horas).
2.  Comparar ACWR:
    - **ACWR > 1.3 (+30% carga):** Superávit requerido (+300-500 kcal).
    - **ACWR < 0.8 (Descarga):** Mantenimiento o ligero déficit.
    - **ACWR 0.8-1.3:** Normocalórica.

### Paso 2: Ejecución de Script
1.  Invocar `scripts/calculate_macros.py`.
2.  El script aplica reglas:
    - Si la sesión dura > 90min -> Añadir 60g Carbohidratos intra/post.
    - Si es día de fuerza -> Priorizar proteína en el post-entreno (25-30g).

### Paso 3: Generación de Menú (Sugerencia)
1.  Seleccionar opciones del PDF base según el ajuste.
    - *Ejemplo:* Si toca superávit, sugerir "Opción B de Merienda" (más densa).

## 📤 Output (Formato Estandarizado)

### 🥑 Plan Nutricional del Día
- **Objetivo:** [Superávit / Mantenimiento / Recarga]
- **Calorías Meta:** ~2800 kcal

#### Ajustes Específicos:
1.  **Pre-Entreno:** Añadir 1 banana extra por la sesión de 10k.
2.  **Post-Entreno:** Asegurar proteina (revisar pág 4 del PDF).
3.  **Cena:** Reducir grasas para mejorar descanso.

## 🛠️ Manejo de Errores
- Si no hay datos de entrenamiento futuro, asumir "Día de Descanso" (Mantenimiento basal).
- Advertir siempre: "Esto es una sugerencia algorítmica, sigue siempre a tu profesional de salud".
