import requests
import json

class AgentTools:
    """
    ANTIGRAVITY v6.0 CORE TOOLS
    Provee capacidad de navegación y lectura web nativa a los Agentes.
    """
    
    @staticmethod
    def search_web(query: str):
        print(f"🕵️ GENESIS SEARCH: {query}")
        return f"Resultados simulados para: {query} (Configura tu API Key en .env)"

    @staticmethod
    def read_url(url: str):
        try:
            print(f"📖 LEYENDO: {url}")
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            response = requests.get(url, headers=headers, timeout=15)
            return response.text[:8000] 
        except Exception as e:
            return f"Error leyendo URL: {str(e)}"
