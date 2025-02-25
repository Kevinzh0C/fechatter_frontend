#!/bin/bash

# Fechatter SSL Deployment Script
# Deploys frontend with SSL configuration

set -e

echo "🚀 Fechatter SSL Deployment"
echo "============================"

# Check if we have the domain configured
if [ -z "$FECHATTER_DOMAIN" ]; then
    echo "⚠️  FECHATTER_DOMAIN not set, using default: fechatter.com"
    export FECHATTER_DOMAIN="fechatter.com"
fi

# Copy SSL configuration
echo "📋 Using SSL configuration..."
cp config/production-ssl.yml config/production.yml
cp vercel-ssl.json vercel.json

# Update API URL resolver for SSL
echo "🔧 Updating API URL resolver for SSL..."
cat > src/utils/apiUrlResolver-ssl.js << 'EOF'
/**
 * SSL-enabled API URL Resolver
 */

import { getApiConfig } from './yamlConfigLoader.js';

function detectRuntimeEnvironment() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production domain
    if (hostname === 'app.fechatter.com' || hostname === 'fechatter.vercel.app') {
      return 'production';
    }
    
    // Vercel preview
    if (hostname.includes('vercel.app')) {
      return 'vercel';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
  }
  
  return 'production';
}

export async function getApiBaseUrl() {
  try {
    const config = await getApiConfig();
    const environment = detectRuntimeEnvironment();
    
    switch (environment) {
      case 'development':
        return config.base_url || '/api';
      case 'production':
        return config.base_url || 'https://api.fechatter.com/api';
      default:
        return config.base_url || 'https://api.fechatter.com/api';
    }
  } catch (error) {
    console.warn('Failed to load API config, using SSL fallback:', error);
    return 'https://api.fechatter.com/api';
  }
}

export async function getFileUrl() {
  const config = await getApiConfig();
  return config.file_url || 'https://api.fechatter.com/files';
}

export async function getSseUrl() {
  const config = await getApiConfig();
  return config.sse_url || 'https://api.fechatter.com/events';
}

export async function getNotifyUrl() {
  const config = await getApiConfig();
  return config.notify_url || 'https://api.fechatter.com/notify';
}

export async function buildApiUrl(endpoint) {
  const baseUrl = await getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

export function getEnvironmentInfo() {
  const environment = detectRuntimeEnvironment();
  return {
    environment,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    ssl: true,
    domain: 'fechatter.com'
  };
}

export { detectRuntimeEnvironment };

export default {
  getApiBaseUrl,
  getFileUrl,
  getSseUrl,
  getNotifyUrl,
  buildApiUrl,
  getEnvironmentInfo,
  detectRuntimeEnvironment
};
EOF

# Backup original resolver
mv src/utils/apiUrlResolver.js src/utils/apiUrlResolver.backup.js
mv src/utils/apiUrlResolver-ssl.js src/utils/apiUrlResolver.js

echo "📦 Building for production..."
yarn build

echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    echo "Then run: vercel --prod"
fi

echo "✅ SSL Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS:"
echo "   - A record: api.fechatter.com → 45.77.178.85"
echo "   - CNAME: app.fechatter.com → cname.vercel-dns.com"
echo ""
echo "2. Run SSL installation on backend server:"
echo "   scp scripts/install-ssl-backend.sh root@45.77.178.85:/tmp/"
echo "   ssh root@45.77.178.85 'chmod +x /tmp/install-ssl-backend.sh && /tmp/install-ssl-backend.sh'"
echo ""
echo "3. Get SSL certificates on backend:"
echo "   ssh root@45.77.178.85 'certbot --nginx -d api.fechatter.com -d admin.fechatter.com'"
echo ""
echo "4. Add custom domain in Vercel dashboard:"
echo "   - Go to your project settings"
echo "   - Add domain: app.fechatter.com"
echo "   - Verify DNS configuration" 