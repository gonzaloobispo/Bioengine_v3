import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def inspect_excel():
    xl = pd.ExcelFile(FILE_PATH)
    if 'Gonzalo' in xl.sheet_names:
        df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo')
        print("Columns found in 'Gonzalo':")
        print(df.columns.tolist())
        print("\nFirst 5 rows:")
        # Print only relevant columns if they are many
        print(df.iloc[:5, :10].to_string()) # First 10 cols
        
if __name__ == "__main__":
    inspect_excel()
