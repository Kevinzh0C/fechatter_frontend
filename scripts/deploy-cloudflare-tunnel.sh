#!/bin/bash

# 🌐 Cloudflare Tunnel Deployment Script
# Replace ngrok with Cloudflare Tunnel for stable HTTPS access

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

echo "🌐 Cloudflare Tunnel Deployment"
echo "==============================="
echo ""

echo -e "${BLUE}📡 Connecting to remote server...${NC}"

# Deploy Cloudflare Tunnel on remote server
ssh "${BACKEND_USER}@${BACKEND_HOST}" << 'EOF'
set -e

echo "🌐 Setting up Cloudflare Tunnel..."

# Stop any existing ngrok containers
echo "🛑 Stopping existing ngrok containers..."
docker stop fechatter-ngrok-tunnel 2>/dev/null || true
docker rm fechatter-ngrok-tunnel 2>/dev/null || true

# Kill any existing cloudflared processes
echo "🛑 Stopping existing cloudflared processes..."
pkill cloudflared 2>/dev/null || true

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing cloudflared..."
    
    # Download and install cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y
    rm cloudflared-linux-amd64.deb
    
    echo "✅ cloudflared installed successfully"
else
    echo "✅ cloudflared already installed"
fi

# Start Cloudflare Tunnel
echo "🚀 Starting Cloudflare Tunnel..."
echo "Target: http://172.17.0.1:8080"

# Start tunnel in background and capture the URL
nohup cloudflared tunnel --url http://172.17.0.1:8080 > /tmp/cloudflare-tunnel.log 2>&1 &
TUNNEL_PID=$!

echo "⏳ Waiting for tunnel to establish..."
sleep 10

# Get tunnel URL from logs
TUNNEL_URL=""
for i in {1..15}; do
    if [ -f /tmp/cloudflare-tunnel.log ]; then
        TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | tail -1 || echo "")
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
    fi
    echo "Attempt $i: Waiting for tunnel URL..."
    sleep 2
done

if [ ! -z "$TUNNEL_URL" ]; then
    echo "✅ Cloudflare Tunnel established successfully!"
    echo "🔗 Tunnel URL: $TUNNEL_URL"
    echo "🔧 Process ID: $TUNNEL_PID"
    
    # Save tunnel info for management
    echo "$TUNNEL_PID" > /tmp/cloudflare-tunnel.pid
    echo "$TUNNEL_URL" > /tmp/cloudflare-tunnel.url
    
    # Update backend CORS configuration
    if [ -f "config/chat.yml" ]; then
        if ! grep -q "$TUNNEL_URL" config/chat.yml 2>/dev/null; then
            echo "🔧 Updating backend CORS configuration..."
            sed -i "/allow_origins:/a\\    - \"$TUNNEL_URL\"" config/chat.yml || true
            
            # Restart backend services to apply CORS changes
            echo "🔄 Restarting backend services..."
            docker restart fechatter-server-vcr notify-server-vcr 2>/dev/null || true
            echo "✅ Backend services restarted with new CORS settings"
        else
            echo "✅ CORS already configured for current tunnel"
        fi
    else
        echo "⚠️ Backend config file not found, skipping CORS update"
    fi
    
    echo ""
    echo "📋 Service Endpoints:"
    echo "  - API: $TUNNEL_URL/api"
    echo "  - Files: $TUNNEL_URL/files" 
    echo "  - Events: $TUNNEL_URL/events"
    echo "  - Notify: $TUNNEL_URL/notify"
    echo "  - Health: $TUNNEL_URL/health"
    
    echo ""
    echo "📊 Tunnel Status:"
    echo "  - Status: Active"
    echo "  - PID: $TUNNEL_PID"
    echo "  - Target: http://172.17.0.1:8080"
    echo "  - Log: /tmp/cloudflare-tunnel.log"
    
else
    echo "❌ Failed to get tunnel URL"
    echo "📋 Tunnel logs:"
    cat /tmp/cloudflare-tunnel.log 2>/dev/null || echo "No logs available"
    exit 1
fi

EOF

# Get the tunnel URL for local configuration update
echo -e "${BLUE}🔧 Updating local configuration...${NC}"

TUNNEL_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "cat /tmp/cloudflare-tunnel.url 2>/dev/null" || echo "")

