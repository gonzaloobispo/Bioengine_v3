import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_system_status():
    print("--- 1. Testing System Status ---")
    try:
        r = requests.get(f"{API_BASE}/system/status", headers={"X-Admin-Token": "bioengine-local"})
        print(f"Status Code: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_pain_tracker():
    print("\n--- 2. Testing Pain Tracker ---")
    payload = {"level": 3, "location": "Rodilla Derecha (QA Test)", "notes": "Prueba automatizada de agente"}
    try:
        # Save
        r_post = requests.post(f"{API_BASE}/pain", json=payload)
        print(f"POST /pain: {r_post.status_code}")
        
        # Verify
        r_get = requests.get(f"{API_BASE}/pain/history?limit=1")
        history = r_get.json().get("history", [])
        if history and history[0]['level'] == 3:
            print("SUCCESS: Pain record verified in history.")
            return True
        else:
            print("FAILURE: Pain record not found or mismatch.")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_hitl_lifecycle():
    print("\n--- 3. Testing HITL Lifecycle ---")
    # We create a pending action directly via backend logic if possible, 
    # but here we test the GET pending endpoint.
    try:
        r = requests.get(f"{API_BASE}/hitl/pending")
        actions = r.json()
        if not isinstance(actions, list):
            print(f"Unexpected response format: {type(actions)}")
            return False
        
        print(f"Pending Actions: {len(actions)}")
        for a in actions:
            # Handle potential dict vs string indices
            severity = a.get('severity', 'UNKNOWN')
            action_id = a.get('action_id', 'N/A')
            desc = a.get('description', 'No description')
            print(f"- [{severity}] {action_id}: {desc}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_coach_intelligence():
    print("\n--- 4. Testing Coach Intelligence (CoT & Citing) ---")
    payload = {"message": "He tenido un poco de molestia en la rodilla ayer, pero hoy no me duele nada (0/10). ¿Qué protocolo debo seguir?", "history": []}
    try:
        print("Waiting for Coach response (CoT)...")
        r = requests.post(f"{API_BASE}/chat/stream", json=payload, stream=True)
        full_text = ""
        for line in r.iter_lines():
            if line:
                full_text += line.decode('utf-8')
        
        print(f"Response snippet: {full_text[:200]}...")
        
        # Validation checks
        has_cot = "RAZONAMIENTO" in full_text
        has_protocol = "9" in full_text and "día" in full_text.lower()
        
        print(f"Has CoT section: {'✅' if has_cot else '❌'}")
        print(f"Cites 9-day protocol: {'✅' if has_protocol else '❌'}")
        
        return has_cot and has_protocol
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    results = {
        "System Status": test_system_status(),
        "Pain Tracker": test_pain_tracker(),
        "HITL Listing": test_hitl_lifecycle(),
        "Coach Intelligence": test_coach_intelligence()
    }
    
    print("\n\n" + "="*30)
    print("FINAL QA REPORT (BACKEND)")
    print("="*30)
    for k, v in results.items():
        print(f"{k:25}: {'PASS ✅' if v else 'FAIL ❌'}")
    print("="*30)
