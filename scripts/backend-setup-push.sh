#!/bin/bash

# 🔄 GitHub → Vercel 工作流专用脚本
# 只配置后端，推送代码让Vercel自动部署

set -e

echo "🔄 GitHub → Vercel Auto-Deploy Setup"
echo "===================================="
echo "📋 This script will:"
echo "   1. Setup backend HTTPS (Cloudflare tunnel)"
echo "   2. Update frontend config"
echo "   3. Push to GitHub (triggers Vercel)"
echo "   4. Vercel handles the rest automatically"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

echo -e "${BLUE}📡 Step 1: Setting up backend tunnel...${NC}"

# Function to run commands on backend
run_on_backend() {
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "$1"
}

# Install cloudflared if needed and start tunnel
echo "🌐 Setting up Cloudflare tunnel..."
run_on_backend "
    # Kill existing tunnel
    pkill cloudflared || true
    
    # Install if not exists
    if ! command -v cloudflared &> /dev/null; then
        echo 'Installing cloudflared...'
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y
        rm -f cloudflared-linux-amd64.deb
        echo 'Cloudflared installed'
    fi
    
    # Start tunnel
    echo 'Starting tunnel...'
    nohup cloudflared tunnel --url http://localhost:6688 > /tmp/cloudflare-tunnel.log 2>&1 &
    echo 'Tunnel started'
"

# Wait for tunnel URL
echo "⏳ Waiting for tunnel URL..."
HTTPS_URL=""
for i in {1..30}; do
    HTTPS_URL=$(run_on_backend "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1" || echo "")
    if [ ! -z "$HTTPS_URL" ]; then
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$HTTPS_URL" ]; then
    echo -e "${RED}❌ Failed to get tunnel URL${NC}"
    echo "Check manually: ssh ${BACKEND_USER}@${BACKEND_HOST} 'cat /tmp/cloudflare-tunnel.log'"
    exit 1
fi

echo -e "${GREEN}✅ Got tunnel URL: ${HTTPS_URL}${NC}"

echo -e "${BLUE}📝 Step 2: Updating frontend configuration...${NC}"

# Update production.yml
sed -i.backup "s|gateway_url:.*|gateway_url: \"${HTTPS_URL}\"|g" config/production.yml
sed -i "s|base_url:.*|base_url: \"${HTTPS_URL}/api\"|g" config/production.yml
sed -i "s|file_url:.*|file_url: \"${HTTPS_URL}/files\"|g" config/production.yml
sed -i "s|sse_url:.*|sse_url: \"${HTTPS_URL}/events\"|g" config/production.yml
sed -i "s|notify_url:.*|notify_url: \"${HTTPS_URL}/notify\"|g" config/production.yml

echo "✅ Frontend config updated"

echo -e "${BLUE}🔧 Step 3: Updating backend CORS...${NC}"

# Get current Vercel URL pattern
VERCEL_PATTERN="https://*zhkevin46-gmailcoms-projects.vercel.app"

# Update backend CORS
run_on_backend "
    cd /root/fechatter
    cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
    
    # Add Vercel wildcard if not exists
    if ! grep -q 'vercel.app' config/chat.yml; then
        sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
        echo 'Added Vercel wildcard to CORS'
    fi
    
    # Restart service
    docker restart fechatter-server-vcr
    echo 'Backend service restarted'
"

echo -e "${BLUE}🚀 Step 4: Pushing to GitHub (triggers Vercel)...${NC}"

# Commit and push
git add config/production.yml
git commit -m "feat: backend tunnel setup - ${HTTPS_URL}

- Cloudflare tunnel: ${HTTPS_URL}
- CORS updated for Vercel domains
- Ready for GitHub → Vercel auto-deploy" || echo "No changes to commit"

echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "🎉 Setup completed!"
echo "=================="
echo -e "${GREEN}✅ Backend tunnel: ${HTTPS_URL}${NC}"
echo -e "${GREEN}✅ Frontend config updated${NC}"
echo -e "${GREEN}✅ Code pushed to GitHub${NC}"
echo -e "${YELLOW}⏳ Vercel is now auto-deploying...${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Wait 1-2 minutes for Vercel to build and deploy"
echo "2. Check Vercel dashboard for deployment status"
echo "3. Visit your Vercel URL when ready"
echo "4. Test with: test@fechatter.com / test123"
echo ""
echo "🔗 Useful links:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- GitHub Repo: $(git remote get-url origin)"
echo "- Backend Tunnel: ${HTTPS_URL}"
echo ""
echo "🔧 Tunnel management:"
echo "- Status: ssh ${BACKEND_USER}@${BACKEND_HOST} 'pgrep cloudflared && echo Running || echo Stopped'"
echo "- Logs: ssh ${BACKEND_USER}@${BACKEND_HOST} 'tail -f /tmp/cloudflare-tunnel.log'"
echo "- Restart: ssh ${BACKEND_USER}@${BACKEND_HOST} 'pkill cloudflared; nohup cloudflared tunnel --url http://localhost:6688 > /tmp/cloudflare-tunnel.log 2>&1 &'" 