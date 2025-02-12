# 消息发送流程调试指南

## 问题描述
用户反馈消息通过MessageInput发送后，不能显示在聊天界面。

## 添加的调试日志

### 1. **chat.js store - sendMessage方法**
- 记录开始发送消息时的状态
- 检查currentChatId与目标chatId是否匹配
- 确保chatId类型正确（数字类型）
- 记录消息添加到数组前后的状态
- 记录API调用和响应

### 2. **MessageList.vue组件**
- 监听messages prop的变化
- 记录接收到的消息数组

### 3. **Chat.vue组件**
- 在computed messages中添加日志
- 跟踪消息数组的响应式更新

### 4. **调试助手方法**
在chat store中添加了`debugMessageState()`方法，可以在控制台调用查看当前状态。

## 常见问题及解决方案

### 问题1: currentChatId不匹配
**症状**: 消息发送到了错误的聊天
**解决**: 在sendMessage中自动更新currentChatId

### 问题2: chatId类型不一致
**症状**: 数字和字符串类型不匹配导致消息不显示
**解决**: 统一转换为数字类型（除了preview-dm）

### 问题3: 消息顺序错误
**症状**: 新消息出现在顶部而不是底部
**解决**: 使用push()而不是unshift()

### 问题4: SSE广播验证失败
**症状**: 消息一直显示为"发送中"状态
**解决**: 检查SSE连接状态和消息ID匹配

## 调试步骤

1. **打开浏览器控制台**

2. **发送一条消息并观察日志**
   - 查看"📤 [SEND]"开头的日志
   - 确认messages数组长度变化
   - 检查currentChatId是否正确

3. **检查MessageList组件**
   - 查看"📩 [MessageList]"日志
   - 确认组件接收到了新消息

4. **手动调试**
   ```javascript
   // 在控制台运行
   const chatStore = window.app._instance.appContext.config.globalProperties.$pinia._s.get('chat');
   
   // 查看当前状态
   chatStore.debugMessageState();
   
   // 手动发送消息测试
   await chatStore.sendMessage(1, { content: 'Test message', files: [] });
   ```

5. **检查SSE连接**
   - 打开Network标签页
   - 查找sse-proxy连接
   - 确认EventStream正常工作

## 预期行为

1. 消息立即显示在聊天界面底部（乐观更新）
2. 消息显示"发送中"状态
3. API调用成功后更新为"已发送"
4. SSE广播确认后更新为"已确认"
5. 如果超时，显示失败状态和重发按钮

## 额外工具

使用 `debug-message-send.html` 页面进行独立测试：
1. 测试直接API调用
2. 测试Store方法
3. 监控SSE事件
4. 检查Store状态

## 注意事项

- 确保登录状态正常
- 检查网络连接
- 确认有正确的聊天权限
- 注意控制台错误信息 