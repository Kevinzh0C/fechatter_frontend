#!/bin/bash

# Fechatter Cloudflare Tunnel Installation
# 为后端服务器提供免费HTTPS域名

set -e

echo "☁️ Fechatter Cloudflare Tunnel Setup"
echo "====================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update

# Download and install cloudflared
echo "📥 Installing Cloudflare Tunnel..."
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb
rm cloudflared-linux-amd64.deb

# Create cloudflared user
echo "👤 Creating cloudflared user..."
useradd -r -s /bin/false cloudflared || true

# Create configuration directory
echo "📁 Creating configuration directory..."
mkdir -p /etc/cloudflared
chown cloudflared:cloudflared /etc/cloudflared

# Create tunnel configuration
echo "⚙️ Creating tunnel configuration..."
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: fechatter-backend
credentials-file: /etc/cloudflared/cert.json

ingress:
  # API endpoints
  - hostname: "*.trycloudflare.com"
    path: /api/*
    service: http://localhost:6688
  
  # File service
  - hostname: "*.trycloudflare.com"
    path: /files/*
    service: http://localhost:6688
  
  # SSE events
  - hostname: "*.trycloudflare.com"
    path: /events/*
    service: http://localhost:6687
  
  # Notifications
  - hostname: "*.trycloudflare.com"
    path: /notify/*
    service: http://localhost:6687
  
  # Health check
  - hostname: "*.trycloudflare.com"
    path: /health
    service: http://localhost:6688
  
  # Catch-all
  - service: http_status:404

# Additional settings
originRequest:
  connectTimeout: 30s
  tlsTimeout: 10s
  tcpKeepAlive: 30s
  noHappyEyeballs: false
  keepAliveTimeout: 90s
  httpHostHeader: localhost
EOF

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/cloudflared.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=cloudflared
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown cloudflared:cloudflared /etc/cloudflared/config.yml

echo "✅ Cloudflare Tunnel installed!"
echo ""
echo "🚀 To start the tunnel:"
echo "1. Run quick tunnel (temporary):"
echo "   cloudflared tunnel --url http://localhost:6688"
echo ""
echo "2. Or create permanent tunnel:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create fechatter-backend"
echo "   cloudflared tunnel route dns fechatter-backend fechatter-api"
echo "   systemctl enable cloudflared"
echo "   systemctl start cloudflared"
echo ""
echo "📋 The tunnel will provide a free HTTPS URL like:"
echo "   https://random-words-1234.trycloudflare.com"
echo ""
echo "🔧 Update your frontend configuration to use this URL!" 