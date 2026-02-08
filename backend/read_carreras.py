import pandas as pd
import os

FILE_PATH = r'c:\BioEngine_V3\Carreras.xlsx'

def analyze_carreras():
    if not os.path.exists(FILE_PATH):
        print(f"Error: File not found at {FILE_PATH}")
        return

    try:
        # Load without header initially to see the structure
        df = pd.read_excel(FILE_PATH, header=None)
        
        print("--- EXCEL STRUCTURE ---")
        print(df.head(10))
        
        # Try to find the header row (one that contains "Carrera" or "Fecha")
        header_idx = 0
        for i, row in df.iterrows():
            if any(isinstance(val, str) and ("carrera" in val.lower() or "fecha" in val.lower()) for val in row):
                header_idx = i
                break
        
        df = pd.read_excel(FILE_PATH, header=header_idx)
        print("\n--- DETECTED DATA ---")
        print(df.head(20))
        
        # Look for competitions
        # Typical competition names/keywords
        keywords = ["maraton", "marathon", "21k", "10k", "5k", "trail", "gp", "gran premio", "competencia", "carrera"]
        
        # List potential competitions
        potential_comps = []
        for i, row in df.iterrows():
            row_str = " ".join([str(val).lower() for val in row.values if pd.notnull(val)])
            if any(k in row_str for k in keywords):
                potential_comps.append(row.to_dict())
        
        print(f"\nPotential Competitions Found: {len(potential_comps)}")
        for comp in potential_comps[:10]:
            print(comp)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_carreras()
