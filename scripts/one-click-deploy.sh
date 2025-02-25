#!/bin/bash

# 🚀 一键部署 - GitHub → Vercel 工作流
# 最简单的使用方式

echo "🚀 One-Click Deploy for GitHub → Vercel"
echo "======================================"

BACKEND_HOST="45.77.178.85"
BACKEND_USER="root"

# 检查隧道状态
echo "🔍 Checking tunnel status..."
if ! ssh -o ConnectTimeout=5 "${BACKEND_USER}@${BACKEND_HOST}" "pgrep cloudflared" &>/dev/null; then
    echo "🌐 Starting Cloudflare tunnel..."
    ssh "${BACKEND_USER}@${BACKEND_HOST}" "
        pkill cloudflared 2>/dev/null || true
        nohup cloudflared tunnel --url http://localhost:6688 > /tmp/cloudflare-tunnel.log 2>&1 &
        sleep 3
    "
fi

# 获取隧道URL
echo "📡 Getting tunnel URL..."
TUNNEL_URL=""
for i in {1..15}; do
    TUNNEL_URL=$(ssh "${BACKEND_USER}@${BACKEND_HOST}" "grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1" || echo "")
    [ ! -z "$TUNNEL_URL" ] && break
    echo -n "."
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to get tunnel URL"
    exit 1
fi

echo "✅ Tunnel URL: $TUNNEL_URL"

# 更新配置
echo "📝 Updating config..."
sed -i.backup "s|gateway_url:.*|gateway_url: \"${TUNNEL_URL}\"|g" config/production.yml
sed -i "s|base_url:.*|base_url: \"${TUNNEL_URL}/api\"|g" config/production.yml
sed -i "s|file_url:.*|file_url: \"${TUNNEL_URL}/files\"|g" config/production.yml
sed -i "s|sse_url:.*|sse_url: \"${TUNNEL_URL}/events\"|g" config/production.yml
sed -i "s|notify_url:.*|notify_url: \"${TUNNEL_URL}/notify\"|g" config/production.yml

# 推送到GitHub（触发Vercel）
echo "📤 Pushing to GitHub..."
git add config/production.yml
git commit -m "deploy: $(date +%Y%m%d-%H%M%S) - ${TUNNEL_URL}" || echo "No changes"
git push origin main

echo ""
echo "🎉 Deploy initiated!"
echo "✅ Config updated"
echo "✅ Pushed to GitHub"
echo "⏳ Vercel is building..."
echo ""
echo "🔗 Links:"
echo "- Tunnel: $TUNNEL_URL"
echo "- Vercel: https://vercel.com/dashboard" 