import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base paths
# backend/config.py -> backend/ -> root/
BACKEND_DIR = Path(__file__).parent
BASE_DIR = BACKEND_DIR.parent

# Context Paths
CONTEXT_BASE_PATH = BASE_DIR / "BioEngine_V3_Contexto_Base"
if not CONTEXT_BASE_PATH.exists():
    # Fallback if the folder is named differently or in a different location
    CONTEXT_BASE_PATH = BASE_DIR / "docs" 

# Database
DB_DIR = BASE_DIR / "db"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = str(DB_DIR / "bioengine_v3.db")

# Security
ADMIN_TOKEN = os.getenv("BIOENGINE_ADMIN_TOKEN", "bioengine-local")

# AI Settings
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Logging
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = str(LOG_DIR / "bioengine_v3.log")
AI_DEBUG_LOG = str(LOG_DIR / "ai_service_debug.log")
MODEL_FALLBACK_LOG = str(LOG_DIR / "ai_model_fallback.log")
