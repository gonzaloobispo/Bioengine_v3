import os
import json
import datetime
import logging

logger = logging.getLogger(__name__)

class ContextManager:
    """
    Gestor del 'Cerebro' de BioEngine. 
    Maneja la carga de conocimiento base (Markdown) y la memoria evolutiva (JSON).
    """
    def __init__(self, base_path=r"c:\BioEngine_V3\BioEngine_V3_Contexto_Base"):
        self.base_path = base_path
        self.context_data_path = os.path.join(base_path, "data_cloud_sync")
        self.training_plan_path = os.path.join(base_path, "Plan_Entrenamiento_Tenis_Master_49.md")
        self.equipamiento_path = os.path.join(base_path, "equipamiento.md")
        self.user_context_file = os.path.join(self.context_data_path, "user_context.json")
        self.pain_file = os.path.join(self.context_data_path, "dolor_rodilla.json")

    def get_foundational_context(self):
        """Lee el conocimiento base completo: plan, equipamiento, perfil médico."""
        context = "=== CONOCIMIENTO BASE DEL ATLETA ===\n\n"
        
        # 1. PLAN DE ENTRENAMIENTO
        try:
            if os.path.exists(self.training_plan_path):
                with open(self.training_plan_path, 'r', encoding='utf-8') as f:
                    plan_content = f.read()
                    context += "## PLAN DE ENTRENAMIENTO 'TENIS MASTER 49+'\n"
                    context += plan_content + "\n\n"
            else:
                context += "## PLAN DE ENTRENAMIENTO\nError: Plan no encontrado.\n\n"
        except Exception as e:
            logger.error(f"Error reading training plan: {e}")
            context += f"Error leyendo plan: {e}\n\n"
        
        # 2. EQUIPAMIENTO E INVENTARIO
        try:
            if os.path.exists(self.equipamiento_path):
                with open(self.equipamiento_path, 'r', encoding='utf-8') as f:
                    equip_content = f.read()
                    context += "## INVENTARIO DE EQUIPAMIENTO\n"
                    context += equip_content + "\n\n"
        except Exception as e:
            logger.error(f"Error reading equipamiento: {e}")
            context += f"Error leyendo equipamiento: {e}\n\n"

        # 3. PERFIL MÉDICO Y BIOMECÁNICO (user_context.json)
        context += "## PERFIL MÉDICO Y BIOMECÁNICO\n"
        user_data = self._read_json(self.user_context_file)
        meta = (user_data or {}).get('metadata', {})
        if user_data:
            profile = user_data.get('perfil_usuario', {})
            med = user_data.get('historial_medico_resumido', {})
            insights = user_data.get('insights_aprendidos', [])
            stats = user_data.get('estadisticas_ultimos_30d', {})
            
            # Perfil básico
            context += f"- Nombre: {profile.get('nombre', 'N/A')}\n"
            context += f"- Edad: {profile.get('edad', 'N/A')} años\n"
            context += f"- Altura: {profile.get('altura_cm', 'N/A')} cm\n"
            context += f"- Peso objetivo: {profile.get('peso_objetivo_kg', 'N/A')} kg\n"
            
            # Experiencia deportiva
            exp = profile.get('experiencia_deportiva', {})
            if exp:
                context += f"- Nivel: {exp.get('nivel_actual', 'N/A')}\n"
                deportes = exp.get('deportes_principales', [])
                if deportes:
                    context += f"- Deportes principales: {', '.join(deportes)}\n"
            
            # Lesiones activas (CRÍTICO)
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
            
            # Insights aprendidos
            if insights:
                context += "\n### INSIGHTS APRENDIDOS (PATRONES DETECTADOS):\n"
                for insight in insights:
                    context += f"- {insight.get('patron', 'N/A')}\n"
                    context += f"  → Acción: {insight.get('accion', 'N/A')}\n"
                    context += f"  → Confianza: {insight.get('confianza', 0)}%\n"

            # Conversaciones relevantes (memoria evolutiva)
            convs = user_data.get('conversaciones_relevantes', [])
            if convs:
                total_convs = len(convs)
                context += f"\n### MEMORIA EVOLUTIVA (TOTAL {total_convs} REGISTROS, ULTIMOS 50):\n"
                for entry in convs[-50:]:
                    fecha = entry.get('fecha', 'N/A')
                    aprendizaje = entry.get('aprendizaje', 'N/A')
                    contexto_item = entry.get('contexto', '')
                    if contexto_item:
                        context += f"- {fecha}: {aprendizaje} ({contexto_item})\n"
                    else:
                        context += f"- {fecha}: {aprendizaje}\n"
            
            # Estadísticas recientes
            if stats:
                context += f"\n### ESTADÍSTICAS ÚLTIMOS 30 DÍAS:\n"
                context += f"- Actividades completadas: {stats.get('actividades_completadas', 0)}\n"
                context += f"- Km totales: {stats.get('km_totales', 0)}\n"
                context += f"- Peso promedio: {stats.get('peso_promedio_kg', 0)} kg\n"
        else:
            context += "Error: No se pudo cargar el perfil del usuario.\n\n"
        
        # 4. RESUMEN CONTEXTUAL
        if user_data and meta:
            context += f"\n### RESUMEN EJECUTIVO:\n{meta.get('context_window_summary', 'N/A')}\n"

            semantic_summary = meta.get('semantic_summary')
            if semantic_summary:
                context += f"\n### RESUMEN SEMANTICO (CONCIENCIA GLOBAL):\n{semantic_summary}\n"
        
        return context

    def get_pain_history(self, limit=10):
        """Obtiene los últimos registros de dolor."""
        data = self._read_json(self.pain_file)
        if data and 'registros' in data:
            return data['registros'][-limit:]
        return []

    def log_pain(self, level, notes=""):
        """Registra un nuevo evento de dolor en la línea de tiempo."""
        data = self._read_json(self.pain_file) or {"registros": []}
        nuevo_registro = {
            "fecha": datetime.datetime.now().isoformat(),
            "nivel": level,
            "notas": notes
        }
        data['registros'].append(nuevo_registro)
        self._write_json(self.pain_file, data)
        
        # Actualizar el resumen en user_context.json si es relevante
        self._update_medical_status(level)

    def log_context_update(self, update_text, source="chat"):
        """Registra una actualización de contexto relevante en user_context.json."""
        if not update_text:
            return

        user_data = self._read_json(self.user_context_file) or {}
        entries = user_data.get('conversaciones_relevantes', [])
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d")
        entries.append({
            "fecha": datetime.datetime.now().strftime("%Y-%m-%d"),
            "aprendizaje": update_text,
            "contexto": f"Registro automático ({source})"
        })
        user_data['conversaciones_relevantes'] = entries

        metadata = user_data.get('metadata', {})
        metadata['last_updated'] = datetime.datetime.now().isoformat()

        # Resumen compacto: últimas 100 entradas
        summary_entries = entries[-100:]
        summary_parts = []
        for entry in summary_entries:
            fecha = entry.get('fecha', 'N/A')
            aprendizaje = entry.get('aprendizaje', 'N/A')
            summary_parts.append(f"{fecha}: {aprendizaje}")
        metadata['context_window_summary'] = " | ".join(summary_parts)

        user_data['metadata'] = metadata
        self._write_json(self.user_context_file, user_data)

    def get_semantic_summary_data(self):
        """Retorna datos necesarios para actualizar el resumen semántico."""
        user_data = self._read_json(self.user_context_file) or {}
        metadata = user_data.get('metadata', {})
        return {
            "summary": metadata.get('semantic_summary', ''),
            "last_count": metadata.get('semantic_summary_last_count', 0),
            "entries": user_data.get('conversaciones_relevantes', [])
        }

    def set_semantic_summary(self, summary_text, total_count):
        """Guarda el resumen semántico actualizado y su offset."""
        user_data = self._read_json(self.user_context_file) or {}
        metadata = user_data.get('metadata', {})
        metadata['semantic_summary'] = summary_text
        metadata['semantic_summary_last_count'] = total_count
        metadata['last_updated'] = datetime.datetime.now().isoformat()
        user_data['metadata'] = metadata
        self._write_json(self.user_context_file, user_data)

    def get_memory_snapshot(self, recent_limit=20):
        """Devuelve un snapshot de memoria para depuracion."""
        user_data = self._read_json(self.user_context_file) or {}
        pain_data = self._read_json(self.pain_file) or {"registros": []}
        entries = user_data.get('conversaciones_relevantes', [])

        snapshot = {
            "metadata": user_data.get('metadata', {}),
            "perfil_usuario": user_data.get('perfil_usuario', {}),
            "historial_medico_resumido": user_data.get('historial_medico_resumido', {}),
            "estadisticas_ultimos_30d": user_data.get('estadisticas_ultimos_30d', {}),
            "insights_aprendidos": user_data.get('insights_aprendidos', []),
            "conversaciones_total": len(entries),
            "conversaciones_relevantes_recientes": entries[-recent_limit:],
            "dolor_registros_total": len(pain_data.get('registros', [])),
            "dolor_registros_recientes": pain_data.get('registros', [])[-recent_limit:]
        }

        return snapshot

    def _update_medical_status(self, last_pain):
        """Actualiza la tendencia de dolor en el contexto de usuario."""
        user_data = self._read_json(self.user_context_file)
        if not user_data: return
        
        med = user_data.get('historial_medico_resumido', {})
        lesiones = med.get('lesiones_activas', [])
        
        for l in lesiones:
            if "Rodilla" in l.get('nombre', '') or "Cuadricipital" in l.get('nombre', ''):
                l['nivel_dolor_actual'] = last_pain
                l['tendencia'] = "Al alza" if last_pain > 3 else "Estable/Baja"
        
        user_data['metadata']['last_updated'] = datetime.datetime.now().isoformat()
        self._write_json(self.user_context_file, user_data)

    def _read_json(self, path):
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error reading JSON {path}: {e}")
        return None

    def _write_json(self, path, data):
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error writing JSON {path}: {e}")
