import os

def peek_xml():
    xml_path = r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\exportar.xml'
    with open(xml_path, 'r', encoding='utf-8') as f:
        count = 0
        for line in f:
            if '<Workout ' in line and 'Running' in line:
                print(line.strip())
                count += 1
                if count >= 3:
                    break

if __name__ == "__main__":
    peek_xml()
