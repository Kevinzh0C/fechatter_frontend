/**
 * 优化的SSE服务 - 精简高效版本
 * 解决前端架构问题，提升SSE连接性能
 */

class OptimizedSSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.connectionState = 'disconnected';
    
    // 简化状态管理
    this.lastMessageTime = null;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    
    // 防止并发连接
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  /**
   * 🚀 优化：单一连接入口，防止并发
   */
  async connect(token = null) {
    // 防止重复连接
    if (this.isConnecting) {
      return this.connectionPromise;
    }
    
    if (this.isConnected) {
      console.log('[SSE-OPT] 连接已存在，跳过重连');
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = this._doConnect(token);
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * 🔧 核心连接逻辑 - 精简版
   */
  async _doConnect(token) {
    try {
      // 1. 获取token (简化策略)
      if (!token) {
        token = await this._getToken();
      }
      
      if (!token) {
        throw new Error('无法获取认证token');
      }

      // 2. 构建连接URL (简化)
      const url = this._buildSSEUrl(token);
      
      // 3. 创建EventSource
      await this._createEventSource(url);
      
      console.log('[SSE-OPT] ✅ 连接建立成功');
      
    } catch (error) {
      console.error('[SSE-OPT] ❌ 连接失败:', error.message);
      this._handleConnectionError();
    }
  }

  /**
   * 🎯 简化的token获取策略
   */
  async _getToken() {
    // 优先从localStorage获取 (最快)
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
   * 🌐 构建SSE URL (去除复杂的环境检测)
   */
  _buildSSEUrl(token) {
    const baseUrl = window.location.port === '5173' || window.location.port === '5174' 
      ? '/events' // 开发环境使用代理
      : 'https://hook-nav-attempt-size.trycloudflare.com/events'; // 生产环境直连
    
    return `${baseUrl}?access_token=${encodeURIComponent(token)}`;
  }

  /**
   * 🔌 创建EventSource连接
   */
  _createEventSource(url) {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(url);
      
      // 连接超时 (简化)
      const timeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new Error('连接超时'));
      }, 15000);

      this.eventSource.onopen = () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.connectionState = 'connected';
        this.connectionAttempts = 0;
        console.log('[SSE-OPT] 🟢 连接已建立');
        resolve();
      };

      this.eventSource.onmessage = (event) => {
        this._handleMessage(event);
      };

      this.eventSource.onerror = () => {
        clearTimeout(timeout);
        this.isConnected = false;
        this.connectionState = 'error';
        reject(new Error('连接错误'));
      };
    });
  }

  /**
   * 📨 优化的消息处理 (移除无界限的消息ID跟踪)
   */
  _handleMessage(event) {
    this.lastMessageTime = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type || 'message';
      
      // 分发给监听器
      const listeners = this.listeners.get(eventType) || [];
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('[SSE-OPT] 监听器错误:', error);
        }
      });
      
    } catch (error) {
      console.warn('[SSE-OPT] 消息解析失败:', event.data.substring(0, 100));
    }
  }

  /**
   * 🔄 简化的错误处理和重连
   */
  _handleConnectionError() {
    this.connectionAttempts++;
    
    if (this.connectionAttempts <= this.maxRetries) {
      const delay = Math.min(1000 * this.connectionAttempts, 5000);
      console.log(`[SSE-OPT] 🔄 ${delay}ms后重试 (${this.connectionAttempts}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('[SSE-OPT] ❌ 重试次数已达上限，停止重连');
      this.connectionState = 'failed';
    }
  }

  /**
   * 📋 事件监听器注册 (保持简单)
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
   * 🛑 干净的断开连接 (修复内存泄漏)
   */
  disconnect() {
    console.log('[SSE-OPT] 🔌 断开连接...');
    
    // 关闭EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理状态
    this.isConnected = false;
    this.connectionState = 'disconnected';
    this.lastMessageTime = null;
    this.connectionAttempts = 0;
    
    // 清理监听器
    this.listeners.clear();
    
    console.log('[SSE-OPT] ✅ 资源已清理');
  }

  /**
   * 📊 获取连接状态
   */
  get connected() {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  get readyState() {
    return this.eventSource?.readyState || EventSource.CLOSED;
  }
}

// 导出单例实例 (防止多个实例)
export const optimizedSSE = new OptimizedSSEService();

// 开发环境调试
if (import.meta.env.DEV) {
  window.optimizedSSE = optimizedSSE;
  console.log('[SSE-OPT] 🛠️ 调试工具已注册到 window.optimizedSSE');
}

export default optimizedSSE;