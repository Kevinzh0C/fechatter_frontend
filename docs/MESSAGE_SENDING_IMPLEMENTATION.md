# Fechatter 消息发送功能实现文档

## 概述

本文档描述了Fechatter前端应用中完整的消息发送功能实现，包括群聊消息发送、私聊消息发送以及channel list的实时更新机制。

## 功能实现

### 1. 群聊消息发送

#### 发送流程
1. 用户在`MessageInput`组件中输入消息
2. 调用`chat.js` store的`sendMessage`方法
3. 创建乐观更新消息（optimistic update）
4. 发送API请求到后端
5. 更新消息状态和UI
6. 更新聊天的`last_message`

#### 代码路径
- `src/components/chat/MessageInput.vue` - 消息输入组件
- `src/stores/chat.js` - `sendMessage`方法
- `src/views/Chat.vue` - `handleSendMessage`处理函数

### 2. 私聊（DM）消息发送

#### 特殊处理
- **临时DM处理**：当用户点击其他用户资料的"Send Message"时，创建临时DM（`preview-dm-{userId}`）
- **首次消息转换**：发送第一条消息时，自动创建真实的DM并替换路由
- **DM重新显示**：已关闭的DM在发送新消息后自动重新出现在列表中

#### 代码实现
```javascript
// src/stores/chat.js - sendMessage方法中的DM处理
if (chat && chat.chat_type === 'Single') {
  const isInList = this.chats.some(c => c.id === chatId);
  if (!isInList) {
    // Re-fetch the chat to ensure we have the latest data
    const response = await api.get(`/chat/${chatId}`);
    const chatData = response.data?.data || response.data;
    if (chatData) {
      const normalizedChat = this._normalizeChat(chatData);
      normalizedChat.last_message = realMessage;
      this.chats.unshift(normalizedChat);
    }
  }
}
```

### 3. Channel List 实时更新

#### 更新机制
1. **发送消息后更新**：
   - 更新聊天的`last_message`
   - 更新`updated_at`时间戳
   - DM自动移到列表顶部

2. **SSE实时更新**：
   - 监听`NewMessage`事件
   - 更新对应聊天的最后消息
   - 更新未读计数（非当前聊天）

#### SSE集成
```javascript
// src/composables/useHomeLayout.js
realtimeCommunicationService.on('new_message', (message) => {
  // 更新聊天的最后消息
  const chat = chatStore.chats.find(c => c.id === message.chat_id);
  if (chat) {
    chat.last_message = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      sender_id: message.sender_id
    };
    chat.updated_at = message.created_at;

    // 如果是DM，移到列表顶部
    if (chat.chat_type === 'Single') {
      const chatIndex = chatStore.chats.findIndex(c => c.id === message.chat_id);
      if (chatIndex > 0) {
        chatStore.chats.splice(chatIndex, 1);
        chatStore.chats.unshift(chat);
      }
    }
  }
});
```

### 4. DM关闭和重新打开

#### 关闭DM
```javascript
// src/stores/chat.js
closeDM(chatId) {
  const chatIndex = this.chats.findIndex(c => c.id === chatId);
  if (chatIndex > -1) {
    const chat = this.chats[chatIndex];
    if (chat.chat_type === 'Single') {
      this.chats.splice(chatIndex, 1);
      // 如果是当前聊天，导航到首页
      if (this.currentChatId === chatId) {
        this.currentChatId = null;
        this.messages = [];
        if (typeof window !== 'undefined' && window.$router) {
          window.$router.push('/home');
        }
      }
    }
  }
}
```

#### 重新打开DM
- 用户发送新消息到已关闭的DM
- 收到来自该DM的新消息
- 两种情况都会自动将DM重新添加到列表

## API对接

### 发送消息API
```
POST /api/chat/{chatId}/messages
```

请求体：
```json
{
  "content": "消息内容",
  "files": []  // 可选的文件附件
}
```

### SSE事件订阅
```
GET /sse-proxy/events?access_token={token}
```

监听事件：
- `NewMessage` - 新消息
- `TypingStatus` - 打字状态
- `MessageRead` - 消息已读
- `UserPresence` - 用户在线状态

## 性能优化

1. **乐观更新**：消息立即显示在UI中，无需等待服务器响应
2. **消息缓存**：使用sessionStorage缓存消息历史
3. **防抖处理**：快速切换聊天时的加载优化
4. **智能排序**：DM按最新消息时间排序，临时DM置顶

## 测试

使用`test-message-send.html`进行功能测试：
1. 登录账号
2. 连接SSE
3. 选择聊天/DM
4. 发送消息
5. 验证channel list更新
6. 测试DM关闭和重新打开

## 注意事项

1. 确保SSE服务正常运行（notify_server）
2. Vite开发服务器需要配置SSE代理
3. 全局`window.$router`需要在`main.js`中设置
4. 消息发送失败时提供重试机制 