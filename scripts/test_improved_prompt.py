"""
Script para probar el nuevo prompt mejorado del AI Coach
Compara la calidad del análisis antes y después de la mejora
"""

import sys
import os

# Fix encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import asyncio
from services.ai_service import AIService

async def test_improved_prompt():
    print("=" * 80)
    print("🧪 TESTING NUEVO PROMPT MEJORADO DEL AI COACH")
    print("=" * 80)
    print()
    
    ai_service = AIService()
    
    print("📊 Generando análisis con el nuevo prompt mejorado...")
    print("⏳ Esto puede tomar 10-15 segundos...")
    print()
    
    try:
        analysis = await ai_service.get_coach_analysis()
        
        print("✅ ANÁLISIS GENERADO CON ÉXITO!")
        print("=" * 80)
        print()
        print(analysis)
        print()
        print("=" * 80)
        print()
        
        # Métricas de calidad
        print("📈 MÉTRICAS DE CALIDAD DEL ANÁLISIS:")
        print(f"   • Longitud: {len(analysis)} caracteres")
        print(f"   • Palabras: {len(analysis.split())} palabras")
        print(f"   • Contiene números reales: {'✅' if any(char.isdigit() for char in analysis) else '❌'}")
        print(f"   • Menciona 'tenis': {'✅' if 'tenis' in analysis.lower() else '❌'}")
        print(f"   • Menciona 'master': {'✅' if 'master' in analysis.lower() else '❌'}")
        print(f"   • Tiene estructura (emojis): {'✅' if '📈' in analysis and '🎯' in analysis else '❌'}")
        print(f"   • Incluye insight de tenis (🎾): {'✅' if '🎾' in analysis else '❌'}")
        print()
        
        # Verificar secciones
        sections = {
            '📈 RESUMEN EJECUTIVO': '📈' in analysis,
            '🎯 ANÁLISIS DE TENDENCIAS': '🎯' in analysis,
            '💡 RECOMENDACIONES': '💡' in analysis,
            '⚠️ PUNTO DE ATENCIÓN': '⚠️' in analysis,
            '🎾 INSIGHT DE TENIS': '🎾' in analysis
        }
        
        print("📋 SECCIONES PRESENTES:")
        for section, present in sections.items():
            status = '✅' if present else '❌'
            print(f"   {status} {section}")
        print()
        
        completeness = sum(sections.values()) / len(sections) * 100
        print(f"🎯 COMPLETITUD: {completeness:.0f}% ({sum(sections.values())}/{len(sections)} secciones)")
        print()
        
        if completeness >= 80:
            print("🌟 EXCELENTE: El análisis está completo y bien estructurado!")
        elif completeness >= 60:
            print("👍 BUENO: El análisis tiene la mayoría de las secciones esperadas")
        else:
            print("⚠️ MEJORABLE: Faltan algunas secciones importantes")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print()
        print("Posibles causas:")
        print("  • API Key de Gemini no configurada")
        print("  • Rate limit de la API alcanzado")
        print("  • Problema de conexión")
        return
    
    print()
    print("=" * 80)
    print("✅ TEST COMPLETADO")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_improved_prompt())
