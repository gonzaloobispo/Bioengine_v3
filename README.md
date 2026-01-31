<<<<<<< HEAD
# 🏃‍♂️ BioEngine V3 - Sistema de Entrenamiento Inteligente

Contexto rápido para asistentes al abrir una nueva terminal:
- Lee primero `docs/README.md` (índice maestro + plan a seguir).
- Luego este `README.md` (estructura y arranque del sistema).
- Si necesitas estado/decisiones técnicas: `docs/MEJORAS_COMPLETADAS.md`, `docs/NAVEGACION_COMPLETADA.md`, `docs/MULTI_CEREBRO_RESUMEN.md`, `docs/CEREBRO_VIVO_IMPLEMENTACION.md`.

**Sistema de análisis biométrico y coaching deportivo personalizado**

---

## 🎯 ¿Qué es BioEngine V3?

BioEngine V3 es un sistema completo para:
- 📊 Visualizar datos de entrenamientos (Garmin) y biometría (Withings)
- 🤖 Chat con AI Coach personalizado (conoce tu plan, lesiones y equipamiento)
- 📈 Análisis automático de rendimiento
- 🔄 Sincronización automática con APIs de Garmin y Withings

---

## 🚀 Inicio Rápido

### 1. Ejecutar el sistema:
```powershell
.\run_bioengine.bat
```

El script:
- ✅ Inicia el backend (FastAPI en puerto 8000)
- ✅ Inicia el frontend (React en puerto 5173)
- ✅ Abre automáticamente el navegador

### 2. Acceder al dashboard:
```
http://localhost:5173
```

---

## 📁 Estructura del Proyecto

```
BioEngine_V3/
├── backend/                    # API FastAPI + servicios
│   ├── main.py                # API endpoints
│   ├── services/              # Servicios (AI, sincronización)
│   │   ├── ai_service.py     # Motor de AI Coach
│   │   ├── context_manager.py # Memoria persistente del coach
│   │   ├── multi_model_client.py # Cliente multi-modelo
│   │   ├── cost_control.py    # Control de gastos
│   │   ├── garmin_service.py  # Sync con Garmin
│   │   └── withings_service.py # Sync con Withings
│   └── migrations/            # Migraciones de DB
│
├── frontend/                   # React UI
│   ├── src/
│   │   ├── App.jsx           # Componente principal
│   │   ├── index.css         # Estilos globales
│   │   └── main.jsx          # Entry point
│   └── package.json
│
├── db/                         # 🗄️ Base de datos
│   └── bioengine_v3.db        # SQLite database
│
├── docs/                       # 📚 Documentación completa
│   ├── README.md              # Índice maestro
│   ├── LISTO_PARA_USAR.md     # Guía de inicio rápido
│   ├── equipamiento.md        # Inventario de equipamiento
│   ├── AI Coach/              # Docs del cerebro vivo
│   ├── Multi-Modelo/          # Docs del sistema multi-cerebro
│   ├── Mejoras/               # Docs de funcionalidades
│   └── Guías/                 # Guías de uso
│
├── logs/                       # 📋 Logs del sistema
│   ├── README.md              # Guía de gestión
│   ├── ai_service_debug.log   # Log activo
│   └── old/                   # Logs históricos
│
├── respaldos/                  # 💾 Backups
│   └── RESPALDO_Contexto_Base_*.zip
│
├── BioEngine_V3_Contexto_Base/ # Conocimiento base del atleta
│   ├── Plan_Entrenamiento_Tenis_Master_49.md
│   ├── data_cloud_sync/
│   │   ├── user_context.json   # Perfil y memoria evolutiva
│   │   └── dolor_rodilla.json  # Tracking de lesión
│   └── Historial Medico/       # PDFs médicos
│
├── scripts/                    # Scripts auxiliares
│   ├── setup_secrets.py       # Configurar API keys
│   └── sync_data.py           # Sincronizar datos manualmente
│
├── run_bioengine.bat          # 🚀 Script de inicio
├── README.md                  # Este archivo
└── .gitignore                 # Configuración de Git
```

