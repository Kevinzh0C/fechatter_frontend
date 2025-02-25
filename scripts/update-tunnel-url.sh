#!/bin/bash

# Update Frontend Configuration with Cloudflare Tunnel URL
# 自动更新前端配置中的隧道URL

set -e

echo "🔄 Update Tunnel URL Configuration"
echo "=================================="

# Check if tunnel URL is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <tunnel-url>"
    echo "Example: $0 https://random-words-1234.trycloudflare.com"
    exit 1
fi

TUNNEL_URL="$1"

# Validate URL format (support both Cloudflare and ngrok)
if [[ ! "$TUNNEL_URL" =~ ^https://.*\.(trycloudflare\.com|ngrok\.io)$ ]]; then
    echo "❌ Invalid tunnel URL format"
    echo "Expected: https://xxx.trycloudflare.com or https://xxx.ngrok.io"
    echo "Got: $TUNNEL_URL"
    exit 1
fi

echo "🌐 Tunnel URL: $TUNNEL_URL"

# Update production-tunnel.yml
echo "📝 Updating production-tunnel.yml..."
sed -i.backup "s|https://YOUR_TUNNEL_URL.trycloudflare.com|$TUNNEL_URL|g" config/production-tunnel.yml

# Copy to production.yml
echo "📋 Copying to production.yml..."
cp config/production-tunnel.yml config/production.yml

# Update Vercel environment variable
echo "🔧 Updating Vercel configuration..."
cat > vercel-tunnel.json << EOF
{
  "buildCommand": "yarn build",
  "outputDirectory": "dist",
  "cleanUrls": false,
  "rewrites": [
    {
      "source": "/((?!api/|config/|favicon|manifest|.*\\\\.).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "VITE_API_URL": "$TUNNEL_URL"
  }
}
EOF

cp vercel-tunnel.json vercel.json

echo "✅ Configuration updated!"
echo ""
echo "📦 Next steps:"
echo "1. Build and deploy:"
echo "   yarn build"
echo "   vercel --prod"
echo ""
echo "2. Or use quick deploy:"
echo "   yarn deploy:tunnel"
echo ""
echo "🔧 Remember to update CORS on your backend to allow:"
echo "   - https://*.vercel.app"
echo "   - Your specific Vercel deployment URL" 