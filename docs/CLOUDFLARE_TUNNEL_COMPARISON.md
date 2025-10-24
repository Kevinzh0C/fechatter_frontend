# Cloudflare Tunnel 对比说明

## 🔍 为什么旧的 URL 不能用了？

### Quick Tunnel (临时模式) - 你当前使用的

```bash
# 启动命令
cloudflared tunnel --url http://172.17.0.1:8080
```

**工作原理：**
```
进程启动 → 随机 URL (hook-nav-attempt-size.trycloudflare.com)
         ↓
    进程运行中 → URL 有效 ✅
         ↓
     进程停止 → URL 永久失效 ❌
         ↓
    再次启动 → 新的随机 URL (personals-delays-fonts-buses.trycloudflare.com)
```

**旧 URL 失效原因：**
- cloudflared 进程停止了（手动杀掉/系统重启/网络断开/资源不足）
- 临时 URL 有隐藏的时间限制（通常 12-24 小时）
- Quick Tunnel 设计就是临时使用，不是生产环境方案

---

## ✅ 解决方案：Named Tunnel（固定域名）

### Named Tunnel (持久化模式) - **100% 免费**

```bash
# 一次性设置
cloudflared tunnel login
cloudflared tunnel create fechatter-prod
cloudflared tunnel run fechatter-prod
```

**工作原理：**
```
一次配置 → 固定 URL (fechatter-prod.cfargotunnel.com)
         ↓
    永久有效 → URL 永不改变 ✅
         ↓
    进程重启 → 同样的 URL ✅
         ↓
    系统重启 → 同样的 URL ✅
```

---

## 📊 功能对比

| 特性 | Quick Tunnel (当前) | Named Tunnel (推荐) |
|------|-------------------|-------------------|
| **价格** | 免费 | **免费** |
| **URL 稳定性** | ❌ 每次重启改变 | ✅ **永久固定** |
| **需要账号** | ❌ 不需要 | ✅ 需要（免费注册） |
| **配置复杂度** | 简单（零配置） | 中等（一次性配置） |
| **生产环境** | ❌ 不推荐 | ✅ **推荐** |
| **自动重连** | ❌ 否 | ✅ 是 |
| **自定义域名** | ❌ 不支持 | ✅ 支持 |
| **代码需要更新** | ✅ 每次重启都要更新 | ✅ **只需更新一次** |
| **Vercel 部署** | ⚠️ 每次需要重新部署 | ✅ **无需重新部署** |

---

## 🚀 立即升级到 Named Tunnel

### 方式 1: 使用自动化脚本（推荐）

```bash
cd /Users/zhangkaiqi/Rust/fechatter_frontend
bash scripts/setup-cloudflare-named-tunnel.sh
```

脚本会自动：
1. 指导你登录 Cloudflare 账号
2. 创建固定名称的 Tunnel
3. 配置 DNS（使用 `.cfargotunnel.com` 子域名）
4. 更新所有配置文件
5. 测试连通性

**时间：5 分钟**

---

### 方式 2: 手动设置

```bash
# 1. SSH 到服务器
ssh root@45.77.178.85

# 2. 登录 Cloudflare（会打开浏览器）
cloudflared tunnel login

# 3. 创建 Named Tunnel
cloudflared tunnel create fechatter-prod

# 4. 记录 Tunnel ID
cloudflared tunnel list

# 5. 创建配置文件
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: "*"
    service: http://172.17.0.1:8080
  - service: http_status:404
EOF

# 6. 启动 Named Tunnel
cloudflared tunnel run fechatter-prod
```

---

## 🎯 升级后的好处

### 立即获得：
- ✅ **固定 URL**：`fechatter-prod.cfargotunnel.com`（或自定义域名）
- ✅ **永不改变**：重启、断网、系统更新都不影响
- ✅ **自动重连**：网络问题自动恢复
- ✅ **生产级别**：Cloudflare 官方推荐的生产方案

### 开发体验改善：
- ✅ **无需频繁更新配置**：URL 固定后只需配置一次
- ✅ **无需重新部署 Vercel**：前端代码不需要改动
- ✅ **团队协作友好**：URL 固定，团队成员可以保存
- ✅ **文档永久有效**：API 文档中的 URL 不会失效

---

## 💡 常见问题

### Q: Named Tunnel 真的免费吗？
**A:** 是的，100% 免费。Cloudflare Tunnel 无论 Quick 还是 Named 模式都完全免费。

### Q: 需要信用卡吗？
**A:** 不需要。只需要一个免费的 Cloudflare 账号（邮箱注册即可）。

### Q: 如果没有自己的域名怎么办？
**A:** 使用 Cloudflare 提供的免费子域名：`fechatter-prod.cfargotunnel.com`

### Q: 现有的临时 Tunnel 需要停止吗？
**A:** 是的，设置脚本会自动停止旧的 Quick Tunnel 并启动新的 Named Tunnel。

### Q: 配置文件会自动更新吗？
**A:** 是的，脚本会自动更新所有配置文件（config/*.yml、vite.config.js、apiUrlResolver.js）。

### Q: Vercel 部署的前端需要重新部署吗？
**A:** 不需要。因为 Vercel 使用代理模式，前端代码不依赖硬编码的 URL。

---

## 📋 升级检查清单

- [ ] 运行设置脚本或手动配置
- [ ] 验证新 URL 可以访问
- [ ] 测试 API 登录功能
- [ ] 更新本地开发配置
- [ ] 测试 SSE 连接
- [ ] （可选）添加自定义域名
- [ ] （可选）配置系统服务自动启动

---

## 🔗 参考资料

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Named Tunnel 配置指南](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)
- [自定义域名设置](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/routing-to-tunnel/)

---

**总结：旧的 Quick Tunnel 失效是正常的，这就是临时模式的设计。升级到 Named Tunnel 可以一劳永逸地解决这个问题。**

