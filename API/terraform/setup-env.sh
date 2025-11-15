#!/bin/bash
set -e

cd "$(dirname "$0")"

ENV_FILE="../.env"

PLACES_API_KEY=$(terraform output -raw places_api_key)
GEMINI_API_KEY=$(terraform output -raw gemini_api_key)

cat > "$ENV_FILE" << EOF
GOOGLE_MAPS_API_KEY=$PLACES_API_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
EOF
