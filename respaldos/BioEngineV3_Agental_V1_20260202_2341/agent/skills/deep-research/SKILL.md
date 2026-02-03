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
2. **Búsqueda:** Utilizar herramientas de búsqueda web para encontrar fuentes académicas (PubMed, ResearchGate) o blogs técnicos de primer nivel.
3. **Análisis:** Resumir los hallazgos en español.
4. **Integración:** Proponer la adición de este resumen a la Memoria Evolutiva o alertar al Coach sobre el nuevo conocimiento.

## 🛠️ Scripts / Prompts
- Este skill se ejecuta principalmente mediante el Agente Antigravity siguiendo este protocolo de búsqueda.

## 📤 Output
Documento de investigación en `docs/research/YYYY-MM-research-topic.md`.
