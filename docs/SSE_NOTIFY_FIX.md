# SSE和Notify服务修复指南

## 问题分析

### 后端日志警告
大量 "Header of type `authorization` was missing" 警告表明：
- SSE连接使用查询参数传递token，而不是Authorization header
- 这是正常的，因为EventSource API不支持自定义headers

### SSE连接机制

1. **连接建立**
   - 前端通过Vite代理 `/sse-proxy` 连接到notify_server (port 6687)
   - URL格式: `/sse-proxy/events?access_token=${token}`
   - Vite将请求代理到 `http://localhost:6687/events`

2. **事件类型**
   - `NewMessage` - 新消息事件
   - `TypingStatus` - 输入状态
   - `MessageRead` - 消息已读
   - `UserPresence` - 用户在线状态
   - `UserJoinedChat` - 用户加入聊天
   - `UserLeftChat` - 用户离开聊天

## 调试步骤

### 1. 使用调试页面

打开 `debug-sse.html` 页面进行测试：

```bash
# 在浏览器中打开
http://localhost:1420/debug-sse.html
```

测试流程：
1. 点击 "Connect SSE" 连接到notify服务
2. 在 "Test Message Send" 部分发送测试消息
3. 观察 "Events Monitor" 是否收到 NewMessage 事件

### 2. 检查SSE连接状态

在控制台运行：
```javascript
// 获取SSE服务实例
const sseService = window.app?._instance?.appContext?.config?.globalProperties?.$realtimeCommunicationService;

// 检查连接状态
sseService?.getConnectionState();
```

### 3. 监控网络请求

在浏览器开发者工具中：
1. 打开 Network 标签
2. 筛选 "EventStream" 类型
3. 查看 `/sse-proxy/events` 连接
4. 检查是否有事件流数据

## 常见问题

### 问题1: SSE连接失败
**症状**: 连接立即关闭或报错
**解决方案**:
1. 确保notify_server在6687端口运行
2. 检查token是否有效
3. 查看后端日志是否有错误

### 问题2: 消息发送成功但SSE没收到
**症状**: API返回成功，但没有NewMessage事件
**可能原因**:
1. 消息没有正确转发到notify_server
2. SSE连接的workspace/chat权限问题
3. 事件过滤逻辑问题

### 问题3: 收到SSE事件但UI不更新
**症状**: Events Monitor显示事件，但聊天界面不更新
**检查点**:
1. `handleChatMessage`方法是否正确处理消息
2. `addRealtimeMessage`是否正确更新store
3. Vue响应式是否正常工作

## 验证消息流程

完整的消息流程应该是：

1. **发送消息**
   ```
   前端 -> fechatter_server API (/chat/{id}/messages)
   ```

2. **消息入库**
   ```
   fechatter_server -> PostgreSQL
   ```

3. **事件分发**
   ```
   fechatter_server -> notify_server (HTTP POST /notify)
   ```

4. **SSE广播**
   ```
   notify_server -> 前端 (SSE NewMessage event)
   ```

5. **UI更新**
   ```
   SSE Service -> Chat Store -> Vue Components
   ```

## 修复建议

### 1. 确保notify_server正常运行
```bash
# 检查notify_server是否在运行
lsof -i :6687

# 查看notify_server日志
# 确保能看到事件分发日志
```

### 2. 验证事件分发
在fechatter_server中添加日志：
- 消息创建成功后的notify调用
- notify服务的响应

### 3. 前端调试日志
已经添加的调试日志：
- SSE连接状态
- 事件接收
- 消息处理流程

### 4. 测试隔离
使用 `debug-sse.html` 独立测试：
- 排除Vue应用的干扰
- 直接观察SSE事件流
- 验证端到端流程

## 预期结果

当一切正常工作时：
1. 发送消息后立即在UI显示（乐观更新）
2. SSE收到NewMessage事件（1-2秒内）
3. 消息状态更新为"已确认"
4. 其他用户看到新消息
5. 未读计数正确更新

## 后续步骤

如果SSE仍然不工作：
1. 检查notify_server的实现
2. 验证fechatter_server的notify调用
3. 使用curl直接测试notify API
4. 检查网络代理/防火墙设置 