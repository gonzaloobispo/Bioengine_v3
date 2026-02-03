---
name: emergency
description: Detecta anomalías biológicas graves (ej. pulso en reposo alto, VFC desplomada) y activa protocolos de alerta.
---

# Protocolos de Emergencia y Riesgo

## 🔍 Cuándo usar este skill
- Cada vez que se procesen nuevos datos de salud del día (HealthKit/Garmin).
- Cuando el usuario reporte síntomas como "mareo", "dolor de pecho" o "palpitaciones".
- Cuando el skill `entrenador-adaptativo` detecte métricas fuera de rango antes de planificar la sesión.

## 📥 Inputs Necesarios
1.  **Datos Vitales:**
    - Frecuencia Cardíaca en Reposo (RHR).
    - Variabilidad Cardíaca (HRV/VFC).
    - Sueño profundo (horas).
2.  **Síntomas Reportados:** Texto libre (opcional).

## ⚙️ Workflow

### Paso 1: Triaje de Signos Vitales
1.  Invocar `scripts/check_vitals.py`.
2.  Aplicar reglas deterministas (No IA, seguridad 100% lógica):
    - **Regla Roja:** RHR > +15% del promedio mensual O HRV drops < -40%.
    - **Regla Amarilla:** Sueño < 4h + Entrenamiento Intenso programado.

### Paso 2: Evaluación de Riesgo
1.  Si **Status == RED**:
    - Abortar cualquier entrenamiento intenso.
    - Recomendar: "Visita médica o descanso absoluto".
2.  Si **Status == YELLOW**:
    - Cambiar sesión a "Recuperación Activa" (Zona 1).

## 📤 Output (Formato Estandarizado)

### 🚨 Reporte de Seguridad Biológica
- **Estado:** [🟢 OPERATIVO / 🟡 PRECAUCIÓN / 🔴 ALERTA]
- **Acción Requerida:** Ninguna / Modificar Rutina / Parar Totalmente

#### Detalle de Anomalías:
- **HRV:** 25ms (⚠️ Baja - Sistema nervioso estresado).
- **Pulso Reposo:** 48 bpm (🟢 Normal).

## 🛠️ Manejo de Errores
- Si los datos son nulos (ej. reloj no usado al dormir), asumir riesgo **AMARILLO** por falta de información si hay síntomas reportados.
- Si no hay síntomas ni datos, asumir **VERDE** (Operativo).
