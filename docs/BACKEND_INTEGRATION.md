# 后端数据集成说明

## 已完成的集成

### 1. Channels 和 DMs 加载
- **位置**: `src/stores/chat.js` - `fetchChats()`
- **使用组件**: 
  - `ChannelList.vue` - 显示所有聊天列表
  - `WelcomeContent.vue` - 显示频道统计和最近频道
- **API端点**: `GET /api/chats`
- **数据格式**: 支持多种响应格式（ApiResponse, 数组, {chats: [...]}）

### 2. 消息加载和发送
- **位置**: `src/stores/chat.js`
  - `fetchMessages()` - 加载消息历史
  - `fetchMoreMessages()` - 加载更多历史消息
  - `sendMessage()` - 发送新消息
- **使用组件**: `Chat.vue`, `MessageList.vue`
- **API端点**: 
  - `GET /api/chat/{chatId}/messages`
  - `POST /api/chat/{chatId}/messages`
- **特性**: 
  - 支持消息缓存（5分钟）
  - 高频发送优化（乐观更新）
  - 文件上传支持

### 3. 搜索功能
- **位置**: 
  - `src/services/api.js` - `SearchService`
  - `src/stores/chat.js` - 搜索方法
  - `src/components/search/CompactSearch.vue`
- **API端点**:
  - `GET /api/search/messages` - 基本搜索
  - `POST /api/search/advanced` - 高级搜索
  - `GET /api/search/suggestions` - 搜索建议
  - `GET /api/search/history` - 搜索历史
- **特性**:
  - 支持时间范围、消息类型、发送者过滤
  - 搜索结果高亮
  - 搜索历史保存
  - 分页加载更多

### 4. 成员管理
- **位置**: `src/stores/chat.js`
  - `fetchChatMembers()` - 获取聊天成员
  - `addChatMembers()` - 添加成员
  - `removeChatMembers()` - 移除成员
- **使用组件**: `MemberManagement.vue`
- **API端点**: 
  - `GET /api/chat/{chatId}/members`
  - `POST /api/chat/{chatId}/members`
  - `DELETE /api/chat/{chatId}/members`

### 5. 实时通信
- **位置**: `src/services/sse.js`
- **连接**: SSE (Server-Sent Events)
- **端点**: `http://127.0.0.1:6687/events`
- **功能**:
  - 实时消息接收
  - 在线状态更新
  - 打字状态指示

## API配置

### 服务器地址
- **API服务器** (无状态): `http://127.0.0.1:6688/api`
- **SSE服务器** (有状态): `http://127.0.0.1:6687`
- **文件服务器**: `http://127.0.0.1:6688/files`

### 认证
- 使用 Bearer Token 认证
- Token 存储位置（按优先级）:
  1. `localStorage.getItem('auth_token')`
  2. `sessionStorage.getItem('auth_token')`
  3. `localStorage.getItem('token')`
  4. `sessionStorage.getItem('token')`

## 数据流程

1. **登录** → 获取 token → 存储到 localStorage/sessionStorage
2. **加载聊天列表** → `chatStore.fetchChats()` → 显示在 ChannelList
3. **选择聊天** → `chatStore.fetchMessages()` → 显示在 MessageList
4. **发送消息** → `chatStore.sendMessage()` → 乐观更新 UI → 后台发送
5. **搜索** → `SearchService.search()` → 显示结果 → 点击跳转

## 性能优化

1. **消息缓存**: 5分钟内重复访问同一聊天使用缓存
2. **高频发送检测**: 30秒内发送3条消息触发乐观更新策略
3. **智能预加载**: 鼠标悬停时预加载聊天数据
4. **防抖路由切换**: 50ms防抖避免快速切换时的重复加载

## 注意事项

1. 所有 API 调用都包含错误处理和重试机制
2. 401 错误会自动清除认证状态并跳转到登录页
3. 搜索结果支持多种数据格式兼容
4. 文件上传支持进度回调 