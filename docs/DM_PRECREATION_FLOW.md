# DM 预创建机制文档

## 概述

DM（Direct Message）预创建机制允许用户在实际发送消息之前预览和准备私聊界面。这提供了更流畅的用户体验，避免了创建聊天时的延迟。

## 工作流程

### 1. 从群聊打开个人资料
- 用户在群聊中点击其他用户的名字或头像
- 弹出 `UserProfile` 组件显示用户详细信息

### 2. 点击"Send Message"按钮
- 用户点击个人资料中的"Send Message"按钮
- 系统执行 `startDirectMessage` 方法

### 3. 检查现有DM
```javascript
// UserProfile.vue
const existingDM = await chatStore.findExistingDM(props.user.id)
```
- 如果已存在真实的DM，直接跳转到该聊天
- 如果不存在，创建临时DM

### 4. 创建临时DM
```javascript
// chat.js store
createTemporaryDM(user) {
  const tempId = `preview-dm-${user.id}`;
  const tempChat = {
    id: tempId,
    is_preview: true,
    chat_type: 'Single',
    name: user.fullname,
    display_name: user.fullname,
    chat_members: [...],
    messages: [],
    created_at: new Date().toISOString(),
  };
  this.chats.unshift(tempChat);
  return tempChat;
}
```

### 5. 在Channel List中显示
- 临时DM会立即出现在DM列表中
- 显示"Start a conversation"提示而非"No messages yet"
- 预创建的DM始终排在列表顶部

### 6. 发送第一条消息
当用户在临时DM中发送第一条消息时：
1. 创建真实的聊天记录
2. 发送消息到新创建的聊天
3. 替换临时路由为真实路由
4. 删除临时DM记录

## DM "Close" (Remove from List) Mechanism

This document outlines the functionality for temporarily removing a Direct Message (DM) from the channel list.

### Workflow

1.  **Hover and Close**:
    *   When a user hovers over a DM in the channel list, a "Close" (×) button appears.

2.  **Clicking Close**:
    *   The user clicks the "Close" button.
    *   The `closeDM(chatId)` action in the `chatStore` is called.
    *   This action removes the specified chat from the local `chats` array in the store.
    *   The DM immediately disappears from the channel list.
    *   **Important**: This is a local, client-side operation only. No chat history or server-side data is deleted.

3.  **Reappearing DMs**: A closed DM will reappear in the channel list under two conditions:
    *   **Receiving a New Message**: If the other user sends a message in that DM, the real-time service (`addRealtimeMessage`) will detect that the chat is not in the local list, fetch its details from the server, and add it back to the top of the list with an unread indicator.
    *   **Re-initiating the DM**: If the user opens the profile of the same person again and clicks "Send Message", the system will find the existing chat on the server and add it back to the local list before navigating to it. A full application refresh (F5) will also restore all DMs by re-fetching the complete chat list from the server.

### Technical Implementation

*   **`chat.js` Store**:
    *   A `closeDM(chatId)` action handles the removal of the chat from the `state.chats` array.
    *   The `addRealtimeMessage(message)` action now includes logic to fetch and re-add a chat if a message for a closed DM arrives.
    *   The previous "hiding" logic (`hiddenDMs`, `visibleChats`, etc.) has been completely removed.

*   **`ChannelList.vue` Component**:
    *   The UI for "hidden conversations" has been removed.
    - The computed properties now directly use `chatStore.chats`.
    *   The close button's click handler is bound to the `closeDM` action.

### User Experience Benefits

*   **Simplicity**: The interaction is a straightforward "close" action, which is more intuitive than "hide".
*   **Cleanliness**: Users can easily clear their DM list of inactive conversations for the current session.
*   **No Data Loss**: Users can be confident that closing a DM will not delete their message history.
*   **Smart Restoration**: Conversations automatically reappear when they become active again, preventing missed messages.

## 技术实现细节

### Store状态管理
```