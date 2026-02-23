import os
import xml.etree.ElementTree as ET

def analyze_tennis():
    xml_path = r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\exportar.xml'
    with open(xml_path, 'r', encoding='utf-8') as f:
        buffer = []
        inside = False
        count = 0
        for line in f:
            if '<Workout ' in line and 'HKWorkoutActivityTypeTennis' in line:
                inside = True
            if inside:
                buffer.append(line.strip())
                if '</Workout>' in line:
                    print('\n'.join(buffer))
                    print("-" * 40)
                    buffer = []
                    inside = False
                    count += 1
                    if count >= 3:
                        break

if __name__ == "__main__":
    analyze_tennis()
