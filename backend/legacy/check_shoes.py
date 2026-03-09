import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def check_shoes():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    print("Columns in Row 3:")
    print(df.iloc[3].tolist())

if __name__ == "__main__":
    check_shoes()
