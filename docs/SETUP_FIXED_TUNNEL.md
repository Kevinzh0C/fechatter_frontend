# 🌐 设置固定域名的 Cloudflare Tunnel

## 📋 操作步骤（只需 5 分钟）

### 第一步：在远端服务器上运行设置脚本

```bash
# 1. SSH 到远端服务器
ssh root@45.77.178.85

# 2. 运行 Named Tunnel 设置脚本（已上传到服务器）
bash /root/setup-named-tunnel.sh
```

**脚本会自动完成：**
- ✅ 检查 cloudflared 安装
- ✅ 引导你登录 Cloudflare（会给出浏览器 URL）
- ✅ 停止旧的临时 Tunnel
- ✅ 创建固定名称的 Tunnel：`fechatter-prod`
- ✅ 生成固定 URL（例如：`https://<tunnel-id>.cfargotunnel.com`）
- ✅ 启动 Named Tunnel
- ✅ 测试连通性

**预期输出：**
```
🎉 Setup Complete!
==========================================

✅ Named Tunnel: fechatter-prod
✅ Tunnel ID: xxxx-xxxx-xxxx-xxxx
✅ Fixed URL: https://xxxxx.cfargotunnel.com
✅ PID: 12345

📋 Service Endpoints:
  - API:    https://xxxxx.cfargotunnel.com/api
  - Files:  https://xxxxx.cfargotunnel.com/files
  - Events: https://xxxxx.cfargotunnel.com/events
  - Notify: https://xxxxx.cfargotunnel.com/notify
  - Health: https://xxxxx.cfargotunnel.com/health
```

**重要：** 记下这个 URL，它是永久固定的！

---

### 第二步：在本地更新配置

```bash
# 在你的本地机器（Mac）上运行
cd /Users/zhangkaiqi/Rust/fechatter_frontend
bash scripts/update-local-config-from-remote.sh
```

**脚本会自动：**
- ✅ 从远端服务器获取 Tunnel URL
- ✅ 更新所有本地配置文件：
  - `config/development.yml`
  - `public/config/development.yml`
  - `vite.config.js`
  - `src/utils/apiUrlResolver.js`
- ✅ 测试连通性
- ✅ 清理备份文件

**完成！** 🎉

---

## 🎯 关键优势

### 升级前（Quick Tunnel - 临时模式）
```
URL: https://personals-delays-fonts-buses.trycloudflare.com
状态: ❌ 每次重启改变
问题: 需要频繁更新配置 → 重新部署 → 测试
```

### 升级后（Named Tunnel - 固定模式）
```
URL: https://xxxxx.cfargotunnel.com
状态: ✅ 永久固定
优势: 一次配置 → 永久有效 → 无需维护
```

---

## 🔧 管理命令

### 在远端服务器上：

```bash
# 查看 Tunnel 状态
ps aux | grep cloudflared

# 查看日志
tail -f /tmp/cloudflare-named-tunnel.log

# 查看 Tunnel 信息
cloudflared tunnel list
cloudflared tunnel info fechatter-prod

# 重启 Tunnel（URL 不变）
kill $(cat /tmp/cloudflare-named-tunnel.pid)
cloudflared tunnel run fechatter-prod

# 停止 Tunnel
kill $(cat /tmp/cloudflare-named-tunnel.pid)
```

### 在本地：

```bash
# 重新从远端同步配置
bash scripts/update-local-config-from-remote.sh

# 查看当前 Tunnel URL
ssh root@45.77.178.85 "cat /tmp/cloudflare-tunnel-url.txt"
```

---

## 📊 文件位置

### 远端服务器 (45.77.178.85)

```
配置文件：
  ~/.cloudflared/config.yml         # Tunnel 配置
  ~/.cloudflared/cert.pem           # Cloudflare 认证证书
  ~/.cloudflared/<tunnel-id>.json   # Tunnel 凭证

运行时文件：
  /tmp/cloudflare-tunnel-id.txt     # Tunnel ID
  /tmp/cloudflare-tunnel-url.txt    # 固定 URL
  /tmp/cloudflare-named-tunnel.pid  # 进程 PID
  /tmp/cloudflare-named-tunnel.log  # 运行日志

设置脚本：
  /root/setup-named-tunnel.sh       # Named Tunnel 设置脚本
```

### 本地机器

```
脚本：
  scripts/remote-setup-named-tunnel.sh      # 远端执行脚本（源）
  scripts/update-local-config-from-remote.sh # 本地配置更新脚本

配置文件（会被自动更新）：
  config/development.yml
  public/config/development.yml
  vite.config.js
  src/utils/apiUrlResolver.js
```

---

## ❓ 常见问题

### Q1: Named Tunnel 需要付费吗？
**A:** 不需要，100% 免费。只需要一个免费的 Cloudflare 账号。

### Q2: 如果服务器重启，URL 会改变吗？
**A:** 不会。URL 是永久固定的。重启后只需运行 `cloudflared tunnel run fechatter-prod` 即可恢复。

### Q3: 登录 Cloudflare 时需要什么？
**A:** 只需要一个邮箱地址注册免费账号，不需要信用卡。

### Q4: 可以自定义域名吗？
**A:** 可以。如果你有自己的域名并托管在 Cloudflare，可以配置自定义域名：
```bash
cloudflared tunnel route dns fechatter-prod api.yourdomain.com
```

### Q5: 如何确认 Tunnel 正在运行？
**A:** 运行 `ps aux | grep cloudflared` 或检查日志 `tail -f /tmp/cloudflare-named-tunnel.log`

### Q6: 旧的临时 Tunnel 怎么办？
**A:** 设置脚本会自动停止旧的临时 Tunnel。新的 Named Tunnel 会接管所有流量。

---

## 🚀 快速开始（完整命令）

```bash
# === 在远端服务器 ===
ssh root@45.77.178.85
bash /root/setup-named-tunnel.sh
# 按照提示登录 Cloudflare
# 等待完成，记下 URL

# === 在本地机器 ===
cd /Users/zhangkaiqi/Rust/fechatter_frontend
bash scripts/update-local-config-from-remote.sh

# === 启动开发服务器 ===
yarn dev
```

**完成！🎉 现在你有了一个永久固定的 Tunnel URL。**

---

## 📚 更多资源

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Named Tunnel 详细指南](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)
- [对比文档](./CLOUDFLARE_TUNNEL_COMPARISON.md)

