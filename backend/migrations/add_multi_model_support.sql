-- Script SQL para agregar soporte multi-modelo
-- Ejecutar en bioengine_v3.db

-- Crear tabla para múltiples API keys si no existe
CREATE TABLE IF NOT EXISTS api_keys (
    provider TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 99,
    last_used TEXT,
    error_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración inicial (reemplaza YOUR_API_KEY con tus keys reales)
INSERT OR REPLACE INTO api_keys (provider, api_key, enabled, priority) VALUES
    ('openai', 'YOUR_OPENAI_API_KEY', 1, 1),
    ('anthropic', 'YOUR_ANTHROPIC_API_KEY', 0, 2),  -- Deshabilitado por defecto
    ('gemini', 'YOUR_GEMINI_API_KEY', 1, 3);

-- Migrar la key existente de Gemini si existe
UPDATE api_keys 
SET api_key = (SELECT credentials_json FROM secrets WHERE service = 'gemini' LIMIT 1)
WHERE provider = 'gemini' 
AND EXISTS (SELECT 1 FROM secrets WHERE service = 'gemini');
