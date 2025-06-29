import { fetchEventSource } from '@microsoft/fetch-event-source';
import tokenSynchronizer from './tokenSynchronizer';

/**
 * 🎯 Modern SSE Service - 基于微软fetch-event-source
 * 
 * 优势:
 * - 现代fetch API
 * - 兼容后端URL参数token格式
 * - 自动重连机制
 * - 更好的错误处理
 * - TypeScript原生支持
 * - 轻量级 (~5KB)
 */
class ModernSSEService {
  constructor() {
    this.controller = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
  }

  /**
   * 🚀 连接SSE - 比原生EventSource强大得多
   */
  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._initializeConnection();
    return this.connectionPromise;
  }

  async _initializeConnection() {
    try {
      const token = await tokenSynchronizer.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // 🔧 CRITICAL FIX: 使用URL参数传递token，与后端API兼容
      const url = this._getSSEUrl() + `?access_token=${encodeURIComponent(token)}`;
      console.log('🚀 [ModernSSE] Connecting to:', url.replace(token, '***'));

      // 清除之前的连接
      if (this.controller) {
        this.controller.abort();
      }
      this.controller = new AbortController();

      // 🎯 fetch-event-source的强大配置
      await fetchEventSource(url, {
        signal: this.controller.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
          // 🔧 REMOVED: Authorization header (后端不支持，使用URL参数)
        },
        
        // 🔧 连接打开回调
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            console.log('✅ [ModernSSE] Connection opened successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            return; // 连接成功，继续接收事件
          } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            // 4xx错误（除了429）不应该重试
            const errorText = await response.text();
            console.error('❌ [ModernSSE] Client error, will not retry:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          } else {
            // 其他错误，抛出以触发重试
            console.warn('⚠️ [ModernSSE] Server error, will retry:', response.status);
            throw new Error(`HTTP ${response.status}`);
          }
        },

        // 🔧 消息接收回调
        onmessage: (event) => {
          console.log('📨 [ModernSSE] Message received:', event.data.substring(0, 100) + '...');
          this._handleMessage(event);
        },

        // 🔧 连接关闭回调
        onclose: () => {
          console.log('🔌 [ModernSSE] Connection closed');
          this.isConnected = false;
          // fetchEventSource会自动重连，这里不需要手动处理
        },

        // 🔧 错误处理回调
        onerror: (error) => {
          console.error('❌ [ModernSSE] Connection error:', error);
          this.isConnected = false;
          
          // 如果是AbortError，说明是手动取消，不重试
          if (error.name === 'AbortError') {
            console.log('🛑 [ModernSSE] Connection manually aborted');
            throw error; // 停止重试
          }
          
          // 其他错误，fetchEventSource会自动重试
          this.reconnectAttempts++;
          console.log(`🔄 [ModernSSE] Will retry connection (attempt ${this.reconnectAttempts})`);
          
          // 如果重试次数过多，停止重试
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [ModernSSE] Max reconnection attempts reached');
            throw new Error('Max reconnection attempts reached');
          }
        },

        // 🔧 重连延迟配置
        openWhenHidden: true // 即使页面隐藏也保持连接
      });

    } catch (error) {
      this.isConnected = false;
      this.connectionPromise = null;
      console.error('❌ [ModernSSE] Connection failed:', error);
      throw error;
    }
  }

  /**
   * 📨 处理接收到的消息
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type || event.type || 'message';
      
      console.log(`📨 [ModernSSE] Processing event: ${eventType}`);
      this._emitToListeners(eventType, data);
      
    } catch (error) {
      console.warn('⚠️ [ModernSSE] Failed to parse message:', event.data, error);
    }
  }

  /**
   * 👂 事件监听
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(callback);
    
    return () => {
      const listeners = this.listeners.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 📡 分发事件
   */
  _emitToListeners(eventType, data) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn('[ModernSSE] Listener error:', error);
      }
    });
  }

  /**
   * 🌐 获取SSE URL
   */
  _getSSEUrl() {
    const isViteEnv = window.location.port === '5173' || window.location.port === '5174';
    
    if (isViteEnv) {
      return '/events'; // Vite代理
    } else {
      return 'https://hook-nav-attempt-size.trycloudflare.com/events';
    }
  }

  /**
   * 🔌 断开连接
   */
  disconnect() {
    console.log('🔌 [ModernSSE] Disconnecting...');
    
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * 📊 连接状态
   */
  get connected() {
    return this.isConnected;
  }

  /**
   * 📈 连接信息
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      library: '@microsoft/fetch-event-source'
    };
  }
}

export const modernSSEService = new ModernSSEService();

// 开发调试
if (import.meta.env.DEV) {
  window.modernSSEService = modernSSEService;
  
  window.testModernSSE = async () => {
    try {
      await modernSSEService.connect();
      console.log('✅ Modern SSE connection test passed');
    } catch (error) {
      console.error('❌ Modern SSE connection test failed:', error);
    }
  };
}

export default modernSSEService; 