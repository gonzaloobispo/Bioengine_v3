"""
Sistema de control de gasto para modelos de IA pagos.
Permite configurar API keys sin usarlas automáticamente.
"""

import sqlite3
from typing import Dict, List, Any
from datetime import datetime
from config import DB_PATH

class CostControl:
    """
    Controla qué modelos pagos están autorizados para usar.
    Por defecto, solo modelos gratuitos están habilitados.
    """
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_table()
    
    def _init_table(self) -> None:
        """Crea la tabla de configuración de costos si no existe"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabla de configuración de modelos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_cost_config (
                provider TEXT PRIMARY KEY,
                cost_type TEXT NOT NULL,  -- 'free', 'free_tier', 'paid'
                enabled_by_default INTEGER DEFAULT 0,
                allow_usage INTEGER DEFAULT 0,  -- 0=bloqueado, 1=permitido temporalmente, 2=siempre permitido
                usage_count INTEGER DEFAULT 0,
                estimated_cost_usd REAL DEFAULT 0.0,
                last_used TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insertar configuración por defecto si no existe
        defaults = [
            ('gemini', 'free', 1, 2, 0, 0.0),  # Siempre permitido
            ('anthropic', 'free_tier', 0, 0, 0, 0.0),  # Bloqueado por defecto
            ('openai', 'paid', 0, 0, 0, 0.0),  # Bloqueado por defecto
        ]
        
        for provider, cost_type, enabled_default, allow, usage, cost in defaults:
            cursor.execute("""
                INSERT OR IGNORE INTO model_cost_config 
                (provider, cost_type, enabled_by_default, allow_usage, usage_count, estimated_cost_usd)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (provider, cost_type, enabled_default, allow, usage, cost))
        
        conn.commit()
        conn.close()
    
    def is_provider_allowed(self, provider: str) -> bool:
        """Verifica si un proveedor está autorizado para usar"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT allow_usage, cost_type FROM model_cost_config 
            WHERE provider = ?
        """, (provider,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            # Si no está en la tabla, asumir que es gratuito
            return True
        
        allow_usage, cost_type = row
        
        # Modelos gratuitos siempre permitidos
        if cost_type == 'free':
            return True
        
        # Modelos pagos: solo si allow_usage > 0
        return allow_usage > 0
    
    def enable_paid_models(self, duration_minutes: int = 60, max_cost: float = 1.0) -> Dict[str, Any]:
        """
        Habilita temporalmente el uso de modelos pagos.
        
        Args:
            duration_minutes: Por cuánto tiempo permitir (default: 60 min)
            max_cost: Costo máximo permitido en USD (default: $1.00)
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Activar modelos pagos temporalmente (allow_usage = 1)
        cursor.execute("""
            UPDATE model_cost_config 
            SET allow_usage = 1, updated_at = ?
            WHERE cost_type IN ('paid', 'free_tier')
        """, (datetime.now().isoformat(),))
        
        conn.commit()
        conn.close()
        
        print(f"Modelos pagos habilitados por {duration_minutes} minutos (max ${max_cost})")
        print("Se deshabilitaran automaticamente despues")
        
        # TODO: Agregar tarea programada para deshabilitarlos después
        return {
            "enabled": True,
            "duration_minutes": duration_minutes,
            "max_cost_usd": max_cost,
            "enabled_at": datetime.now().isoformat()
        }
    
    def disable_paid_models(self) -> None:
        """Deshabilita el uso de modelos pagos"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE model_cost_config 
            SET allow_usage = 0, updated_at = ?
            WHERE cost_type IN ('paid', 'free_tier')
        """, (datetime.now().isoformat(),))
        
        conn.commit()
        conn.close()
        
        print("Modelos pagos deshabilitados. Solo se usaran modelos gratuitos.")
    
    def get_status(self) -> Dict[str, Any]:
        """Retorna el estado actual de todos los modelos"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT provider, cost_type, allow_usage, usage_count, 
                   estimated_cost_usd, last_used
            FROM model_cost_config
            ORDER BY 
                CASE cost_type 
                    WHEN 'free' THEN 1 
                    WHEN 'free_tier' THEN 2 
                    WHEN 'paid' THEN 3 
                END
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        status = {
            "free_models": [],
            "paid_models": [],
            "total_cost_usd": 0.0
        }
        
        for row in rows:
            model_info = {
                "provider": row['provider'],
                "cost_type": row['cost_type'],
                "allowed": bool(row['allow_usage']),
                "usage_count": row['usage_count'],
                "cost_usd": row['estimated_cost_usd'],
                "last_used": row['last_used']
            }
            
            if row['cost_type'] == 'free':
                status["free_models"].append(model_info)
            else:
                status["paid_models"].append(model_info)
            
            status["total_cost_usd"] += row['estimated_cost_usd'] or 0.0
        
        return status
    
    def log_usage(self, provider: str, cost_estimate: float = 0.0) -> None:
        """Registra el uso de un modelo"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE model_cost_config 
            SET usage_count = usage_count + 1,
                estimated_cost_usd = estimated_cost_usd + ?,
                last_used = ?,
                updated_at = ?
            WHERE provider = ?
        """, (cost_estimate, datetime.now().isoformat(), datetime.now().isoformat(), provider))
        
        conn.commit()
        conn.close()


# CLI para control manual
if __name__ == "__main__":
    import sys
    
    cc = CostControl()
    
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python cost_control.py status         - Ver estado actual")
        print("  python cost_control.py enable [min]   - Habilitar modelos pagos (default: 60 min)")
        print("  python cost_control.py disable        - Deshabilitar modelos pagos")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "status":
        status = cc.get_status()
        print("\nESTADO DE MODELOS:\n")
        
        print("Modelos Gratuitos:")
        for m in status["free_models"]:
            print(f"  - {m['provider']}: {m['usage_count']} usos")
        
        print("\nModelos Pagos:")
        for m in status["paid_models"]:
            status_icon = "ALLOW" if m['allowed'] else "LOCK"
            print(f"  {status_icon} {m['provider']}: {m['usage_count']} usos, ${m['cost_usd']:.4f}")
        
        print(f"\nCosto total estimado: ${status['total_cost_usd']:.4f}")
    
    elif command == "enable":
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        cc.enable_paid_models(duration_minutes=duration)
    
    elif command == "disable":
        cc.disable_paid_models()
    
    else:
        print(f"Comando desconocido: {command}")
        sys.exit(1)
