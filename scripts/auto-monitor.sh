#!/bin/bash

# 🔄 Fechatter 自动监控和自愈系统
# 持续监控服务状态，自动修复问题

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"
CHECK_INTERVAL=60  # 检查间隔（秒）
LOG_FILE="/tmp/fechatter-monitor.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check backend services
check_backend_services() {
    if ssh "${BACKEND_USER}@${BACKEND_HOST}" "docker ps | grep fechatter-server-vcr | grep -q healthy" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Check Cloudflare tunnel
check_tunnel() {
    if ssh "${BACKEND_USER}@${BACKEND_HOST}" "pgrep cloudflared" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Auto-restart tunnel if needed
restart_tunnel() {
    log "🔄 Restarting Cloudflare tunnel..."
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        pkill cloudflared || true
        nohup cloudflared tunnel --url http://localhost:6688 > /tmp/cloudflare-tunnel.log 2>&1 &
    "
    sleep 5
    if check_tunnel; then
        log "✅ Tunnel restarted successfully"
        return 0
    else
        log "❌ Failed to restart tunnel"
        return 1
    fi
}

# Get current tunnel URL
get_tunnel_url() {
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1" || echo ""
}

# Update configuration if URL changed
update_config_if_needed() {
    CURRENT_URL=$(get_tunnel_url)
    if [ ! -z "$CURRENT_URL" ]; then
        CONFIG_URL=$(grep "gateway_url:" config/production.yml | sed 's/.*"\(.*\)".*/\1/')
        if [ "$CURRENT_URL" != "$CONFIG_URL" ]; then
            log "🔄 Updating configuration with new URL: $CURRENT_URL"
            sed -i.backup "s|gateway_url:.*|gateway_url: \"${CURRENT_URL}\"|g" config/production.yml
            sed -i "s|base_url:.*|base_url: \"${CURRENT_URL}/api\"|g" config/production.yml
            sed -i "s|file_url:.*|file_url: \"${CURRENT_URL}/files\"|g" config/production.yml
            sed -i "s|sse_url:.*|sse_url: \"${CURRENT_URL}/events\"|g" config/production.yml
            sed -i "s|notify_url:.*|notify_url: \"${CURRENT_URL}/notify\"|g" config/production.yml
            
            # Auto-deploy
            git add config/production.yml
            git commit -m "feat: auto-update tunnel URL - $CURRENT_URL" || true
            git push origin main
            log "✅ Configuration updated and deployed"
        fi
    fi
}

# Main monitoring loop
monitor() {
    log "🔍 Starting Fechatter monitoring system..."
    
    while true; do
        log "🔍 Checking system status..."
        
        # Check backend services
        if ! check_backend_services; then
            log "❌ Backend services down, attempting restart..."
            ssh "${BACKEND_USER}@${BACKEND_HOST}" "docker restart fechatter-server-vcr" || true
            sleep 10
        else
            log "✅ Backend services healthy"
        fi
        
        # Check tunnel
        if ! check_tunnel; then
            log "❌ Tunnel down, attempting restart..."
            restart_tunnel
        else
            log "✅ Tunnel running"
            update_config_if_needed
        fi
        
        log "⏳ Sleeping for $CHECK_INTERVAL seconds..."
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
cleanup() {
    log "🛑 Monitor stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start monitoring
if [ "$1" == "start" ]; then
    monitor
elif [ "$1" == "status" ]; then
    echo "🔍 Current Status:"
    echo "=================="
    if check_backend_services; then
        echo -e "${GREEN}✅ Backend services: Running${NC}"
    else
        echo -e "${RED}❌ Backend services: Down${NC}"
    fi
    
    if check_tunnel; then
        echo -e "${GREEN}✅ Tunnel: Running${NC}"
        TUNNEL_URL=$(get_tunnel_url)
        if [ ! -z "$TUNNEL_URL" ]; then
            echo "📍 Tunnel URL: $TUNNEL_URL"
        fi
    else
        echo -e "${RED}❌ Tunnel: Down${NC}"
    fi
elif [ "$1" == "logs" ]; then
    tail -f "$LOG_FILE"
else
    echo "🔄 Fechatter Auto-Monitor"
    echo "========================"
    echo "Usage: $0 {start|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start  - Start monitoring (runs continuously)"
    echo "  status - Check current status"
    echo "  logs   - View monitor logs"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start monitoring"
    echo "  $0 status         # Quick status check"
    echo "  $0 logs           # View logs"
fi 