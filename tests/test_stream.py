import requests
import json
import sys

def test_stream():
    url = "http://localhost:8000/chat/stream"
    payload = {"message": "Cuenta hasta 3 lentamente", "history": []}
    
    print(f"Conectando a {url}...")
    try:
        with requests.post(url, json=payload, stream=True) as r:
            if r.status_code != 200:
                print(f"Error Status: {r.status_code}")
                print(r.text)
                return
            
            print("Conexión establecida. Escuchando chunks...")
            chunk_count = 0
            for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
                if chunk:
                    chunk_count += 1
                    # Imprimir sin salto de linea para ver el efecto, flush inmediato
                    print(f"[{chunk_count}] '{chunk}'")
                    sys.stdout.flush()
            
            if chunk_count == 0:
                print("\n❌ Error: No se recibieron chunks (Body vacío).")
            else:
                print(f"\n✅ Streaming exitoso. Total chunks: {chunk_count}")

    except Exception as e:
        print(f"\n❌ Error de conexión: {e}")
        print("Asegúrate de que el servidor backend esté corriendo (py -m backend.main).")

if __name__ == "__main__":
    test_stream()
