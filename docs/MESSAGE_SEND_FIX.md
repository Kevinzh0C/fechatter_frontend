# 消息发送机制修复文档

## 问题描述

用户反馈的问题：
1. 从 MessageInput 框发出的消息没有很好的增量更新
2. 聊天气泡格式不对（显示"Unknown User"）
3. SSE 通知可能没有成功分发

## 根本原因分析

### 1. 消息格式不一致
- 乐观更新创建的消息缺少 `sender_id` 字段
- normalizeMessage 方法过度依赖可能不存在的 `chatMembers` 数据
- 前后端消息格式不匹配

### 2. SSE 事件处理不完善
- `addRealtimeMessage` 方法没有正确处理所有场景
- 消息去重逻辑有缺陷
- 实时消息更新时没有正确更新 channel list

### 3. 消息状态管理复杂
- 临时消息和真实消息的替换逻辑复杂
- 缓存更新不一致

## 修复内容

### 1. 改进 `sendMessage` 方法
**文件**: `src/stores/chat.js`

```javascript
// 修复前：缺少 sender_id，格式不完整
const optimisticMessage = {
  id: tempId,
  temp_id: tempId,
  chat_id: chatId,
  content,
  files: files || [],
  created_at: new Date().toISOString(),
  sender: { id: authStore.user.id, fullname: authStore.user.fullname || 'You' },
  status: 'sending',
};

// 修复后：添加完整格式
const optimisticMessage = {
  id: tempId,
  temp_id: tempId,
  chat_id: chatId,
  sender_id: authStore.user.id,  // 添加 sender_id
  content,
  files: files || [],
  created_at: new Date().toISOString(),
  sender: { 
    id: authStore.user.id, 
    fullname: authStore.user.fullname || authStore.user.username || 'You',
    email: authStore.user.email 
  },
  status: 'sending',
};
```

### 2. 改进 `normalizeMessage` 方法
**文件**: `src/stores/chat.js`

修复要点：
- 添加多重数据源查找机制
- 优先使用 `userStore.workspaceUsers`（最可靠）
- 依次尝试 chatMembers、getCurrentChat.chat_members
- 最后使用消息自带的 sender 信息
- 确保所有必需字段都存在

### 3. 改进 `addRealtimeMessage` 和 `handleIncomingMessage`
**文件**: `src/stores/chat.js`

新增功能：
- 正确的消息去重逻辑（基于 ID 和时间戳）
- 自动替换临时消息为真实消息
- 更新 channel list 的 last_message
- DM 自动移到列表顶部
- 处理已关闭 DM 的重新显示

### 4. 修复 SSE 事件处理
**文件**: `src/services/sse.js`

```javascript
// 确保消息格式完整
const formattedMessage = {
  id: parseInt(message.id),
  chat_id: message.chat_id,
  sender_id: message.sender_id || message.user_id,
  content: message.content,
  files: message.files || [],
  created_at: message.created_at ? new Date(message.created_at).toISOString() : new Date().toISOString(),
  sender_name: message.sender_name,
  sender_fullname: message.sender_fullname,
  sender: message.sender,
  realtime: true
};
```

### 5. 修复 Channel List 更新
**文件**: `src/composables/useHomeLayout.js`

- 正确更新 last_message 格式
- 处理已关闭 DM 的重新显示
- 更新未读计数

## 测试场景

1. **群聊消息发送**
   - 发送纯文本消息
   - 发送带附件的消息
   - 快速连续发送多条消息

2. **私聊消息发送**
   - 新建私聊并发送首条消息
   - 向已存在的私聊发送消息
   - 向已关闭的私聊发送消息（应重新显示在列表中）

3. **实时更新**
   - 接收他人发送的消息
   - Channel list 正确更新最后消息
   - 未读计数正确更新

4. **消息显示**
   - 发送者名称正确显示
   - 时间戳正确
   - 发送状态指示器工作正常

## 注意事项

1. **性能优化**
   - 消息缓存机制保持不变
   - 避免重复的 API 调用
   - 优化消息排序逻辑

2. **错误处理**
   - 发送失败时显示重试按钮
   - 网络断开时的优雅降级
   - SSE 重连机制

3. **用户体验**
   - 乐观更新确保即时反馈
   - 消息状态清晰可见
   - 平滑的动画过渡

## 后续优化建议

1. 实现消息编辑功能
2. 添加消息已读回执
3. 实现消息引用回复
4. 添加消息搜索功能
5. 优化大量消息时的性能 