# 🔗 多用户会话管理系统

## 📋 功能概述

多用户会话管理系统允许同一浏览器的不同标签页使用不同的用户身份，实现真正的多用户并发访问。

## 🎯 主要特性

### ✅ 已实现功能

1. **标签页隔离** - 每个标签页都有独立的用户会话
2. **会话持久化** - 关闭标签页后重新打开仍保持登录状态
3. **快速切换** - 在不同用户身份之间快速切换
4. **会话管理** - 查看所有活跃会话并管理它们
5. **自动清理** - 自动清理过期会话（24小时）

### 🔧 技术实现

- **sessionStorage** - 标签页特定的会话存储
- **localStorage** - 跨标签页的会话持久化
- **唯一会话ID** - 每个标签页生成唯一的会话标识符
- **AuthStateManager 集成** - 与现有认证系统无缝集成

## 🚀 使用方法

### 1. 基本使用

1. **打开第一个标签页**
   ```
   http://localhost:5173/login
   ```
   使用账户 `super@test.com` / `password` 登录

2. **打开第二个标签页**
   ```
   http://localhost:5173/login
   ```
   使用账户 `admin@test.com` / `password` 登录

3. **切换标签页**
   - 每个标签页显示不同用户的界面
   - 侧边栏顶部显示用户会话切换器

### 2. 会话切换器使用

在应用的侧边栏顶部，你会看到用户会话切换器：

- **当前用户头像** - 显示当前登录用户
- **用户数量徽章** - 显示活跃会话数量
- **下拉菜单** - 点击查看所有会话并切换

### 3. 测试页面

访问测试页面来体验完整功能：
```
http://localhost:5173/test-multi-user-sessions.html
```

## 🔧 开发者信息

### 核心文件

1. **MultiUserSessionManager** (`src/utils/multiUserSessionManager.js`)
   - 核心会话管理逻辑
   - 会话创建、切换、清理

2. **AuthStateManager** (`src/utils/authStateManager.js`)
   - 集成多用户会话支持
   - 优先使用会话存储，fallback 到传统存储

3. **UserSessionSwitcher** (`src/components/auth/UserSessionSwitcher.vue`)
   - 用户界面组件
   - 会话列表、切换、管理功能

### API 接口

```javascript
// 获取当前会话认证信息
const auth = multiUserSessionManager.getSessionAuth()

// 设置会话认证信息
multiUserSessionManager.setSessionAuth(token, user)

// 清除当前会话
multiUserSessionManager.clearSessionAuth()

// 获取所有登录用户
const users = multiUserSessionManager.getLoggedInUsers()

// 切换到其他用户会话
multiUserSessionManager.switchToUser(targetSessionId)
```

## 📊 会话存储结构

### SessionStorage (标签页特定)
```
fechatter_session_auth: {
  token: "jwt_token",
  user: { id, email, name, ... },
  sessionId: "session_123456789_abc",
  timestamp: 1640995200000,
  lastActivity: 1640995200000
}
```

### LocalStorage (跨标签页)
```
fechatter_users_sessions: {
  "session_123456789_abc": {
    created: 1640995200000,
    lastActivity: 1640995200000,
    userAgent: "...",
    url: "..."
  }
}

fechatter_users_auth_session_123456789_abc: {
  token: "jwt_token",
  user: { ... },
  sessionId: "session_123456789_abc",
  timestamp: 1640995200000,
  lastActivity: 1640995200000
}
```

## 🎨 UI 组件

### 会话切换器位置
- **侧边栏顶部** - 在 AdminStatusBar 之后
- **样式集成** - 与现有 Discord 风格主题一致
- **响应式设计** - 支持移动端和桌面端

### 状态指示器
- **🟢 Current** - 当前活跃会话
- **🔵 Active** - 最近5分钟内活跃
- **⚪ Inactive** - 超过5分钟未活跃

## 🔍 调试功能

### 开发者控制台
```javascript
// 查看会话信息
multiUserSessionManager.getSessionInfo()

// 查看所有活跃会话
multiUserSessionManager.getActiveSessions()

// 调试认证状态管理器
authStateManager.debug()
```

### 测试页面功能
- 实时会话监控
- 快速登录测试账户
- 会话切换测试
- 调试信息显示

## 🚨 注意事项

### 安全考虑
1. **会话隔离** - 每个会话的数据完全隔离
2. **自动清理** - 24小时后自动清理过期会话
3. **活动跟踪** - 记录最后活动时间

### 性能优化
1. **存储优化** - 优先使用 sessionStorage，必要时使用 localStorage
2. **内存管理** - 自动清理无效会话数据
3. **事件处理** - 页面卸载时更新活动时间

### 兼容性
1. **向后兼容** - 与现有单用户系统完全兼容
2. **渐进增强** - 不支持多用户时自动降级到单用户模式
3. **浏览器支持** - 支持所有现代浏览器

## 🎯 使用场景

### 开发测试
- 同时测试不同角色用户的功能
- 验证权限控制和数据隔离
- 快速切换测试账户

### 生产环境
- 客服人员管理多个用户账户
- 管理员同时监控不同用户状态
- 家庭共享设备的多用户使用

### 演示展示
- 产品演示时展示不同用户视角
- 培训时同时展示多种用户角色
- 功能对比和测试

## 📈 后续优化

### 计划中的功能
1. **会话同步** - 跨设备会话同步
2. **权限继承** - 管理员会话可以查看其他用户数据
3. **批量操作** - 批量管理多个会话
4. **会话分组** - 按项目或团队分组会话

### 性能优化
1. **懒加载** - 按需加载会话数据
2. **缓存策略** - 智能缓存常用会话信息
3. **压缩存储** - 优化存储数据结构

## 🆘 故障排除

### 常见问题

**Q: 会话切换器不显示？**
A: 检查是否已登录，组件只在认证后显示

**Q: 切换用户后数据没有更新？**
A: 刷新页面或检查网络连接，确保 API 调用正常

**Q: 会话丢失？**
A: 检查浏览器存储限制，清理过多的缓存数据

**Q: 性能问题？**
A: 定期清理过期会话，避免存储过多会话数据

### 调试步骤
1. 打开浏览器开发者工具
2. 检查 Console 日志中的会话相关信息
3. 查看 Application > Storage 中的会话数据
4. 使用测试页面验证功能

## ✅ 总结

多用户会话管理系统为 Fechatter 前端提供了强大的多用户支持能力，通过标签页隔离和智能会话管理，实现了真正的多用户并发访问。系统设计注重安全性、性能和用户体验，为开发测试和生产使用提供了完整的解决方案。 