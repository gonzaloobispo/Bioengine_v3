import asyncio
import sys
import os

# Add project root to path so we can import backend packages
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from backend.services.ai_service import AIService
except ModuleNotFoundError as e:
    print(f"Error imports: {e}")
    print(f"PYTHONPATH: {sys.path}")
    sys.exit(1)

async def main():
    print("Inicializando BioEngine Coach Service...")
    s = AIService()
    
    print("\nSolicitando análisis (esto puede tardar si la API está ocupada)...")
    analysis = await s.get_coach_analysis()
    
    print("\n" + "="*40)
    print("BIOENGINE COACH v3 - ANÁLISIS")
    print("="*40 + "\n")
    print(analysis)
    print("\n" + "="*40)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nOperación cancelada por el usuario.")
