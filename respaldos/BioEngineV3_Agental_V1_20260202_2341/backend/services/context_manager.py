import os
import json
import datetime
import logging
import sqlite3
from typing import Optional, Dict, Any, List
from config import CONTEXT_BASE_PATH, DB_PATH

logger = logging.getLogger(__name__)

class ContextManager:
    """
    Gestor del 'Cerebro' de BioEngine. 
    Maneja la carga de conocimiento base (Markdown) y la memoria evolutiva (SQLite).
    """
    def __init__(self, base_path: str = str(CONTEXT_BASE_PATH)):
        self.base_path = base_path
        self.db_path = DB_PATH
        self.training_plan_path = os.path.join(base_path, "Plan_Entrenamiento_Tenis_Master_49.md")
        self.equipamiento_path = os.path.join(base_path, "equipamiento.md")

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_context_value(self, key: str) -> Optional[Any]:
        """Obtiene un valor de la tabla user_context."""
        conn = self._get_connection()
        try:
            row = conn.execute("SELECT value_json FROM user_context WHERE key = ?", (key,)).fetchone()
            if row:
                return json.loads(row['value_json'])
        except Exception as e:
            logger.error(f"Error reading context key {key}: {e}")
        finally:
            conn.close()
        return None

    def _set_context_value(self, key: str, value: Any):
        """Guarda un valor en la tabla user_context."""
        conn = self._get_connection()
        try:
            conn.execute("""
                INSERT OR REPLACE INTO user_context (key, value_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (key, json.dumps(value, ensure_ascii=False)))
            conn.commit()
        except Exception as e:
            logger.error(f"Error writing context key {key}: {e}")
        finally:
            conn.close()

    def get_foundational_context(self) -> str:
        """Lee el conocimiento base completo: plan, equipamiento, perfil médico."""
        context = "=== CONOCIMIENTO BASE DEL ATLETA ===\n\n"
        
        # 1. PLAN DE ENTRENAMIENTO (Markdown)
        try:
            if os.path.exists(self.training_plan_path):
                with open(self.training_plan_path, 'r', encoding='utf-8') as f:
                    plan_content = f.read()
                    context += "## PLAN DE ENTRENAMIENTO 'TENIS MASTER 49+'\n"
                    context += plan_content + "\n\n"
        except Exception as e:
            logger.error(f"Error reading training plan: {e}")
            context += f"Error leyendo plan: {e}\n\n"
        
        # 2. EQUIPAMIENTO E INVENTARIO (Markdown)
        try:
            if os.path.exists(self.equipamiento_path):
                with open(self.equipamiento_path, 'r', encoding='utf-8') as f:
                    equip_content = f.read()
                    context += "## INVENTARIO DE EQUIPAMIENTO\n"
                    context += equip_content + "\n\n"
        except Exception as e:
            logger.error(f"Error reading equipamiento: {e}")
            context += f"Error leyendo equipamiento: {e}\n\n"

        # 3. PERFIL MÉDICO Y BIOMECÁNICO (SQLite)
        context += "## PERFIL MÉDICO Y BIOMECÁNICO\n"
        
        profile = self._get_context_value('perfil_usuario')
        med = self._get_context_value('historial_medico_resumido')
        insights = self._get_context_value('insights_aprendidos')
        stats = self._get_context_value('estadisticas_ultimos_30d')
        meta = self._get_context_value('metadata')

        if profile:
            context += f"- Nombre: {profile.get('nombre', 'N/A')}\n"
            context += f"- Edad: {profile.get('edad', 'N/A')} años\n"
            context += f"- Altura: {profile.get('altura_cm', 'N/A')} cm\n"
            context += f"- Peso objetivo: {profile.get('peso_objetivo_kg', 'N/A')} kg\n"
            
            exp = profile.get('experiencia_deportiva', {})
            if exp:
                context += f"- Nivel: {exp.get('nivel_actual', 'N/A')}\n"
                deportes = exp.get('deportes_principales', [])
                if deportes:
                    context += f"- Deportes principales: {', '.join(deportes)}\n"
        
        if med:
            lesiones = med.get('lesiones_activas', [])
            if lesiones:
                context += "\n### LESIONES ACTIVAS:\n"
                for lesion in lesiones:
                    context += f"- **{lesion.get('nombre', 'N/A')}**\n"
                    context += f"  - Gravedad: {lesion.get('gravedad', 'N/A')}\n"
                    context += f"  - Dolor actual: {lesion.get('nivel_dolor_actual', 0)}/10\n"
                    context += f"  - Tendencia: {lesion.get('tendencia', 'N/A')}\n"
                    restricciones = lesion.get('restricciones', [])
                    if restricciones:
                        context += f"  - Restricciones: {', '.join(restricciones)}\n"
        
        if insights:
            context += "\n### INSIGHTS APRENDIDOS (PATRONES DETECTADOS):\n"
            for insight in insights:
                context += f"- {insight.get('patron', 'N/A')}\n"
                context += f"  → Acción: {insight.get('accion', 'N/A')}\n"
                context += f"  → Confianza: {insight.get('confianza', 0)}%\n"

        # 4. MEMORIA EVOLUTIVA (SQLite Table)
        conn = self._get_connection()
        try:
            memories = conn.execute("SELECT date, lesson, context FROM evolutionary_memory ORDER BY created_at DESC LIMIT 50").fetchall()
            if memories:
                context += f"\n### MEMORIA EVOLUTIVA (ÚLTIMOS {len(memories)} REGISTROS):\n"
                # Voltear para mostrar cronológico en el prompt si se desea, o dejar DESC para prioridad
                for m in reversed(memories):
                    context += f"- {m['date']}: {m['lesson']} ({m['context'] or 'N/A'})\n"
        except Exception as e:
            logger.error(f"Error reading evolutionary memory: {e}")
        finally:
            conn.close()

        if stats:
            context += f"\n### ESTADÍSTICAS ÚLTIMOS 30 DÍAS:\n"
            context += f"- Actividades completadas: {stats.get('actividades_completadas', 0)}\n"
            context += f"- Km totales: {stats.get('km_totales', 0)}\n"
            context += f"- Peso promedio: {stats.get('peso_promedio_kg', 0)} kg\n"

        if meta:
            semantic_summary = meta.get('semantic_summary')
            if semantic_summary:
                context += f"\n### RESUMEN SEMANTICO (CONCIENCIA GLOBAL):\n{semantic_summary}\n"
        
        return context

    def get_pain_history(self, limit=10):
        """Obtiene los últimos registros de dolor desde SQLite."""
        conn = self._get_connection()
        try:
            rows = conn.execute("SELECT date, level, notes FROM pain_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error reading pain history: {e}")
            return []
        finally:
            conn.close()

    def log_pain(self, level: int, notes: str = "") -> None:
        """Registra un nuevo evento de dolor en SQLite."""
        conn = self._get_connection()
        try:
            conn.execute("""
                INSERT INTO pain_logs (date, level, notes)
                VALUES (?, ?, ?)
            """, (datetime.datetime.now().isoformat(), level, notes))
            conn.commit()
            
            # Actualizar tendencia en el historial médico
            self._update_medical_status(level)
        except Exception as e:
            logger.error(f"Error logging pain: {e}")
        finally:
            conn.close()

    def log_context_update(self, update_text: str, source: str = "chat") -> None:
        """Registra una actualización de contexto relevante en evolutionary_memory."""
        if not update_text:
            return
        
        conn = self._get_connection()
        try:
            conn.execute("""
                INSERT INTO evolutionary_memory (date, lesson, context, source)
                VALUES (?, ?, ?, ?)
            """, (datetime.datetime.now().strftime("%Y-%m-%d"), update_text, f"Registro automático ({source})", source))
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging context update: {e}")
        finally:
            conn.close()

    def get_semantic_summary_data(self) -> Dict[str, Any]:
        """Retorna datos necesarios para actualizar el resumen semántico."""
        meta = self._get_context_value('metadata') or {}
        
        conn = self._get_connection()
        try:
            count_row = conn.execute("SELECT COUNT(*) as total FROM evolutionary_memory").fetchone()
            total_count = count_row['total'] if count_row else 0
            
            return {
                "summary": meta.get('semantic_summary', ''),
                "last_count": meta.get('semantic_summary_last_count', 0),
                "total_count": total_count
            }
        except Exception as e:
            logger.error(f"Error getting semantic summary data: {e}")
            return {"summary": "", "last_count": 0, "total_count": 0}
        finally:
            conn.close()

    def get_new_evolutionary_memories(self, last_count: int) -> List[Dict[str, Any]]:
        """Obtiene memorias evolutivas nuevas para el resumen semántico."""
        conn = self._get_connection()
        try:
            # SQL OFFSET is useful here
            rows = conn.execute("SELECT date, lesson, context FROM evolutionary_memory ORDER BY created_at ASC LIMIT -1 OFFSET ?", (last_count,)).fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error reading new memories: {e}")
            return []
        finally:
            conn.close()

    def set_semantic_summary(self, summary_text: str, total_count: int) -> None:
        """Guarda el resumen semántico actualizado."""
        meta = self._get_context_value('metadata') or {}
        meta['semantic_summary'] = summary_text
        meta['semantic_summary_last_count'] = total_count
        meta['last_updated'] = datetime.datetime.now().isoformat()
        self._set_context_value('metadata', meta)

    def get_memory_snapshot(self, recent_limit: int = 20) -> Dict[str, Any]:
        """Devuelve un snapshot de memoria para depuración."""
        conn = self._get_connection()
        try:
            memories = conn.execute("SELECT * FROM evolutionary_memory ORDER BY created_at DESC LIMIT ?", (recent_limit,)).fetchall()
            pains = conn.execute("SELECT * FROM pain_logs ORDER BY created_at DESC LIMIT ?", (recent_limit,)).fetchall()
            total_mem = conn.execute("SELECT COUNT(*) FROM evolutionary_memory").fetchone()[0]
            total_pain = conn.execute("SELECT COUNT(*) FROM pain_logs").fetchone()[0]
            
            return {
                "metadata": self._get_context_value('metadata'),
                "perfil_usuario": self._get_context_value('perfil_usuario'),
                "historial_medico_resumido": self._get_context_value('historial_medico_resumido'),
                "estadisticas_ultimos_30d": self._get_context_value('estadisticas_ultimos_30d'),
                "insights_aprendidos": self._get_context_value('insights_aprendidos'),
                "conversaciones_total": total_mem,
                "conversaciones_relevantes_recientes": [dict(m) for m in memories],
                "dolor_registros_total": total_pain,
                "dolor_registros_recientes": [dict(p) for p in pains]
            }
        finally:
            conn.close()

    def _update_medical_status(self, last_pain: int) -> None:
        """Actualiza la tendencia de dolor en el historial médico."""
        med = self._get_context_value('historial_medico_resumido')
        if not med: return
        
        lesiones = med.get('lesiones_activas', [])
        for l in lesiones:
            if "Rodilla" in l.get('nombre', '') or "Cuadricipital" in l.get('nombre', ''):
                l['nivel_dolor_actual'] = last_pain
                l['tendencia'] = "Al alza" if last_pain > 3 else "Estable/Baja"
        
        self._set_context_value('historial_medico_resumido', med)
        
        # Log last updated in metadata
        meta = self._get_context_value('metadata') or {}
        meta['last_updated'] = datetime.datetime.now().isoformat()
        self._set_context_value('metadata', meta)
