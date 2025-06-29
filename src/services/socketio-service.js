import { io } from 'socket.io-client';
import tokenSynchronizer from './tokenSynchronizer';

/**
 * 🚀 Socket.IO Service - 业界标准聊天实时通信
 * 
 * 优势:
 * - 自动连接降级 (WebSocket → HTTP long-polling → SSE → xhr-polling)
 * - 内建重连机制
 * - 房间和命名空间支持
 * - 消息确认和缓存
 * - 生产级可靠性
 */
class SocketIOService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 🔧 初始化连接 - 比SSE简单得多
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
      // 获取认证token
      const token = await tokenSynchronizer.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // 获取服务器URL
      const serverUrl = this._getServerUrl();
      
      console.log('🚀 [SocketIO] Initializing connection to:', serverUrl);

      // 🎯 Socket.IO配置 - 自动处理所有连接问题
      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        // 🔧 传输方式自动降级
        transports: ['websocket', 'polling', 'htmlfile', 'xhr-polling', 'jsonp-polling']
      });

      // 设置事件监听器
      this._setupEventListeners();

      // 等待连接建立
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('✅ [SocketIO] Connected successfully');
          console.log('📡 [SocketIO] Transport:', this.socket.io.engine.transport.name);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ [SocketIO] Connection failed:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ [SocketIO] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 事件监听器设置
   */
  _setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ [SocketIO] Connected with ID:', this.socket.id);
      
      // 重新加入之前的房间
      this._rejoinRooms();
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn('⚠️ [SocketIO] Disconnected:', reason);
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(`🔄 [SocketIO] Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
    });

    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ [SocketIO] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('❌ [SocketIO] All reconnection attempts failed');
      this.isConnected = false;
    });

    // 🎯 聊天相关事件
    this.socket.on('new_message', (data) => {
      console.log('📨 [SocketIO] New message:', data);
      this._emitToListeners('new_message', data);
    });

    this.socket.on('user_joined', (data) => {
      console.log('👋 [SocketIO] User joined:', data);
      this._emitToListeners('user_joined', data);
    });

    this.socket.on('user_left', (data) => {
      console.log('👋 [SocketIO] User left:', data);
      this._emitToListeners('user_left', data);
    });

    this.socket.on('typing_start', (data) => {
      this._emitToListeners('typing_start', data);
    });

    this.socket.on('typing_stop', (data) => {
      this._emitToListeners('typing_stop', data);
    });
  }

  /**
   * 🏠 加入聊天房间 - Socket.IO的强大功能
   */
  joinChatRoom(chatId) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ [SocketIO] Cannot join room - not connected');
      return;
    }

    console.log(`🏠 [SocketIO] Joining chat room: ${chatId}`);
    this.socket.emit('join_chat', { chatId });
  }

  /**
   * 🚪 离开聊天房间
   */
  leaveChatRoom(chatId) {
    if (!this.isConnected || !this.socket) {
      return;
    }

    console.log(`🚪 [SocketIO] Leaving chat room: ${chatId}`);
    this.socket.emit('leave_chat', { chatId });
  }

  /**
   * 📨 发送消息 - 带确认机制
   */
  sendMessage(chatId, content, callback) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ [SocketIO] Cannot send message - not connected');
      return false;
    }

    const messageData = {
      chatId,
      content,
      timestamp: new Date().toISOString()
    };

    // 🎯 Socket.IO的消息确认机制
    this.socket.emit('send_message', messageData, (response) => {
      if (response.success) {
        console.log('✅ [SocketIO] Message sent successfully:', response.messageId);
      } else {
        console.error('❌ [SocketIO] Message send failed:', response.error);
      }
      callback?.(response);
    });

    return true;
  }

  /**
   * ⌨️ 发送打字状态
   */
  sendTypingStatus(chatId, isTyping) {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit(isTyping ? 'typing_start' : 'typing_stop', { chatId });
  }

  /**
   * 👂 事件监听 - 类似之前的SSE接口
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
   * 📡 分发事件给监听器
   */
  _emitToListeners(eventType, data) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn('[SocketIO] Listener error:', error);
      }
    });
  }

  /**
   * 🔄 重新加入房间 (重连后)
   */
  _rejoinRooms() {
    // 这里可以根据应用状态重新加入相关房间
    const currentChatId = this._getCurrentChatId();
    if (currentChatId) {
      this.joinChatRoom(currentChatId);
    }
  }

  /**
   * 🌐 获取服务器URL
   */
  _getServerUrl() {
    const isViteEnv = window.location.port === '5173' || window.location.port === '5174';
    
    if (isViteEnv) {
      // 开发环境：使用相对路径，Vite会代理
      return window.location.origin;
    } else {
      // 生产环境：直接连接后端
      return 'https://hook-nav-attempt-size.trycloudflare.com';
    }
  }

  /**
   * 📍 获取当前聊天ID
   */
  _getCurrentChatId() {
    const match = window.location.pathname.match(/\/chat\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * 🔌 断开连接
   */
  disconnect() {
    console.log('🔌 [SocketIO] Disconnecting...');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
    this.listeners.clear();
  }

  /**
   * 📊 连接状态
   */
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  /**
   * 📈 连接质量信息
   */
  getConnectionInfo() {
    if (!this.socket) {
      return { connected: false };
    }

    return {
      connected: this.socket.connected,
      transport: this.socket.io?.engine?.transport?.name,
      id: this.socket.id,
      reconnectAttempts: this.reconnectAttempts,
      ping: this.socket.ping || 0
    };
  }
}

// 导出单例
export const socketService = new SocketIOService();

// 开发环境调试
if (import.meta.env.DEV) {
  window.socketService = socketService;
  
  // 🔧 调试函数
  window.testSocketIO = async () => {
    try {
      await socketService.connect();
      console.log('✅ Socket.IO connection test passed');
      console.log('📊 Connection info:', socketService.getConnectionInfo());
    } catch (error) {
      console.error('❌ Socket.IO connection test failed:', error);
    }
  };

  console.log('🔧 Socket.IO debugging: use testSocketIO() to test connection');
}

export default socketService; 