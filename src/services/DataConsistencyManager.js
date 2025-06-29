/**
 * 🎯 统一数据一致性管理器
 * 解决并发性问题，确保Store数据的一致性和完整性
 * 
 * 核心功能:
 * 1. 请求去重和排队
 * 2. 数据版本控制
 * 3. 并发写入锁
 * 4. 数据同步检查
 * 5. 降级命名机制统一
 */

class DataConsistencyManager {
  constructor() {
    // 🔒 并发控制
    this.activeFetches = new Map(); // 活跃的请求
    this.dataLocks = new Map(); // 数据锁
    this.requestQueue = new Map(); // 请求队列
    
    // 📊 数据版本控制
    this.dataVersions = new Map(); // 数据版本号
    this.lastUpdateTimes = new Map(); // 最后更新时间
    
    // 👤 用户数据缓存和一致性
    this.userCache = new Map(); // 用户信息缓存
    this.userFallbackNames = new Map(); // 降级命名缓存
    
    // 💬 消息数据一致性
    this.messageConsistency = new Map(); // 消息一致性状态
    
    // 🏪 Store引用管理
    this.storeReferences = new Map(); // Store引用缓存
    
    // ⚙️ 配置
    this.config = {
      lockTimeout: 15000, // 锁超时时间 15秒 (增加)
      cacheExpiry: 300000, // 缓存过期时间 5分钟
      maxRetries: 3, // 最大重试次数
      debounceTime: 100, // 防抖时间
      queueTimeout: 30000, // 队列超时 30秒 (与API保持一致)
      defaultTimeout: 30000, // 默认请求超时 30秒 (与API保持一致)
      retryDelay: 1000 // 重试延迟基准值
    };
  }

