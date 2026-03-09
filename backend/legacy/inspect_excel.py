import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def inspect_excel():
    if not FILE_PATH.exists():
        print(f"File {FILE_PATH} does not exist.")
        return

    # List all sheets
    xl = pd.ExcelFile(FILE_PATH)
    print(f"Sheets: {xl.sheet_names}")
    
    # Read 'Gonzalo' sheet
    if 'Gonzalo' in xl.sheet_names:
        df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo')
        print("\n--- Gonzalo Sheet Content (First 10 rows) ---")
        print(df.head(10).to_string())
        print(f"\nTotal rows: {len(df)}")
        print(f"Columns: {df.columns.tolist()}")
    else:
        print("\n'Gonzalo' sheet not found.")

if __name__ == "__main__":
    inspect_excel()
