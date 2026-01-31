import os
import json
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

class MultiModelClient:
    """
    Cliente multi-modelo con fallback automático.
    Prioriza modelos GRATUITOS para evitar costos inesperados.
    Orden: Gemini 2.0 (gratis) → Gemini 1.5 (gratis) → Claude (free tier) → GPT-4 (PAGA) → GPT-3.5 (PAGA)
    """
    
    def __init__(self, api_keys: Dict[str, str], cost_control: Any = None):
        """
        Args:
            api_keys: Dict con las API keys {"openai": "sk-...", "anthropic": "sk-ant-...", "gemini": "..."}
            cost_control: Objeto para control de costos.
        """
        self.api_keys = api_keys
        self.cost_control = cost_control
        
        # Orden de MEJOR a PEOR, priorizando modelos GRATUITOS
        self.fallback_order = [
            # 1. GEMINI 2.0 FLASH THINKING (GRATIS con Google AI Studio / Plan Plus)
            {
                "provider": "gemini", 
                "model": "gemini-2.0-flash-thinking-exp-1219", 
                "priority": 1, 
                "cost": "free",
                "description": "Gemini 2.0 Thinking (Gratuito)"
            },
            
            # 2. GEMINI 1.5 FLASH (GRATIS con Google AI Studio)
            {
                "provider": "gemini", 
                "model": "gemini-1.5-flash-latest", 
                "priority": 2, 
                "cost": "free",
                "description": "Gemini 1.5 Flash (Gratuito)"
            },
            
            # 3. CLAUDE 3.5 SONNET (Free tier limitado, luego paga)
            {
                "provider": "anthropic", 
                "model": "claude-3-5-sonnet-20241022", 
                "priority": 3, 
                "cost": "free_tier",
                "description": "Claude 3.5 (Free tier limitado)"
            },
            
            # 4. GPT-4 (⚠️ PAGA - ChatGPT Plus NO incluye acceso a API)
            {
                "provider": "openai", 
                "model": "gpt-4-turbo-preview", 
                "priority": 4, 
                "cost": "paid",
                "description": "GPT-4 Turbo (⚠️ PAGA ~$0.01/1k tokens)"
            },
            
            # 5. GPT-3.5 TURBO (⚠️ PAGA pero más barato)
            {
                "provider": "openai", 
                "model": "gpt-3.5-turbo", 
                "priority": 5, 
                "cost": "paid",
                "description": "GPT-3.5 Turbo (⚠️ PAGA ~$0.001/1k tokens)"
            },
        ]
        
        self.current_provider = None
        self.current_model = None
        self.log_file = "ai_model_fallback.log"
        self.cost_warnings_shown = set()  # Para no repetir advertencias de costo
        
    def generate(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000) -> str:
        """
        Genera respuesta intentando modelos en orden de fallback.
        
        Args:
            prompt: El prompt del usuario
            system_instruction: Instrucciones del sistema (contexto base)
            max_tokens: Máximo de tokens en la respuesta
            
        Returns:
            La respuesta generada por el primer modelo que funcione
        """
        last_error = None
        
        for config in self.fallback_order:
            provider = config["provider"]
            model = config["model"]
            cost_type = config.get("cost", "unknown")
            description = config.get("description", f"{provider}/{model}")
            
            # Verificar si tenemos API key para este proveedor
            if provider not in self.api_keys or not self.api_keys[provider]:
                self._log_skip(provider, model, "No API key configurada")
                continue
            
            # Advertencia de costo si es modelo pago
            if cost_type == "paid" and f"{provider}/{model}" not in self.cost_warnings_shown:
                self._log_cost_warning(provider, model, description)
                self.cost_warnings_shown.add(f"{provider}/{model}")
                
            try:
                self._log_attempt(provider, model, description)
                
                if provider == "openai":
                    response = self._call_openai(prompt, system_instruction, model, max_tokens)
                elif provider == "anthropic":
                    response = self._call_anthropic(prompt, system_instruction, model, max_tokens)
                elif provider == "gemini":
                    response = self._call_gemini(prompt, system_instruction, model, max_tokens)
                else:
                    continue
                
                # Si llegamos aquí, funcionó
                if self.current_provider != provider or self.current_model != model:
                    self._log_switch(provider, model, description)
                    self.current_provider = provider
                    self.current_model = model
                
                return response
                
            except Exception as e:
                last_error = e
                self._log_error(provider, model, str(e))
                continue
        
        # Si todos fallaron
        error_msg = f"Todos los modelos fallaron. Último error: {last_error}"
        self._log_critical(error_msg)
        raise Exception(error_msg)
    
    def _call_openai(self, prompt: str, system_instruction: str, model: str, max_tokens: int) -> str:
        """Llama a OpenAI GPT-4 o GPT-3.5"""
        try:
            from openai import OpenAI
        except ImportError:
            raise Exception("openai package not installed. Run: pip install openai")
        
        client = OpenAI(api_key=self.api_keys["openai"])
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def _call_anthropic(self, prompt: str, system_instruction: str, model: str, max_tokens: int) -> str:
        """Llama a Anthropic Claude"""
        try:
            from anthropic import Anthropic
        except ImportError:
            raise Exception("anthropic package not installed. Run: pip install anthropic")
        
        client = Anthropic(api_key=self.api_keys["anthropic"])
        
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_instruction if system_instruction else "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
    
    def _call_gemini(self, prompt: str, system_instruction: str, model: str, max_tokens: int) -> str:
        """Llama a Google Gemini (incluye 2.0 Flash Thinking)"""
        import google.generativeai as genai
        
        genai.configure(api_key=self.api_keys["gemini"])
        
        # Construir el prompt completo
        full_prompt = prompt
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"
        
        model_obj = genai.GenerativeModel(model)
        response = model_obj.generate_content(
            full_prompt,
            generation_config={"max_output_tokens": max_tokens, "temperature": 0.7}
        )
        
        return response.text
    
    def _log_skip(self, provider: str, model: str, reason: str):
        """Registra modelo omitido"""
        msg = f"[{datetime.now().isoformat()}] SKIP: {provider}/{model} - {reason}"
        logger.debug(msg)
        self._write_log(msg)
    
    def _log_attempt(self, provider: str, model: str, description: str):
        """Registra intento de usar un modelo"""
        msg = f"[{datetime.now().isoformat()}] INTENTO: {description}"
        logger.info(msg)
        self._write_log(msg)
    
    def _log_switch(self, provider: str, model: str, description: str):
        """Registra cambio de modelo"""
        msg = f"[{datetime.now().isoformat()}] 🧠 CAMBIO DE CEREBRO: Ahora usando {description}"
        logger.warning(msg)
        self._write_log(msg)
        print(f"\n⚠️ {msg}\n")  # También imprime en consola
    
    def _log_cost_warning(self, provider: str, model: str, description: str):
        """Registra advertencia de costo"""
        msg = f"[{datetime.now().isoformat()}] 💰 ADVERTENCIA COSTO: Usando {description} - Este modelo genera costos"
        logger.warning(msg)
        self._write_log(msg)
        print(f"\n💰 ADVERTENCIA: {description} - Este modelo GENERA COSTOS\n")
    
    def _log_error(self, provider: str, model: str, error: str):
        """Registra error de un modelo"""
        error_short = error[:200] if len(error) > 200 else error
        msg = f"[{datetime.now().isoformat()}] ❌ ERROR en {provider}/{model}: {error_short}"
        logger.error(msg)
        self._write_log(msg)
    
    def _log_critical(self, message: str):
        """Registra error crítico (todos los modelos fallaron)"""
        msg = f"[{datetime.now().isoformat()}] 🚨 CRÍTICO: {message}"
        logger.critical(msg)
        self._write_log(msg)
    
    def _write_log(self, message: str):
        """Escribe en el archivo de log"""
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(message + '\n')
        except Exception as e:
            logger.error(f"Error escribiendo log: {e}")
    
    def get_current_model_info(self) -> Dict[str, str]:
        """Retorna información del modelo actual"""
        for config in self.fallback_order:
            if config["provider"] == self.current_provider and config["model"] == self.current_model:
                return {
                    "provider": self.current_provider,
                    "model": self.current_model,
                    "description": config.get("description", ""),
                    "cost": config.get("cost", "unknown")
                }
        
        return {
            "provider": self.current_provider or "ninguno",
            "model": self.current_model or "ninguno",
            "description": "No inicializado",
            "cost": "unknown"
        }
