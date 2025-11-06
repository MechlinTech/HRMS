#!/bin/sh

# Generate runtime configuration for environment variables
# This script runs at container startup to inject environment variables into the built React app

# Create a JavaScript file with environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}",
  VITE_AZURE_CLIENT_ID: "${VITE_AZURE_CLIENT_ID:-}",
  VITE_AZURE_TENANT_ID: "${VITE_AZURE_TENANT_ID:-}",
  VITE_AZURE_REDIRECT_URI: "${VITE_AZURE_REDIRECT_URI:-}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  NODE_ENV: "${NODE_ENV:-production}"
};
EOF

echo "Environment configuration generated successfully"
