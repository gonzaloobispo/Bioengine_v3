import os
import sys
from pathlib import Path
from datetime import datetime

# Este script es una interfaz para el Agente Antigravity o el Coach 
# para documentar investigaciones estratégicas.

RESEARCH_DIR = Path(__file__).parent.parent.parent.parent / "docs" / "research"

def create_research_template(topic):
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"research_{timestamp}_{topic.lower().replace(' ', '_')}.md"
    filepath = RESEARCH_DIR / filename
    
    template = f"""# Investigación Estratégica: {topic}
Fecha: {datetime.now().strftime('%Y-%m-%d')}
Estado: Borrador / Revisión por Coach

## 🔍 Resumen Ejecutivo
(El agente debe completar esto tras la búsqueda)

## 📚 Hallazgos Clave
1. 
2. 
3. 

## ⚖️ Aplicabilidad en BioEngine
(Cómo afecta esto al plan de entrenamiento o salud articular del usuario)

## 🔗 Fuentes
- 

---
*Documento generado por Deep Research Agent V1*
"""
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(template)
    
    return filepath

if __name__ == "__main__":
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
        path = create_research_template(topic)
        print(f"✅ Plantilla de investigación creada en: {path}")
    else:
        print("Uso: py researcher_pro.py 'Tema de investigación'")
