# BioEngine V3 - Lista de Tareas

## Estado Actual: 2026-01-31

---

## ✅ COMPLETADO

### Frontend
- [x] Refactorización de `App.jsx` - estructura modular
- [x] Componente `Sidebar` extraído
- [x] Componente `CoachAnalysisCard` extraído
- [x] Componente `KPIOverview` extraído
- [x] Componente `ActivityTable` extraído
- [x] Componente `BiometricsView` extraído
- [x] Componente `EquiposView` extraído
- [x] Componente `MemoryView` extraído
- [x] Componente `ChatSidebar` extraído
- [x] Componente `CalendarView` extraído
- [x] Hook `useBioEngineData` - manejo centralizado de datos
- [x] Sistema de notificaciones Toast
- [x] Integración de header `X-Admin-Token` para sincronización

### Backend
- [x] Migración a `google-genai` SDK (reemplaza `google.generativeai` deprecado)
- [x] Actualización de nombres de modelos Gemini
- [x] Sistema de fallback multi-modelo
- [x] Logging de debug para token de admin
- [x] Tests de API básicos (6/6 pasando)
- [x] Flag `AI_ENABLED` para pausar APIs de IA

---

## ⏸️ PAUSADO (Pendiente API Key válida)

### APIs de IA
- [ ] Resolver cuota de Gemini (crear proyecto nuevo en Google AI Studio)
- [ ] Reactivar `AI_ENABLED = True` en `ai_service.py`
- [ ] Probar análisis del coach
- [ ] Probar chat con IA

---

## 🔧 EN PROGRESO

### Sincronización de Datos
- [ ] Verificar conexión Garmin
  - [ ] Probar autenticación
  - [ ] Validar sincronización de actividades
  - [ ] Revisar duplicados
- [ ] Verificar conexión Withings
  - [ ] Probar refresh de tokens
  - [ ] Validar sincronización de peso
  - [ ] Revisar datos en dashboard

### Dashboard
- [ ] Verificar vista de Actividades (filtros funcionando)
- [ ] Verificar vista de Biometría (gráficos de peso)
- [ ] Verificar vista de Calendario (actividades por día)
- [ ] Verificar vista de Equipos (km por zapatilla/bici)
- [ ] Verificar vista de Memoria (acceso con token)
- [ ] Verificar KPIs dinámicos

---

## 📋 PENDIENTE (Post-reactivación IA)

### Tests
- [ ] Tests unitarios para componentes frontend
- [ ] Tests de integración para sincronización
- [ ] Tests de AI service con mocks

### UI/UX
- [ ] Pulir animaciones y transiciones
- [ ] Mejorar responsive design
- [ ] Agregar estados de carga más descriptivos

### Funcionalidades
- [ ] Exportar datos a CSV/Excel
- [ ] Configuración de usuario (tokens, preferencias)
- [ ] Notificaciones push para metas

---

## 🔑 NOTAS IMPORTANTES

### Para reactivar IA:
1. Crear nuevo proyecto en Google AI Studio
2. Generar nueva API key
3. Ejecutar: `python backend/update_key.py` (actualizar key primero)
4. En `backend/services/ai_service.py`: cambiar `AI_ENABLED = True`
5. Reiniciar backend

### Credenciales actuales:
- Admin Token: `bioengine-local`
- DB Path: `db/bioengine_v3.db`
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
