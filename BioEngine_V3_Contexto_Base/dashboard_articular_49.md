# 🩺 Dashboard de Rendimiento y Salud Articular (Atletas 49+)

Este documento establece la arquitectura lógica y los indicadores biológicos/biomecánicos críticos para la monitorización de BioEngine. El foco es la **integridad de la rodilla** y la **prevención de lesiones** mediante la gestión de carga y técnica.

---

## 1. Objetivo del Dashboard
Monitorizar la carga interna y externa para mantener al atleta en una "zona segura" de entrenamiento, maximizando la adaptación fisiológica sin comprometer la integridad deomusculoesquelética, utilizando un enfoque preventivo basado en datos científicos.

## 2. KPIs Transversales (Gestión de Carga y Recuperación)

| KPI | Definición / Lógica | Zona Segura |
|---|---|---|
| **ACWR (Acute:Chronic)** | Relación carga última semana vs promedio 4 semanas (EWMA). | 0.8 – 1.3 |
| **HRV (rMSSD)** | Estado del Sistema Nervioso Autónomo. Monitorizar matutino. | Estable (±10% basal) |
| **Sueño & Wellness** | Horas sueño + Calidad + Sensación subjetiva de dolor rodilla. | > 7h / Dolor < 3 |

> [!IMPORTANT]
> **Regla de Oro:** Si el sueño es < 7h y el dolor de rodilla > 3/10, se debe reducir obligatoriamente la carga de impacto (Running/Tenis).

## 3. KPIs Específicos por Disciplina

### A. Running (Protección Biomecánica)
1. **Cadencia (spm):** Meta **170 - 190 spm**. El aumento del 5-10% reduce drásticamente el impacto en la rodilla (anterior y tibia).
2. **Oscilación Vertical:** Meta **6-10 cm**. Menos rebote = Menos fuerza de reacción del suelo.
3. **Tiempo de Contacto (GCT):** Meta **< 250-300 ms**. Tiempos altos indican absorción pasiva peligrosa por las articulaciones.

### B. Ciclismo (Eficiencia y Ergonomía)
*   **Balance L/R:** Meta **50/50** (tolerancia ±2%). Asimetría indica riesgo de sobrecarga unilateral.
*   **Torque Effectiveness (TE):** Meta **> 70%**. Pedaleo "redondo" para evitar picos de tensión en el tendón rotuliano.

### C. Tenis (Gestión de Impactos)
*   **Volumen de Impactos:** Control de aceleraciones/desaceleraciones bruscas.
*   **Superficie:** Priorizar tierra batida ante molestias articulares.

### D. Hipertrofia (Estructura Protectora)
*   **Ratio Isquios:Cuádriceps (H:Q):** Meta **0.6 - 1.0**. Isquios fuertes protegen el LCA del desplazamiento anterior.
*   **Intensidad (RIR):** Meta **RIR 1-3**. Evitar el fallo técnico para no degradar la forma y proteger la articulación.

## 4. Lógica Agéntica (System 2 Reasoning)

```python
IF (HRV < Basal OR Sueño < 6h):
    Recomendar: Zona 2 Bici o Recuperación Activa.
    Bloquear: Running de alta intensidad / Tenis.

IF (ACWR > 1.3):
    Alerta: "Riesgo Incrementado de Lesión".
    Acción: Reducir volumen semanal un 20%.

IF (Cadencia < 170 spm):
    Recomendación: "Entrenamiento de Metrónomo".
```

## 5. Estrategia de Ejercicios Excéntricos (Protección Activa)
*   **Cuádriceps:** Sentadilla Excéntrica (Tempo 3-1), Sentadilla a una pierna asistida.
*   **Isquiotibiales:** Curl Nórdico (Frenado excéntrico vital para LCA).
*   **Core:** Planchas laterales y puentes de glúteos (Protección de la cadena cinética).

---
*Documento de Referencia para BioEngine Coach v4.*
