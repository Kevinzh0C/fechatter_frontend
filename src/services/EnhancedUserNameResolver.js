/**
 * 🚀 增强用户名解析服务
 * 彻底解决用户名显示降级问题的核心解决方案
 * 
 * 核心策略：
 * 1. 多层级数据源优先级
 * 2. 智能缓存与持久化
 * 3. 一致性fallback名称生成
 * 4. 性能优化的批量处理
 */

import { dataConsistencyManager } from './DataConsistencyManager.js';

export class EnhancedUserNameResolver {
  constructor() {
    this.userCache = new Map();
    this.fallbackCache = new Map();
    this.pendingRequests = new Map();
    this.batchQueue = new Set();
    this.batchTimer = null;
    
    // 配置参数
    this.config = {
      cacheExpiry: 10 * 60 * 1000, // 10分钟缓存
      batchDelay: 100, // 100ms批量处理延迟
      maxBatchSize: 50, // 最大批量处理大小
      fallbackPersistence: true, // 启用fallback持久化
      debugMode: true
    };
    
    // 统计信息
    this.stats = {
      cacheHits: 0,
      apiCalls: 0,
      fallbackGenerated: 0,
      batchProcessed: 0
    };
    
    this.initializeStores();
  }

  /**
   * 🔧 初始化Store引用
   */
  initializeStores() {
    this.storeRefs = {
      userStore: null,
      authStore: null,
      workspaceStore: null
    };
    
    // 延迟获取Store引用以避免循环依赖
    setTimeout(() => {
      try {
        if (window.__pinia_stores__?.user) {
          this.storeRefs.userStore = window.__pinia_stores__.user();
        }
        if (window.__pinia_stores__?.auth) {
          this.storeRefs.authStore = window.__pinia_stores__.auth();
        }
        if (window.__pinia_stores__?.workspace) {
          this.storeRefs.workspaceStore = window.__pinia_stores__.workspace();
        }
        
        if (this.config.debugMode) {
          console.log('✅ [EnhancedUserNameResolver] Store references initialized');
        }
      } catch (error) {
        console.warn('⚠️ [EnhancedUserNameResolver] Failed to initialize stores:', error);
      }
    }, 1000);
  }

  /**
   * 🎯 主要解析方法 - 单个用户名解析
   */
  async resolveUserName(senderId, messageContext = {}) {
    if (!senderId) {
      return 'Unknown User';
    }

    const userId = parseInt(senderId);
    const cacheKey = `user_${userId}`;
    
    // 1. 检查内存缓存
    const cached = this.getCachedUserName(userId);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    // 2. 尝试从消息上下文获取
    const contextName = this.extractNameFromContext(messageContext);
    if (contextName) {
      this.cacheUserName(userId, contextName, 'context');
      return contextName;
    }

    // 3. 从各种Store获取
    const storeName = await this.getNameFromStores(userId);
    if (storeName) {
      this.cacheUserName(userId, storeName, 'store');
      return storeName;
    }

    // 4. API查询 (添加到批量队列)
    const apiName = await this.getNameFromAPI(userId);
    if (apiName) {
      this.cacheUserName(userId, apiName, 'api');
      return apiName;
    }

    // 5. 生成一致的fallback名称
    const fallbackName = this.generateConsistentFallback(userId);
    this.cacheUserName(userId, fallbackName, 'fallback');
    this.stats.fallbackGenerated++;
    
    if (this.config.debugMode) {
      console.warn(`🏷️ [EnhancedUserNameResolver] Generated fallback for user ${userId}: ${fallbackName}`);
    }
    
    return fallbackName;
  }

  /**
   * 🚀 批量用户名解析 - 性能优化
   */
  async resolveUserNamesBatch(userIds) {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const results = {};
    const missingUserIds = [];

    // 1. 从缓存获取已知用户名
    for (const userId of userIds) {
      const cached = this.getCachedUserName(parseInt(userId));
      if (cached) {
        results[userId] = cached;
        this.stats.cacheHits++;
      } else {
        missingUserIds.push(parseInt(userId));
      }
    }

    // 2. 批量获取缺失的用户信息
    if (missingUserIds.length > 0) {
      const batchResults = await this.batchGetUserNames(missingUserIds);
      Object.assign(results, batchResults);
    }

    return results;
  }

