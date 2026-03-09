import sqlite3
import os
from config import DB_PATH

class DataHealthService:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path

    def get_health_stats(self):
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # 1. Activities audit
            cursor.execute("SELECT COUNT(*) as total FROM activities")
            total_activities = cursor.fetchone()['total']

            cursor.execute("""
                SELECT COUNT(*) as incomplete FROM activities 
                WHERE (distancia_km IS NULL OR distancia_km = 0)
                   OR (duracion_min IS NULL OR duracion_min = 0)
                   OR (calorias IS NULL OR calorias = 0)
                   OR (tipo IS NULL OR tipo = '')
            """)
            incomplete_activities = cursor.fetchone()['incomplete']

            # 2. Biometrics audit
            cursor.execute("SELECT COUNT(*) as total FROM biometrics")
            total_biometrics = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as incomplete FROM biometrics WHERE peso IS NULL OR peso = 0")
            incomplete_biometrics = cursor.fetchone()['incomplete']

            # 3. Context audit
            cursor.execute("SELECT COUNT(*) as total FROM user_context")
            total_context = cursor.fetchone()['total']

            # Calculate score (Simplified)
            activity_score = max(0, 100 - (incomplete_activities / (total_activities or 1) * 100))
            biometric_score = max(0, 100 - (incomplete_biometrics / (total_biometrics or 1) * 100))
            
            overall_score = (activity_score * 0.7) + (biometric_score * 0.3)

            conn.close()

            return {
                "overall_score": round(overall_score, 1),
                "activities": {
                    "total": total_activities,
                    "incomplete": incomplete_activities,
                    "score": round(activity_score, 1)
                },
                "biometrics": {
                    "total": total_biometrics,
                    "incomplete": incomplete_biometrics,
                    "score": round(biometric_score, 1)
                }
            }
        except Exception as e:
            return {"error": str(e)}
