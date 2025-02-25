#!/bin/bash

# 🧠 智能域名部署脚本
# 自动选择最佳域名方案：反向DNS → Cloudflare隧道 → 直连IP

set -e

echo "🧠 Smart Domain Deploy"
echo "====================="
echo "Automatically selecting the best domain solution..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"
REVERSE_DNS="45.77.178.85.vultrusercontent.com"

# Test functions
test_reverse_dns() {
    echo "🔍 Testing reverse DNS domain..."
    if curl -k -s --connect-timeout 5 "https://${REVERSE_DNS}:8443/api/health" &>/dev/null; then
        echo -e "${GREEN}✅ Reverse DNS works with existing SSL${NC}"
        return 0
    elif curl -s --connect-timeout 5 "http://${REVERSE_DNS}:8080/api/health" &>/dev/null; then
        echo -e "${YELLOW}⚠️ Reverse DNS works but needs SSL setup${NC}"
        return 1
    else
        echo -e "${RED}❌ Reverse DNS not accessible${NC}"
        return 2
    fi
}

test_cloudflare_tunnel() {
    echo "🔍 Testing Cloudflare tunnel availability..."
    if ssh "${BACKEND_USER}@${BACKEND_HOST}" "command -v cloudflared" &>/dev/null; then
        echo -e "${GREEN}✅ Cloudflared available${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Cloudflared not installed${NC}"
        return 1
    fi
}

# Strategy 1: Use reverse DNS with Let's Encrypt
deploy_reverse_dns_ssl() {
    echo -e "${BLUE}🚀 Strategy: Reverse DNS + Let's Encrypt SSL${NC}"
    echo "This will provide the best user experience!"
    echo ""
    
    read -p "Install Let's Encrypt for ${REVERSE_DNS}? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/setup-letsencrypt-dns.sh
    else
        echo "Skipping Let's Encrypt setup"
        deploy_reverse_dns_basic
    fi
}

# Strategy 2: Use reverse DNS with existing SSL
deploy_reverse_dns_basic() {
    echo -e "${BLUE}🚀 Strategy: Reverse DNS (basic)${NC}"
    ./scripts/use-reverse-dns.sh
}

# Strategy 3: Use Cloudflare tunnel
deploy_cloudflare_tunnel() {
    echo -e "${BLUE}🚀 Strategy: Cloudflare Tunnel${NC}"
    ./scripts/one-click-deploy.sh
}

# Strategy 4: Direct IP fallback
deploy_direct_ip() {
    echo -e "${BLUE}🚀 Strategy: Direct IP (fallback)${NC}"
    
    # Update to use direct IP
    sed -i.backup "s|gateway_url:.*|gateway_url: \"https://${BACKEND_HOST}:8443\"|g" config/production.yml
    sed -i "s|base_url:.*|base_url: \"https://${BACKEND_HOST}:8443/api\"|g" config/production.yml
    sed -i "s|file_url:.*|file_url: \"https://${BACKEND_HOST}:8443/files\"|g" config/production.yml
    sed -i "s|sse_url:.*|sse_url: \"https://${BACKEND_HOST}:8443/events\"|g" config/production.yml
    sed -i "s|notify_url:.*|notify_url: \"https://${BACKEND_HOST}:8443/notify\"|g" config/production.yml
    
    # Update CORS
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        cd /root/fechatter
        if ! grep -q 'vercel.app' config/chat.yml; then
            sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
            docker restart fechatter-server-vcr
        fi
    "
    
    # Push to GitHub
    git add config/production.yml
    git commit -m "feat: direct IP HTTPS fallback" || echo "No changes"
    git push origin main
    
    echo -e "${YELLOW}⚠️ Users will need to manually accept SSL certificate${NC}"
}

# Main decision logic
main() {
    echo "🎯 Analyzing available options..."
    
    # Test reverse DNS
    test_reverse_dns
    REVERSE_DNS_STATUS=$?
    
    # Test Cloudflare tunnel
    test_cloudflare_tunnel
    CLOUDFLARE_STATUS=$?
    
    echo ""
    echo "📊 Analysis Results:"
    echo "==================="
    
    case $REVERSE_DNS_STATUS in
        0)
            echo -e "${GREEN}✅ Reverse DNS: Working with SSL${NC}"
            echo -e "${BLUE}🎯 Recommended: Use reverse DNS (already configured)${NC}"
            deploy_reverse_dns_basic
            ;;
        1)
            echo -e "${YELLOW}⚠️ Reverse DNS: Available but needs SSL${NC}"
            echo -e "${BLUE}🎯 Recommended: Setup Let's Encrypt for reverse DNS${NC}"
            deploy_reverse_dns_ssl
            ;;
        2)
            echo -e "${RED}❌ Reverse DNS: Not accessible${NC}"
            if [ $CLOUDFLARE_STATUS -eq 0 ]; then
                echo -e "${BLUE}🎯 Fallback: Use Cloudflare tunnel${NC}"
                deploy_cloudflare_tunnel
            else
                echo -e "${BLUE}🎯 Fallback: Direct IP with manual SSL${NC}"
                deploy_direct_ip
            fi
            ;;
    esac
    
    echo ""
    echo "🎉 Smart deployment completed!"
    echo "=============================="
    echo "The system automatically selected the best available option."
    echo "Check Vercel dashboard for deployment progress."
}

# Check if required scripts exist
if [ ! -f "scripts/use-reverse-dns.sh" ]; then
    echo -e "${RED}❌ Required script missing: scripts/use-reverse-dns.sh${NC}"
    exit 1
fi

if [ ! -f "scripts/one-click-deploy.sh" ]; then
    echo -e "${RED}❌ Required script missing: scripts/one-click-deploy.sh${NC}"
    exit 1
fi

# Run main function
main 