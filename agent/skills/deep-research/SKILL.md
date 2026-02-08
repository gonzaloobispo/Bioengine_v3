---
name: deep-research
description: Agente de investigación que busca artículos científicos, papers y tendencias de entrenamiento para actualizar la base de conocimiento.
---

# Deep Research Agent

## 🔍 Cuándo usar este skill
- Mensualmente para actualizar protocolos de entrenamiento.
- Cuando el usuario pregunta por una tecnología nueva (ej. "Nuevas placas de carbono en Trail").
- Para profundizar en una patología detectada (ej. "Ejercicios específicos para síndrome de fricción de la cintilla iliotibial").

## ⚙️ Workflow
1. **Trigger:** Solicitud explícita o trigger temporal.
2. **Búsqueda:** Utilizar herramientas de búsqueda web (vía Antigravity) para encontrar fuentes académicas (PubMed, ResearchGate) o blogs técnicos de primer nivel.
3. **Generación:** Ejecutar `researcher_pro.py` para crear el documento base.
4. **Análisis:** Resumir los hallazgos en español dentro del documento.
5. **Integración:** El Coach leerá automáticamente estos archivos al estar en `docs/research/`.

## 🛠️ Herramientas
- `researcher_pro.py`: Generador de reportes estructurados.
- `search_web`: Herramienta primaria para recopilación de datos.

## 📤 Output
Documento de investigación en `docs/research/YYYYMMDD_topic.md`.
