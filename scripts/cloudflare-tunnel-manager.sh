#!/bin/bash

# 🌐 Cloudflare Tunnel Manager
# Comprehensive management script for Cloudflare Tunnel

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

# Function to display usage
show_usage() {
    echo "🌐 Cloudflare Tunnel Manager"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the Cloudflare Tunnel"
    echo "  stop        Stop the Cloudflare Tunnel"
    echo "  restart     Restart the Cloudflare Tunnel"
    echo "  status      Show tunnel status"
    echo "  logs        Show tunnel logs"
    echo "  url         Get current tunnel URL"
    echo "  update      Update configuration and restart"
    echo "  monitor     Monitor tunnel health"
    echo "  test        Test tunnel connectivity"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 url"
    echo "  $0 test"
}

# Function to execute remote command
remote_exec() {
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "$1"
}

# Function to start Cloudflare Tunnel
start_tunnel() {
    echo -e "${BLUE}🚀 Starting Cloudflare Tunnel...${NC}"
    
    remote_exec "
        # Kill any existing cloudflared processes
        pkill cloudflared 2>/dev/null || true
        
        # Start tunnel in background
        nohup cloudflared tunnel --url http://172.17.0.1:8080 > /tmp/cloudflare-tunnel.log 2>&1 &
        TUNNEL_PID=\$!
        
        echo \"⏳ Waiting for tunnel to establish...\"
        sleep 8
        
        # Get tunnel URL
        TUNNEL_URL=\"\"
        for i in {1..10}; do
            if [ -f /tmp/cloudflare-tunnel.log ]; then
                TUNNEL_URL=\$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | tail -1 || echo \"\")
                if [ ! -z \"\$TUNNEL_URL\" ]; then
                    break
                fi
            fi
            echo \"Attempt \$i: Waiting for tunnel URL...\"
            sleep 2
        done
        
        if [ ! -z \"\$TUNNEL_URL\" ]; then
            echo \"✅ Tunnel started successfully!\"
            echo \"🔗 URL: \$TUNNEL_URL\"
            echo \"🔧 PID: \$TUNNEL_PID\"
            
            # Save tunnel info
            echo \"\$TUNNEL_PID\" > /tmp/cloudflare-tunnel.pid
            echo \"\$TUNNEL_URL\" > /tmp/cloudflare-tunnel.url
        else
            echo \"❌ Failed to start tunnel\"
            cat /tmp/cloudflare-tunnel.log 2>/dev/null || echo \"No logs available\"
            exit 1
        fi
    "
    
    echo -e "${GREEN}✅ Tunnel started successfully${NC}"
    get_tunnel_url
}

# Function to stop Cloudflare Tunnel
stop_tunnel() {
    echo -e "${BLUE}🛑 Stopping Cloudflare Tunnel...${NC}"
    
    remote_exec "
        if [ -f /tmp/cloudflare-tunnel.pid ]; then
            PID=\$(cat /tmp/cloudflare-tunnel.pid)
            if kill \$PID 2>/dev/null; then
                echo \"✅ Tunnel stopped (PID: \$PID)\"
            else
                echo \"⚠️ Process not found, killing all cloudflared processes\"
                pkill cloudflared 2>/dev/null || true
            fi
            rm -f /tmp/cloudflare-tunnel.pid /tmp/cloudflare-tunnel.url
        else
            echo \"⚠️ No PID file found, killing all cloudflared processes\"
            pkill cloudflared 2>/dev/null || true
        fi
    "
    
    echo -e "${GREEN}✅ Tunnel stopped successfully${NC}"
}

# Function to restart Cloudflare Tunnel
restart_tunnel() {
    echo -e "${BLUE}🔄 Restarting Cloudflare Tunnel...${NC}"
    
    stop_tunnel
    sleep 2
    start_tunnel
}

# Function to show tunnel status
show_status() {
    echo -e "${BLUE}📊 Cloudflare Tunnel Status${NC}"
    echo "===================================="
    
    # Check if tunnel is running
    local status
    status=$(remote_exec "ps aux | grep 'cloudflared tunnel' | grep -v grep || echo 'NOT_RUNNING'")
    
    if [ "$status" != "NOT_RUNNING" ]; then
        echo -e "${GREEN}✅ Tunnel Status: Running${NC}"
        echo "$status"
        
        # Get tunnel URL
        echo ""
        get_tunnel_url
        
        # Show resource usage
        echo ""
        echo -e "${BLUE}📈 Resource Usage:${NC}"
        remote_exec "ps aux | grep 'cloudflared tunnel' | grep -v grep | awk '{print \"CPU: \" \$3 \"%, Memory: \" \$4 \"%, PID: \" \$2}'"
        
    else
        echo -e "${RED}❌ Tunnel Status: Not Running${NC}"
    fi
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Cloudflare Tunnel Logs${NC}"
    echo "================================="
    
    if [ "$1" = "-f" ]; then
        echo "Following logs (Ctrl+C to exit)..."
        remote_exec "tail -f /tmp/cloudflare-tunnel.log"
    else
        remote_exec "tail -20 /tmp/cloudflare-tunnel.log 2>/dev/null || echo 'No logs available'"
    fi
}

# Function to get tunnel URL
get_tunnel_url() {
    echo -e "${BLUE}🔗 Getting tunnel URL...${NC}"
    
    local url
    url=$(remote_exec "cat /tmp/cloudflare-tunnel.url 2>/dev/null || echo ''")
    
    if [ ! -z "$url" ]; then
        echo -e "${GREEN}✅ Tunnel URL: ${url}${NC}"
        echo -e "${BLUE}📋 Service Endpoints:${NC}"
        echo "  - API: ${url}/api"
        echo "  - Files: ${url}/files"
        echo "  - Events: ${url}/events"
        echo "  - Notify: ${url}/notify"
        echo "  - Health: ${url}/health"
    else
        echo -e "${RED}❌ Could not retrieve tunnel URL${NC}"
        echo "Try checking logs: $0 logs"
    fi
}

# Function to update configuration
update_config() {
    echo -e "${BLUE}🔧 Updating configuration with current tunnel URL...${NC}"
    
    local current_url
    current_url=$(remote_exec "cat /tmp/cloudflare-tunnel.url 2>/dev/null || echo ''")
    
    if [ ! -z "$current_url" ]; then
        echo -e "${GREEN}Current URL: ${current_url}${NC}"
        
        # Update local configuration files
        echo "Updating local configuration..."
        
        # Update development configuration
        if [ -f "config/development.yml" ]; then
            sed -i.backup "s|gateway_url:.*|gateway_url: \"${current_url}\"|g" config/development.yml
            sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${current_url}/api\"|g" config/development.yml
            sed -i '' "s|file_url: \"https://[^\"]*\"|file_url: \"${current_url}/files\"|g" config/development.yml
            sed -i '' "s|sse_url: \"https://[^\"]*\"|sse_url: \"${current_url}/events\"|g" config/development.yml
            sed -i '' "s|notify_url: \"https://[^\"]*\"|notify_url: \"${current_url}/notify\"|g" config/development.yml
        fi
        
        # Update public configuration
        if [ -f "public/config/development.yml" ]; then
            sed -i.backup "s|gateway_url:.*|gateway_url: \"${current_url}\"|g" public/config/development.yml
            sed -i '' "s|base_url: \"https://[^\"]*\"|base_url: \"${current_url}/api\"|g" public/config/development.yml
            sed -i '' "s|file_url: \"https://[^\"]*\"|file_url: \"${current_url}/files\"|g" public/config/development.yml
            sed -i '' "s|sse_url: \"https://[^\"]*\"|sse_url: \"${current_url}/events\"|g" public/config/development.yml
            sed -i '' "s|notify_url: \"https://[^\"]*\"|notify_url: \"${current_url}/notify\"|g" public/config/development.yml
        fi
        
        # Update Vite proxy
        if [ -f "vite.config.js" ]; then
            sed -i.backup "s|target: 'https://[^']*'|target: '${current_url}'|g" vite.config.js
        fi
        
        # Update API URL resolver
        if [ -f "src/utils/apiUrlResolver.js" ]; then
            sed -i.backup "s|const CLOUDFLARE_URL = '[^']*'|const CLOUDFLARE_URL = '${current_url}'|g" src/utils/apiUrlResolver.js
        fi
        
        echo -e "${GREEN}✅ Configuration updated${NC}"
    else
        echo -e "${RED}❌ Could not get current URL for update${NC}"
    fi
}

# Function to monitor tunnel health
monitor_tunnel() {
    echo -e "${BLUE}🔍 Monitoring tunnel health...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    while true; do
        local url
        url=$(remote_exec "cat /tmp/cloudflare-tunnel.url 2>/dev/null || echo ''")
        
        if [ ! -z "$url" ]; then
            local status_code
            status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}/health" 2>/dev/null || echo "000")
            
            local timestamp
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            if [ "$status_code" = "000" ]; then
                echo -e "${timestamp} - ${RED}❌ Tunnel unreachable${NC}"
            elif [ "$status_code" = "404" ]; then
                echo -e "${timestamp} - ${YELLOW}⚠️  Tunnel OK (404 - endpoint not found)${NC}"
            elif [ "$status_code" = "200" ]; then
                echo -e "${timestamp} - ${GREEN}✅ Tunnel healthy${NC}"
            else
                echo -e "${timestamp} - ${YELLOW}⚠️  Status: ${status_code}${NC}"
            fi
        else
            echo -e "$(date '+%Y-%m-%d %H:%M:%S') - ${RED}❌ No tunnel URL found${NC}"
        fi
        
        sleep 30
    done
}

# Function to test tunnel connectivity
test_tunnel() {
    echo -e "${BLUE}🧪 Testing tunnel connectivity...${NC}"
    
    local url
    url=$(remote_exec "cat /tmp/cloudflare-tunnel.url 2>/dev/null || echo ''")
    
    if [ -z "$url" ]; then
        echo -e "${RED}❌ No tunnel URL found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Testing: ${url}${NC}"
    
    # Test health endpoint
    echo -n "Health check: "
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}/health" | grep -q "200"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    # Test API endpoint
    echo -n "API endpoint: "
    local api_status
    api_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}/api/health" 2>/dev/null || echo "000")
    if [ "$api_status" = "200" ] || [ "$api_status" = "404" ]; then
        echo -e "${GREEN}✅ Reachable (${api_status})${NC}"
    else
        echo -e "${RED}❌ Failed (${api_status})${NC}"
    fi
    
    # Test file endpoint
    echo -n "File endpoint: "
    local file_status
    file_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}/files/" 2>/dev/null || echo "000")
    if [ "$file_status" = "200" ] || [ "$file_status" = "404" ] || [ "$file_status" = "403" ]; then
        echo -e "${GREEN}✅ Reachable (${file_status})${NC}"
    else
        echo -e "${RED}❌ Failed (${file_status})${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Test completed${NC}"
}

# Main script logic
case "${1:-}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        restart_tunnel
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    url)
        get_tunnel_url
        ;;
    update)
        update_config
        ;;
    monitor)
        monitor_tunnel
        ;;
    test)
        test_tunnel
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 