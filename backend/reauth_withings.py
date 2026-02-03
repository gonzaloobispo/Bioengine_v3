"""
Script para re-autorizar Withings OAuth2
Ejecutar: python reauth_withings.py
"""
import sqlite3
import json
import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

DB_PATH = 'C:/BioEngine_V3/db/bioengine_v3.db'

def get_app_credentials():
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", ('withings_app',)).fetchone()
    conn.close()
    return json.loads(row[0]) if row else None

def save_tokens(tokens):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE secrets SET credentials_json = ?, updated_at = datetime('now') WHERE service = ?",
        (json.dumps(tokens), 'withings_tokens')
    )
    conn.commit()
    conn.close()
    print("\n[OK] Tokens guardados en la base de datos!")

class CallbackHandler(BaseHTTPRequestHandler):
    authorization_code = None
    
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        if 'code' in query:
            CallbackHandler.authorization_code = query['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"""
                <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: green;">Autorizacion Exitosa!</h1>
                <p>Puedes cerrar esta ventana.</p>
                </body></html>
            """)
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            error = query.get('error', ['Unknown'])[0]
            self.wfile.write(f"<html><body><h1>Error: {error}</h1></body></html>".encode())
    
    def log_message(self, format, *args):
        pass  # Silenciar logs

def main():
    print("=" * 50)
    print("  WITHINGS RE-AUTORIZACION")
    print("=" * 50)
    
    creds = get_app_credentials()
    if not creds:
        print("[ERROR] No se encontraron credenciales de la app Withings")
        return
    
    client_id = creds['client_id']
    client_secret = creds['client_secret']
    redirect_uri = creds.get('redirect_uri', 'http://localhost:8080/')
    
    # Construir URL de autorizacion
    auth_url = (
        f"https://account.withings.com/oauth2_user/authorize2"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user.metrics"
        f"&state=bioengine"
    )
    
    print(f"\n[1] Abriendo navegador para autorizar...")
    print(f"    URL: {auth_url[:80]}...")
    
    # Iniciar servidor local para capturar el callback
    port = 8080
    server = HTTPServer(('localhost', port), CallbackHandler)
    server.timeout = 120
    
    # Abrir navegador
    webbrowser.open(auth_url)
    
    print(f"\n[2] Esperando autorizacion en http://localhost:{port}/...")
    print("    (Tienes 2 minutos para autorizar en el navegador)")
    
    # Esperar el callback
    while CallbackHandler.authorization_code is None:
        server.handle_request()
        if CallbackHandler.authorization_code:
            break
    
    code = CallbackHandler.authorization_code
    print(f"\n[3] Codigo recibido: {code[:20]}...")
    
    # Intercambiar codigo por tokens
    print("\n[4] Intercambiando codigo por tokens...")
    token_url = "https://wbsapi.withings.net/v2/oauth2"
    payload = {
        'action': 'requesttoken',
        'grant_type': 'authorization_code',
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri
    }
    
    response = requests.post(token_url, data=payload)
    data = response.json()
    
    if data.get('status') == 0:
        tokens = data['body']
        save_tokens(tokens)
        print(f"\n[OK] Access Token: {tokens['access_token'][:20]}...")
        print(f"[OK] Refresh Token: {tokens['refresh_token'][:20]}...")
        print(f"[OK] Expira en: {tokens['expires_in']} segundos")
        print("\n" + "=" * 50)
        print("  WITHINGS RE-AUTORIZADO EXITOSAMENTE!")
        print("  Reinicia el backend y prueba sincronizar.")
        print("=" * 50)
    else:
        print(f"\n[ERROR] Fallo al obtener tokens:")
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    main()
