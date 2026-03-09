# BioEngine V3 - Ecosistema Agéntico SOTA 2026

[![Version](https://img.shields.io/badge/version-4.2.0_v1.0-red.svg)](https://bioengine.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini_2.0-orange.svg)](https://deepmind.google/technologies/gemini/)

BioEngine V3 es una plataforma avanzada para la salud articular e integridad física del atleta, potenciada por **Gemini 3 Pro** y una arquitectura agéntica de última generación.

## 📖 Documentación Principal
Para entender la visión técnica, las misiones ejecutadas y el estado actual del proyecto, consulta nuestra documentación oficial:

👉 **[Arquitectura Maestra V4.2 (SOTA 2026)](docs/ARCHITECTURE_V4_MASTER.md)**
👉 **[Guía Funcional y de Testeo (QA Manual)](docs/FUNCTIONAL_GUIDE_V4.md)**
👉 **[Índice de Documentación y RoadMap](docs/README.md)**

---

## 🚀 Inicio Rápido

Para iniciar el ecosistema híbrido (Frontend V3 + Engine V4):

```powershell
.\LAUNCH_BIOENGINE.bat
```

> **Nota:** Este lanzador asegura que los procesos previos se limpien y utiliza la configuración local de `c:\BioEngine_V3`.

---

## 📂 Estado del Proyecto (Consolidado)

Este repositorio ha sido restaurado a un estado **Híbrido Estable**:
- **UI:** Interfaz BioEngine V3 original (Restaurada).
- **Engine:** Lógica de Backend V4 (Agente-Céntrica, con soporte de video y razonamiento clínico).
- **Estructura:** Modular (Componentes separados en `frontend/src/components/dashboard`).

| Sección | Descripción | Enlace |
| :--- | :--- | :--- |
| **Documentación** | Índice Maestro y Plan 2026 | [docs/README.md](./docs/README.md) |
| **Backend** | FastAPI, SQLite & AI Logic | [backend/](./backend/) |
| **Frontend** | React V3 + Dashboard Modular | [frontend/](./frontend/) |
| **Maintenance** | Scripts de utilidad | [scripts/](./scripts/) |

---

## 🧪 Control de Calidad

El sistema utiliza validación estricta con Pydantic y un sistema de "Safety Lock" clínico.

```powershell
# Ejecutar tests de validación y API
$env:PYTHONPATH=".;./backend"; pytest
```

---

## 📜 Licencia

Desarrollado con ❤️ por el equipo de BioEngine & Antigravity. Bajo licencia MIT.