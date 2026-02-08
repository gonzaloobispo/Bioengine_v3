# 🔒 CONTROL DE GASTOS - MODELOS PAGOS DISPONIBLES PERO DESHABILITADOS

## 📋 CÓMO FUNCIONA

### Concepto:
Puedes **configurar las API keys** de modelos pagos (Claude, GPT-4), pero **NO se usarán automáticamente**.

### Estado por defecto:
- 🆓 **Gemini** → ✅ SIEMPRE HABILITADO (gratis)
- ⚠️ **Claude** → 🔒 BLOQUEADO (configuras key pero no se usa)
- 💰 **GPT-4** → 🔒 BLOQUEADO (configuras key pero no se usa)

### Cuándo activar modelos pagos:
Solo cuando **tú decidas conscientemente gastar dinero**.

---

## 🛠️ COMANDOS DE CONTROL

### Ver estado actual:
```powershell
cd c:\BioEngine_V3
python backend/services/cost_control.py status
```

**Salida esperada:**
```
📊 ESTADO DE MODELOS:

🆓 Modelos Gratuitos:
  • gemini: 50 usos

💰 Modelos Pagos:
  🔒 anthropic: 0 usos, $0.0000
  🔒 openai: 0 usos, $0.0000

💵 Costo total estimado: $0.0000
```

### Habilitar modelos pagos temporalmente:
```powershell
# Por 60 minutos (default)
python backend/services/cost_control.py enable

# Por 30 minutos
python backend/services/cost_control.py enable 30

# Por 2 horas (120 min)
python backend/services/cost_control.py enable 120
```

**Salida:**
```
✅ Modelos pagos habilitados por 60 minutos (máx $1.0)
⏰ Se deshabilitarán automáticamente después
```

### Deshabilitar modelos pagos:
```powershell
python backend/services/cost_control.py disable
```

**Salida:**
```
🔒 Modelos pagos deshabilitados. Solo se usarán modelos gratuitos.
```

---

## 🎯 CASOS DE USO

### Caso 1: Uso normal (Solo Gemini gratis)
```
1. Usuario escribe mensaje
2. Sistema usa Gemini 2.0 (gratis)
3. Si falla → Gemini 1.5 (gratis)
4. Si ambos fallan → Error (no intenta modelos pagos)
```

### Caso 2: Gemini no funciona + Necesitas respuesta urgente
```bash
# Habilitas modelos pagos por 30 minutos
python backend/services/cost_control.py enable 30
```

```
1. Usuario escribe mensaje
2. Sistema intenta Gemini 2.0 → Falla
3. Sistema intenta Gemini 1.5 → Falla
4. Sistema intenta Claude 3.5 (ahora permitido)
   💰 ADVERTENCIA: Usando Claude - Genera costos
5. Funciona → Respuesta generada
6. Después de 30 min → Claude se bloquea automáticamente
```

### Caso 3: Quieres probar GPT-4 específicamente
```bash
# Habilitas modelos pagos
python backend/services/cost_control.py enable 15

# Forzas error en Gemini (desconectas internet temporalmente)
# El sistema pasa a Claude → GPT-4
```

---

## 📊 TABLA DE CONFIGURACIÓN (DB)

La tabla `model_cost_config` controla todo:

| provider | cost_type | allow_usage | Significado |
|----------|-----------|-------------|-------------|
| gemini | free | 2 | Siempre permitido |
| anthropic | free_tier | 0 | 🔒 Bloqueado |
| openai | paid | 0 | 🔒 Bloqueado |

**Valores de `allow_usage`:**
- **0**: 🔒 BLOQUEADO - No se usará aunque tenga API key
- **1**: ⏰ TEMPORAL - Permitido temporalmente (por X minutos)
- **2**: ✅ SIEMPRE - Siempre permitido (solo para modelos gratuitos)

---

## 🔗 INTEGRACIÓN CON MultiModelClient

Cuando `MultiModelClient.generate()` se ejecuta:

```python
for model in fallback_order:
    provider = model["provider"]
    
    # 1. Verificar si tiene API key
    if not has_api_key(provider):
        skip()
    
    # 2. Verificar si está permitido por CostControl
    if not cost_control.is_provider_allowed(provider):
        skip()  # 🔒 BLOQUEADO
    
    # 3. Intentar usar el modelo
    try:
        response = call_model()
        return response
    except:
        continue
```

**Resultado:**
- Si `allow_usage=0` para `openai` → GPT-4 se saltea aunque tengas API key
- Si `allow_usage=1` → Se permite usar temporalmente
- Si `allow_usage=2` → Siempre se usa (caso de Gemini)

---

## 💡 VENTAJAS DEL SISTEMA

### ✅ Tienes las keys configuradas
- No necesitas buscarlas cuando las necesites
- Están listas para usar en emergencias

### ✅ Pero no gastas por error
- Por defecto BLOQUEADOS
- Requiere acción consciente para activar

### ✅ Control temporal
- Activas por 30-60 minutos
- Se desactivan automáticamente

### ✅ Transparencia total
- Log registra cada uso
- Sabes exactamente cuándo se usa un modelo pago

---

## 🚀 SETUP COMPLETO

### 1. Configurar todas las API keys:
```powershell
python scripts\setup_multi_model.py
```

El script te pedirá:
- ✅ Gemini (gratis) - YA CONFIGURADO
- ⚠️ Claude (free tier → paga) - OPCIONAL
- 💰 OpenAI GPT-4 (paga) - OPCIONAL, con advertencia clara

### 2. Verificar estado:
```powershell
python backend/services/cost_control.py status
```

Deberías ver:
```
🆓 Modelos Gratuitos:
  • gemini: 0 usos

💰 Modelos Pagos:
  🔒 anthropic: 0 usos (BLOQUEADO)
  🔒 openai: 0 usos (BLOQUEADO)
```

### 3. Usar normalmente:
Todo funciona con Gemini (gratis), sin costos.

### 4. Si necesitas modelos pagos:
```powershell
# Habilitar por 1 hora
python backend/services/cost_control.py enable 60
```

---

## 📝 EJEMPLO PRÁCTICO

### Escenario: Quieres comparar respuestas de diferentes modelos

```powershell
# 1. Pregunta con Gemini (gratis, default)
# En el chat: "Explícame X"
# Respuesta de Gemini 2.0

# 2. Ahora quieres comparar con GPT-4
python backend/services/cost_control.py enable 10  # Solo 10 min

# 3. Forzar que use GPT-4 (temporalmente deshabilitar Gemini)
# O simplemente esperar a que Gemini falle por cuota

# 4. En el chat: "Explícame X" (misma pregunta)
# 💰 ADVERTENCIA: Usando GPT-4 Turbo - Genera costos
# Respuesta de GPT-4

# 5. Comparas ambas respuestas

# 6. Después de 10 min → GPT-4 se bloquea automáticamente
python backend/services/cost_control.py status
# 🔒 openai: 1 uso, $0.02
```

---

## ⚠️ LIMITACIONES ACTUALES

1. **Auto-deshabilitado no implementado aún**
   - Tienes que deshabilitar manualmente con `disable`
   - TODO: Implementar tarea programada

2. **Estimación de costos aproximada**
   - Se calcula basado en tokens promedio
   - No es 100% exacto

3. **Sin límite de gasto estricto**
   - Puedes gastar más del "máximo" si habilitas varias veces
   - TODO: Implementar límite acumulado mensual

---

**Estado Actual:** 📋 DOCUMENTADO - ✅ INTEGRADO EN ANÁLISIS DEL COACH  
**Próximo Paso:** Extender fallback al chat en `AIService.py`
