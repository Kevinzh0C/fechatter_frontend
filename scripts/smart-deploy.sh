#!/bin/bash

# 🧠 Fechatter 智能自动化部署
# 自动检测问题并选择最佳HTTPS方案

set -e

echo "🧠 Fechatter Smart Auto-Deploy"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

# Test backend connectivity
test_backend() {
    echo "🔍 Testing backend connectivity..."
    if ssh -o ConnectTimeout=5 "${BACKEND_USER}@${BACKEND_HOST}" "echo 'Connected'" &>/dev/null; then
        echo -e "${GREEN}✅ Backend SSH accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend SSH not accessible${NC}"
        return 1
    fi
}

# Test if backend services are running
test_backend_services() {
    echo "🔍 Testing backend services..."
    SERVICES=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "docker ps --format 'table {{.Names}}' | grep fechatter" 2>/dev/null || echo "")
    if [ ! -z "$SERVICES" ]; then
        echo -e "${GREEN}✅ Backend services running${NC}"
        echo "$SERVICES"
        return 0
    else
        echo -e "${RED}❌ Backend services not running${NC}"
        return 1
    fi
}

# Test direct HTTPS connection
test_direct_https() {
    echo "🔍 Testing direct HTTPS connection..."
    if curl -k -s --connect-timeout 5 "https://${BACKEND_HOST}:8443/api/health" &>/dev/null; then
        echo -e "${GREEN}✅ Direct HTTPS works${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Direct HTTPS needs SSL certificate acceptance${NC}"
        return 1
    fi
}

# Test if Cloudflare tunnel is available
test_cloudflare_available() {
    echo "🔍 Testing Cloudflare tunnel availability..."
    if ssh "${BACKEND_USER}@${BACKEND_HOST}" "command -v cloudflared" &>/dev/null; then
        echo -e "${GREEN}✅ Cloudflared available${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Cloudflared not installed${NC}"
        return 1
    fi
}

# Get current Vercel URL
get_vercel_url() {
    echo "🔍 Detecting Vercel deployment URL..."
    
    # Try multiple methods
    VERCEL_URL=""
    
    # Method 1: vercel CLI
    if command -v vercel &> /dev/null; then
        VERCEL_URL=$(vercel ls 2>/dev/null | grep "fechatter-frontend" | head -1 | awk '{print "https://" $2}' || echo "")
    fi
    
    # Method 2: git remote analysis
    if [ -z "$VERCEL_URL" ]; then
        GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
        if [[ "$GIT_REMOTE" == *"github.com"* ]]; then
            REPO_NAME=$(basename "$GIT_REMOTE" .git)
            USERNAME=$(echo "$GIT_REMOTE" | sed 's/.*github.com[:/]\([^/]*\)\/.*/\1/')
            VERCEL_URL="https://${REPO_NAME}-git-main-${USERNAME}-projects.vercel.app"
        fi
    fi
    
    # Method 3: fallback pattern
    if [ -z "$VERCEL_URL" ]; then
        VERCEL_URL="https://fechatter-frontend-git-main-zhkevin46-gmailcoms-projects.vercel.app"
    fi
    
    echo "📍 Detected Vercel URL: $VERCEL_URL"
    echo "$VERCEL_URL"
}

# Auto-select best strategy
select_strategy() {
    echo "🎯 Selecting optimal deployment strategy..."
    
    if ! test_backend; then
        echo -e "${RED}❌ Cannot proceed: Backend not accessible${NC}"
        exit 1
    fi
    
    if ! test_backend_services; then
        echo -e "${RED}❌ Cannot proceed: Backend services not running${NC}"
        echo "💡 Try: ssh ${BACKEND_USER}@${BACKEND_HOST} 'docker-compose up -d'"
        exit 1
    fi
    
    if test_direct_https; then
        echo -e "${BLUE}🎯 Strategy: Direct HTTPS (SSL already accepted)${NC}"
        return 1
    elif test_cloudflare_available; then
        echo -e "${BLUE}🎯 Strategy: Cloudflare Tunnel (automatic HTTPS)${NC}"
        return 2
    else
        echo -e "${BLUE}🎯 Strategy: Install Cloudflare Tunnel${NC}"
        return 3
    fi
}

