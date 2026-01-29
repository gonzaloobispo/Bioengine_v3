# 🧠 CEREBRO VIVO - SISTEMA DE MEMORIA CONTEXTUAL DEL AI COACH

## 📋 RESUMEN EJECUTIVO

Se ha implementado un sistema de "Cerebro Vivo" que permite al AI Coach de BioEngine V3 tener:
1. **Memoria Base**: Conocimiento fundacional (plan de entrenamiento, perfil médico, lesiones)
2. **Memoria Evolutiva**: Capacidad de aprender y actualizar su conocimiento basado en las interacciones
3. **Línea de Tiempo**: Consciencia temporal del estado actual vs histórico del atleta

---

## 🎯 OBJETIVO

Crear un coach que NO sea genérico, sino que:
- Conozca tu plan de entrenamiento ("Tenis Master 49+")
- Recuerde tus lesiones (Tendinosis Cuadricipital Derecha)
- Aprenda de las conversaciones (insights, patrones)
- Registre eventos importantes (dolor, logros)
- Evolucione su memoria con el tiempo

---

## 🏗️ ARQUITECTURA IMPLEMENTADA

### Componentes Creados

#### 1️⃣ **ContextManager** (`backend/services/context_manager.py`)

**Responsabilidades:**
- Leer el conocimiento base desde `C:\BioEngine_V3\BioEngine_V3_Contexto_Base`
- Gestionar archivos de memoria persistente (JSON)
- Registrar eventos nuevos (dolor, logros)
- Actualizar el estado médico

**Métodos principales:**
```python
get_foundational_context()    # Lee plan + perfil + insights
get_pain_history(limit=10)    # Obtiene últimos registros de dolor
log_pain(level, notes)         # Registra nuevo evento de dolor
```

**Archivos que gestiona:**
- `Plan_Entrenamiento_Tenis_Master_49.md` - Plan de rehabilitación y ejercicios
- `user_context.json` - Perfil, lesiones activas, insights aprendidos
- `dolor_rodilla.json` - Historial de eventos de dolor

---

#### 2️⃣ **AIService Mejorado** (`backend/services/ai_service.py`)

**Cambios realizados:**

##### A. Inicialización del ContextManager
```python
def __init__(self):
    # ...
    self.context_manager = ContextManager()
```

##### B. Inyección de Contexto Base en Chat (`get_response`)
El sistema ahora incluye en CADA conversación:
- **Fecha actual** (para consciencia temporal)
- **Conocimiento base completo** (Plan + Perfil médico + Insights)
- **Instrucciones de auto-actualización**

##### C. Sistema de Comandos Ocultos
El AI puede emitir comandos que el sistema procesa automáticamente:
- `[COMMAND: LOG_PAIN: 7]` → Registra dolor nivel 7/10
- `[COMMAND: UPDATE_CONTEXT: ...]` → Actualiza contexto (futuro)

Estos comandos se eliminan de la respuesta final al usuario.

##### D. Procesamiento de Respuesta con Memoria
```python
# Detecta comandos en la respuesta de la IA
if "[COMMAND:" in response:
    # Extrae nivel de dolor
    pain_match = re.search(r"\[COMMAND: LOG_PAIN: (\d+)\]", response)
    if pain_match:
        self.context_manager.log_pain(level, notes)
    
    # Limpia comandos de la respuesta
    processed_response = re.sub(r"\[COMMAND:.*?\]", "", response)
```

##### E. Análisis del Coach con Contexto Base
El método `get_coach_analysis()` ahora incluye:
- Fecha actual
- Conocimiento base completo
- Estado de lesiones y fase del plan

---

## 📂 ESTRUCTURA DE ARCHIVOS DE MEMORIA

### Archivo: `user_context.json`
```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2026-01-29T15:50:00",
    "context_window_summary": "Usuario 49 años, tendinosis rotuliana, Fase 1"
  },
  "perfil_usuario": {
    "nombre": "Gonzalo Obispo",
    "edad": 49,
    "peso_objetivo_kg": 74
  },
  "historial_medico_resumido": {
    "lesiones_activas": [
      {
        "nombre": "Tendinosis Cuadricipital Derecha",
        "gravedad": "Moderada",
        "nivel_dolor_actual": 0,
        "tendencia": "Estable"
      }
    ]
  },
  "insights_aprendidos": [
    {
      "patron": "Ciclismo 45min → Dolor 0/10 (92% correlación)",
      "accion": "Priorizar ciclismo en semanas con dolor"
    }
  ]
}
```

### Archivo: `dolor_rodilla.json`
```json
{
  "registros": [
    {
      "fecha": "2026-01-29T15:30:00",
      "nivel": 7,
      "notas": "Registrado vía chat: Dolor al subir escaleras"
    }
  ]
}
```

---

## 🔄 FLUJO DE FUNCIONAMIENTO

### Caso 1: Usuario pregunta por su lesión

```
Usuario: "¿Qué sabes de mi rodilla?"

1. AIService llama a context_manager.get_foundational_context()
2. Se inyecta en el prompt:
   - Plan de entrenamiento completo
   - Lesión: Tendinosis Cuadricipital Derecha
   - Restricciones: Evitar impacto alto, priorizar ciclismo
   - Insights: "Ciclismo 45min → Dolor 0/10"
3. IA responde con conocimiento específico del atleta
```

