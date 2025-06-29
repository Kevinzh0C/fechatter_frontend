# SSE Token 诊断测试

## 🔍 完整诊断流程

### 1. 在浏览器控制台运行以下诊断命令

```javascript
// 🔧 SSE Token 诊断函数 - 修正版
async function diagnoseSSEToken() {
  console.log('🔍 开始SSE Token诊断...');
  
  // 1. 检查localStorage中的token
  const localToken = localStorage.getItem('auth_token');
  console.log('📱 localStorage token:', localToken ? `${localToken.substring(0, 20)}...` : 'null');
  
  // 2. 检查tokenSynchronizer
  let syncToken = null;
  try {
    const tokenSync = window.tokenSynchronizer || (await import('/src/services/tokenSynchronizer.js')).default;
    syncToken = await tokenSync.getToken();
    console.log('🔄 tokenSynchronizer token:', syncToken ? `${syncToken.substring(0, 20)}...` : 'null');
  } catch (error) {
    console.error('❌ tokenSynchronizer error:', error);
  }
  
  // 3. 检查auth store
  let authToken = null;
  try {
    const authStore = window.authStore || (await import('/src/stores/auth.js')).useAuthStore();
    authToken = authStore.token;
    console.log('🔐 auth store token:', authToken ? `${authToken.substring(0, 20)}...` : 'null');
    console.log('🔐 auth store isAuthenticated:', authStore.isAuthenticated);
  } catch (error) {
    console.error('❌ auth store error:', error);
  }
  
  // 4. 选择最优token
  const bestToken = localToken || syncToken || authToken;
  console.log('✅ 选择的token:', bestToken ? `${bestToken.substring(0, 20)}...` : 'null');
  
  if (!bestToken) {
    console.error('❌ 没有找到任何token!');
    return null;
  }
  
  // 5. 测试token格式
  try {
    const parts = bestToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      console.log('🎯 Token payload:', {
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
        aud: payload.aud,
        iss: payload.iss,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        isExpired: payload.exp <= now,
        expiresIn: payload.exp - now
      });
    } else {
      console.error('❌ Token格式无效，不是JWT');
    }
  } catch (error) {
    console.error('❌ Token解析失败:', error);
  }
  
  // 6. 测试API认证 - 🔧 FIX: 使用正确的端点
  console.log('🔗 测试API认证...');
  try {
    const apiResponse = await fetch('/api/workspace/chats', {
      headers: {
        'Authorization': `Bearer ${bestToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('📡 API认证测试:', apiResponse.status, apiResponse.statusText);
    
    if (apiResponse.ok) {
      console.log('✅ API认证成功！');
    } else {
      const errorText = await apiResponse.text();
      console.error('❌ API认证错误详情:', errorText);
    }
  } catch (error) {
    console.error('❌ API认证测试失败:', error);
  }
  
  // 7. 测试SSE认证
  console.log('📡 测试SSE认证...');
  try {
    const sseUrl = `/events?access_token=${encodeURIComponent(bestToken)}`;
    console.log('🔗 SSE URL (masked):', sseUrl.replace(/access_token=[^&]+/, 'access_token=***'));
    
    const sseResponse = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📡 SSE认证测试:', sseResponse.status, sseResponse.statusText);
    
    if (!sseResponse.ok) {
      const errorText = await sseResponse.text();
      console.error('❌ SSE认证错误详情:', errorText);
    } else {
      console.log('✅ SSE认证成功！');
    }
  } catch (error) {
    console.error('❌ SSE认证测试失败:', error);
  }
  
  return bestToken;
}

// 运行诊断
diagnoseSSEToken();
```

### 2. 🔧 快速修复当前错误的诊断脚本

```javascript
// 🚀 快速修复 - 在浏览器控制台运行
async function quickFix() {
  console.log('🔧 快速修复诊断...');
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.log('❌ 没有token，需要重新登录');
    return;
  }
  
  console.log('✅ Token存在:', token.substring(0, 20) + '...');
  
  // 测试正确的API端点
  try {
    const response = await fetch('/api/workspace/chats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 API测试结果:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎉 API工作正常！聊天数据:', data.data ? data.data.length : 'unknown', '个');
    }
  } catch (error) {
    console.error('❌ API测试失败:', error);
  }
  
  // 测试SSE
  try {
    const sseResponse = await fetch(`/events?access_token=${encodeURIComponent(token)}`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📡 SSE测试结果:', sseResponse.status, sseResponse.statusText);
    
    if (sseResponse.ok) {
      console.log('🎉 SSE工作正常！');
    } else {
      const errorText = await sseResponse.text();
      console.log('❌ SSE错误:', errorText);
    }
  } catch (error) {
    console.error('❌ SSE测试失败:', error);
  }
}

// 运行快速修复
quickFix();
```

### 3. 🔍 System Health Check 诊断

```javascript
// 🏥 检查系统健康状态
function checkSystemHealth() {
  console.log('🏥 系统健康检查...');
  
  const health = {
    authStore: !!window.authStore,
    sseService: !!window.sseService,
    unifiedMessageService: !!window.unifiedMessageService,
    tokenSynchronizer: !!window.tokenSynchronizer,
    currentPath: window.location.pathname,
    isAuthenticated: window.authStore?.isAuthenticated
  };
  
  console.log('📊 系统状态:', health);
  
  // 检查当前页面需要的服务
  const currentPath = window.location.pathname;
  const isOnChatPage = currentPath.includes('/chat') || currentPath === '/home' || currentPath === '/';
  
  console.log('📍 页面上下文:', {
    currentPath,
    isOnChatPage,
    需要的服务: isOnChatPage ? ['authStore', 'sseService', 'messageService'] : ['authStore']
  });
  
  // 建议修复
  const missing = [];
  if (!health.authStore) missing.push('authStore');
  if (isOnChatPage && !health.sseService) missing.push('sseService');
  if (isOnChatPage && !health.unifiedMessageService) missing.push('messageService');
  
  if (missing.length > 0) {
    console.warn('⚠️ 缺失的服务:', missing);
    console.log('💡 建议:', '刷新页面或重新登录');
  } else {
    console.log('✅ 所有必需服务都正常');
  }
  
  return health;
}

// 运行健康检查
checkSystemHealth();
```

---

## 🎯 现在的状态总结

1. ✅ **SSE初始化函数错误已修复**
2. ✅ **SSE连接大部分时候成功**（看到200 OK响应）
3. ✅ **Token同步机制正常工作**
4. 🔧 **API端点问题已识别**：需要使用`/api/workspace/chats`而不是`/api/chats`
5. 🔍 **System Health Check**：需要检查具体哪些服务缺失

**请在浏览器控制台运行上面的 `quickFix()` 函数，它会使用正确的API端点进行测试！** 