# Fechatter API 契约文档

## 📊 API 对应关系概览

- **匹配的API数量**: 18
- **前端缺失后端支持**: 2
- **后端未被前端使用**: 4
- **对应率**: 75.0%

## 🔄 完整API映射表

### 认证相关 API
| 前端路径 | 后端路径 | 方法 | 状态 | 参数 |
|---------|---------|------|------|------|
| /signin | /signin | POST | ✅ | email, password |
| /signup | /signup | POST | ✅ | fullname, email, password, workspace |
| /logout | /logout | POST | ✅ | - |
| /logout_all | /logout_all | POST | ✅ | - |
| /refresh | /refresh | POST | ✅ | - |

### 聊天相关 API
| 前端路径 | 后端路径 | 方法 | 状态 | 参数 |
|---------|---------|------|------|------|
| /chat | /chat | GET | ✅ | - |
| /chat | /chat | POST | ✅ | name, chat_type, is_public, workspace_id |
| /chat/{id} | /chat/{id} | DELETE | ✅ | id |
| /chat/{id}/messages | /chat/{id}/messages | GET | ✅ | id, limit, offset |
| /chat/{id}/messages | /chat/{id}/messages | POST | ✅ | id, content, message_type |
| /chat/{id}/members | /chat/{id}/members | GET | ✅ | id |
| /chat/{id}/members | /chat/{id}/members | POST | ✅ | id, member_ids |
| /chat/{id}/members | /chat/{id}/members | DELETE | ✅ | id, member_ids |
| /chat/{id}/messages/search | /chat/{id}/messages/search | POST | ⚠️ | 路径不匹配 |

### 文件相关 API
| 前端路径 | 后端路径 | 方法 | 状态 | 参数 |
|---------|---------|------|------|------|
| /upload | /upload | POST | ✅ | file |
| /fix-files/{ws_id} | /fix-files/{ws_id} | POST | ✅ | ws_id |

### 工作空间相关 API
| 前端路径 | 后端路径 | 方法 | 状态 | 参数 |
|---------|---------|------|------|------|
| /workspaces | /workspaces | GET | ⚠️ | 路径不匹配 |
| /users | /users | GET | ✅ | - |
| /workspace/invite | - | POST | ❌ | 后端缺失 |
| /workspace/users/{userId} | - | DELETE | ❌ | 后端缺失 |

## 🚨 需要修复的问题

### 1. 前端调用但后端缺失
- POST /workspace/invite (stores/workspace.js)
- DELETE /workspace/users/{userId} (stores/workspace.js)

### 2. 路径不匹配问题
- **搜索API**: 前端 `/chat/{id}/search` vs 后端 `/chat/{id}/messages/search`
- **文件API**: 前端 `/files/{path}` vs 后端 `/files/{ws_id}/{*path}`
- **工作空间API**: 前端 `/workspaces` vs 后端 `/workspaces`

### 3. 后端已实现但前端未使用
- GET /files/{ws_id}/{*path}
- POST /user/switch-workspace
- PATCH /chat/{id}
- PATCH /chat/{id}/members/{member_id}

## 🛠️ 推荐修复方案

### 立即修复 (高优先级)
1. 统一搜索API路径
2. 修复工作空间API路径不匹配
3. 实现缺失的工作空间管理API

### 长期优化 (中优先级)
1. 建立API schema验证
2. 实现自动化契约测试
3. 添加API版本控制

---

*生成时间: 2025-06-06T07:35:28.084Z*
