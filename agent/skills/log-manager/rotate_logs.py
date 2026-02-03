import os
import shutil
from datetime import datetime
from pathlib import Path
import sys

# Añadir el path del backend para importar config
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "backend"))
try:
    import config
except ImportError:
    print("Error: No se pudo cargar config.py")
    sys.exit(1)

MAX_SIZE_MB = 10
MAX_HISTORY = 5

def rotate_log(log_path_str):
    log_path = Path(log_path_str)
    if not log_path.exists():
        print(f"Skipping {log_path.name}: File does not exist.")
        return

    size_mb = log_path.stat().st_size / (1024 * 1024)
    print(f"Checking {log_path.name} ({size_mb:.2f} MB)...")

    if size_mb > MAX_SIZE_MB:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        rotated_path = log_path.with_suffix(f".{timestamp}.log")
        
        try:
            # Copy then truncate to avoid issues with open handles
            shutil.copy(log_path, rotated_path)
            with open(log_path, 'w') as f:
                f.truncate(0)
            print(f"✅ Rotated: {log_path.name} -> {rotated_path.name}")
            
            # Cleanup old logs
            logs_dir = log_path.parent
            pattern = f"{log_path.stem}.*.log"
            history_logs = sorted(
                list(logs_dir.glob(pattern)),
                key=os.path.getmtime,
                reverse=True
            )
            
            if len(history_logs) > MAX_HISTORY:
                for old_log in history_logs[MAX_HISTORY:]:
                    old_log.unlink()
                    print(f"🗑️ Deleted old history: {old_log.name}")
                    
        except Exception as e:
            print(f"❌ Error rotating {log_path.name}: {e}")
    else:
        print(f"  Steady: {log_path.name} is within limits.")

def main():
    print("--- BioEngine V3 Log Management ---")
    logs_to_check = [
        config.LOG_FILE,
        config.AI_DEBUG_LOG,
        config.MODEL_FALLBACK_LOG
    ]
    
    for l in logs_to_check:
        rotate_log(l)
    print("--- Maintenance Completed ---")

if __name__ == "__main__":
    main()
