# 🏃‍♂️ BioEngine V3 — Arquitectura Agéntica

[![Version](https://img.shields.io/badge/version-3.1.0_v1.0-blue.svg)](https://bioengine.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini_2.0-orange.svg)](https://deepmind.google/technologies/gemini/)

> **BioEngine V3** no es solo un registrador de entrenamientos; es un ecosistema agéntico que utiliza inteligencia artificial de última generación para actuar como tu Coach personal de Triatlón y Tenis, con un enfoque prioritario en la salud articular.

---

## 🌟 Características Principales

- **🧠 Cerebro Vivo (NotebookLM):** Integración profunda con tu base de conocimientos (fisioterapia, planes, técnica).
- **🌊 Streaming Chat (SSE):** Respuestas instantáneas y fluidas del AI Coach.
- **🛹 Dashboard de Sistema:** Panel de control de agentes, costes y salud semántica.
- **🫀 Skills Clínicas:** Módulos especializados en Biomecánica, Nutrición y Emergencia.
- **🛡️ Datos Blindados:** Validación estricta con Pydantic para garantizar la integridad física y digital.

---

## 🛠️ Inicio Rápido

Para iniciar todo el ecosistema (Frontend + Backend):

```powershell
.\run_bioengine.bat
```

> **Nota:** Asegúrate de tener configurado tu `.env` con las API Keys de Gemini.

---

## 📂 Navegación del Proyecto

| Sección | Descripción | Enlace |
| :--- | :--- | :--- |
| **Documentación** | Índice Maestro y Plan 2026 | [docs/README.md](./docs/README.md) |
| **Arquitectura** | Detalle de Agentes y Skills | [BIOENGINE_AGENTAL_V1.md](./docs/BIOENGINE_AGENTAL_V1.md) |
| **Backend** | FastAPI, SQLite & AI Logic | [backend/](./backend/) |
| **Frontend** | React, Dashboard & Streaming | [frontend/](./frontend/) |
| **Agentes** | Definición de Habilidades | [agent/skills/](./agent/skills/) |

---

## 🧪 Control de Calidad

El sistema incluye una suite de pruebas automatizadas para garantizar la estabilidad:

```powershell
# Ejecutar tests de validación y API
$env:PYTHONPATH=".;./backend"; pytest
```

---

## 📜 Licencia

Desarrollado con ❤️ por el equipo de BioEngine. Bajo licencia MIT.