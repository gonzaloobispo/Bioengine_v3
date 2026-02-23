import pandas as pd
from pathlib import Path

FILE_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')

def check_rows_4_5():
    df = pd.read_excel(FILE_PATH, sheet_name='Gonzalo', header=None)
    for i in range(4, 10):
        print(f"Row {i}: {df.iloc[i].tolist()}")

if __name__ == "__main__":
    check_rows_4_5()
