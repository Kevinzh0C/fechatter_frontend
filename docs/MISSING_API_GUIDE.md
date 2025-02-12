# 缺失API实现指南

## 🚨 需要在后端实现的API

### 工作空间邀请API
- **路径**: `/api/workspace/invite`
- **方法**: `POST`
- **描述**: 邀请用户到工作空间

**实现代码**:
```rust
// 在后端添加邀请路由 (lib.rs中auth_routes部分)
.route("/workspace/invite", post(invite_user_to_workspace_handler))

// 创建对应的handler
pub async fn invite_user_to_workspace_handler(
    State(state): State<AppState>,
    Extension(user): Extension<UserClaims>,
    Json(payload): Json<InviteUserPayload>
) -> Result<Json<ApiResponse>, AppError> {
    // 实现邀请逻辑
}

```

### 移除工作空间用户API
- **路径**: `/api/workspace/users/{userId}`
- **方法**: `DELETE`
- **描述**: 从工作空间移除用户

**实现代码**:
```rust
// 在后端添加移除用户路由
.route("/workspace/users/{user_id}", delete(remove_user_from_workspace_handler))

// 创建对应的handler
pub async fn remove_user_from_workspace_handler(
    State(state): State<AppState>,
    Extension(user): Extension<UserClaims>,
    Path(user_id): Path<i64>
) -> Result<Json<ApiResponse>, AppError> {
    // 实现移除用户逻辑
}

```



## 📋 实现步骤

1. **更新路由定义** (fechatter_server/src/lib.rs)
   - 在适当的路由组中添加新的路由定义
   - 确保middleware配置正确

2. **创建Handler函数**
   - 在 fechatter_server/src/handlers/ 下创建对应的handler
   - 实现业务逻辑和数据验证

3. **添加数据结构**
   - 在需要的地方定义请求/响应的数据结构
   - 使用serde进行序列化

4. **测试API**
   - 编写单元测试
   - 进行集成测试
   - 验证前后端整合

## 🔄 API契约维护

### 自动化检查
```bash
# 运行契约检查
node api-contract-checker.js

# 自动修复已知问题
node api-contract-fixer.js
```

### Git Hooks建议
```bash
# pre-commit hook
#!/bin/sh
node api-contract-checker.js
if [ $? -ne 0 ]; then
  echo "❌ API契约检查失败，请修复不匹配问题后再提交"
  exit 1
fi
```

---
*生成时间: 2025-06-06T07:39:24.760Z*
