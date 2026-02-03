---
name: log-manager
description: Gestiona la rotación, limpieza y archivado de logs del sistema para prevenir saturación de disco.
---

# Log Manager (Mantenimiento)

## 🔍 Cuándo usar este skill
- En tareas de mantenimiento programado (mensual/semanal).
- Cuando el sistema detecta que los archivos de log superan el umbral crítico (>10MB).
- Para auditar el volumen de datos generados por los agentes.

## ⚙️ Lógica de Operación
1. **Identificación:** Localiza los archivos configurados en `backend/config.py` (`LOG_FILE`, `AI_DEBUG_LOG`, etc.).
2. **Evaluación:** Comprueba el tamaño de cada archivo.
3. **Rotación:** Si un archivo supera el límite (ej. 5MB):
   - Renombra `file.log` -> `file.log.YYYYMMDD`.
   - Crea un nuevo `file.log` vacío.
4. **Purga:** Mantiene solo las últimas 5 versiones rotadas, eliminando las más antiguas.

## 🛠️ Scripts Incluidos
- `rotate_logs.py`: Script ejecutable para realizar la limpieza.

## 📤 Output esperado
Un reporte del espacio liberado y los archivos rotados.
