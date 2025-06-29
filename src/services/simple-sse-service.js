import ReconnectingEventSource from 'reconnecting-eventsource';
import tokenSynchronizer from './tokenSynchronizer';

/**
 * 🎯 Simple SSE Service - 基于reconnecting-eventsource
 * 
 * 优势:
 * - 轻量级 (~2KB)
 * - 直接替换原生EventSource
 * - 自动重连
 * - 简单易用
 * - 最小学习成本
 */
class SimpleSSEService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  /**
   * 🚀 连接SSE - 一行代码解决重连问题
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

      const url = `${this._getSSEUrl()}?access_token=${encodeURIComponent(token)}`;
      console.log('🚀 [SimpleSSE] Connecting to:', url.replace(/access_token=[^&]+/, 'access_token=***'));

      // 关闭现有连接
      if (this.eventSource) {
        this.eventSource.close();
      }

      // 🎯 reconnecting-eventsource配置 - 比原生EventSource强大
      this.eventSource = new ReconnectingEventSource(url, {
        // 重连配置
        max_retry_time: 30000,      // 最大重连间隔30秒
        initial_retry_delay: 1000,  // 初始重连延迟1秒
        retry_delay_multiplier: 1.5, // 延迟倍数1.5
        max_retry_attempts: 10,     // 最大重试10次
        
        // EventSource配置
        withCredentials: false,
        
        // 自定义headers (通过URL参数，因为EventSource限制)
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      // 设置事件监听器
      this._setupEventListeners();

      // 等待连接建立
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.eventSource.addEventListener('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.log('✅ [SimpleSSE] Connected successfully');
          console.log('🔗 [SimpleSSE] Ready state:', this.eventSource.readyState);
          resolve();
        });

        this.eventSource.addEventListener('error', (error) => {
          console.warn('⚠️ [SimpleSSE] Connection error (will auto-retry):', error);
          // reconnecting-eventsource会自动重试，这里不需要reject
        });
      });

    } catch (error) {
      this.isConnected = false;
      this.connectionPromise = null;
      console.error('❌ [SimpleSSE] Connection failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 设置事件监听器
   */
  _setupEventListeners() {
    // 连接打开
    this.eventSource.addEventListener('open', () => {
      this.isConnected = true;
      console.log('✅ [SimpleSSE] Connection opened');
    });

    // 连接错误
    this.eventSource.addEventListener('error', (error) => {
      console.warn('⚠️ [SimpleSSE] Connection error:', error);
      // reconnecting-eventsource会自动处理重连
    });

    // 消息接收
    this.eventSource.addEventListener('message', (event) => {
      console.log('📨 [SimpleSSE] Message received:', event.data.substring(0, 100) + '...');
      this._handleMessage(event);
    });

    // 自定义事件类型
    const customEvents = ['new_message', 'user_joined', 'user_left', 'typing_start', 'typing_stop'];
    customEvents.forEach(eventType => {
      this.eventSource.addEventListener(eventType, (event) => {
        console.log(`📨 [SimpleSSE] ${eventType} event:`, event.data);
        this._handleMessage(event, eventType);
      });
    });
  }

  /**
   * 📨 处理消息
   */
  _handleMessage(event, eventType = null) {
    try {
      const data = JSON.parse(event.data);
      const type = eventType || data.type || 'message';
      
      this._emitToListeners(type, data);
      
    } catch (error) {
      console.warn('⚠️ [SimpleSSE] Failed to parse message:', event.data, error);
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
        console.warn('[SimpleSSE] Listener error:', error);
      }
    });
  }

  /**
   * 🌐 获取SSE URL
   */
  _getSSEUrl() {
    const isViteEnv = window.location.port === '5173' || window.location.port === '5174';
    
    if (isViteEnv) {
      return '/events';
    } else {
      return 'https://hook-nav-attempt-size.trycloudflare.com/events';
    }
  }

  /**
   * 🔌 断开连接
   */
  disconnect() {
    console.log('🔌 [SimpleSSE] Disconnecting...');
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
    this.listeners.clear();
  }

  /**
   * 📊 连接状态
   */
  get connected() {
    return this.isConnected && this.eventSource?.readyState === 1;
  }

  /**
   * 📈 连接信息
   */
  getConnectionInfo() {
    return {
      connected: this.connected,
      readyState: this.eventSource?.readyState,
      library: 'reconnecting-eventsource'
    };
  }
}

export const simpleSSEService = new SimpleSSEService();

// 开发调试
if (import.meta.env.DEV) {
  window.simpleSSEService = simpleSSEService;
  
  window.testSimpleSSE = async () => {
    try {
      await simpleSSEService.connect();
      console.log('✅ Simple SSE connection test passed');
    } catch (error) {
      console.error('❌ Simple SSE connection test failed:', error);
    }
  };
}

export default simpleSSEService; 