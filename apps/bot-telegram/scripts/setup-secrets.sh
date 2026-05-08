#!/bin/bash
# setup-secrets.sh
# 
# SCRIPT DE MIGRACIÓN INICIAL PARA FIREBASE SECRET MANAGER Y CLOUD FUNCTIONS
#
# Lee las variables del archivo .env actual y las inyecta en GCP Secret Manager.
# También asigna dinámicamente los roles a la cuenta de servicio de funciones 
# para que Cloud Functions las pueda accesar en tiempo real. 
#
# Ejecución:
# bash scripts/setup-secrets.sh
#

PROJECT_ID="bioengine-v4"
ENV_FILE=".env"

echo "=================================================="
echo "🚀 BIOENGINE V3: SECRETS INITIALIZATOR"
echo "=================================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró el archivo $ENV_FILE en la raíz actual."
    exit 1
fi

echo "✅ Archivo .env encontrado. Extrayendo variables..."

# Secrets reales: credenciales y API keys que NUNCA deben estar en código ni UI.
# Configuración operativa (OPENROUTER_MODEL, GOG_TIMEZONE, etc.) NO va aquí — va a Firestore.
SECRETS_KEYS=(
    "TELEGRAM_BOT_TOKEN"
    "GEMINI_API_KEY"
    "GROQ_API_KEY"
    "OPENROUTER_API_KEY"
    "ELEVENLABS_API_KEY"
    "GARMIN_EMAIL"
    "GARMIN_PASSWORD"
    "WITHINGS_CLIENT_ID"
    "WITHINGS_CLIENT_SECRET"
)

# Loop leyendo las variables clave
for KEY in "${SECRETS_KEYS[@]}"; do
    # Buscar el valor en el .env descartando comentarios
    VALUE=$(grep "^$KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    
    if [ -n "$VALUE" ]; then
        echo "🔐 Configurando secreto: $KEY"
        
        # 1. Crear el baúl del secreto si no existe
        gcloud secrets create "$KEY" --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null
        
        # 2. Inyectar el valor como nueva versión
        echo -n "$VALUE" | gcloud secrets versions add "$KEY" --data-file=- --project="$PROJECT_ID"
        
        echo "   -> Versión añadida remotamente."
    else
        echo "⚠️  Salto: $KEY no fue encontrada en $ENV_FILE."
    fi
done

echo "=================================================="
echo "🛡️  ASIGNANDO PERMISOS A LA SERVICE ACCOUNT"
echo "=================================================="

# La cuenta de servicio por defecto para app de Firebase cloud functions puede ser `PROJECT_ID@appspot.gserviceaccount.com`
# O la cuenta de servicio genérica de compute. Asumiremos App Engine Default.
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Iterar de nuevo para darle permiso a la Service Account de leer estos secretos en particular
for KEY in "${SECRETS_KEYS[@]}"; do
    VALUE=$(grep "^$KEY=" "$ENV_FILE" | cut -d '=' -f2-)
    if [ -n "$VALUE" ]; then
        gcloud secrets add-iam-policy-binding "$KEY" \
            --member="serviceAccount:${SERVICE_ACCOUNT}" \
            --role="roles/secretmanager.secretAccessor" \
            --project="$PROJECT_ID" > /dev/null 2>&1
        echo "   -> IAM asignado a $SERVICE_ACCOUNT para leer $KEY"
    fi
done

echo "=================================================="
echo "🎉 ¡MIGRACIÓN COMPLETADA! "
echo ""
echo "Tus secretos ahora viven en GCP Secret Manager."
echo ""
echo "REGLAS DE OPERACIÓN:"
echo "  - Para rotar un secret:"
echo "    1. echo -n 'nuevo_valor' | gcloud secrets versions add KEY --data-file=- --project=$PROJECT_ID"
echo "    2. gcloud secrets versions disable 1 --secret=KEY --project=$PROJECT_ID"
echo "  - La UI web NUNCA debe mostrar ni recibir estos campos."
echo "  - Configuración operativa (thresholds, timezone) va en Firestore, no aquí."
echo "=================================================="
