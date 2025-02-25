#!/bin/bash

# Fechatter Backend SSL Certificate Installation Script
# Run this on your backend server (45.77.178.85)

set -e

echo "🔐 Fechatter Backend SSL Certificate Installation"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y nginx certbot python3-certbot-nginx ufw

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 8080/tcp    # Backend HTTP (optional)
ufw allow 8443/tcp    # Backend HTTPS (current)
ufw --force enable

# Backup current nginx config
echo "💾 Backing up current nginx configuration..."
cp -r /etc/nginx /etc/nginx.backup.$(date +%Y%m%d_%H%M%S)

# Create nginx configuration for domain
echo "⚙️ Creating nginx configuration..."
cat > /etc/nginx/sites-available/fechatter-ssl << 'EOF'
# Fechatter SSL Configuration
server {
    listen 80;
    server_name api.fechatter.com admin.fechatter.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fechatter.com admin.fechatter.com;
    
    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/api.fechatter.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fechatter.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CORS Headers for API
    add_header Access-Control-Allow-Origin "https://app.fechatter.com" always;
    add_header Access-Control-Allow-Origin "https://*.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With, Accept, Origin, X-API-Key" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Max-Age "86400" always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    # Proxy to backend services
    location /api/ {
        proxy_pass http://localhost:6688/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /files/ {
        proxy_pass http://localhost:6688/files/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }
    
    location /events/ {
        proxy_pass http://localhost:6687/events/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 0;
        proxy_buffering off;
    }
    
    location /notify/ {
        proxy_pass http://localhost:6687/notify/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        return 200 '{"status":"ok","ssl":true,"timestamp":"$time_iso8601"}';
        add_header Content-Type application/json;
    }
}
EOF

# Enable the site
echo "🔗 Enabling nginx site..."
ln -sf /etc/nginx/sites-available/fechatter-ssl /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Restart nginx
echo "🔄 Restarting nginx..."
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configuration complete!"
echo ""
echo "🔐 Now run the following commands to get SSL certificates:"
echo "sudo certbot --nginx -d api.fechatter.com -d admin.fechatter.com"
echo ""
echo "📋 After SSL installation, update your frontend configuration to use:"
echo "  - API Base URL: https://api.fechatter.com"
echo "  - Admin URL: https://admin.fechatter.com"
echo ""
echo "🔄 Set up automatic renewal:"
echo "sudo crontab -e"
echo "Add: 0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx" 