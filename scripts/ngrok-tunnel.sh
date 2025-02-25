#!/bin/bash

# ngrok Tunnel for Fechatter Backend
# 使用ngrok为后端创建HTTPS隧道

echo "🚀 ngrok HTTPS Tunnel for Fechatter Backend"
echo "=========================================="

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "📥 Installing ngrok..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ngrok/ngrok/ngrok
    else
        echo "❌ Please install ngrok manually from https://ngrok.com/download"
        exit 1
    fi
fi

echo "🔍 Checking backend services..."

# Check if backend is running
if curl -s http://localhost:6688/health > /dev/null 2>&1; then
    echo "✅ Main backend service (6688) is running"
else
    echo "⚠️ Main backend service (6688) not detected"
    echo "Please make sure your backend is running on port 6688"
fi

echo ""
echo "🌐 Starting ngrok tunnel..."
echo "This will create a temporary HTTPS URL for your backend"
echo "Press Ctrl+C to stop the tunnel"
echo ""
echo "📋 After starting, you'll get a URL like:"
echo "   https://abc123.ngrok.io"
echo ""
echo "🔧 Copy this URL and run:"
echo "   yarn tunnel:update https://abc123.ngrok.io"
echo ""

# Start ngrok tunnel
ngrok http 6688 