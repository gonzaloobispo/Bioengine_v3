import os
import json
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from config import MODEL_FALLBACK_LOG

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
        
        # Orden SOTA 2026 - Modelos Verificados (Feb 2026)
        self.fallback_order = [
            # 1. GEMINI 2.5 PRO (SOTA 2026 - Máxima Precisión)
            {
                "provider": "gemini", 
                "model": "gemini-2.5-pro", 
                "priority": 0, 
                "cost": "free",
                "description": "Gemini 2.5 Pro (SOTA 2026)"
            },
            
            # 2. GEMINI 2.5 FLASH (Velocidad Optimizada)
            {
                "provider": "gemini", 
                "model": "gemini-2.5-flash", 
                "priority": 1, 
                "cost": "free",
                "description": "Gemini 2.5 Flash"
            },
            
            # 3. GEMINI 2.0 FLASH (Fallback Estable)
            {
                "provider": "gemini", 
                "model": "gemini-2.0-flash", 
                "priority": 2, 
                "cost": "free",
                "description": "Gemini 2.0 Flash"
            },
            
            # 4. GPT-4o (Razonamiento General)
            {
                "provider": "openai", 
                "model": "gpt-4o", 
                "priority": 3, 
                "cost": "paid",
                "description": "GPT-4o (OpenAI Premium)"
            },
            
            # 5. GPT-3.5 TURBO (Económico)
            {
                "provider": "openai", 
                "model": "gpt-3.5-turbo", 
                "priority": 4, 
                "cost": "paid",
                "description": "GPT-3.5 Turbo"
            },
        ]
        
        self.current_provider: Optional[str] = None
        self.current_model: Optional[str] = None
        self.log_file = MODEL_FALLBACK_LOG
        self.cost_warnings_shown: set = set()  # Para no repetir advertencias de costo
        
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
            
            # 3. Control de costos para modelos pagos/free_tier
            if cost_type in ["paid", "free_tier"]:
                if self.cost_control and not self.cost_control.is_provider_allowed(provider):
                    self._log_skip(provider, model, f"Bloqueado por control de costos (tipo: {cost_type})")
                    continue

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
        """Llama a Google Gemini via new google-genai SDK"""
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=self.api_keys["gemini"])
        
        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
            system_instruction=system_instruction
        )
        
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        
        return response.text
    
    async def generate_stream(self, prompt: str, system_instruction: str = "", max_tokens: int = 1000):
        """
        Genera respuesta en streaming intentando modelos en orden de fallback.
        """
        last_error = None
        
        for config in self.fallback_order:
            provider = config["provider"]
            model = config["model"]
            cost_type = config.get("cost", "unknown")
            description = config.get("description", f"{provider}/{model}")
            
            # Verificar si tenemos API key para este proveedor
            if provider not in self.api_keys or not self.api_keys[provider]:
                continue
            
            # Control de costos para modelos pagos
            if cost_type in ["paid", "free_tier"]:
                if self.cost_control and not self.cost_control.is_provider_allowed(provider):
                    self._log_skip(provider, model, f"Streaming bloqueado por control de costos (tipo: {cost_type})")
                    continue

            try:
                self._log_attempt(provider, model, description)
                
                # Yield info about which model is starting (optional, maybe too noisy for chat)
                # yield f"[DEBUG: Usando {description}]\n"

                success = False
                if provider == "openai":
                    async for chunk in self._call_openai_stream(prompt, system_instruction, model, max_tokens):
                        yield chunk
                        success = True
                elif provider == "anthropic":
                    async for chunk in self._call_anthropic_stream(prompt, system_instruction, model, max_tokens):
                        yield chunk
                        success = True
                elif provider == "gemini":
                    async for chunk in self._call_gemini_stream(prompt, system_instruction, model, max_tokens):
                        yield chunk
                        success = True
                
                if success:
                    # Si funcionó, registramos y terminamos
                    if self.current_provider != provider or self.current_model != model:
                        self._log_switch(provider, model, description)
                        self.current_provider = provider
                        self.current_model = model
                    return

            except Exception as e:
                last_error = e
                self._log_error(provider, model, str(e))
                # Fallback al siguiente modelo de la lista
                continue
        
        # Si todos fallaron
        yield f"\n[Error crítico: Todos los modelos de IA fallaron. Último error: {str(last_error)}]"

    async def _call_openai_stream(self, prompt: str, system_instruction: str, model: str, max_tokens: int):
        """Llama a OpenAI en modo streaming"""
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise Exception("openai package not installed.")
        
        client = AsyncOpenAI(api_key=self.api_keys["openai"])
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def _call_anthropic_stream(self, prompt: str, system_instruction: str, model: str, max_tokens: int):
        """Llama a Anthropic en modo streaming"""
        try:
            from anthropic import AsyncAnthropic
        except ImportError:
            raise Exception("anthropic package not installed.")
        
        client = AsyncAnthropic(api_key=self.api_keys["anthropic"])
        async with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system_instruction if system_instruction else "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _call_gemini_stream(self, prompt: str, system_instruction: str, model: str, max_tokens: int):
        """Llama a Gemini en modo streaming asíncrono"""
        from google import genai
        from google.genai import types
        
        # Usamos el cliente asíncrono de genai
        client = genai.Client(api_key=self.api_keys["gemini"])
        
        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
            system_instruction=system_instruction
        )
        
        async for chunk in await client.aio.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=config
        ):
            if chunk.text:
                yield chunk.text

    def _log_skip(self, provider: str, model: str, reason: str) -> None:
        """Registra modelo omitido"""
        msg = f"[{datetime.now().isoformat()}] SKIP: {provider}/{model} - {reason}"
        logger.debug(msg)
        self._write_log(msg)
    
    def _log_attempt(self, provider: str, model: str, description: str) -> None:
        """Registra intento de usar un modelo"""
        msg = f"[{datetime.now().isoformat()}] INTENTO: {description}"
        logger.info(msg)
        self._write_log(msg)
    
    def _log_switch(self, provider: str, model: str, description: str) -> None:
        """Registra cambio de modelo"""
        msg = f"[{datetime.now().isoformat()}] 🧠 CAMBIO DE CEREBRO: Ahora usando {description}"
        logger.warning(msg)
        self._write_log(msg)
        print(f"\n⚠️ {msg}\n")  # También imprime en consola
    
    def _log_cost_warning(self, provider: str, model: str, description: str) -> None:
        """Registra advertencia de costo"""
        msg = f"[{datetime.now().isoformat()}] 💰 ADVERTENCIA COSTO: Usando {description} - Este modelo genera costos"
        logger.warning(msg)
        self._write_log(msg)
        print(f"\n💰 ADVERTENCIA: {description} - Este modelo GENERA COSTOS\n")
    
    def _log_error(self, provider: str, model: str, error: str) -> None:
        """Registra error de un modelo"""
        error_short = error[:200] if len(error) > 200 else error
        msg = f"[{datetime.now().isoformat()}] ❌ ERROR en {provider}/{model}: {error_short}"
        logger.error(msg)
        self._write_log(msg)
    
    def _log_critical(self, message: str) -> None:
        """Registra error crítico (todos los modelos fallaron)"""
        msg = f"[{datetime.now().isoformat()}] 🚨 CRÍTICO: {message}"
        logger.critical(msg)
        self._write_log(msg)
    
    def _write_log(self, message: str) -> None:
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
