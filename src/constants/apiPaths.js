/**
 * API路径常量 - 修复重复前缀问题
 * 
 * 注意：baseURL已经包含 '/api'，所以这里的路径不需要 '/api' 前缀
 * 实际请求：baseURL + path = '/api' + '/workspace/chats' = '/api/workspace/chats'
 */

export const API_PATHS = {
  // 🔓 公开API
  HEALTH: '/health',
  HEALTH_READINESS: '/health/readiness', 
  SIGNIN: '/signin',

  // 🔐 认证API
  UNREAD_COUNTS: '/unread-counts',

  // 🏢 工作区API  
  WORKSPACE_CHATS: '/workspace/chats',
  USERS: '/users',
  USER_PROFILE: '/users/profile',

  // 💬 聊天API
  CHAT_DETAILS: (chatId) => `/chat/${chatId}`,
  CHAT_MESSAGES: (chatId) => `/chat/${chatId}/messages`,
  CHAT_MEMBERS: (chatId) => `/chat/${chatId}/members`,
  CHAT_UNREAD: (chatId) => `/chat/${chatId}/unread`,
  
  // 实时功能
  CHAT_TYPING_START: (chatId) => `/chat/${chatId}/typing/start`,
  CHAT_TYPING_STOP: (chatId) => `/chat/${chatId}/typing/stop`,
  CHAT_TYPING_USERS: (chatId) => `/chat/${chatId}/typing/users`,

  // 🔍 搜索API
  SEARCH_CHAT_MESSAGES: (chatId) => `/search/chat/${chatId}/messages`,
  SEARCH_GLOBAL_MESSAGES: '/search/messages',
  
  // 📁 文件API
  FILE_UPLOAD: '/files/single',
  FILE_DOWNLOAD: (fileId) => `/files/download/${fileId}`,
}

// 邀请功能 - 核心API（已验证可用）
export const INVITE_API = {
  // ✅ 邀请用户加入聊天 - 100%可用
  ADD_CHAT_MEMBERS: (chatId) => `/chat/${chatId}/members`,
}

export default API_PATHS;
