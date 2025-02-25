#!/bin/bash

# ⚡ 快速重新配置脚本
# 适合GitHub → Vercel工作流的快速调整

set -e

echo "⚡ Quick Reconfig for GitHub → Vercel"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

# Quick status check
echo "🔍 Quick status check..."
if ssh -o ConnectTimeout=5 "${BACKEND_USER}@${BACKEND_HOST}" "pgrep cloudflared" &>/dev/null; then
    TUNNEL_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1" || echo "")
    if [ ! -z "$TUNNEL_URL" ]; then
        echo -e "${GREEN}✅ Tunnel running: ${TUNNEL_URL}${NC}"
        
        # Check if config needs update
        CURRENT_CONFIG=$(grep "gateway_url:" config/production.yml | sed 's/.*"\(.*\)".*/\1/')
        if [ "$TUNNEL_URL" != "$CURRENT_CONFIG" ]; then
            echo -e "${YELLOW}🔄 Config needs update${NC}"
            
            # Update config
            sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" config/production.yml
            sed -i "s|base_url:.*|base_url: \"${TUNNEL_URL}/api\"|g" config/production.yml
            sed -i "s|file_url:.*|file_url: \"${TUNNEL_URL}/files\"|g" config/production.yml
            sed -i "s|sse_url:.*|sse_url: \"${TUNNEL_URL}/events\"|g" config/production.yml
            sed -i "s|notify_url:.*|notify_url: \"${TUNNEL_URL}/notify\"|g" config/production.yml
            
            # Quick push
            git add config/production.yml
            git commit -m "fix: update tunnel URL - ${TUNNEL_URL}" || echo "No changes"
            git push origin main
            
            echo -e "${GREEN}✅ Config updated and pushed${NC}"
            echo -e "${YELLOW}⏳ Vercel will auto-deploy in 1-2 minutes${NC}"
        else
            echo -e "${GREEN}✅ Config is up to date${NC}"
        fi
    else
        echo "❌ Tunnel running but no URL found"
        exit 1
    fi
else
    echo "❌ Tunnel not running, starting new tunnel..."
    
    # Start new tunnel
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        nohup cloudflared tunnel --url http://localhost:6688 > /tmp/cloudflare-tunnel.log 2>&1 &
    "
    
    # Wait for URL
    echo "⏳ Waiting for new tunnel URL..."
    for i in {1..20}; do
        TUNNEL_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1" || echo "")
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if [ ! -z "$TUNNEL_URL" ]; then
        echo -e "${GREEN}✅ New tunnel: ${TUNNEL_URL}${NC}"
        
        # Update and push
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" config/production.yml
        sed -i "s|base_url:.*|base_url: \"${TUNNEL_URL}/api\"|g" config/production.yml
        sed -i "s|file_url:.*|file_url: \"${TUNNEL_URL}/files\"|g" config/production.yml
        sed -i "s|sse_url:.*|sse_url: \"${TUNNEL_URL}/events\"|g" config/production.yml
        sed -i "s|notify_url:.*|notify_url: \"${TUNNEL_URL}/notify\"|g" config/production.yml
        
        git add config/production.yml
        git commit -m "feat: new tunnel setup - ${TUNNEL_URL}" || echo "No changes"
        git push origin main
        
        echo -e "${GREEN}✅ New tunnel configured and pushed${NC}"
    else
        echo "❌ Failed to get tunnel URL"
        exit 1
    fi
fi

echo ""
echo "🎉 Quick reconfig completed!"
echo "- GitHub will trigger Vercel deployment"
echo "- Check Vercel dashboard for progress" 