### Caso 2: Usuario reporta dolor

```
Usuario: "Hoy me dolió la rodilla después de jugar tenis, un 6/10"

1. IA procesa el mensaje con contexto base
2. IA genera respuesta + comando oculto: 
   "Entiendo que... [COMMAND: LOG_PAIN: 6]"
3. AIService detecta el comando:
   - Registra en dolor_rodilla.json
   - Actualiza nivel_dolor_actual en user_context.json
   - Actualiza tendencia de la lesión
4. Usuario recibe respuesta limpia (sin el comando)
5. Próxima conversación: IA sabe del evento de dolor
```

### Caso 3: Análisis del Coach

```
Usuario: Click en "Análisis del Coach"

1. get_coach_analysis() carga:
   - Actividades recientes (DB)
   - Peso reciente (DB)
   - Contexto base (ContextManager)
2. Prompt incluye:
   - "FECHA ACTUAL: 2026-01-29"
   - Plan completo de "Tenis Master 49+"
   - Estado de lesiones: "Tendinosis activa, nivel 6/10"
   - Insights aprendidos
3. IA genera análisis consciente del plan y estado actual
```

---

## ✅ LO QUE SE IMPLEMENTÓ

- [x] `ContextManager` con lectura de plan Markdown
- [x] Integración en `AIService.__init__`
- [x] Inyección de contexto base en `get_response()`
- [x] Inyección de contexto base en `get_coach_analysis()`
- [x] Sistema de comandos ocultos [COMMAND: ...]
- [x] Procesamiento automático de LOG_PAIN
- [x] Actualización de `user_context.json` al registrar dolor
- [x] Consciente temporal (fecha actual en prompts)
- [x] Script de prueba `test_living_brain.py`

---

## ⚠️ LIMITACIONES ACTUALES

1. **Modelo con quota limitada**: Gemini 2.0 Flash alcanzó límite de cuota gratuita.
   - **Solución aplicada**: Cambio a `gemini-1.5-flash`

2. **Comandos limitados**: Solo se implementó LOG_PAIN.
   - **Futuro**: UPDATE_CONTEXT, MARK_ACHIEVEMENT, etc.

3. **Insights aprendidos**: Se leen pero no se auto-generan aún.
   - **Futuro**: IA detecta patrones y los agrega automáticamente

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

### Corto Plazo
1. ✅ Probar el chat interactivo con preguntas sobre el plan
2. ⬜ Verificar que el dolor se registre correctamente
3. ⬜ Probar el análisis del coach con contexto base

### Mediano Plazo
1. ⬜ Implementar más comandos (ACHIEVEMENT, PHASE_CHANGE)
2. ⬜ Auto-detección de patrones → insights aprendidos
3. ⬜ Notificaciones proactivas ("3 días sin entrenar")

### Largo Plazo
1. ⬜ Migrar memoria a SQLite para mejor indexación
2. ⬜ Integración con Google Drive para sincronización
3. ⬜ Dashboard de "Memoria" para visualizar evolución

---

## 🔧 CÓMO PROBAR

### Test 1: Consciencia de Lesión
```python
# En el chat del dashboard
"Hola Coach, ¿qué sabes de mi lesión de rodilla?"

# Esperado: Menciona "Tendinosis Cuadricipital Derecha"
```

### Test 2: Conocimiento del Plan
```python
"¿Qué ejercicios debo hacer esta semana?"

# Esperado: Menciona "Spanish Squat", "Short Foot", etc.
```

### Test 3: Registro de Dolor
```python
"Me dolió la rodilla un 7/10 hoy al jugar tenis"

# Verificar: C:\BioEngine_V3\BioEngine_V3_Contexto_Base\data_cloud_sync\dolor_rodilla.json
# Debe contener un nuevo registro con nivel: 7
```

### Test 4: Evolución de Memoria
```python
# Sesión 1: "Me duele la rodilla"
# Sesión 2 (1 día después): "¿Cómo está mi rodilla según lo que te conté?"

# Esperado: IA recuerda el dolor reportado anteriormente
```

---

## 📊 IMPACTO EN EL USUARIO

### Antes (Sin Cerebro Vivo)
- ❌ Coach genérico sin conocimiento del plan
- ❌ No recuerda lesiones entre sesiones
- ❌ Respuestas basadas solo en actividad reciente
- ❌ Sin consciencia de fase de rehabilitación

### Ahora (Con Cerebro Vivo)
- ✅ Coach conoce el plan "Tenis Master 49+"
- ✅ Recuerda lesiones activas y restricciones
- ✅ Respuestas contextualizadas al estado actual
- ✅ Registra eventos automáticamente
- ✅ Consciencia temporal (sabe qué día es)
- ✅ Memoria evolutiva (aprende de conversaciones)

---

**Versión**: 1.0  
**Fecha**: 29 de Enero, 2026 - 15:50 PM  
**Estado**: ✅ IMPLEMENTADO Y LISTO PARA PRUEBAS  
**Implementado por**: Antigravity AI
