import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def raw_peek():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    print("Row 0:")
    print(df.iloc[0].tolist())
    print("\nRow 1:")
    print(df.iloc[1].tolist())
    print("\nRow 2:")
    print(df.iloc[2].tolist())

if __name__ == "__main__":
    raw_peek()
