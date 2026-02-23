import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def analyze_gonzalo():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo')
    print(f"Total rows: {len(df)}")
    # Print all columns and their first non-null values
    for col in df.columns:
        first_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else "None"
        print(f"Column: {col} | First Value: {first_val}")

if __name__ == "__main__":
    analyze_gonzalo()
