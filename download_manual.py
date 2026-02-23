
import os
import requests

MANUAL_DIR = "c:/BioEngine_V3/docs/manual"
os.makedirs(MANUAL_DIR, exist_ok=True)

screens = {
    # Updated Links from Stitch
    "dashboard.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2ExMzAzNGRlMzVkMjQ3NjdiMmU3MzA4YjZjZDliNTEzEgsSBxDZ4J7T9QMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTY2MDcxMjc5NzkwODIwMjEwNA&filename=&opi=96797242",
    "plans_lock.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzk4ZGZkZDFlNzA4ODRmZjc5YTA2YTJiN2IyNWI3YjdlEgsSBxDZ4J7T9QMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTY2MDcxMjc5NzkwODIwMjEwNA&filename=&opi=96797242",
    # Keeping previous one as it was decent
    "recovery_alert.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2IxY2Y4NWU1ZTEzNzRlNWE4OTZkNTZkYTNjODY2NDk1EgsSBxDZ4J7T9QMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTY2MDcxMjc5NzkwODIwMjEwNA&filename=&opi=96797242"
}

index_content = """
<!DOCTYPE html>
<html>
<head>
    <title>BioEngine V4 - Manual Interactivo (Rediseño)</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; text-align: center; padding: 50px; }
        h1 { color: #8b5cf6; margin-bottom: 10px; }
        .subtitle { color: #525252; font-size: 0.9em; margin-bottom: 50px; }
        .grid { display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; }
        .card { 
            background: #171717; 
            padding: 30px; 
            border-radius: 16px; 
            width: 280px; 
            border: 1px solid #262626;
            transition: all 0.3s ease; 
        }
        .card:hover { transform: translateY(-5px); border-color: #8b5cf6; box-shadow: 0 10px 30px -10px rgba(139, 92, 246, 0.3); }
        a { text-decoration: none; color: white; display: block; }
        .icon { font-size: 48px; margin-bottom: 15px; }
        h3 { margin: 10px 0; color: #fff; }
        p { font-size: 14px; color: #a3a3a3; line-height: 1.4; }
        .tag {
            display: inline-block;
            padding: 4px 8px;
            font-size: 10px;
            border-radius: 4px;
            background: #333;
            color: #888;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <h1>BioEngine V4.2</h1>
    <p class="subtitle">Manual Interactivo de Operaciones • Master Athlete Protocol</p>
    
    <div class="grid">
        <div class="card">
            <a href="dashboard.html">
                <div class="tag">VISTA ACTUALIZADA</div>
                <div class="icon">📊</div>
                <h3>Training Dashboard</h3>
                <p>Nueva interfaz oscura con KPIs de carga aguda, polarización y benchmarks de NotebookLM.</p>
            </a>
        </div>
        <div class="card">
            <a href="plans_lock.html">
                <div class="tag">SEGURIDAD CLINICA</div>
                <div class="icon">🔒</div>
                <h3>Plan Semanal & Lock</h3>
                <p>Visualización del bloqueo de impacto por dolor (>3) y sustitución automática de sesiones.</p>
            </a>
        </div>
        <div class="card">
            <a href="recovery_alert.html">
                <div class="tag">FISIOLOGÍA</div>
                <div class="icon">❤️</div>
                <h3>Data-Driven Recovery</h3>
                <p>Alertas de fatiga basadas en VFC y Sueño con recomendaciones de descanso.</p>
            </a>
        </div>
    </div>
</body>
</html>
"""

print("Downloading redesigned screens...")
for filename, url in screens.items():
    try:
        print(f"Fetching {filename}...")
        response = requests.get(url)
        response.raise_for_status()
        with open(os.path.join(MANUAL_DIR, filename), "wb") as f:
            f.write(response.content)
        print(f"Saved {filename}")
    except Exception as e:
        print(f"Error downloading {filename}: {e}")

with open(os.path.join(MANUAL_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(index_content)
    
print(f"\nManual generated at: {os.path.abspath(MANUAL_DIR)}\\index.html")
