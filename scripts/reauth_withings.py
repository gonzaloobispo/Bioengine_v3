import requests
import sqlite3
import json
import webbrowser

DB_PATH = r"c:\BioEngine_V3\bioengine_v3.db"

def get_secret(service):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", (service,)).fetchone()
    conn.close()
    return json.loads(row['credentials_json']) if row else None

def save_secret(service, data):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT OR REPLACE INTO secrets (service, credentials_json) VALUES (?, ?)",
                 (service, json.dumps(data)))
    conn.commit()
    conn.close()

def manual_auth():
    app_secrets = get_secret('withings_app')
    if not app_secrets:
        print("Error: No se encontraron credenciales de la app Withings en la DB.")
        return

    client_id = app_secrets['client_id']
    client_secret = app_secrets['client_secret']
    redirect_uri = app_secrets['redirect_uri']
    
    auth_url = (
        f"https://account.withings.com/oauth2_user/authorize2"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&state=bioengine_v3"
        f"&scope=user.metrics"
        f"&redirect_uri={redirect_uri}"
    )

    print("\n=== AUTORIZACION MANUAL WITHINGS ===")
    print("1. Se abrirá una ventana en tu navegador.")
    print("2. Inicia sesión y autoriza la aplicación.")
    print("3. Serás redirigido a una página de error (localhost:8080).")
    print("4. COPIA la URL completa de esa página de error y pégala aquí.\n")
    
    webbrowser.open(auth_url)
    
    callback_url = input("Pega la URL de redirección completa aquí: ")
    
    try:
        code = callback_url.split('code=')[1].split('&')[0]
    except:
        print("Error: No se pudo encontrar el código en la URL proporcionada.")
        return

    # Canjear código por tokens
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
    
    if data['status'] == 0:
        save_secret('withings_tokens', data['body'])
        print("\n✅ EXITO: Tokens actualizados y guardados en la base de datos.")
        print("Ya puedes cerrar este script y volver a usar la interfaz de BioEngine V3.")
    else:
        print(f"\n❌ ERROR de Withings: {data}")

if __name__ == "__main__":
    manual_auth()