# Strategy 1: Use direct HTTPS
deploy_direct_https() {
    echo "🚀 Deploying with direct HTTPS..."
    
    VERCEL_URL=$(get_vercel_url)
    
    # Update frontend config
    sed -i.backup "s|gateway_url:.*|gateway_url: \"https://${BACKEND_HOST}:8443\"|g" config/production.yml
    sed -i "s|base_url:.*|base_url: \"https://${BACKEND_HOST}:8443/api\"|g" config/production.yml
    sed -i "s|file_url:.*|file_url: \"https://${BACKEND_HOST}:8443/files\"|g" config/production.yml
    sed -i "s|sse_url:.*|sse_url: \"https://${BACKEND_HOST}:8443/events\"|g" config/production.yml
    sed -i "s|notify_url:.*|notify_url: \"https://${BACKEND_HOST}:8443/notify\"|g" config/production.yml
    
    # Update backend CORS
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        cd /root/fechatter
        cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
        if ! grep -q '${VERCEL_URL}' config/chat.yml; then
            sed -i '/allow_origins:/a\\    - \"${VERCEL_URL}\"' config/chat.yml
        fi
        if ! grep -q 'vercel.app' config/chat.yml; then
            sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
        fi
        docker restart fechatter-server-vcr
    "
    
    echo -e "${GREEN}✅ Direct HTTPS configured${NC}"
    echo -e "${YELLOW}⚠️ Users will need to accept SSL certificate manually${NC}"
}

# Strategy 2: Use existing Cloudflare tunnel
deploy_cloudflare_existing() {
    echo "🚀 Deploying with existing Cloudflare tunnel..."
    
    # Start tunnel and get URL
    TUNNEL_LOG="/tmp/cloudflare-tunnel.log"
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        pkill cloudflared || true
        nohup cloudflared tunnel --url http://localhost:6688 > ${TUNNEL_LOG} 2>&1 &
    "
    
    # Wait for URL
    echo "⏳ Waiting for tunnel URL..."
    HTTPS_URL=""
    for i in {1..30}; do
        HTTPS_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' ${TUNNEL_LOG} 2>/dev/null | head -1" || echo "")
        if [ ! -z "$HTTPS_URL" ]; then
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if [ -z "$HTTPS_URL" ]; then
        echo -e "${RED}❌ Failed to get tunnel URL, falling back to direct HTTPS${NC}"
        deploy_direct_https
        return
    fi
    
    echo -e "${GREEN}✅ Got tunnel URL: ${HTTPS_URL}${NC}"
    
    # Update configs
    VERCEL_URL=$(get_vercel_url)
    
    sed -i.backup "s|gateway_url:.*|gateway_url: \"${HTTPS_URL}\"|g" config/production.yml
    sed -i "s|base_url:.*|base_url: \"${HTTPS_URL}/api\"|g" config/production.yml
    sed -i "s|file_url:.*|file_url: \"${HTTPS_URL}/files\"|g" config/production.yml
    sed -i "s|sse_url:.*|sse_url: \"${HTTPS_URL}/events\"|g" config/production.yml
    sed -i "s|notify_url:.*|notify_url: \"${HTTPS_URL}/notify\"|g" config/production.yml
    
    # Update backend CORS
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        cd /root/fechatter
        cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
        if ! grep -q '${VERCEL_URL}' config/chat.yml; then
            sed -i '/allow_origins:/a\\    - \"${VERCEL_URL}\"' config/chat.yml
        fi
        if ! grep -q 'vercel.app' config/chat.yml; then
            sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
        fi
        docker restart fechatter-server-vcr
    "
    
    echo -e "${GREEN}✅ Cloudflare tunnel configured${NC}"
}

# Strategy 3: Install and use Cloudflare tunnel
deploy_cloudflare_install() {
    echo "🚀 Installing and deploying with Cloudflare tunnel..."
    
    # Install cloudflared
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y
        rm -f cloudflared-linux-amd64.deb
    "
    
    echo "✅ Cloudflared installed"
    deploy_cloudflare_existing
}

# Main execution
main() {
    select_strategy
    STRATEGY=$?
    
    case $STRATEGY in
        1)
            deploy_direct_https
            ;;
        2)
            deploy_cloudflare_existing
            ;;
        3)
            deploy_cloudflare_install
            ;;
    esac
    
    # Deploy to Vercel
    echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
    git add config/production.yml
    git commit -m "feat: smart auto-deploy - $(date)" || echo "No changes to commit"
    git push origin main
    
    echo ""
    echo "🎉 Smart deployment completed!"
    echo "=============================="
    echo -e "${GREEN}✅ Configuration updated${NC}"
    echo -e "${GREEN}✅ Backend CORS configured${NC}"
    echo -e "${GREEN}✅ Vercel deployment triggered${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Wait 1-2 minutes for Vercel deployment"
    echo "2. Visit your Vercel URL"
    echo "3. Test login with: test@fechatter.com / test123"
}

# Run main function
main 