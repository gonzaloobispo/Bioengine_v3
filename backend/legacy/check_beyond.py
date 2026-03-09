import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def check_beyond():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    row3 = df.iloc[3].tolist()
    print(f"Total cols in Row 3: {len(row3)}")
    print(row3)

if __name__ == "__main__":
    check_beyond()
