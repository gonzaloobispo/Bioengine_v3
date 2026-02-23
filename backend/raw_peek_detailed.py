import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def raw_peek():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    for i in range(3):
        print(f"--- Row {i} ---")
        row_vals = df.iloc[i].tolist()
        for idx, val in enumerate(row_vals):
            print(f"Col {idx}: {val}")

if __name__ == "__main__":
    raw_peek()