---

## 📚 Documentación

Toda la documentación técnica está en la carpeta **`docs/`**:

- **[README.md](docs/README.md)** - Índice maestro (plan y accesos rápidos)

### 🧠 Sistema "Cerebro Vivo" (AI Coach)
- **[CEREBRO_VIVO_LISTO.md](docs/CEREBRO_VIVO_LISTO.md)** - Guía de uso del AI Coach
- **[CEREBRO_VIVO_IMPLEMENTACION.md](docs/CEREBRO_VIVO_IMPLEMENTACION.md)** - Documentación técnica
- **[CONTEXTO_BASE_COMPLETO.md](docs/CONTEXTO_BASE_COMPLETO.md)** - Qué conoce el coach

### 🤖 Sistema Multi-Modelo (Gemini, Claude, GPT-4)
- **[MULTI_CEREBRO_RESUMEN.md](docs/MULTI_CEREBRO_RESUMEN.md)** - ⭐ Guía principal
- **[SISTEMA_MULTI_CEREBRO.md](docs/SISTEMA_MULTI_CEREBRO.md)** - Documentación técnica
- **[CONTROL_DE_GASTOS.md](docs/CONTROL_DE_GASTOS.md)** - Cómo evitar costos
- **[CONFIGURACION_COMPLETADA.txt](docs/CONFIGURACION_COMPLETADA.txt)** - Estado actual

### 📊 Mejoras y Funcionalidades
- **[MEJORAS_COMPLETADAS.md](docs/MEJORAS_COMPLETADAS.md)** - Resumen de todas las mejoras
- **[NAVEGACION_COMPLETADA.md](docs/NAVEGACION_COMPLETADA.md)** - Navegación del dashboard
- **[MEJORA_1_FILTROS_FECHA.md](docs/MEJORA_1_FILTROS_FECHA.md)** - Filtros por fecha
- **[NUEVAS_VISUALIZACIONES.md](docs/NUEVAS_VISUALIZACIONES.md)** - Gráficos mejorados

### 🔧 Guías y Procedimientos
- **[LIMPIEZA_COMPLETADA.md](docs/LIMPIEZA_COMPLETADA.md)** - Limpieza del contexto base
- **[COMO_PROBAR.md](docs/COMO_PROBAR.md)** - Cómo probar el sistema

### 🐛 Solución de Problemas
- **[PROBLEMA_RESUELTO.md](docs/PROBLEMA_RESUELTO.md)** - Problemas resueltos
- **[ESTADO_ACTUAL.md](docs/ESTADO_ACTUAL.md)** - Estado del proyecto

---

## 🔑 Configuración Inicial

### 1. API Keys de Servicios Externos

```powershell
# Configurar Gemini, Garmin, Withings
python scripts/setup_secrets.py
```

