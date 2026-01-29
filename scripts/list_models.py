import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from backend.services.ai_service import AIService
import requests
import json

# Get API key
service = AIService()
api_key = service.api_key

if not api_key:
    print("ERROR: No API key found")
    sys.exit(1)

# List available models
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
response = requests.get(url)

print("Available Gemini Models:")
print("=" * 50)

if response.status_code == 200:
    data = response.json()
    for model in data.get('models', []):
        name = model.get('name', 'Unknown')
        supported = model.get('supportedGenerationMethods', [])
        if 'generateContent' in supported:
            print(f"[OK] {name}")
            print(f"  Methods: {', '.join(supported)}")
            print()
else:
    print(f"Error: {response.status_code}")
    print(response.text)
