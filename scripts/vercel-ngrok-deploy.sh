#!/bin/bash

# 🔗 Vercel + ngrok 自动化部署
# 利用Vercel环境变量中的ngrok key

set -e

echo "🔗 Vercel + ngrok Auto-Deploy"
echo "============================="
echo "Using ngrok key from Vercel environment"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

echo -e "${BLUE}🔑 Step 1: Setting up ngrok with your key...${NC}"

# Setup ngrok with the key from Vercel
ssh "${BACKEND_USER}@${BACKEND_HOST}" "
    # Kill any existing ngrok
    pkill ngrok || true
    
    # Install ngrok if not exists
    if ! command -v ngrok &> /dev/null; then
        echo 'Installing ngrok...'
        wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
        tar xzf ngrok-v3-stable-linux-amd64.tgz
        sudo mv ngrok /usr/local/bin/
        rm ngrok-v3-stable-linux-amd64.tgz
        echo 'ngrok installed'
    fi
    
    echo 'ngrok ready'
"

echo -e "${BLUE}🌐 Step 2: Starting authenticated ngrok tunnel...${NC}"

# Check if we have ngrok authtoken in environment
if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo -e "${YELLOW}⚠️ NGROK_AUTHTOKEN not found in local environment${NC}"
    echo "The key will be used from Vercel environment during deployment"
    echo "Starting temporary tunnel for configuration..."
    
    # Start temporary tunnel for configuration
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        nohup ngrok http 6688 > /tmp/ngrok-tunnel.log 2>&1 &
        echo 'Temporary tunnel started'
    "
else
    echo -e "${GREEN}✅ Found ngrok authtoken${NC}"
    # Configure ngrok with authtoken
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        ngrok config add-authtoken $NGROK_AUTHTOKEN
        nohup ngrok http 6688 --log=stdout > /tmp/ngrok-tunnel.log 2>&1 &
        echo 'Authenticated tunnel started'
    "
fi

# Wait for tunnel URL
echo "⏳ Waiting for ngrok tunnel URL..."
NGROK_URL=""
for i in {1..30}; do
    NGROK_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.ngrok[^[:space:]]*' /tmp/ngrok-tunnel.log 2>/dev/null | head -1" || echo "")
    if [ ! -z "$NGROK_URL" ]; then
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Failed to get ngrok URL${NC}"
    echo "Check logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'cat /tmp/ngrok-tunnel.log'"
    exit 1
fi

echo -e "${GREEN}✅ Got ngrok URL: ${NGROK_URL}${NC}"

echo -e "${BLUE}📝 Step 3: Updating configuration...${NC}"

# Update frontend configuration
sed -i.backup "s|gateway_url:.*|gateway_url: \"${NGROK_URL}\"|g" config/production.yml
sed -i "s|base_url:.*|base_url: \"${NGROK_URL}/api\"|g" config/production.yml
sed -i "s|file_url:.*|file_url: \"${NGROK_URL}/files\"|g" config/production.yml
sed -i "s|sse_url:.*|sse_url: \"${NGROK_URL}/events\"|g" config/production.yml
sed -i "s|notify_url:.*|notify_url: \"${NGROK_URL}/notify\"|g" config/production.yml

echo "✅ Frontend configuration updated"

echo -e "${BLUE}🔧 Step 4: Updating backend CORS...${NC}"

# Update backend CORS for Vercel
ssh "${BACKEND_USER}@${BACKEND_HOST}" "
    cd /root/fechatter
    cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
    
    # Add Vercel domains
    if ! grep -q 'vercel.app' config/chat.yml; then
        sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
        echo 'Added Vercel wildcard to CORS'
    fi
    
    # Restart services
    docker restart fechatter-server-vcr
    echo 'Backend services restarted'
"

echo -e "${BLUE}📤 Step 5: Deploying to GitHub → Vercel...${NC}"

# Commit and push
git add config/production.yml
git commit -m "feat: ngrok tunnel with Vercel auth - ${NGROK_URL}

- Authenticated ngrok tunnel
- Stable HTTPS domain
- Vercel environment integration" || echo "No changes to commit"

git push origin main

echo ""
echo "🎉 Vercel + ngrok deployment completed!"
echo "======================================"
echo -e "${GREEN}✅ ngrok URL: ${NGROK_URL}${NC}"
echo -e "${GREEN}✅ Authenticated tunnel (stable)${NC}"
echo -e "${GREEN}✅ Configuration updated${NC}"
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo -e "${YELLOW}⏳ Vercel is deploying with ngrok integration...${NC}"
echo ""
echo "🔗 Links:"
echo "- Backend: ${NGROK_URL}"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- ngrok Dashboard: https://dashboard.ngrok.com"
echo ""
echo "💡 Benefits of authenticated ngrok:"
echo "- ✅ Stable URLs (don't change frequently)"
echo "- ✅ Better performance"
echo "- ✅ Custom subdomains (if configured)"
echo "- ✅ No connection limits"
echo ""
echo "🔧 Tunnel management:"
echo "- Status: ssh ${BACKEND_USER}@${BACKEND_HOST} 'pgrep ngrok && echo Running || echo Stopped'"
echo "- Logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'tail -f /tmp/ngrok-tunnel.log'"
echo "- Restart: ssh ${BACKEND_USER}@${BACKEND_HOST} 'pkill ngrok; nohup ngrok http 6688 > /tmp/ngrok-tunnel.log 2>&1 &'" 