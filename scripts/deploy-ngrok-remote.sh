#!/bin/bash

# 🚀 Remote ngrok Deployment Script
# Deploy ngrok tunnel directly on remote server with dynamic domain

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"
NGROK_TOKEN="2z1RvwiPVR0LBsPzdWkFtBehIEX_sj78dVygq3BnRts5e7VY"

echo "🚀 Remote ngrok Deployment"
echo "========================="
echo ""

echo -e "${BLUE}📡 Connecting to remote server...${NC}"

# Deploy ngrok on remote server
ssh "${BACKEND_USER}@${BACKEND_HOST}" << 'EOF'
set -e

echo "🐳 Setting up ngrok tunnel..."

# Stop any existing ngrok containers
docker stop fechatter-ngrok-tunnel 2>/dev/null || true
docker rm fechatter-ngrok-tunnel 2>/dev/null || true

# Pull latest ngrok image
docker pull ngrok/ngrok:latest

# Start ngrok tunnel with dynamic domain
docker run -d \
    --name fechatter-ngrok-tunnel \
    --restart unless-stopped \
    -p 4040:4040 \
    -e NGROK_AUTHTOKEN=2z1RvwiPVR0LBsPzdWkFtBehIEX_sj78dVygq3BnRts5e7VY \
    --network fechatter-network \
    ngrok/ngrok http 80 --log=stdout --log-level=info

echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Get tunnel URL
TUNNEL_URL=""
for i in {1..10}; do
    TUNNEL_URL=$(docker logs fechatter-ngrok-tunnel 2>&1 | grep -E 'url=https://.*ngrok' | tail -1 | grep -o 'https://[^[:space:]]*' || echo "")
    if [ ! -z "$TUNNEL_URL" ]; then
        break
    fi
    echo "Attempt $i: Waiting for tunnel URL..."
    sleep 2
done

if [ ! -z "$TUNNEL_URL" ]; then
    echo "✅ Tunnel established successfully!"
    echo "🔗 Tunnel URL: $TUNNEL_URL"
    echo "📊 Web UI: http://45.77.178.85:4040"
    
    # Update backend CORS configuration
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
    
    echo ""
    echo "📋 Service Endpoints:"
    echo "  - API: $TUNNEL_URL/api"
    echo "  - Files: $TUNNEL_URL/files" 
    echo "  - Events: $TUNNEL_URL/events"
    echo "  - Notify: $TUNNEL_URL/notify"
    echo "  - Health: $TUNNEL_URL/health"
    
else
    echo "❌ Failed to get tunnel URL"
    echo "📋 Container logs:"
    docker logs fechatter-ngrok-tunnel --tail 20
    exit 1
fi

EOF

# Get the tunnel URL for local configuration update
echo -e "${BLUE}🔧 Updating local configuration...${NC}"

TUNNEL_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "docker logs fechatter-ngrok-tunnel 2>&1 | grep -E 'url=https://.*ngrok' | tail -1 | grep -o 'https://[^[:space:]]*'" || echo "")

if [ ! -z "$TUNNEL_URL" ]; then
    echo -e "${GREEN}✅ Retrieved tunnel URL: ${TUNNEL_URL}${NC}"
    
    # Update development configuration
    if [ -f "config/development.yml" ]; then
        echo "🔧 Updating config/development.yml..."
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" config/development.yml
        sed -i "s|base_url:.*ngrok[^/]*/api|base_url: \"${TUNNEL_URL}/api\"|g" config/development.yml
        sed -i "s|file_url:.*ngrok[^/]*/files|file_url: \"${TUNNEL_URL}/files\"|g" config/development.yml
        sed -i "s|sse_url:.*ngrok[^/]*/events|sse_url: \"${TUNNEL_URL}/events\"|g" config/development.yml
        sed -i "s|notify_url:.*ngrok[^/]*/notify|notify_url: \"${TUNNEL_URL}/notify\"|g" config/development.yml
    fi
    
    # Update public configuration
    if [ -f "public/config/development.yml" ]; then
        echo "🔧 Updating public/config/development.yml..."
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" public/config/development.yml
        sed -i "s|base_url:.*ngrok[^/]*/api|base_url: \"${TUNNEL_URL}/api\"|g" public/config/development.yml
        sed -i "s|file_url:.*ngrok[^/]*/files|file_url: \"${TUNNEL_URL}/files\"|g" public/config/development.yml
        sed -i "s|sse_url:.*ngrok[^/]*/events|sse_url: \"${TUNNEL_URL}/events\"|g" public/config/development.yml
        sed -i "s|notify_url:.*ngrok[^/]*/notify|notify_url: \"${TUNNEL_URL}/notify\"|g" public/config/development.yml
    fi
    
    # Update Vite proxy configuration
    if [ -f "vite.config.js" ]; then
        echo "🔧 Updating vite.config.js proxy..."
        sed -i.backup "s|target: 'https://[^']*ngrok[^']*'|target: '${TUNNEL_URL}'|g" vite.config.js
    fi
    
    echo -e "${GREEN}✅ Local configuration updated${NC}"
    
else
    echo -e "${RED}❌ Could not retrieve tunnel URL${NC}"
    exit 1
fi

echo ""
echo "🎉 Remote ngrok Deployment Complete!"
echo "===================================="
echo ""
echo -e "${GREEN}✅ ngrok Tunnel: ${TUNNEL_URL}${NC}"
echo -e "${GREEN}✅ Web UI: http://${BACKEND_HOST}:4040${NC}"
echo -e "${GREEN}✅ Local Config: Updated${NC}"
echo -e "${GREEN}✅ Backend CORS: Configured${NC}"
echo ""
echo "🔧 Management Commands:"
echo "  - Check status: ssh ${BACKEND_USER}@${BACKEND_HOST} 'docker ps | grep ngrok'"
echo "  - View logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'docker logs fechatter-ngrok-tunnel'"
echo "  - Restart: ssh ${BACKEND_USER}@${BACKEND_HOST} 'docker restart fechatter-ngrok-tunnel'"
echo ""
echo "🚀 Ready to test your application!" 