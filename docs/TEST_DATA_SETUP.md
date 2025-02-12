# 测试数据设置指南

## 概述
本指南说明如何使用后端 API 为 super@test.com 用户创建真实的测试数据，包括 workspace、channels 和消息。

## 前置条件
1. 后端服务运行在 `http://127.0.0.1:6688`
2. super@test.com 用户已存在，密码为 `password123`
3. Python3 或 curl 已安装

## 方法 1: 使用 Python 脚本（推荐）

### 安装依赖
```bash
pip3 install requests
```

### 运行脚本
```bash
python3 setup-test-data.py
```

### 脚本功能
1. 登录 super@test.com 账户
2. 获取用户信息
3. 检查现有 channels
4. 创建以下 channels（如果不存在）：
   - `general` (PublicChannel)
   - `product-dev` (PublicChannel)
   - `admin-announcements` (PrivateChannel)
5. 向每个 channel 发送测试消息
6. 验证最终状态

## 方法 2: 使用 Shell 脚本

### 赋予执行权限
```bash
chmod +x setup-test-data.sh
```

### 运行脚本
```bash
./setup-test-data.sh
```

## 方法 3: 使用 REST Client（VS Code 扩展）

1. 安装 VS Code 的 REST Client 扩展
2. 打开 `setup-test-data.http` 文件
3. 依次点击每个请求的 "Send Request" 按钮

## 验证数据

### 在浏览器控制台运行
```javascript
// 调试 channels 显示问题
window.debugChannels()
```

### 检查 API 响应
```bash
# 获取所有 chats
curl -H "Authorization: Bearer YOUR_TOKEN" http://127.0.0.1:6688/api/chats
```

## 常见问题

### 1. Channels 不显示
**原因**: chat_type 格式不匹配
**解决**: 确保 chat_type 是 `PublicChannel`，而不是 `publicchannel`

### 2. 401 Unauthorized
**原因**: Token 过期或无效
**解决**: 重新登录获取新 token

### 3. Channel 已存在错误
**原因**: Channel 名称重复
**解决**: 脚本会自动跳过已存在的 channels

## 数据结构

### 创建 Channel 请求
```json
{
  "name": "general",
  "chat_type": "PublicChannel",
  "description": "General discussion",
  "members": []
}
```

### 发送消息请求
```json
{
  "content": "Hello, world!"
}
```

## 清理数据

如需清理测试数据，可以通过 API 删除 channels：
```bash
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:6688/api/chat/{CHAT_ID}
```

## 注意事项

1. 确保后端正确实现了 chat_type 的处理
2. 前端已实现大小写兼容（见 `normalizeChatType` 方法）
3. 用户必须是 workspace 成员才能看到 channels
4. PublicChannel 应该对所有 workspace 成员可见 