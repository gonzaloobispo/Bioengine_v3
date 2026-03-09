
import os
import time
import json
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

app = FastAPI(title="NotebookLM Sidecar Server")

class QueryRequest(BaseModel):
    notebook_id: str
    message: str

# Configuración de rutas
CHROME_PROFILE = r"C:\APP\Notebook\chrome_profile_notebooklm"

class NotebookBrowser:
    def __init__(self):
        self.driver = None
        
    def start(self):
        if self.driver:
            return
            
        print(f"Iniciando Chrome con perfil: {CHROME_PROFILE}")
        options = uc.ChromeOptions()
        options.add_argument(f"--user-data-dir={CHROME_PROFILE}")
        options.add_argument("--profile-directory=Default")
        # Quitamos headless temporalmente si hay problemas de login, 
        # pero para el agente lo ideal es que sea estable.
        
        try:
            self.driver = uc.Chrome(options=options)
            print("Driver iniciado con éxito.")
            # Ir a la home para asegurar sesión
            self.driver.get("https://notebooklm.google.com/")
            time.sleep(5)
            print(f"Página inicial: {self.driver.title}")
        except Exception as e:
            print(f"Error iniciando driver: {e}")

    def query(self, notebook_id: str, message: str):
        url = f"https://notebooklm.google.com/notebook/{notebook_id}"
        print(f"Navegando al cuaderno: {url}")
        
        try:
            current_url = self.driver.current_url
            if notebook_id not in current_url:
                self.driver.get(url)
            
            # Esperar a que cargue el input específico descubierto por el subagente
            input_selector = "textarea.query-box-input"
            chat_box = WebDriverWait(self.driver, 30).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, input_selector))
            )
            print("Chat input encontrado con éxito.")

            # Limpiar y escribir
            chat_box.click()
            time.sleep(0.5)
            chat_box.send_keys(message)
            time.sleep(0.5)
            
            # Intentar buscar el botón de enviar (icono arrow_forward en mat-icon)
            try:
                send_button = self.driver.find_element(By.XPATH, "//button[descendant::mat-icon[text()='arrow_forward']]")
                send_button.click()
                print("Botón Enviar clickeado.")
            except:
                print("Botón enviar no detectado, usando Enter...")
                chat_box.send_keys("\n") 
            
            print("Esperando respuesta...")
            # NotebookLM puede tardar. Esperamos a que aparezca un nuevo bloque de respuesta.
            time.sleep(20) 
            
            # Selectores de respuesta mejorados
            response_selectors = [
                ".model-response-text", 
                "message-content div",
                ".chat-panel-content .response-block",
                ".formatted-text"
            ]
            
            for attempt in range(4):
                for r_sel in response_selectors:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, r_sel)
                    if elements:
                        # Obtenemos la última burbuja de respuesta
                        text = elements[-1].text.strip()
                        if text:
                            return text
                print(f"Intento {attempt+1} buscando respuesta...")
                time.sleep(5)
            
            return f"Respuesta no detectada tras 40s. Por favor revisa la pestaña de Chrome."
        except Exception as e:
            return f"Error crítico en consulta: {str(e)}"

    def reconnect(self):
        print("Reconectando driver...")
        try:
            if self.driver:
                self.driver.quit()
        except: pass
        self.driver = None
        self.start()

    def list_notebooks(self):
        print(f"Navegando a la home para listar cuadernos...")
        try:
            self.driver.get("https://notebooklm.google.com/")
            time.sleep(10) # Dar tiempo a que cargue el grid
            
            notebooks = []
            links = self.driver.find_elements(By.TAG_NAME, "a")
            print(f"DEBUG: Se encontraron {len(links)} links en total.")
            
            with open("links_debug.txt", "w", encoding="utf-8") as f:
                for link in links:
                    try:
                        href = link.get_attribute("href")
                        text = link.text.strip()
                        f.write(f"TEXT: {text} | HREF: {href}\n")
                        if href and "/notebook/" in href:
                            clean_url = href.split('?')[0].split('#')[0]
                            title = text or link.get_attribute("aria-label") or "Sin título"
                            notebooks.append({"title": title, "url": clean_url})
                    except: continue

            print(f"Se encontraron {len(notebooks)} cuadernos.")
            return notebooks
        except Exception as e:
            print(f"Error final listando cuadernos: {str(e)}")
            return [{"error": str(e), "url": self.driver.current_url}]
        except Exception as e:
            print(f"Error final listando cuadernos: {str(e)}")
            return [{"error": str(e), "url": self.driver.current_url}]

browser = NotebookBrowser()

@app.on_event("startup")
async def startup_event():
    print("Iniciando evento de startup...")
    # Iniciamos en un hilo separado para no bloquear FastAPI
    loop = asyncio.get_event_loop()
    print("Llamando a browser.start en el executor...")
    await loop.run_in_executor(None, browser.start)
    print("Evento de startup completado.")

@app.get("/list")
async def handle_list():
    loop = asyncio.get_event_loop()
    notebooks = await loop.run_in_executor(None, browser.list_notebooks)
    return {"notebooks": notebooks}

@app.get("/source")
async def handle_source():
    return {"source": browser.driver.page_source}

@app.post("/query")
async def handle_query(request: QueryRequest):
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, browser.query, request.notebook_id, request.message)
    return {"response": response}

@app.get("/health")
async def health():
    return {"status": "alive", "browser": "connected" if browser.driver else "disconnected"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
