#!/bin/bash

# 🐳 Docker ngrok Tunnel Manager
# Comprehensive management script for Docker-based ngrok tunnel

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"
CONTAINER_NAME="fechatter-ngrok-tunnel"
COMPOSE_FILE="docker-compose.ngrok.yml"

# Function to display usage
show_usage() {
    echo "🐳 Docker ngrok Tunnel Manager"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the ngrok tunnel"
    echo "  stop        Stop the ngrok tunnel"
    echo "  restart     Restart the ngrok tunnel"
    echo "  status      Show tunnel status"
    echo "  logs        Show tunnel logs"
    echo "  url         Get current tunnel URL"
    echo "  update      Update configuration and restart"
    echo "  cleanup     Clean up old containers"
    echo "  monitor     Monitor tunnel health"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 url"
}

# Function to execute remote command
remote_exec() {
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "cd /root/fechatter && $1"
}

# Function to start ngrok tunnel
start_tunnel() {
    echo -e "${BLUE}🚀 Starting Docker ngrok tunnel...${NC}"
    
    remote_exec "docker-compose -f ${COMPOSE_FILE} up -d"
    
    echo -e "${GREEN}✅ Tunnel started successfully${NC}"
    sleep 3
    get_tunnel_url
}

# Function to stop ngrok tunnel
stop_tunnel() {
    echo -e "${BLUE}🛑 Stopping Docker ngrok tunnel...${NC}"
    
    remote_exec "docker-compose -f ${COMPOSE_FILE} down"
    
    echo -e "${GREEN}✅ Tunnel stopped successfully${NC}"
}

# Function to restart ngrok tunnel
restart_tunnel() {
    echo -e "${BLUE}🔄 Restarting Docker ngrok tunnel...${NC}"
    
    stop_tunnel
    sleep 2
    start_tunnel
}

# Function to show tunnel status
show_status() {
    echo -e "${BLUE}📊 Docker ngrok Tunnel Status${NC}"
    echo "=================================="
    
    # Check if container is running
    if remote_exec "docker ps | grep ${CONTAINER_NAME}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Container Status: Running${NC}"
        
        # Get container info
        remote_exec "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep ${CONTAINER_NAME}"
        
        # Get tunnel URL
        echo ""
        get_tunnel_url
        
        # Show resource usage
        echo ""
        echo -e "${BLUE}📈 Resource Usage:${NC}"
        remote_exec "docker stats ${CONTAINER_NAME} --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}'"
        
    else
        echo -e "${RED}❌ Container Status: Not Running${NC}"
    fi
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Docker ngrok Tunnel Logs${NC}"
    echo "=================================="
    
    if [ "$1" = "-f" ]; then
        echo "Following logs (Ctrl+C to exit)..."
        remote_exec "docker logs -f ${CONTAINER_NAME}"
    else
        remote_exec "docker logs --tail 50 ${CONTAINER_NAME}"
    fi
}

# Function to get tunnel URL
get_tunnel_url() {
    echo -e "${BLUE}🔗 Getting tunnel URL...${NC}"
    
    local url
    url=$(remote_exec "docker logs ${CONTAINER_NAME} 2>&1 | grep -E 'url=https://.*ngrok' | tail -1 | grep -o 'https://[^[:space:]]*'" 2>/dev/null || echo "")
    
    if [ ! -z "$url" ]; then
        echo -e "${GREEN}✅ Tunnel URL: ${url}${NC}"
        echo -e "${BLUE}📋 API Endpoints:${NC}"
        echo "  - Base API: ${url}/api"
        echo "  - Health: ${url}/api/health"
        echo "  - Files: ${url}/files"
        echo "  - Events: ${url}/events"
        echo "  - Notify: ${url}/notify"
        echo "  - Web UI: http://${BACKEND_HOST}:4040"
    else
        echo -e "${RED}❌ Could not retrieve tunnel URL${NC}"
        echo "Check logs for more information:"
        echo "  $0 logs"
    fi
}

# Function to update configuration
update_config() {
    echo -e "${BLUE}🔧 Updating ngrok configuration...${NC}"
    
    # Get current URL
    local current_url
    current_url=$(remote_exec "docker logs ${CONTAINER_NAME} 2>&1 | grep -E 'url=https://.*ngrok' | tail -1 | grep -o 'https://[^[:space:]]*'" 2>/dev/null || echo "")
    
    if [ ! -z "$current_url" ]; then
        echo -e "${GREEN}Current URL: ${current_url}${NC}"
        
        # Update frontend configuration
        echo "Updating frontend configuration..."
        sed -i.backup "s|gateway_url:.*|gateway_url: \"${current_url}\"|g" config/production.yml
        sed -i "s|base_url:.*ngrok[^/]*/api|base_url: \"${current_url}/api\"|g" config/production.yml
        sed -i "s|file_url:.*ngrok[^/]*/files|file_url: \"${current_url}/files\"|g" config/production.yml
        sed -i "s|sse_url:.*ngrok[^/]*/events|sse_url: \"${current_url}/events\"|g" config/production.yml
        sed -i "s|notify_url:.*ngrok[^/]*/notify|notify_url: \"${current_url}/notify\"|g" config/production.yml
        
        # Update backend CORS
        echo "Updating backend CORS..."
        remote_exec "
            if ! grep -q '${current_url}' config/chat.yml; then
                sed -i '/allow_origins:/a\\    - \"${current_url}\"' config/chat.yml
                docker restart fechatter-server-vcr notify-server-vcr
                echo 'Backend CORS updated and services restarted'
            else
                echo 'CORS already contains current URL'
            fi
        "
        
        echo -e "${GREEN}✅ Configuration updated${NC}"
    else
        echo -e "${RED}❌ Could not get current URL for update${NC}"
    fi
}

# Function to cleanup old containers
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up old ngrok containers...${NC}"
    
    remote_exec "
        # Remove stopped containers
        docker container prune -f
        
        # Remove unused images
        docker image prune -f
        
        # Show current status
        echo 'Current ngrok containers:'
        docker ps -a | grep ngrok || echo 'No ngrok containers found'
    "
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to monitor tunnel health
monitor_tunnel() {
    echo -e "${BLUE}🔍 Monitoring tunnel health...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    while true; do
        local url
        url=$(remote_exec "docker logs ${CONTAINER_NAME} 2>&1 | grep -E 'url=https://.*ngrok' | tail -1 | grep -o 'https://[^[:space:]]*'" 2>/dev/null || echo "")
        
        if [ ! -z "$url" ]; then
            local status_code
            status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}/api/health" 2>/dev/null || echo "000")
            
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
    cleanup)
        cleanup
        ;;
    monitor)
        monitor_tunnel
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 