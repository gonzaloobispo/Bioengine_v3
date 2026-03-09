import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def get_cons_data():
    # Read sheet, no headers first to see structure
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    
    # Block 1: Calle (Cols 0 to 10)
    # Block 2: Trail (Cols 11 to 21)
    
    # Typical header row is 0
    headers_calle = df.iloc[0, 0:11].tolist()
    data_calle = df.iloc[1:, 0:11].copy()
    data_calle.columns = headers_calle
    data_calle = data_calle.dropna(subset=['Fecha', 'Calle'], how='all')
    
    headers_trail = df.iloc[0, 11:22].tolist()
    data_trail = df.iloc[1:, 11:22].copy()
    data_trail.columns = headers_trail
    data_trail = data_trail.dropna(subset=['Fecha', 'Trail'], how='all')

    print("--- CALLE ---")
    print(data_calle.head().to_string())
    print("\n--- TRAIL ---")
    print(data_trail.head().to_string())

if __name__ == "__main__":
    get_cons_data()
