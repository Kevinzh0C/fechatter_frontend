#!/bin/bash

# 🐳 Complete Docker Deployment with ngrok
# One-click deployment for all services

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

echo "🐳 Complete Docker Deployment with ngrok"
echo "========================================"
echo ""

echo -e "${BLUE}🔍 Step 1: Checking backend services...${NC}"

# Check backend services
ssh "${BACKEND_USER}@${BACKEND_HOST}" "
    cd /root/fechatter
    echo 'Backend services status:'
    docker ps --format 'table {{.Names}}\t{{.Status}}' | grep fechatter
"

echo -e "${BLUE}🔗 Step 2: Managing ngrok tunnel...${NC}"

# Use the ngrok manager to get current status
./scripts/docker-ngrok-manager.sh status

echo -e "${BLUE}📝 Step 3: Updating configurations...${NC}"

# Update configurations
./scripts/docker-ngrok-manager.sh update

echo -e "${BLUE}🚀 Step 4: Deploying to GitHub → Vercel...${NC}"

# Commit and push changes
git add config/production.yml
git commit -m "feat: Docker ngrok deployment update

- Updated configuration with current Docker ngrok URL
- All services running in Docker containers
- Persistent and auto-restart enabled
- Unified service management" || echo "No changes to commit"

git push origin main

echo ""
echo "🎉 Complete Docker Deployment Summary"
echo "====================================="

# Get final status
echo -e "${GREEN}✅ Backend Services: Running${NC}"
ssh "${BACKEND_USER}@${BACKEND_HOST}" "cd /root/fechatter && docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E '(fechatter|notify|bot|analytics)'"

echo ""
echo -e "${GREEN}✅ ngrok Tunnel: Running${NC}"
./scripts/docker-ngrok-manager.sh url

echo ""
echo -e "${GREEN}✅ Configuration: Updated${NC}"
echo -e "${GREEN}✅ GitHub: Pushed${NC}"
echo -e "${YELLOW}⏳ Vercel: Deploying...${NC}"

echo ""
echo "🔧 Management Commands:"
echo "- Check status: ./scripts/docker-ngrok-manager.sh status"
echo "- View logs: ./scripts/docker-ngrok-manager.sh logs"
echo "- Restart tunnel: ./scripts/docker-ngrok-manager.sh restart"
echo "- Monitor health: ./scripts/docker-ngrok-manager.sh monitor"

echo ""
echo "🌐 Service URLs:"
echo "- ngrok Web UI: http://${BACKEND_HOST}:4040"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- GitHub Repository: https://github.com/Kevinzh0C/fechatter_frontend"

echo ""
echo "🎯 Next Steps:"
echo "1. Wait 1-2 minutes for Vercel deployment"
echo "2. Test the application at your Vercel URL"
echo "3. Login with test@fechatter.com / test123"
echo "4. Monitor tunnel health if needed"

echo ""
echo -e "${GREEN}🎉 Docker deployment completed successfully!${NC}" 