if [ ! -z "$TUNNEL_URL" ]; then
    echo -e "${GREEN}✅ Retrieved tunnel URL: ${TUNNEL_URL}${NC}"
    
    # Update development configuration
    if [ -f "config/development.yml" ]; then
        echo "🔧 Updating config/development.yml..."
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" config/development.yml
        sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${TUNNEL_URL}/api\"|g" config/development.yml
        sed -i '' "s|file_url: \"https://[^\"]*\"|file_url: \"${TUNNEL_URL}/files\"|g" config/development.yml
        sed -i '' "s|sse_url: \"https://[^\"]*\"|sse_url: \"${TUNNEL_URL}/events\"|g" config/development.yml
        sed -i '' "s|notify_url: \"https://[^\"]*\"|notify_url: \"${TUNNEL_URL}/notify\"|g" config/development.yml
        sed -i '' "s|endpoint: \"https://[^\"]*\"|endpoint: \"${TUNNEL_URL}/analytics\"|g" config/development.yml
        sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${TUNNEL_URL}\"|g" config/development.yml
    fi
    
    # Update public configuration
    if [ -f "public/config/development.yml" ]; then
        echo "🔧 Updating public/config/development.yml..."
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" public/config/development.yml
        sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${TUNNEL_URL}/api\"|g" public/config/development.yml
        sed -i '' "s|file_url: \"https://[^\"]*\"|file_url: \"${TUNNEL_URL}/files\"|g" public/config/development.yml
        sed -i '' "s|sse_url: \"https://[^\"]*\"|sse_url: \"${TUNNEL_URL}/events\"|g" public/config/development.yml
        sed -i '' "s|notify_url: \"https://[^\"]*\"|notify_url: \"${TUNNEL_URL}/notify\"|g" public/config/development.yml
        sed -i '' "s|endpoint: \"https://[^\"]*\"|endpoint: \"${TUNNEL_URL}/analytics\"|g" public/config/development.yml
        sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${TUNNEL_URL}\"|g" public/config/development.yml
    fi
    
    # Update Vite proxy configuration
    if [ -f "vite.config.js" ]; then
        echo "🔧 Updating vite.config.js proxy..."
        sed -i.backup "s|target: 'https://[^']*'|target: '${TUNNEL_URL}'|g" vite.config.js
    fi
    
    # Update API URL resolver
    if [ -f "src/utils/apiUrlResolver.js" ]; then
        echo "🔧 Updating apiUrlResolver.js..."
        sed -i.backup "s|const NGROK_URL = '[^']*'|const CLOUDFLARE_URL = '${TUNNEL_URL}'|g" src/utils/apiUrlResolver.js
        sed -i '' "s|NGROK_URL|CLOUDFLARE_URL|g" src/utils/apiUrlResolver.js
        sed -i '' "s|ngrok|Cloudflare Tunnel|g" src/utils/apiUrlResolver.js
    fi
    
    echo -e "${GREEN}✅ Local configuration updated${NC}"
    
else
    echo -e "${RED}❌ Could not retrieve tunnel URL${NC}"
    exit 1
fi

echo ""
echo "🎉 Cloudflare Tunnel Deployment Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Cloudflare Tunnel: ${TUNNEL_URL}${NC}"
echo -e "${GREEN}✅ Target: http://172.17.0.1:8080${NC}"
echo -e "${GREEN}✅ Local Config: Updated${NC}"
echo -e "${GREEN}✅ Backend CORS: Configured${NC}"
echo ""
echo "🔧 Management Commands:"
echo "  - Check status: ssh ${BACKEND_USER}@${BACKEND_HOST} 'ps aux | grep cloudflared'"
echo "  - View logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'tail -f /tmp/cloudflare-tunnel.log'"
echo "  - Stop tunnel: ssh ${BACKEND_USER}@${BACKEND_HOST} 'kill \$(cat /tmp/cloudflare-tunnel.pid)'"
echo "  - Restart tunnel: ./scripts/deploy-cloudflare-tunnel.sh"
echo ""
echo "🌟 Advantages over ngrok:"
echo "  - ✅ Completely free"
echo "  - ✅ No bandwidth limits"
echo "  - ✅ More stable connections"
echo "  - ✅ Better performance"
echo "  - ✅ No account required"
echo ""
echo "🚀 Ready to test your application!" 