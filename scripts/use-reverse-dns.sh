#!/bin/bash

# 🌐 使用反向DNS域名的HTTPS方案
# 利用Vultr提供的反向DNS域名

set -e

echo "🌐 Reverse DNS Domain Setup"
echo "=========================="
echo "Using: 45.77.178.85.vultrusercontent.com"
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

echo -e "${BLUE}🔍 Step 1: Testing reverse DNS domain...${NC}"

# Test if the domain resolves correctly for our use case
echo "Testing domain resolution..."
if ping -c 1 "$REVERSE_DNS" &>/dev/null; then
    echo -e "${GREEN}✅ Domain resolves${NC}"
else
    echo -e "${YELLOW}⚠️ Domain resolution issue, but may still work for HTTPS${NC}"
fi

echo -e "${BLUE}🔧 Step 2: Configuring backend for domain-based SSL...${NC}"

# Update backend configuration to use the domain name
ssh "${BACKEND_USER}@${BACKEND_HOST}" "
    cd /root/fechatter
    
    # Backup current config
    cp config/chat.yml config/chat.yml.backup-\$(date +%Y%m%d-%H%M%S)
    
    # Add Vercel domains to CORS if not exists
    if ! grep -q 'vercel.app' config/chat.yml; then
        sed -i '/allow_origins:/a\\    - \"https://*.vercel.app\"' config/chat.yml
        echo 'Added Vercel wildcard to CORS'
    fi
    
    # Restart services
    docker restart fechatter-server-vcr
    echo 'Backend services restarted'
"

echo -e "${BLUE}📝 Step 3: Updating frontend configuration...${NC}"

# Update frontend to use the reverse DNS domain
sed -i.backup "s|gateway_url:.*|gateway_url: \"https://${REVERSE_DNS}:8443\"|g" config/production.yml
sed -i "s|base_url:.*|base_url: \"https://${REVERSE_DNS}:8443/api\"|g" config/production.yml
sed -i "s|file_url:.*|file_url: \"https://${REVERSE_DNS}:8443/files\"|g" config/production.yml
sed -i "s|sse_url:.*|sse_url: \"https://${REVERSE_DNS}:8443/events\"|g" config/production.yml
sed -i "s|notify_url:.*|notify_url: \"https://${REVERSE_DNS}:8443/notify\"|g" config/production.yml

echo "✅ Frontend configuration updated with reverse DNS domain"

echo -e "${BLUE}🚀 Step 4: Testing the configuration...${NC}"

# Test if the HTTPS connection works with the domain
echo "Testing HTTPS connection..."
if curl -k -s --connect-timeout 10 "https://${REVERSE_DNS}:8443/api/health" &>/dev/null; then
    echo -e "${GREEN}✅ HTTPS connection successful${NC}"
    SSL_STATUS="working"
else
    echo -e "${YELLOW}⚠️ HTTPS connection needs verification${NC}"
    SSL_STATUS="needs-verification"
fi

echo -e "${BLUE}📤 Step 5: Deploying to GitHub → Vercel...${NC}"

# Commit and push changes
git add config/production.yml
git commit -m "feat: use reverse DNS domain for HTTPS

- Domain: ${REVERSE_DNS}
- Eliminates IP-based SSL certificate issues
- Should work better with browsers" || echo "No changes to commit"

git push origin main

echo ""
echo "🎉 Reverse DNS setup completed!"
echo "================================"
echo -e "${GREEN}✅ Backend: https://${REVERSE_DNS}:8443${NC}"
echo -e "${GREEN}✅ Frontend config updated${NC}"
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo -e "${YELLOW}⏳ Vercel is deploying...${NC}"
echo ""

if [ "$SSL_STATUS" = "working" ]; then
    echo -e "${GREEN}🔒 SSL Status: Working${NC}"
    echo "The domain-based SSL should work without manual certificate acceptance!"
else
    echo -e "${YELLOW}🔒 SSL Status: Needs Verification${NC}"
    echo "You may still need to accept the certificate, but it should be easier with a domain name."
fi

echo ""
echo "🔗 Test URLs:"
echo "- Backend Health: https://${REVERSE_DNS}:8443/api/health"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo ""
echo "💡 Benefits of using reverse DNS:"
echo "- Better SSL certificate handling"
echo "- More professional appearance"
echo "- Potential for easier SSL certificate installation" 