#!/bin/bash

# 超快速替换ngrok URL
if [ -z "$1" ]; then
    echo "❌ 用法: $0 <ngrok-url>"
    echo "例如: $0 https://abc123.ngrok.io"
    exit 1
fi

URL="$1"
echo "🔄 快速替换URL: $URL"

# 直接替换配置文件
sed -i.bak "s|https://REPLACE_WITH_NGROK_URL.ngrok.io|$URL|g" config/production.yml

echo "✅ URL已更新！"
echo "🚀 现在运行: vercel --prod" 