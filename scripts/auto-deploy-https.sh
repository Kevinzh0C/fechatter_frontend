#!/bin/bash

# 🚀 Fechatter 完全自动化HTTPS部署
# 无需手动操作，一键完成所有配置

set -e

echo "🚀 Fechatter Auto-Deploy HTTPS"
echo "=============================="
echo "📋 This script will:"
echo "   1. Setup Cloudflare tunnel on backend"
echo "   2. Get HTTPS URL automatically"
echo "   3. Update frontend configuration"
echo "   4. Deploy to Vercel"
echo "   5. Update backend CORS"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"
FRONTEND_DIR="$(pwd)"

echo -e "${BLUE}📡 Step 1: Setting up Cloudflare tunnel on backend...${NC}"

# Function to run commands on backend
run_on_backend() {
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "$1"
}

# Install and start Cloudflare tunnel
echo "📦 Installing Cloudflare tunnel..."
run_on_backend "
    # Kill any existing tunnel
    pkill cloudflared || true
    
    # Install cloudflared if not exists
    if ! command -v cloudflared &> /dev/null; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y
        rm -f cloudflared-linux-amd64.deb
    fi
    
    echo '✅ Cloudflared installed'
"

echo "🌐 Starting tunnel and getting HTTPS URL..."

# Start tunnel in background and capture URL
TUNNEL_LOG="/tmp/cloudflare-tunnel.log"
run_on_backend "
    nohup cloudflared tunnel --url http://localhost:6688 > ${TUNNEL_LOG} 2>&1 &
    echo 'Tunnel started, waiting for URL...'
"

# Wait for tunnel URL
echo "⏳ Waiting for tunnel URL (max 30 seconds)..."
HTTPS_URL=""
for i in {1..30}; do
    HTTPS_URL=$(run_on_backend "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' ${TUNNEL_LOG} 2>/dev/null | head -1" || echo "")
    if [ ! -z "$HTTPS_URL" ]; then
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$HTTPS_URL" ]; then
    echo -e "${RED}❌ Failed to get tunnel URL${NC}"
    echo "Manual fallback: Check tunnel log on backend:"
    echo "ssh ${BACKEND_USER}@${BACKEND_HOST} 'cat ${TUNNEL_LOG}'"
    exit 1
fi

echo -e "${GREEN}✅ Got HTTPS URL: ${HTTPS_URL}${NC}"

echo -e "${BLUE}📝 Step 2: Updating frontend configuration...${NC}"

# Update production.yml with new URL
sed -i.backup "s|gateway_url:.*|gateway_url: \"${HTTPS_URL}\"|g" config/production.yml
sed -i "s|base_url:.*|base_url: \"${HTTPS_URL}/api\"|g" config/production.yml
sed -i "s|file_url:.*|file_url: \"${HTTPS_URL}/files\"|g" config/production.yml
sed -i "s|sse_url:.*|sse_url: \"${HTTPS_URL}/events\"|g" config/production.yml
sed -i "s|notify_url:.*|notify_url: \"${HTTPS_URL}/notify\"|g" config/production.yml

echo "✅ Frontend configuration updated"

echo -e "${BLUE}🔧 Step 3: Getting current Vercel deployment URL...${NC}"

# Get current Vercel deployment URL
VERCEL_URL=""
if command -v vercel &> /dev/null; then
    VERCEL_URL=$(vercel ls 2>/dev/null | grep "fechatter-frontend" | head -1 | awk '{print $2}' || echo "")
fi

# Fallback: try to get from git remote or use pattern
if [ -z "$VERCEL_URL" ]; then
    VERCEL_URL="https://fechatter-frontend-git-main-zhkevin46-gmailcoms-projects.vercel.app"
fi

echo "📍 Using Vercel URL: ${VERCEL_URL}"

echo -e "${BLUE}🌐 Step 4: Updating backend CORS configuration...${NC}"

# Update backend CORS to allow Vercel domain
run_on_backend "
    cd /root/fechatter
    cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
    
    # Add Vercel URL to CORS if not exists
    if ! grep -q '${VERCEL_URL}' config/chat.yml; then
        sed -i '/allow_origins:/a\\    - \"${VERCEL_URL}\"' config/chat.yml
    fi
    
    # Add wildcard Vercel pattern if not exists
    if ! grep -q 'vercel.app' config/chat.yml; then
        sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
    fi
    
    echo 'CORS configuration updated'
    
    # Restart backend service
    docker restart fechatter-server-vcr
    echo 'Backend service restarted'
"

echo -e "${BLUE}🚀 Step 5: Deploying to Vercel...${NC}"

# Commit changes
git add config/production.yml
git commit -m "feat: auto-deploy with Cloudflare tunnel - ${HTTPS_URL}" || echo "No changes to commit"

# Push to trigger Vercel deployment
git push origin main

echo -e "${GREEN}✅ Deployment initiated!${NC}"

echo ""
echo "🎉 Auto-deployment completed!"
echo "================================"
echo -e "${GREEN}✅ Backend HTTPS URL: ${HTTPS_URL}${NC}"
echo -e "${GREEN}✅ Frontend URL: ${VERCEL_URL}${NC}"
echo -e "${GREEN}✅ CORS configured automatically${NC}"
echo -e "${GREEN}✅ Vercel deployment triggered${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Wait 1-2 minutes for Vercel deployment"
echo "2. Visit ${VERCEL_URL}"
echo "3. Test login with: test@fechatter.com / test123"
echo ""
echo "🔧 Tunnel management:"
echo "- Check tunnel status: ssh ${BACKEND_USER}@${BACKEND_HOST} 'ps aux | grep cloudflared'"
echo "- View tunnel logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'cat ${TUNNEL_LOG}'"
echo "- Stop tunnel: ssh ${BACKEND_USER}@${BACKEND_HOST} 'pkill cloudflared'"
echo ""
echo "🔄 To re-run this script: ./scripts/auto-deploy-https.sh" 