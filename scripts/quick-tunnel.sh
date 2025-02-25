#!/bin/bash

# Quick Cloudflare Tunnel for Fechatter Backend
# 快速为后端创建HTTPS隧道

echo "🚀 Quick HTTPS Tunnel for Fechatter Backend"
echo "==========================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📥 Installing cloudflared..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflared
    else
        echo "❌ Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
fi

echo "🔍 Checking backend services..."

# Check if backend is running
if curl -s http://localhost:6688/health > /dev/null 2>&1; then
    echo "✅ Main backend service (6688) is running"
else
    echo "⚠️ Main backend service (6688) not detected"
fi

if curl -s http://localhost:6687/health > /dev/null 2>&1; then
    echo "✅ SSE service (6687) is running"
else
    echo "⚠️ SSE service (6687) not detected"
fi

echo ""
echo "🌐 Starting Cloudflare Tunnel..."
echo "This will create a temporary HTTPS URL for your backend"
echo "Press Ctrl+C to stop the tunnel"
echo ""

# Start the tunnel
cloudflared tunnel --url http://localhost:6688 