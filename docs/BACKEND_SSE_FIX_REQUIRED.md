# 后端SSE配置修复需求

## 问题描述

前端已正确登录并获得有效token，但SSE连接失败：

1. **CORS错误**

   ```
   Access to fetch at 'https://ca90-45-77-178-85.ngrok-free.app/events?access_token=...' 
   from origin 'http://localhost:5173' has been blocked by CORS policy
   ```
2. **MIME Type错误**

   ```
   EventSource's response has a MIME type ("text/html") that is not "text/event-stream"
   ```

## 后端需要修复

### 1. SSE端点CORS配置

```rust
// 在SSE handler中添加：
.header("Access-Control-Allow-Origin", "*")
.header("Access-Control-Allow-Credentials", "true")
.header("Access-Control-Allow-Methods", "GET, OPTIONS")
.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

### 2. 确保返回正确的Content-Type

```rust
.header("Content-Type", "text/event-stream")
.header("Cache-Control", "no-cache")
.header("Connection", "keep-alive")
```

### 3. 处理OPTIONS预检请求

```rust
if method == Method::OPTIONS {
    return Response::builder()
        .status(200)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .body(Body::empty())
}
```

### 4. 401错误应返回text/event-stream格式

```rust
// 不要返回HTML错误页面，而是：
if !authenticated {
    return Response::builder()
        .status(401)
        .header("Content-Type", "text/event-stream")
        .body("event: error\ndata: {\"error\": \"Unauthorized\"}\n\n")
}
```

## 前端已经正确处理

- ✅ Token获取和存储
- ✅ SSE连接URL构建
- ✅ 错误处理和重试逻辑

## 测试步骤

1. 修复后端CORS配置
2. 重启后端服务
3. 前端会自动工作，无需修改
