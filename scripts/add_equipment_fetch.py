"""
Script para agregar fetch de equipment al App.jsx
"""
import re

# Leer App.jsx
with open(r'c:\BioEngine_V3\frontend\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Agregar estado equipment después de biometrics
content = content.replace(
    "const [biometrics, setBiometrics] = useState([]);",
    "const [biometrics, setBiometrics] = useState([]);\n  const [equipment, setEquipment] = useState(null);"
)

# 2. Agregar fetch de equipment en useEffect
# Buscar el useEffect que tiene fetchActivities y fetchBiometrics
fetch_pattern = r"(const fetchBiometrics = async \(\) => \{[^}]+\}\;)"
replacement = r"\1\n\n    const fetchEquipment = async () => {\n      try {\n        const res = await fetch('http://localhost:8000/equipment');\n        const data = await res.json();\n        setEquipment(data);\n      } catch (err) {\n        console.error('Error fetching equipment:', err);\n      }\n    };"

content = re.sub(fetch_pattern, replacement, content, flags=re.DOTALL)

# 3. Llamar a fetchEquipment en useEffect
content = content.replace(
    "fetchBiometrics();",
    "fetchBiometrics();\n      fetchEquipment();"
)

# Guardar
with open(r'c:\BioEngine_V3\frontend\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] App.jsx modificado:")
print("  ✅ Estado equipment agregado")
print("  ✅ fetchEquipment() agregado")
print("  ✅ Llamada en useEffect agregada")