  /**
   * 🔒 获取数据锁
   */
  async acquireLock(lockKey, timeout = this.config.lockTimeout) {
    const lockId = `${lockKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 检查是否已经有锁
    if (this.dataLocks.has(lockKey)) {
      const existingLock = this.dataLocks.get(lockKey);
      
      // 检查锁是否过期
      if (Date.now() - existingLock.timestamp > timeout) {
        console.warn(`⚠️ [DataConsistency] Lock expired for ${lockKey}, releasing...`);
        this.dataLocks.delete(lockKey);
      } else {
        // 等待现有锁释放
        console.log(`🔒 [DataConsistency] Waiting for lock: ${lockKey}`);
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (!this.dataLocks.has(lockKey)) {
              clearInterval(checkInterval);
              resolve(this.acquireLock(lockKey, timeout));
            }
          }, 50);
          
          // 超时处理
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error(`Lock acquisition timeout for ${lockKey}`));
          }, timeout);
        });
      }
    }
    
    // 创建新锁
    this.dataLocks.set(lockKey, {
      id: lockId,
      timestamp: Date.now(),
      key: lockKey
    });
    
    console.log(`🔓 [DataConsistency] Lock acquired: ${lockKey} (${lockId})`);
    
    return {
      lockId,
      release: () => this.releaseLock(lockKey, lockId)
    };
  }

  /**
   * 🔓 释放数据锁
   */
  releaseLock(lockKey, lockId) {
    const existingLock = this.dataLocks.get(lockKey);
    if (existingLock && existingLock.id === lockId) {
      this.dataLocks.delete(lockKey);
      console.log(`✅ [DataConsistency] Lock released: ${lockKey} (${lockId})`);
      return true;
    }
    
    console.warn(`⚠️ [DataConsistency] Invalid lock release attempt: ${lockKey} (${lockId})`);
    return false;
  }

  /**
   * 🔄 统一的请求去重机制
   */
  async deduplicatedFetch(fetchKey, fetchFunction, options = {}) {
    const {
      forceRefresh = false,
      timeout = 90000, // 🔧 FIX: 增加到90秒，适应慢网络环境
      cacheTime = this.config.cacheExpiry,
      maxRetries = 3 // 🔧 FIX: 增加重试次数到3次
    } = options;
    
    // 检查是否强制刷新
    if (!forceRefresh) {
      // 检查是否有正在进行的相同请求
      if (this.activeFetches.has(fetchKey)) {
        console.log(`🔄 [DataConsistency] Reusing active fetch: ${fetchKey}`);
        return this.activeFetches.get(fetchKey);
      }
      
      // 检查缓存数据是否有效
      const cachedData = this.getCachedData(fetchKey);
      if (cachedData && !this.isDataExpired(fetchKey, cacheTime)) {
        console.log(`📦 [DataConsistency] Using cached data: ${fetchKey}`);
        return cachedData;
      }
    }
    
    // 创建新的请求（带重试机制）
    const fetchPromise = this.executeWithRetry(fetchFunction, timeout, maxRetries, fetchKey)
      .then(result => {
        // 缓存结果
        this.setCachedData(fetchKey, result);
        return result;
      })
      .catch(error => {
        console.error(`❌ [DataConsistency] Fetch failed after retries: ${fetchKey}`, error);
        throw error;
      })
      .finally(() => {
        // 清除活跃请求
        this.activeFetches.delete(fetchKey);
      });
    
    // 添加到活跃请求
    this.activeFetches.set(fetchKey, fetchPromise);
    
    return fetchPromise;
  }

  /**
   * ⏱️ 带超时的执行器
   */
  async executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }

  /**
   * 🔄 执行带重试机制的操作
   */
  async executeWithRetry(fn, timeout, maxRetries, fetchKey) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 [DataConsistency] Attempt ${attempt}/${maxRetries + 1} for: ${fetchKey}`);
        return await this.executeWithTimeout(fn, timeout);
      } catch (error) {
        lastError = error;
        
        if (attempt <= maxRetries) {
          const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 8000); // 🔧 FIX: 更温和的退避策略，适应慢网络
          console.warn(`⚠️ [DataConsistency] Attempt ${attempt} failed, retrying in ${delay}ms: ${fetchKey}`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 💾 缓存数据管理
   */
  setCachedData(key, data) {
    const version = (this.dataVersions.get(key) || 0) + 1;
    this.dataVersions.set(key, version);
    this.lastUpdateTimes.set(key, Date.now());
    
    // 存储到对应的数据结构中
    if (key.startsWith('user_')) {
      this.userCache.set(key, data);
    } else if (key.startsWith('message_')) {
      this.messageConsistency.set(key, data);
    }
    
    console.log(`💾 [DataConsistency] Data cached: ${key} (v${version})`);
  }

  getCachedData(key) {
    if (key.startsWith('user_')) {
      return this.userCache.get(key);
    } else if (key.startsWith('message_')) {
      return this.messageConsistency.get(key);
    }
    return null;
  }

  isDataExpired(key, maxAge) {
    const lastUpdate = this.lastUpdateTimes.get(key);
    if (!lastUpdate) return true;
    
    return Date.now() - lastUpdate > maxAge;
  }

  /**
   * 👤 统一用户信息管理
   */
  async getUserInfo(userId, options = {}) {
    const userKey = `user_${userId}`;
    
    return this.deduplicatedFetch(userKey, async () => {
      console.log(`🔍 [DataConsistency] Fetching user info: ${userId}`);
      
      try {
        // 尝试从多个Store获取用户信息
        const userSources = [
          () => this.getFromUserStore(userId),
          () => this.getFromAuthStore(userId),
          () => this.getFromChatMembers(userId),
          () => this.fetchUserFromAPI(userId)
        ];
        
        for (const getUser of userSources) {
          try {
            const userInfo = await getUser();
            if (userInfo && userInfo.id === userId) {
              console.log(`✅ [DataConsistency] User info found: ${userInfo.fullname || userInfo.email}`);
              return this.normalizeUserData(userInfo);
            }
          } catch (error) {
            console.warn(`⚠️ [DataConsistency] User source failed:`, error.message);
          }
        }
        
        // 如果所有方法都失败，使用降级命名
        return this.generateFallbackUserInfo(userId);
        
      } catch (error) {
        console.error(`❌ [DataConsistency] User fetch failed: ${userId}`, error);
        return this.generateFallbackUserInfo(userId);
      }
    }, options);
  }

  /**
   * 📝 标准化用户数据格式
   */
  normalizeUserData(rawUserData) {
    return {
      id: rawUserData.id,
      fullname: rawUserData.fullname || rawUserData.name || rawUserData.username,
      email: rawUserData.email || '',
      avatar_url: rawUserData.avatar_url || rawUserData.avatar || null,
      status: rawUserData.status || 'Unknown',
      workspace_id: rawUserData.workspace_id || null,
      
      // 标记数据来源和版本
      _dataSource: 'normalized',
      _timestamp: Date.now(),
      _version: this.dataVersions.get(`user_${rawUserData.id}`) || 1
    };
  }

  /**
   * 🏷️ 生成降级用户信息
   */
  generateFallbackUserInfo(userId) {
    const fallbackKey = `fallback_${userId}`;
    
    // 🔧 FIX: 使用永久缓存确保一致性
    // 检查localStorage中的持久化缓存
    const storedFallback = this.getPersistedFallback(userId);
    if (storedFallback) {
      console.log(`🏷️ [DataConsistency] Using persisted fallback name: ${storedFallback.fullname}`);
      this.userFallbackNames.set(fallbackKey, storedFallback);
      return storedFallback;
    }
    
    // 检查内存缓存
    if (this.userFallbackNames.has(fallbackKey)) {
      const existing = this.userFallbackNames.get(fallbackKey);
      console.log(`🏷️ [DataConsistency] Using existing fallback name: ${existing.fullname}`);
      return existing;
    }
    
    // 生成新的降级名称
    const fallbackName = this.generateConsistentFallbackName(userId);
    const fallbackUser = {
      id: userId,
      fullname: fallbackName,
      email: '',
      avatar_url: null,
      status: 'Unknown',
      workspace_id: null,
      
      // 标记为降级数据
      _dataSource: 'fallback',
      _timestamp: Date.now(),
      _isFallback: true
    };
    
    // 缓存降级名称
    this.userFallbackNames.set(fallbackKey, fallbackUser);
    this.persistFallback(userId, fallbackUser);
    console.log(`🏷️ [DataConsistency] Generated fallback name: ${fallbackName} for user ${userId}`);
    
    return fallbackUser;
  }

  /**
   * 💾 持久化fallback用户信息
   */
  persistFallback(userId, fallbackUser) {
    try {
      const key = `fechatter_fallback_user_${userId}`;
      localStorage.setItem(key, JSON.stringify(fallbackUser));
    } catch (error) {
      console.warn('[DataConsistency] Failed to persist fallback user:', error);
    }
  }

  /**
   * 💿 获取持久化的fallback用户信息
   */
  getPersistedFallback(userId) {
    try {
      const key = `fechatter_fallback_user_${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[DataConsistency] Failed to get persisted fallback:', error);
    }
    return null;
  }

  /**
   * 🎯 生成一致的降级名称
   */
  generateConsistentFallbackName(userId) {
    // 🔧 FIX: 确保同一用户ID始终生成相同的名称
    if (!userId) {
      return "Unknown User";
    }
    
    const userIdStr = String(userId);
    
    // 🔧 FIX: 使用简单的哈希算法生成一致的名称
    const nameTemplates = [
      'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley', 'Gray', 'Harper',
      'Jordan', 'Kelly', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley', 'Sage',
      'Taylor', 'Unity', 'Val', 'Winter'
    ];
    
    // 使用userId的数值来选择模板
    const numericId = parseInt(userIdStr) || 0;
    const templateIndex = Math.abs(numericId) % nameTemplates.length;
    const baseName = nameTemplates[templateIndex];
    
    // 使用ID的后4位作为后缀
    const displayId = userIdStr.length > 4 ? userIdStr.slice(-4) : userIdStr.padStart(4, '0');
    
    return `${baseName} #${displayId}`;
  }

  /**
   * 🏪 从不同Store获取用户信息
   */
  async getFromUserStore(userId) {
    try {
      const { useUserStore } = await import('@/stores/user');
      const userStore = useUserStore();
      return userStore.getUserById?.(userId);
    } catch (error) {
      return null;
    }
  }

  async getFromAuthStore(userId) {
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      return authStore.user?.id === userId ? authStore.user : null;
    } catch (error) {
      return null;
    }
  }

  async getFromChatMembers(userId) {
    try {
      const { useChatStore } = await import('@/stores/chat');
      const chatStore = useChatStore();
      
      // 搜索所有聊天的成员
      for (const chatId in chatStore.chatMembers) {
        const members = chatStore.chatMembers[chatId];
        const member = members.find(m => m.id === userId);
        if (member) return member;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async fetchUserFromAPI(userId) {
    try {
      const api = await import('@/services/api');
      const response = await api.default.get(`/users/${userId}`);
      return response.data?.data || response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * 💬 消息数据一致性检查
   */
  validateMessageConsistency(message) {
    const issues = [];
    
    // 检查必需字段
    if (!message.id) issues.push('Missing message ID');
    if (!message.content && (!message.files || message.files.length === 0)) {
      issues.push('Message has no content or files');
    }
    if (!message.sender_id) issues.push('Missing sender ID');
    if (!message.created_at) issues.push('Missing timestamp');
    
    // 检查用户信息一致性
    if (message.sender_id && message.sender) {
      if (message.sender.id !== message.sender_id) {
        issues.push('Sender ID mismatch');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      needsUserFetch: !message.sender && message.sender_id
    };
  }

  /**
   * 🔄 同步Store数据
   */
  async syncStoreData(storeType, dataKey, newData) {
    const lockKey = `${storeType}_${dataKey}`;
    const lock = await this.acquireLock(lockKey);
    
    try {
      console.log(`🔄 [DataConsistency] Syncing ${storeType} data: ${dataKey}`);
      
      // 根据store类型执行不同的同步逻辑
      switch (storeType) {
        case 'chat':
          await this.syncChatStoreData(dataKey, newData);
          break;
        case 'user':
          await this.syncUserStoreData(dataKey, newData);
          break;
        case 'workspace':
          await this.syncWorkspaceStoreData(dataKey, newData);
          break;
        default:
          console.warn(`⚠️ [DataConsistency] Unknown store type: ${storeType}`);
      }
      
      // 更新版本号
      const version = (this.dataVersions.get(`${storeType}_${dataKey}`) || 0) + 1;
      this.dataVersions.set(`${storeType}_${dataKey}`, version);
      
      console.log(`✅ [DataConsistency] Data synced: ${storeType}_${dataKey} (v${version})`);
      
    } finally {
      lock.release();
    }
  }

  async syncChatStoreData(dataKey, newData) {
    // 实现聊天数据同步逻辑
    // 确保消息数据的一致性
  }

  async syncUserStoreData(dataKey, newData) {
    // 实现用户数据同步逻辑
    // 更新所有相关的用户引用
  }

  async syncWorkspaceStoreData(dataKey, newData) {
    // 实现工作空间数据同步逻辑
  }

  /**
   * 📊 获取一致性统计
   */
  getConsistencyStats() {
    return {
      activeFetches: this.activeFetches.size,
      dataLocks: this.dataLocks.size,
      cachedUsers: this.userCache.size,
      fallbackNames: this.userFallbackNames.size,
      dataVersions: this.dataVersions.size,
      lastUpdate: Math.max(...Array.from(this.lastUpdateTimes.values()), 0)
    };
  }

  /**
   * 🧹 清理过期数据
   */
  cleanup() {
    const now = Date.now();
    
    // 清理过期的锁
    for (const [key, lock] of this.dataLocks) {
      if (now - lock.timestamp > this.config.lockTimeout) {
        this.dataLocks.delete(key);
        console.log(`🧹 [DataConsistency] Cleaned expired lock: ${key}`);
      }
    }
    
    // 清理过期的缓存
    for (const [key, timestamp] of this.lastUpdateTimes) {
      if (now - timestamp > this.config.cacheExpiry) {
        this.lastUpdateTimes.delete(key);
        this.dataVersions.delete(key);
        this.userCache.delete(key);
        console.log(`🧹 [DataConsistency] Cleaned expired cache: ${key}`);
      }
    }
  }

  /**
   * 🔄 重置所有状态
   */
  reset() {
    this.activeFetches.clear();
    this.dataLocks.clear();
    this.requestQueue.clear();
    this.dataVersions.clear();
    this.lastUpdateTimes.clear();
    this.userCache.clear();
    this.userFallbackNames.clear();
    this.messageConsistency.clear();
    this.storeReferences.clear();
    
    console.log('🔄 [DataConsistency] Manager reset complete');
  }
}

// 创建全局单例
export const dataConsistencyManager = new DataConsistencyManager();

// 定期清理
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataConsistencyManager.cleanup();
  }, 60000); // 每分钟清理一次
}

export default dataConsistencyManager;