Necesitarás:
- **Google Gemini API Key** (gratis en https://aistudio.google.com/apikey)
- **Garmin OAuth** (consumer key + secret)
- **Withings OAuth** (client ID + secret)

### 2. Sincronizar Datos

```powershell
# Primera sincronización
python scripts/sync_data.py
```

Esto descargará:
- Actividades de Garmin (últimos 30 días)
- Peso de Withings (últimos 30 días)

---

## 💡 Características Principales

### 🤖 AI Coach Consciente
- ✅ Conoce tu plan de entrenamiento (Tenis Master 49+)
- ✅ Conoce tus lesiones (tendinosis cuadricipital)
- ✅ Conoce tu equipamiento (zapatillas, plantillas obligatorias)
- ✅ Memoria evolutiva (recuerda conversaciones previas)
- ✅ Registro automático de dolor

### 📊 Dashboard Interactivo
- ✅ Gráficos de actividad (distancia, duración, calorías)
- ✅ Gráficos de peso y composición corporal
- ✅ Filtros por fecha (día, semana, mes, año, todo)
- ✅ Tarjetas de equipamiento con tracking de km
- ✅ Navegación fluida entre vistas

### 🔄 Sincronización Automática
- ✅ Garmin Connect API (OAuth 1.0)
- ✅ Withings API (OAuth 2.0)
- ✅ Actualización manual o automática

---

## 🧠 ¿Cómo Funciona el AI Coach?

El coach tiene acceso a:

```
1. Tu Plan de Entrenamiento
   - 3 fases de rehabilitación
   - Ejercicios específicos para rodilla
   - Restricciones biomecánicas

2. Tu Perfil Médico
   - Lesiones activas (tendinosis cuadricipital)
   - Nivel de dolor actual
   - Tendencias de recuperación

3. Tu Equipamiento
   - Zapatillas (Kayano, Speedgoat, Brooks, etc.)
   - Bicicleta Trek con sensores
   - Plantillas ortopédicas OBLIGATORIAS

4. Tus Datos Recientes
   - Últimas 10 actividades
   - Últimas 5 mediciones de peso
   - Patrones detectados
```

### Ejemplo de Conversación:

```
Usuario: "¿Qué zapatillas uso para trail?"

Coach: "Para terreno técnico usa las Hoka Speedgoat 6 (máxima 
amortiguación). Para senderos fáciles, las New Balance Garoe. 
IMPORTANTE: ¿Ya tienes puestas las plantillas ortopédicas? 
Son OBLIGATORIAS por tu pie plano severo grado III."
```

---

## 🛡️ Sistema Multi-Modelo (Fallback Automático)

Modelos disponibles (en orden de prioridad):

1. **Gemini 2.0 Flash Thinking** - 🆓 GRATIS (siempre habilitado)
2. **Gemini 1.5 Flash** - 🆓 GRATIS (siempre habilitado)
3. **Claude 3.5 Sonnet** - 🔒 BLOQUEADO (configurable, $5 gratis)
4. **GPT-4 Turbo** - 🔒 BLOQUEADO (configurable, PAGA)

**Costo actual: $0.00**

Si Gemini falla → Automáticamente intenta el siguiente modelo disponible.

---

## 📈 Próximas Mejoras

Ver [docs/RESUMEN_IMPLEMENTACION.md](docs/RESUMEN_IMPLEMENTACION.md) para roadmap completo.

- ⬜ Auto-sincronización cada hora
- ⬜ Dashboard de modelo IA activo en UI
- ⬜ Comparación de respuestas entre modelos
- ⬜ Exportación de datos a CSV
- ⬜ Notificaciones de lesiones

---

## 🐛 Solución de Problemas

### Backend no inicia:
```powershell
# Windows (PowerShell)
Get-Content backend_err.log
```
```bash
# Linux/macOS
cat backend_err.log
```

### Frontend no carga:
```powershell
# Windows (PowerShell)
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```
```bash
# Linux/macOS
cd frontend
rm -rf node_modules
npm install
```

### AI Coach no responde:
```powershell
# Verificar API key de Gemini
python -c "import sqlite3; conn = sqlite3.connect('db/bioengine_v3.db'); cursor = conn.cursor(); row = cursor.execute('SELECT credentials_json FROM secrets WHERE service=?', ('gemini',)).fetchone(); print('Key:', row[0][:50] if row else 'NO CONFIGURADA'); conn.close()"
```

---

## 📞 Soporte

- 📚 Documentación completa: `docs/`
- 🔍 Logs de debug: `ai_service_debug.log`
- 🐛 Problemas conocidos: `docs/PROBLEMA_RESUELTO.md`

---

**Versión:** 3.0  
**Última actualización:** 29 de Enero, 2026  
**Stack:** Python FastAPI + React + SQLite + Google Gemini AI
=======
# Antigravity Template v2
>>>>>>> d1a067b60927735b71783355d0ed03445a0a5280
