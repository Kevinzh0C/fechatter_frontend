# 消息发送机制修复 V2 - 群聊优化与超时重发

## 修复概述

根据用户反馈，实现了以下功能：
1. 消息发送时立即在 messageList 显示（乐观更新）
2. 通过 SSE 广播验证消息是否成功入库
3. 超时失败时显示重发按钮
4. 群聊不需要已读功能，DM 需要未读/已读功能

## 核心实现

### 1. 乐观更新与消息验证机制

**文件**: `src/stores/chat.js`

#### sendMessage 方法改进
```javascript
async sendMessage(chatId, { content, files }) {
  // 1. 创建临时消息（乐观更新）
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const optimisticMessage = {
    id: tempId,
    temp_id: tempId,
    status: 'sending',
    timeout: null  // 存储超时计时器ID
    // ... 其他字段
  };

  // 2. 立即显示在UI
  this.messages.unshift(optimisticMessage);

  // 3. 设置超时检测（10秒）
  const timeoutId = setTimeout(() => {
    this.handleMessageTimeout(tempId, chatId);
  }, 10000);

  // 4. 发送到服务器
  const response = await api.post(`/chat/${chatId}/messages`, { content, files });

  // 5. 存储映射关系，等待SSE验证
  this.pendingOptimisticMessages.set(tempId, {
    tempId,
    realId: realMessage.id,
    chatId,
    timeoutId
  });
}
```

#### 消息超时处理
```javascript
handleMessageTimeout(tempId, chatId) {
  // 将消息状态更新为失败
  const updateTimeoutState = (messageList) => {
    const index = messageList.findIndex(m => m.temp_id === tempId);
    if (index !== -1 && messageList[index].status !== 'confirmed') {
      messageList[index].status = 'failed';
      messageList[index].error = 'Message confirmation timeout';
    }
  };
  // 更新UI，显示重发按钮
}
```

#### SSE 广播验证
```javascript
verifyMessageBroadcast(broadcastMessage) {
  // 查找匹配的待验证消息
  for (const [tempId, pending] of this.pendingOptimisticMessages.entries()) {
    if (pending.realId === normalizedMessage.id) {
      // 清除超时计时器
      clearTimeout(pending.timeoutId);
      
      // 将临时消息替换为确认的消息
      const replaceWithConfirmed = (messageList) => {
        const index = messageList.findIndex(m => m.temp_id === tempId);
        if (index !== -1) {
          messageList[index] = {
            ...normalizedMessage,
            status: 'confirmed',
            temp_id: undefined
          };
        }
      };
      
      return true;
    }
  }
}
```

### 2. 消息重发机制

**文件**: `src/stores/chat.js`

```javascript
async retrySendMessage(failedMessage) {
  // 移除失败的消息
  const tempId = failedMessage.temp_id || failedMessage.id;
  this.messages = this.messages.filter(m => 
    (m.temp_id !== tempId && m.id !== tempId)
  );
  
  // 重新发送
  await this.sendMessage(chatId, { content, files });
}
```

### 3. 已读功能区分

**文件**: `src/services/sse.js`

```javascript
handleChatMessage(message) {
  // ... 处理消息
  
  // 只有DM消息才标记为已读（群聊不需要已读功能）
  if (chatStore.currentChatId === message.chat_id && 
      message.chat_type === 'Single') {
    this.markCurrentChatMessageRead(message.id, message.chat_id);
  }
}
```

## 消息状态流转

1. **sending** - 消息正在发送中（显示旋转图标）
2. **sent** - 已发送到服务器，等待SSE确认
3. **confirmed** - 通过SSE广播确认消息已入库（显示勾号）
4. **failed** - 发送失败或超时（显示重发按钮）

## 用户体验优化

1. **即时反馈**：消息立即显示，不等待服务器响应
2. **可靠性保证**：通过SSE广播验证消息是否真正入库
3. **失败处理**：超时或失败时显示明确的重发按钮
4. **功能区分**：群聊简化（无已读），DM完整（有已读）

## 测试场景

1. **正常发送**
   - 发送消息 → 立即显示 → SSE确认 → 显示勾号

2. **网络延迟**
   - 发送消息 → 立即显示 → 等待10秒 → 超时失败 → 显示重发

3. **服务器错误**
   - 发送消息 → 立即显示 → API失败 → 显示重发

4. **消息重发**
   - 点击重发 → 移除失败消息 → 重新执行发送流程

## 注意事项

1. 临时消息ID使用时间戳+随机数，避免重复
2. 超时时间设为10秒，可根据实际网络情况调整
3. SSE断线重连时，待验证消息可能需要特殊处理
4. 缓存更新需要同步，确保刷新页面后状态一致 