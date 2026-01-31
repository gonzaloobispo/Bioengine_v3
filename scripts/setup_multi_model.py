"""
Script para configurar las API keys de múltiples modelos de IA.
ORDEN: Del mejor al peor, priorizando modelos GRATUITOS.
Ejecuta este script y sigue las instrucciones.
"""

import sqlite3
import json
import os

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def setup_api_keys():
    print("=" * 70)
    print("   CONFIGURACION DE MULTIPLES CEREBROS IA (MULTI-MODELO)")
    print("=" * 70)
    print()
    print("Configuraremos los modelos en orden de MEJOR a PEOR.")
    print("PRIORIZAMOS MODELOS GRATUITOS para evitar costos inesperados.")
    print()
    print("Presiona ENTER para omitir un modelo si no tienes API key.")
    print()
    
    # Conectar a la DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Crear tabla si no existe
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            api_key TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            priority INTEGER DEFAULT 99,
            last_used TEXT,
            error_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 1. Gemini (GRATIS - PRIORIDAD 1)
    print("=" * 70)
    print("PRIORIDAD 1 Y 2: Google Gemini (GRATUITO)")
    print("=" * 70)
    print()
    print("   Incluye:")
    print("   - Gemini 2.0 Flash Thinking Experimental (lo mas avanzado)")
    print("   - Gemini 1.5 Flash (rapido y confiable)")
    print()
    print("   GRATIS con tu plan de Google AI Studio")
    print("   Crear/ver API key: https://aistudio.google.com/apikey")
    print()
    
    # Intentar obtener de la tabla secrets
    gemini_found = False
    try:
        cursor.execute("SELECT credentials_json FROM secrets WHERE service = 'gemini'")
        row = cursor.fetchone()
        if row:
            creds = json.loads(row[0])
            gemini_key = creds.get('api_key', '')
            if gemini_key:
                cursor.execute("""
                    INSERT OR REPLACE INTO api_keys (provider, api_key, enabled, priority)
                    VALUES (?, ?, 1, 1)
                """, ('gemini', gemini_key))
                print("   Gemini YA CONFIGURADO (encontrado en DB)")
                print(f"   Key: ...{gemini_key[-20:]}")
                gemini_found = True
            else:
                raise Exception("No hay api_key en credentials")
        else:
            raise Exception("No existe en secrets")
    except Exception:
        pass
    
    if not gemini_found:
        print("   WARN: No se encontro configuracion existente")
        gemini_key = input("   API Key de Gemini: ").strip()
        if gemini_key:
            cursor.execute("""
                INSERT OR REPLACE INTO api_keys (provider, api_key, enabled, priority)
                VALUES (?, ?, 1, 1)
            """, ('gemini', gemini_key))
            print("   OK: Gemini configurado (Prioridad 1 y 2 - GRATUITO)")
        else:
            print("   SKIP: Omitido")
    
    print()
    
    # 2. Anthropic Claude (FREE TIER LIMITADO - PRIORIDAD 3)
    print("=" * 70)
    print("PRIORIDAD 3: Anthropic Claude 3.5 Sonnet")
    print("=" * 70)
    print()
    print("   WARN: FREE TIER LIMITADO: $5 de credito gratis, luego paga")
    print("   Despues del free tier: ~$3 por millon de tokens")
    print("   Crear cuenta: https://console.anthropic.com/")
    print()
    anthropic_key = input("   API Key de Anthropic (sk-ant-...): ").strip()
    
    if anthropic_key:
        cursor.execute("""
            INSERT OR REPLACE INTO api_keys (provider, api_key, enabled, priority)
            VALUES (?, ?, 1, 3)
        """, ('anthropic', anthropic_key))
        print("   OK: Anthropic configurado (Prioridad 3 - Free tier limitado)")
    else:
        print("   SKIP: Omitido (se usara solo si Gemini falla)")
    
    print()
    
    # 3. OpenAI (PAGA - PRIORIDAD 4 y 5)
    print("=" * 70)
    print("PRIORIDAD 4 Y 5: OpenAI GPT-4 / GPT-3.5")
    print("=" * 70)
    print()
    print("   IMPORTANTE: ChatGPT Plus NO incluye acceso a la API")
    print("      La API es un servicio SEPARADO que GENERA COSTOS:")
    print("      - GPT-4 Turbo: ~$0.01 por cada 1,000 tokens (~750 palabras)")
    print("      - GPT-3.5 Turbo: ~$0.001 por cada 1,000 tokens")
    print() 
    print("   Recomendacion: DEJARLO VACIO y usar solo Gemini (gratis)")
    print("   Si quieres pagar: https://platform.openai.com/api-keys")
    print()
    
    openai_confirm = input("   WARN: Deseas configurar OpenAI (PAGA)? (s/N): ").strip().lower()
    
    if openai_confirm == 's':
        openai_key = input("   API Key de OpenAI (sk-...): ").strip()
        if openai_key:
            cursor.execute("""
                INSERT OR REPLACE INTO api_keys (provider, api_key, enabled, priority)
                VALUES (?, ?, 1, 4)
            """, ('openai', openai_key))
            print("   OK: OpenAI configurado (Prioridad 4 y 5 - GENERA COSTOS)")
            print("   Se notificara en el log cada vez que se use")
        else:
            print("   SKIP: Omitido")
    else:
        print("   SKIP: Omitido (recomendado - usaras solo modelos gratuitos)")
    
    # Guardar cambios
    conn.commit()
    
    # Mostrar resumen
    print()
    print("=" * 70)
    print("   RESUMEN DE CONFIGURACION")
    print("=" * 70)
    
    cursor.execute("SELECT provider, enabled, priority FROM api_keys ORDER BY priority")
    rows = cursor.fetchall()
    
    if rows:
        print()
        print("Modelos configurados (en orden de fallback):")
        print()
        for provider, enabled, priority in rows:
            status = "OK Activo" if enabled else "NO Deshabilitado"
            
            if provider == "gemini":
                cost_label = "GRATIS"
                models = "Gemini 2.0 + 1.5"
            elif provider == "anthropic":
                cost_label = "Free tier -> Paga"
                models = "Claude 3.5 Sonnet"
            elif provider == "openai":
                cost_label = "PAGA"
                models = "GPT-4 + GPT-3.5"
            else:
                cost_label = ""
                models = provider
            
            print(f"  {priority}. {models:30} {status:20} {cost_label}")
        
        print()
        print("El sistema intentara los modelos en este orden.")
        print("Si uno falla, pasa automaticamente al siguiente.")
        print("Los cambios se registran en: ai_model_fallback.log")
    else:
        print()
        print("WARN: No se configuro ningun modelo.")
        print("El sistema intentara usar Gemini desde la tabla secrets.")
    
    conn.close()
    
    print()
    print("=" * 70)
    print("   CONFIGURACION COMPLETADA")
    print("=" * 70)
    print()
    print("Proximo paso: Reinicia el backend para aplicar cambios")
    print("   cd backend")
    print("   python -m uvicorn main:app --reload")
    print()

if __name__ == "__main__":
    setup_api_keys()
