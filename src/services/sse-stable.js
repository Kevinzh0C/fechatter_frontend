/**
 * SSE稳定连接服务 - 最佳实践实现
 * 完全匹配curl命令格式，采用最佳连接稳定性策略
 */

class StableSSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.connectionState = 'disconnected';
    
    // 🔧 最佳实践：连接稳定性配置
    this.config = {
      maxRetries: 5,                    // 最大重试次数
      baseRetryDelay: 1000,             // 基础重试延迟
      maxRetryDelay: 30000,             // 最大重试延迟
      connectionTimeout: 15000,         // 连接超时
      heartbeatInterval: 30000,         // 心跳检测间隔
      reconnectOnVisibilityChange: true // 页面可见时重连
    };
    
    // 连接状态管理
    this.retryAttempts = 0;
    this.lastConnectionTime = null;
    this.connectionId = null;
    this.heartbeatTimer = null;
    this.retryTimer = null;
    
    // 🚀 最佳实践：页面可见性变化时自动重连
    this._setupVisibilityHandling();
    
    // 🚀 最佳实践：页面卸载时清理资源
    this._setupUnloadHandling();
  }

  /**
   * 🔗 连接SSE - 完全匹配curl命令格式
   * curl -N -v -H "Accept: text/event-stream" -H "Cache-Control: no-cache" "http://45.77.178.85:8080/events?access_token=${TOKEN}"
   */
  async connect(token = null) {
    // 防止重复连接
    if (this.isConnected || this.connectionState === 'connecting') {
      console.log('[SSE-STABLE] 连接已存在或正在连接中');
      return;
    }

    this.connectionState = 'connecting';
    console.log('[SSE-STABLE] 🔄 开始建立SSE连接...');

    try {
      // 1. 获取token
      if (!token) {
        token = await this._getToken();
      }
      
      if (!token) {
        throw new Error('无法获取认证token');
      }

      // 2. 构建完全匹配curl的URL
      const url = this._buildSSEUrl(token);
      console.log('[SSE-STABLE] 🌐 URL格式:', url.replace(/access_token=[^&]+/, 'access_token=***'));

      // 3. 创建EventSource连接
      await this._createEventSource(url);
      
      // 4. 启动心跳检测
      this._startHeartbeat();
      
      console.log('[SSE-STABLE] ✅ SSE连接建立成功');
      
    } catch (error) {
      console.error('[SSE-STABLE] ❌ 连接失败:', error.message);
      this._handleConnectionError(error);
    }
  }

  /**
   * 🔌 创建EventSource连接 (严格按照SSE标准)
   */
  _createEventSource(url) {
    return new Promise((resolve, reject) => {
      // 清理现有连接
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      // 🔧 关键：EventSource自动设置正确的headers:
      // - Accept: text/event-stream
      // - Cache-Control: no-cache
      // - Connection: keep-alive
      this.eventSource = new EventSource(url);
      this.connectionId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 连接超时处理
      const connectionTimeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new Error('连接超时'));
      }, this.config.connectionTimeout);

      // 连接成功
      this.eventSource.onopen = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        this.connectionState = 'connected';
        this.lastConnectionTime = Date.now();
        this.retryAttempts = 0; // 重置重试计数
        
        console.log('[SSE-STABLE] 🟢 EventSource连接已打开');
        console.log('[SSE-STABLE] 📊 连接信息:', {
          readyState: this.eventSource.readyState,
          url: this.eventSource.url.replace(/access_token=[^&]+/, 'access_token=***'),
          connectionId: this.connectionId
        });
        
        resolve();
      };

      // 消息处理
      this.eventSource.onmessage = (event) => {
        this._handleMessage(event);
      };

      // 错误处理
      this.eventSource.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.warn('[SSE-STABLE] ⚠️ EventSource错误:', {
          readyState: this.eventSource?.readyState,
          type: error.type,
          connectionId: this.connectionId
        });
        
        // 区分错误类型
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.isConnected = false;
          this.connectionState = 'disconnected';
          reject(new Error('连接被服务器关闭'));
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // 连接中的错误，等待自动重连
          console.log('[SSE-STABLE] 🔄 EventSource正在重连...');
        }
      };
    });
  }

  /**
   * 📨 处理接收到的消息
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type || 'message';
      
      // 更新最后收到消息的时间
      this.lastMessageTime = Date.now();
      
      // 分发给监听器
      const listeners = this.listeners.get(eventType) || [];
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('[SSE-STABLE] 监听器执行错误:', error);
        }
      });
      
      // 调试日志
      if (eventType === 'heartbeat') {
        console.debug('[SSE-STABLE] 💓 心跳消息');
      } else {
        console.debug('[SSE-STABLE] 📨 收到消息:', eventType);
      }
      
    } catch (error) {
      console.warn('[SSE-STABLE] 消息解析失败:', event.data.substring(0, 100));
    }
  }

  /**
   * 🔄 最佳实践：智能重连策略
   */
  _handleConnectionError(error) {
    this.isConnected = false;
    this.connectionState = 'error';
    
    // 清理心跳
    this._stopHeartbeat();
    
    // 检查是否应该重试
    if (this.retryAttempts >= this.config.maxRetries) {
      console.error('[SSE-STABLE] ❌ 重试次数已达上限，停止重连');
      this.connectionState = 'failed';
      return;
    }

    // 🚀 最佳实践：指数退避 + 抖动
    this.retryAttempts++;
    const baseDelay = this.config.baseRetryDelay;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, this.retryAttempts - 1),
      this.config.maxRetryDelay
    );
    
    // 添加随机抖动（±25%）
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const finalDelay = Math.max(exponentialDelay + jitter, 1000);

    console.log(`[SSE-STABLE] 🔄 ${finalDelay.toFixed(0)}ms后重试 (${this.retryAttempts}/${this.config.maxRetries})`);
    
    this.retryTimer = setTimeout(() => {
      this.connect();
    }, finalDelay);
  }

  /**
   * 💓 心跳检测机制
   */
  _startHeartbeat() {
    this._stopHeartbeat(); // 清理现有心跳
    
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) {
        this._stopHeartbeat();
        return;
      }
      
      // 检查连接状态
      if (this.eventSource?.readyState !== EventSource.OPEN) {
        console.warn('[SSE-STABLE] 💔 心跳检测失败，连接已断开');
        this._handleConnectionError(new Error('心跳检测失败'));
        return;
      }
      
      // 检查最后收到消息的时间
      if (this.lastMessageTime) {
        const timeSinceLastMessage = Date.now() - this.lastMessageTime;
        if (timeSinceLastMessage > this.config.heartbeatInterval * 2) {
          console.warn('[SSE-STABLE] 💔 长时间未收到消息，可能连接异常');
          this._handleConnectionError(new Error('长时间未收到消息'));
          return;
        }
      }
      
      console.debug('[SSE-STABLE] 💓 心跳检测正常');
    }, this.config.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 🌐 构建SSE URL (完全匹配curl格式)
   */
  _buildSSEUrl(token) {
    // 检测环境
    const isDevEnv = window.location.port === '5173' || window.location.port === '5174';
    
    let baseUrl;
    if (isDevEnv) {
      // 开发环境：使用Vite代理
      baseUrl = '/events';
    } else {
      // 生产环境：直连后端
      baseUrl = 'https://hook-nav-attempt-size.trycloudflare.com/events';
    }
    
    // 🔧 关键：完全匹配curl命令的URL格式
    return `${baseUrl}?access_token=${encodeURIComponent(token)}`;
  }

  /**
   * 🔑 获取认证token
   */
  async _getToken() {
    // 优先从localStorage获取
    const token = localStorage.getItem('auth_token');
    if (token && token.length > 20) {
      return token;
    }
    
    // 从auth store获取
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      return authStore.token;
    } catch {
      return null;
    }
  }

  /**
   * 👁️ 页面可见性处理
   */
  _setupVisibilityHandling() {
    if (!this.config.reconnectOnVisibilityChange) return;
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时，检查连接状态
        if (!this.isConnected && this.connectionState !== 'connecting') {
          console.log('[SSE-STABLE] 📱 页面重新可见，尝试重连...');
          setTimeout(() => this.connect(), 1000);
        }
      } else {
        // 页面隐藏时，暂停心跳（但保持连接）
        console.log('[SSE-STABLE] 📱 页面隐藏，暂停心跳检测');
        this._stopHeartbeat();
      }
    });
  }

  /**
   * 🚪 页面卸载处理
   */
  _setupUnloadHandling() {
    const cleanup = () => {
      this.disconnect();
    };
    
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
  }

  /**
   * 📋 注册事件监听器
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(callback);
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 🛑 断开连接并清理资源
   */
  disconnect() {
    console.log('[SSE-STABLE] 🔌 断开连接...');
    
    // 更新状态
    this.isConnected = false;
    this.connectionState = 'disconnected';
    
    // 清理定时器
    this._stopHeartbeat();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // 关闭EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理监听器
    this.listeners.clear();
    
    // 重置计数器
    this.retryAttempts = 0;
    this.lastConnectionTime = null;
    this.lastMessageTime = null;
    this.connectionId = null;
    
    console.log('[SSE-STABLE] ✅ 资源已完全清理');
  }

  // Getters
  get connected() {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  get readyState() {
    return this.eventSource?.readyState || EventSource.CLOSED;
  }

  get status() {
    return {
      connected: this.connected,
      connectionState: this.connectionState,
      retryAttempts: this.retryAttempts,
      lastConnectionTime: this.lastConnectionTime,
      lastMessageTime: this.lastMessageTime,
      connectionId: this.connectionId
    };
  }
}

// 导出单例实例
export const stableSSE = new StableSSEService();

// 开发环境调试工具
if (import.meta.env.DEV) {
  window.stableSSE = stableSSE;
  console.log('[SSE-STABLE] 🛠️ 调试工具已注册到 window.stableSSE');
  
  // 全局快捷测试函数
  window.testStableSSE = async () => {
    console.log('🧪 [TEST] 开始测试稳定SSE连接...');
    await stableSSE.connect();
    
    setTimeout(() => {
      console.log('📊 [TEST] 连接状态:', stableSSE.status);
    }, 5000);
  };
}

export default stableSSE;