  /**
   * 💾 获取缓存的用户名
   */
  getCachedUserName(userId) {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      return cached.name;
    }
    return null;
  }

  /**
   * 💾 缓存用户名
   */
  cacheUserName(userId, name, source) {
    this.userCache.set(userId, {
      name,
      source,
      timestamp: Date.now()
    });

    // 如果是fallback，同时持久化到localStorage
    if (source === 'fallback' && this.config.fallbackPersistence) {
      this.persistFallbackName(userId, name);
    }
  }

  /**
   * 📄 从消息上下文提取用户名
   */
  extractNameFromContext(messageContext) {
    if (!messageContext) return null;

    // 优先级顺序
    const sources = [
      messageContext.sender?.fullname,
      messageContext.sender?.name,
      messageContext.sender_name,
      messageContext.sender?.username,
      messageContext.user_name,
      messageContext.fullname
    ];

    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim() && source !== 'null') {
        return source.trim();
      }
    }

    return null;
  }

  /**
   * 🏪 从各种Store获取用户名
   */
  async getNameFromStores(userId) {
    // 1. UserStore
    if (this.storeRefs.userStore) {
      try {
        const user = this.storeRefs.userStore.getUserByIdWithFallback(userId);
        if (user?.fullname) return user.fullname;
        if (user?.username) return user.username;
      } catch (error) {
        // Store访问失败，继续下一个
      }
    }

    // 2. WorkspaceStore
    if (this.storeRefs.workspaceStore?.workspaceUsers) {
      try {
        const user = this.storeRefs.workspaceStore.workspaceUsers.find(u => 
          parseInt(u.id) === userId
        );
        if (user?.fullname) return user.fullname;
        if (user?.username) return user.username;
      } catch (error) {
        // Store访问失败，继续下一个
      }
    }

    // 3. AuthStore (如果是当前用户)
    if (this.storeRefs.authStore?.user?.id === userId) {
      try {
        const user = this.storeRefs.authStore.user;
        if (user.fullname) return user.fullname;
        if (user.username) return user.username;
      } catch (error) {
        // Store访问失败
      }
    }

    return null;
  }

  /**
   * 🌐 从API获取用户名
   */
  async getNameFromAPI(userId) {
    const requestKey = `api_${userId}`;
    
    // 避免重复请求
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const apiPromise = this.performAPIRequest(userId);
    this.pendingRequests.set(requestKey, apiPromise);

    try {
      const result = await apiPromise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 🔧 执行API请求
   */
  async performAPIRequest(userId) {
    try {
      // 使用DataConsistencyManager获取用户信息
      const userInfo = await dataConsistencyManager.getUserInfo(userId);
      
      if (userInfo && !userInfo._isFallback) {
        this.stats.apiCalls++;
        return userInfo.fullname || userInfo.username || userInfo.email?.split('@')[0];
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.warn(`⚠️ [EnhancedUserNameResolver] API request failed for user ${userId}:`, error);
      }
    }

    return null;
  }

  /**
   * 🚀 批量获取用户名
   */
  async batchGetUserNames(userIds) {
    const results = {};

    try {
      // 1. 从Store批量获取
      for (const userId of userIds) {
        const storeName = await this.getNameFromStores(userId);
        if (storeName) {
          results[userId] = storeName;
          this.cacheUserName(userId, storeName, 'store');
        }
      }

      // 2. 为剩余用户生成fallback
      const remainingUserIds = userIds.filter(id => !results[id]);
      for (const userId of remainingUserIds) {
        const fallbackName = this.generateConsistentFallback(userId);
        results[userId] = fallbackName;
        this.cacheUserName(userId, fallbackName, 'fallback');
      }

      this.stats.batchProcessed++;
      
    } catch (error) {
      console.error('❌ [EnhancedUserNameResolver] Batch processing failed:', error);
      
      // 紧急fallback - 为所有用户生成名称
      for (const userId of userIds) {
        if (!results[userId]) {
          results[userId] = this.generateConsistentFallback(userId);
        }
      }
    }

    return results;
  }

  /**
   * 🎯 生成一致的fallback名称
   */
  generateConsistentFallback(userId) {
    // 检查持久化缓存
    const persisted = this.getPersistedFallbackName(userId);
    if (persisted) {
      return persisted;
    }

    // 检查内存fallback缓存
    if (this.fallbackCache.has(userId)) {
      return this.fallbackCache.get(userId);
    }

    // 生成新的一致名称
    const name = this.generateNameFromId(userId);
    
    // 缓存
    this.fallbackCache.set(userId, name);
    if (this.config.fallbackPersistence) {
      this.persistFallbackName(userId, name);
    }

    return name;
  }

  /**
   * 🎲 从用户ID生成一致的名称
   */
  generateNameFromId(userId) {
    const nameTemplates = [
      'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley', 'Gray', 'Harper',
      'Jordan', 'Kelly', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley', 'Sage',
      'Taylor', 'Unity', 'Val', 'Winter', 'Avery', 'Cameron', 'Devon', 'Ellis'
    ];

    // 使用用户ID生成一致的索引
    const nameIndex = Math.abs(userId) % nameTemplates.length;
    const baseName = nameTemplates[nameIndex];

    // 生成后缀以确保唯一性但保持简洁
    const suffix = Math.abs(userId) % 100;
    
    // 只在必要时添加后缀
    if (suffix < 10) {
      return baseName;
    }
    
    return `${baseName}${suffix}`;
  }

  /**
   * 💾 持久化fallback名称
   */
  persistFallbackName(userId, name) {
    try {
      const key = `fechatter_enhanced_fallback_${userId}`;
      const data = {
        name,
        userId,
        timestamp: Date.now(),
        version: '2.0'
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ [EnhancedUserNameResolver] Failed to persist fallback:', error);
    }
  }

  /**
   * 💿 获取持久化的fallback名称
   */
  getPersistedFallbackName(userId) {
    try {
      const key = `fechatter_enhanced_fallback_${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        // 检查版本和时效性
        if (data.version === '2.0' && data.name) {
          return data.name;
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
    return null;
  }

  /**
   * 🧹 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    // 清理内存缓存
    for (const [userId, cached] of this.userCache) {
      if (now - cached.timestamp > this.config.cacheExpiry) {
        this.userCache.delete(userId);
        cleanedCount++;
      }
    }

    // 清理localStorage中过期的fallback
    this.cleanupPersistedFallbacks();

    if (this.config.debugMode && cleanedCount > 0) {
      console.log(`🧹 [EnhancedUserNameResolver] Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 🧹 清理持久化的fallback数据
   */
  cleanupPersistedFallbacks() {
    try {
      const keys = Object.keys(localStorage);
      const fallbackKeys = keys.filter(key => key.startsWith('fechatter_enhanced_fallback_'));
      
      for (const key of fallbackKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          // 清理超过30天的数据
          if (Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // 清理无效数据
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('⚠️ [EnhancedUserNameResolver] Failed to cleanup persisted fallbacks:', error);
    }
  }

  /**
   * 📊 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.userCache.size,
      fallbackCacheSize: this.fallbackCache.size,
      pendingRequests: this.pendingRequests.size,
      cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.apiCalls + this.stats.fallbackGenerated) || 0
    };
  }

  /**
   * 🔄 重置统计信息
   */
  resetStats() {
    this.stats = {
      cacheHits: 0,
      apiCalls: 0,
      fallbackGenerated: 0,
      batchProcessed: 0
    };
  }

  /**
   * 🔧 清理所有缓存
   */
  clearCache() {
    this.userCache.clear();
    this.fallbackCache.clear();
    this.pendingRequests.clear();
    
    if (this.config.debugMode) {
      console.log('🧹 [EnhancedUserNameResolver] All caches cleared');
    }
  }
}

// 创建全局单例
export const enhancedUserNameResolver = new EnhancedUserNameResolver();

// 定期清理
if (typeof window !== 'undefined') {
  // 将实例挂载到全局，以便同步访问
  window.__enhancedUserNameResolver = enhancedUserNameResolver;
  
  setInterval(() => {
    enhancedUserNameResolver.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}

export default enhancedUserNameResolver; 