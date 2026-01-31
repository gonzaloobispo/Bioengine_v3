"""
Prueba simplificada del sistema de Cerebro Vivo.
Verifica solo la carga de contexto sin hacer llamadas a la API.
"""
import sys
import os

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(r"c:\BioEngine_V3\backend")

from services.context_manager import ContextManager

def test_context_loading():
    print("=== PRUEBA DE CARGA DE CONTEXTO BASE ===\n")
    
    cm = ContextManager()
    
    # Test 1: Cargar contexto fundacional
    print("[*] Cargando conocimiento base...")
    context = cm.get_foundational_context()
    
    # Verificar que contiene elementos clave
    checks = {
        "Plan de Entrenamiento": "FASE 1" in context or "Spanish Squat" in context,
        "Lesiones": "Tendinosis" in context or "rodilla" in context.lower(),
        "Insights": "insight" in context.lower() or "patrón" in context.lower(),
    }
    
    print(f"\n[OK] Contexto cargado: {len(context)} caracteres\n")
    print("[CHECK] Verificaciones:")
    for check, result in checks.items():
        status = "[OK]" if result else "[FAIL]"
        print(f"   {status} {check}: {'ENCONTRADO' if result else 'NO ENCONTRADO'}")
    
    # Mostrar extracto
    print(f"\n[INFO] Extracto del contexto (primeros 500 caracteres):")
    print("-" * 60)
    print(context[:500])
    print("-" * 60)
    
    # Test 2: Historial de dolor
    print("\n[PAIN] Historial de dolor:")
    pain_history = cm.get_pain_history(limit=5)
    if pain_history:
        for entry in pain_history:
            print(f"   • {entry.get('fecha', 'N/A')}: Nivel {entry.get('nivel', '?')}/10 - {entry.get('notas', '')}")
    else:
        print("   (Sin registros de dolor)")
    
    print("\n[OK] PRUEBA COMPLETADA")
    
    return all(checks.values())

if __name__ == "__main__":
    success = test_context_loading()
    sys.exit(0 if success else 1)
