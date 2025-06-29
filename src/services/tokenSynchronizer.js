/**
 * Token Synchronizer Service
 * 
 * 集中管理和同步所有token存储位置，解决token同步问题
 * 提供单一可靠的token获取和更新接口
 */

import { authEventBus, AuthEvents } from './auth-events';

class TokenSynchronizer {
  constructor() {
    this.storageLocations = {
      memory: {
        token: null,
        user: null,
        lastUpdated: null
      },
      initialized: false
    };
    
    // 并发控制
    this.initializationPromise = null;
    this.syncPromise = null;
    
    // 防重复操作
    this.isClearing = false;
    this.lastClearTime = 0;
    this.clearCooldown = 1000; // 1秒冷却时间
    
    // 递归检测
    this.syncDepth = 0;
    this.maxSyncDepth = 3;
    
    // 存储位置优先级
    this.priority = [
      'memory',      // 内存（最快）
      'tokenManager', // TokenManager服务
      'authStore',   // Auth Store (Pinia)
      'authStateManager', // AuthStateManager
      'localStorage', // localStorage（持久化）
      'sessionStorage' // sessionStorage（会话级）
    ];
    
    // 监听存储变化
    this.setupStorageListeners();
  }
  
  /**
   * 初始化同步器（带并发控制）
   */
  async initialize() {
    if (this.storageLocations.initialized) return;
    
    // 如果已经有初始化进程在运行，等待它完成
    if (this.initializationPromise) {
      console.log('🔄 [TokenSynchronizer] 等待现有初始化进程完成');
      return await this.initializationPromise;
    }
    
    // 创建新的初始化promise
    this.initializationPromise = this._doInitialize();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
  
  /**
   * 实际的初始化逻辑
   */
  async _doInitialize() {
    try {
      console.log('🚀 [TokenSynchronizer] 开始初始化');

      // 🔧 CRITICAL FIX: Initialization should only READ, not WRITE.
      // Calling synchronizeAll() here creates a race condition with the login flow.
      // The login flow is responsible for writing the new token, and initialization
      // should simply load the state into memory.
      const { token, user } = await this.gatherFromAllSources();

      this.storageLocations.memory = {
        token,
        user,
        lastUpdated: Date.now()
      };

      this.storageLocations.initialized = true;
      console.log('✅ [TokenSynchronizer] 初始化完成，状态已读入内存');
    } catch (error) {
      console.error('❌ [TokenSynchronizer] 初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 从所有存储位置收集token和用户信息
   */
  async gatherFromAllSources() {
    let token = null;
    let user = null;
    
    // 1. 尝试从TokenManager获取
    try {
      const { default: tokenManager } = await import('./tokenManager');
      const managerToken = tokenManager.getAccessToken();
      if (managerToken && typeof managerToken === 'string' && managerToken.length > 10) {
        token = managerToken;
        console.log('🔍 [TokenSynchronizer] 从TokenManager获取token');
      }
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] 从TokenManager获取token失败:', error);
    }
    
    // 2. 尝试从AuthStateManager获取
    if (!token || !user) {
      try {
        const { default: authStateManager } = await import('../utils/authStateManager');
        const authState = authStateManager.getAuthState();
        if (authState) {
          if (!token && authState.token && authState.token.length > 10) {
            token = authState.token;
            console.log('🔍 [TokenSynchronizer] 从AuthStateManager获取token');
          }
          
          if (!user && authState.user) {
            user = authState.user;
            console.log('🔍 [TokenSynchronizer] 从AuthStateManager获取用户信息');
          }
        }
      } catch (error) {
        console.warn('⚠️ [TokenSynchronizer] 从AuthStateManager获取失败:', error);
      }
    }
    
    // 3. 尝试从localStorage获取
    if (!token) {
      const localToken = localStorage.getItem('auth_token') || 
                         localStorage.getItem('access_token') || 
                         localStorage.getItem('token');
      if (localToken && localToken.length > 10) {
        token = localToken;
        console.log('🔍 [TokenSynchronizer] 从localStorage获取token');
      }
    }
    
    if (!user) {
      try {
        const userStr = localStorage.getItem('auth_user');
        if (userStr) {
          user = JSON.parse(userStr);
          console.log('🔍 [TokenSynchronizer] 从localStorage获取用户信息');
        }
      } catch (error) {
        console.warn('⚠️ [TokenSynchronizer] 解析localStorage用户信息失败');
      }
    }
    
    // 4. 尝试从sessionStorage获取
    if (!token) {
      const sessionToken = sessionStorage.getItem('auth_token') || 
                           sessionStorage.getItem('access_token');
      if (sessionToken && sessionToken.length > 10) {
        token = sessionToken;
        console.log('🔍 [TokenSynchronizer] 从sessionStorage获取token');
      }
    }
    
    return { token, user };
  }
  
  /**
   * 同步token到所有存储位置（带并发控制）
   */
  async synchronizeAll(token, user = null) {
    // 递归检测
    if (this.syncDepth >= this.maxSyncDepth) {
      console.warn('⚠️ [TokenSynchronizer] 达到最大递归深度，跳过同步操作');
      return;
    }
    
    // 如果已经有同步进程在运行，等待它完成
    if (this.syncPromise) {
      console.log('🔄 [TokenSynchronizer] 等待现有同步进程完成');
      await this.syncPromise;
    }
    
    // 创建新的同步promise
    this.syncPromise = this._doSynchronize(token, user);
    
    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }
  
  /**
   * 实际的同步逻辑
   */
  async _doSynchronize(token, user = null) {
    // 增加递归深度
    this.syncDepth++;
    
    try {
      console.log(`🔄 [TokenSynchronizer] 开始同步token到所有存储位置 (深度: ${this.syncDepth})`);
      
      // 更新内存中的值
      this.storageLocations.memory = {
        token,
        user,
        lastUpdated: Date.now()
      };
      
      // 并行同步到所有存储位置
      const syncOperations = [];
    
    // 同步到TokenManager
    syncOperations.push(
      (async () => {
        try {
          const { default: tokenManager } = await import('./tokenManager');
          await tokenManager.setTokens({
            accessToken: token,
            refreshToken: token, // 简化实现，使用相同token
            expiresAt: Date.now() + (3600 * 1000), // 默认1小时
            issuedAt: Date.now()
          });
          console.log('✅ [TokenSynchronizer] 已同步到TokenManager');
        } catch (error) {
          console.warn('⚠️ [TokenSynchronizer] 同步到TokenManager失败:', error);
        }
      })()
    );
    
    // 同步到AuthStateManager
    syncOperations.push(
      (async () => {
        try {
          const { default: authStateManager } = await import('../utils/authStateManager');
          authStateManager.setAuthState(token, user);
          console.log('✅ [TokenSynchronizer] 已同步到AuthStateManager');
        } catch (error) {
          console.warn('⚠️ [TokenSynchronizer] 同步到AuthStateManager失败:', error);
        }
      })()
    );
    
    // 同步到localStorage
    syncOperations.push(
      (async () => {
        try {
          localStorage.setItem('auth_token', token);
          if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
          console.log('✅ [TokenSynchronizer] 已同步到localStorage');
        } catch (error) {
          console.warn('⚠️ [TokenSynchronizer] 同步到localStorage失败:', error);
        }
      })()
    );
    
    // 同步到sessionStorage
    syncOperations.push(
      (async () => {
        try {
          sessionStorage.setItem('auth_token', token);
          console.log('✅ [TokenSynchronizer] 已同步到sessionStorage');
        } catch (error) {
          console.warn('⚠️ [TokenSynchronizer] 同步到sessionStorage失败:', error);
        }
      })()
    );
    
    // 等待所有同步操作完成
    await Promise.all(syncOperations);
    
      // 触发事件通知
      try {
        authEventBus.emit(AuthEvents.TOKEN_UPDATED, { token, user });
        console.log('📢 [TokenSynchronizer] 已发送token更新事件');
      } catch (error) {
        console.warn('⚠️ [TokenSynchronizer] 发送事件通知失败:', error);
      }
    } finally {
      // 减少递归深度
      this.syncDepth--;
    }
  }
  
  /**
   * 获取token（多源获取策略）
   */
  async getToken() {
    // 首先检查内存中是否有token
    if (this.storageLocations.memory.token) {
      return this.storageLocations.memory.token;
    }
    
    // 如果没有初始化，先初始化
    if (!this.storageLocations.initialized) {
      await this.initialize();
      if (this.storageLocations.memory.token) {
        return this.storageLocations.memory.token;
      }
    }
    
    // 再次从所有源获取
    const { token } = await this.gatherFromAllSources();
    
    // 如果找到token，更新内存并同步
    if (token) {
      this.storageLocations.memory.token = token;
      this.storageLocations.memory.lastUpdated = Date.now();
      
      // 异步同步到其他存储位置
      setTimeout(() => {
        this.synchronizeAll(token, this.storageLocations.memory.user).catch(error => {
          console.warn('⚠️ [TokenSynchronizer] 后台同步失败:', error);
        });
      }, 0);
    }
    
    return token;
  }
  
  /**
   * 获取用户信息
   */
  async getUser() {
    // 首先检查内存中是否有用户信息
    if (this.storageLocations.memory.user) {
      return this.storageLocations.memory.user;
    }
    
    // 如果没有初始化，先初始化
    if (!this.storageLocations.initialized) {
      await this.initialize();
      if (this.storageLocations.memory.user) {
        return this.storageLocations.memory.user;
      }
    }
    
    // 再次从所有源获取
    const { user } = await this.gatherFromAllSources();
    
    // 如果找到用户信息，更新内存
    if (user) {
      this.storageLocations.memory.user = user;
      this.storageLocations.memory.lastUpdated = Date.now();
    }
    
    return user;
  }
  
  /**
   * 设置token和用户信息
   */
  async setTokenAndUser(token, user) {
    if (!token) {
      console.warn('⚠️ [TokenSynchronizer] 尝试设置空token');
      return false;
    }
    
    await this.synchronizeAll(token, user);
    return true;
  }
  
  /**
   * 清除所有存储位置的token
   */
  async clearAll(skipEvent = false) {
    // 防止重复清除操作
    const now = Date.now();
    if (this.isClearing || (now - this.lastClearTime) < this.clearCooldown) {
      console.log('🔄 [TokenSynchronizer] 防重复：跳过清除操作');
      return;
    }
    
    this.isClearing = true;
    this.lastClearTime = now;
    
    try {
      console.log('🧹 [TokenSynchronizer] 清除所有token存储');
      
      // 清除内存
      this.storageLocations.memory = {
        token: null,
        user: null,
        lastUpdated: Date.now()
      };
    
    // 清除TokenManager
    try {
      const { default: tokenManager } = await import('./tokenManager');
      await tokenManager.clearTokens();
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] 清除TokenManager失败:', error);
    }
    
    // 清除AuthStateManager
    try {
      const { default: authStateManager } = await import('../utils/authStateManager');
      authStateManager.clearAuthState();
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] 清除AuthStateManager失败:', error);
    }
    
    // 清除localStorage
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] 清除localStorage失败:', error);
    }
    
    // 清除sessionStorage
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('access_token');
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] 清除sessionStorage失败:', error);
    }
    
      // 只有在不跳过事件时才触发事件通知
      if (!skipEvent) {
        try {
          authEventBus.emit(AuthEvents.LOGGED_OUT);
          console.log('📢 [TokenSynchronizer] 已发送登出事件');
        } catch (error) {
          console.warn('⚠️ [TokenSynchronizer] 发送事件通知失败:', error);
        }
      }
    } finally {
      this.isClearing = false;
    }
  }
  
  /**
   * 设置存储变化监听器
   */
  setupStorageListeners() {
    // 监听localStorage变化
    window.addEventListener('storage', async (event) => {
      if (event.key === 'auth_token' || event.key === 'access_token') {
        console.log('🔔 [TokenSynchronizer] 检测到localStorage token变化');
        
        // 如果token被删除，可能是登出操作
        if (!event.newValue && this.storageLocations.memory.token) {
          console.log('🚪 [TokenSynchronizer] 检测到token被删除，可能是登出操作');
          await this.clearAll();
          return;
        }
        
        // 如果有新token且与内存中不同，同步到所有位置
        if (event.newValue && event.newValue !== this.storageLocations.memory.token) {
          console.log('🔄 [TokenSynchronizer] 检测到新token，同步到所有位置');
          await this.synchronizeAll(event.newValue, this.storageLocations.memory.user);
        }
      }
      
      // 监听用户信息变化
      if (event.key === 'auth_user') {
        console.log('🔔 [TokenSynchronizer] 检测到localStorage用户信息变化');
        
        // 如果用户信息被删除，可能是登出操作
        if (!event.newValue && this.storageLocations.memory.user) {
          console.log('🚪 [TokenSynchronizer] 检测到用户信息被删除');
          return;
        }
        
        // 如果有新用户信息，更新内存
        if (event.newValue) {
          try {
            const user = JSON.parse(event.newValue);
            this.storageLocations.memory.user = user;
            console.log('✅ [TokenSynchronizer] 已更新内存中的用户信息');
          } catch (error) {
            console.warn('⚠️ [TokenSynchronizer] 解析用户信息失败:', error);
          }
        }
      }
    });
    
    // 监听auth事件
    authEventBus.on(AuthEvents.LOGGED_IN, async (data) => {
      console.log('🔔 [TokenSynchronizer] 收到登录事件');
      if (data && data.token) {
        await this.synchronizeAll(data.token, data.user);
      }
    });
    
    authEventBus.on(AuthEvents.LOGGED_OUT, async () => {
      console.log('🔔 [TokenSynchronizer] 收到登出事件');
      await this.clearAll(true); // 跳过事件通知，防止递归
    });
    
    authEventBus.on(AuthEvents.TOKEN_REFRESHED, async (data) => {
      console.log('🔔 [TokenSynchronizer] 收到token刷新事件');
      if (data && data.token) {
        await this.synchronizeAll(data.token, this.storageLocations.memory.user);
      }
    });
  }
  
  /**
   * 验证token是否有效
   */
  isValidToken(token) {
    if (!token || typeof token !== 'string' || token.length < 10) {
      return false;
    }
    
    // 简单验证JWT格式
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // 尝试解码payload检查过期时间
    try {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp <= now) {
        console.warn('⚠️ [TokenSynchronizer] Token已过期');
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] Token验证失败:', error);
      return false;
    }
  }
  
  /**
   * 获取token状态信息
   */
  async getTokenStatus() {
    const token = await this.getToken();
    
    if (!token) {
      return {
        exists: false,
        valid: false,
        expired: false,
        expiresIn: 0
      };
    }
    
    // 检查JWT格式和过期时间
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          exists: true,
          valid: false,
          expired: true,
          expiresIn: 0
        };
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp) {
        return {
          exists: true,
          valid: payload.exp > now,
          expired: payload.exp <= now,
          expiresIn: payload.exp - now,
          expiresAt: new Date(payload.exp * 1000).toISOString()
        };
      }
      
      return {
        exists: true,
        valid: true, // 没有过期时间的token视为有效
        expired: false,
        expiresIn: null
      };
    } catch (error) {
      console.warn('⚠️ [TokenSynchronizer] Token状态检查失败:', error);
      return {
        exists: true,
        valid: false,
        expired: true,
        expiresIn: 0,
        error: error.message
      };
    }
  }
}

// 创建单例实例
const tokenSynchronizer = new TokenSynchronizer();

// 导出单例
export default tokenSynchronizer; 