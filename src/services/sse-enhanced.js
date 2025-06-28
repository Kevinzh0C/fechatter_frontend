/**
 * Enhanced SSE Service with Cloudflare Tunnel support
 * Provides real-time messaging with intelligent reconnection
 */

import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';

// Disable enhanced SSE to prevent conflicts
const DISABLE_ENHANCED_SSE = false;

class EnhancedSSEService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.connectionState = 'disconnected';
    this.connectionAttempts = 0;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.maxReconnectAttempts = 10;
    this.lastActivityTime = Date.now();
    this.connectionStartTime = null;
    
    // Event listeners
    this.listeners = new Map();
    
    // SSE endpoint fallbacks
    this.sseEndpointFallbacks = [
      '/events',
      '/api/events', 
      '/realtime/events'
    ];
    this.fallbackIndex = 0;
    
    // Connection quality tracking
    this.latencyHistory = [];
    this.errorHistory = [];
    this.connectionQuality = 'UNKNOWN';
    
    // Retry control
    this.retryControl = {
      totalAttempts: 0,
      consecutiveFailures: 0,
      maxTotalAttempts: 50,
      maxConsecutiveFailures: 10,
      permanentFailure: false,
      lastAttemptTime: 0,
      errorTypeHistory: []
    };
    
    // Network status
    this.networkStatus = {
      isOnline: navigator.onLine || true
    };
    
    // Error handler
    this.errorHandler = {
      handleConnectionError: (error) => {
        console.error('🔌 SSE Connection Error:', error);
        return true;
      },
      handleMessageError: (error, context) => {
        console.error(`🔌 SSE Message Error (${context}):`, error);
      },
      handleGeneralError: (error, context) => {
        console.error(`🔌 SSE General Error (${context}):`, error);
      }
    };
    
    // Setup network status monitoring
    this.setupNetworkMonitoring();
  }
  
  /**
   * Setup network status monitoring
   */
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      console.log('🌐 Network back online, attempting reconnection');
      const authStore = useAuthStore();
      if (authStore.token && !this.isConnected) {
        this.connect(authStore.token);
      }
    });
    
    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      console.log('🌐 Network offline, pausing SSE connection');
      this.disconnect();
    });
  }
  
  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  /**
   * Emit event
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in SSE event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Classify error type for intelligent handling
   */
  classifyError(error, response = null) {
    // HTTP status code detection
    if (response?.status === 404) {
      return 'PROXY_ERROR';
    }
    if (response?.status === 502 || response?.status === 503) {
      return 'PROXY_ERROR';
    }
    if (response?.status === 401 || response?.status === 403) {
      return 'AUTH_ERROR';
    }
    if (response?.status >= 500) {
      return 'SERVER_ERROR';
    }
    
    // Error message detection
    const message = error.message?.toLowerCase() || '';
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('stream closed') || message.includes('premature') || 
        message.includes('event stream')) {
      return 'PROXY_ERROR';
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'AUTH_ERROR';
    }
    
    // EventSource specific error detection
    if (error.target && error.target.readyState === EventSource.CLOSED) {
      if (this.connectionAttempts > 3) {
        return 'PROXY_ERROR';
      }
      return 'NETWORK_ERROR';
    }
    
    return 'NETWORK_ERROR'; // Default
  }
  
  /**
   * Get SSE URL with fallback
   */
  async getSseUrl() {
    try {
      const { getApiConfig } = await import('@/utils/configLoader');
      const apiConfig = getApiConfig();
      
      const baseUrl = apiConfig.gateway_url || 'https://hook-nav-attempt-size.trycloudflare.com';
      const endpoint = this.sseEndpointFallbacks[this.fallbackIndex];
      
      return `${baseUrl}${endpoint}`;
    } catch (error) {
      console.warn('Failed to load config, using fallback URL');
      return `https://hook-nav-attempt-size.trycloudflare.com${this.sseEndpointFallbacks[this.fallbackIndex]}`;
    }
  }
  
  /**
   * Connect to SSE
   */
  async connect(token) {
    if (DISABLE_ENHANCED_SSE) {
      console.log('🚨 Enhanced SSE service is disabled');
      return Promise.resolve();
    }
    
    if (this.isConnected || this.connectionState === 'connecting') {
      return;
    }
    
    if (!this.networkStatus.isOnline) {
      console.log('🌐 Network offline, skipping SSE connection');
      return;
    }
    
    this.connectionState = 'connecting';
    this.connectionAttempts++;
    this.connectionStartTime = Date.now();
    
    try {
      // Ensure token is valid
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid authentication token provided for SSE connection');
      }
      
      // Get SSE URL
      const sseUrl = await this.getSseUrl();
      const fullSseUrl = `${sseUrl}?access_token=${encodeURIComponent(token)}`;
      
      console.log(`🔌 SSE: Connecting to ${sseUrl} (attempt ${this.connectionAttempts})`);
      
      // Create EventSource
      this.eventSource = new EventSource(fullSseUrl);
      
      // Setup event handlers
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onmessage = this.handleMessage.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      
      // Setup specific event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('🔌 SSE: Connection setup failed:', error);
      
      const errorType = this.classifyError(error);
      this.errorHandler.handleConnectionError(error);
      
      this.connectionState = 'disconnected';
      this.scheduleReconnect(errorType);
    }
  }
  
  /**
   * Setup SSE event listeners
   */
  setupEventListeners() {
    if (!this.eventSource) return;
    
    // New message event
    this.eventSource.addEventListener('NewMessage', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleChatMessage(data);
      } catch (error) {
        this.errorHandler.handleMessageError(error, 'NewMessage');
      }
    });
    
    // Typing status event
    this.eventSource.addEventListener('TypingStatus', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleTypingStatus(data);
      } catch (error) {
        this.errorHandler.handleMessageError(error, 'TypingStatus');
      }
    });
    
    // Message read event
    this.eventSource.addEventListener('MessageRead', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessageStatus(data);
      } catch (error) {
        this.errorHandler.handleMessageError(error, 'MessageRead');
      }
    });
    
    // User presence event
    this.eventSource.addEventListener('UserPresence', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleUserPresence(data);
      } catch (error) {
        this.errorHandler.handleMessageError(error, 'UserPresence');
      }
    });
  }
  
  /**
   * Handle connection open
   */
  handleOpen(event) {
    this.isConnected = true;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.lastActivityTime = Date.now();
    
    // Reset retry control
    this.retryControl.consecutiveFailures = 0;
    
    console.log(`✅ [SSE Enhanced] Connected successfully (Total attempts: ${this.retryControl.totalAttempts})`);
    
    // Record connection latency
    if (this.connectionStartTime) {
      const connectionLatency = Date.now() - this.connectionStartTime;
      this.latencyHistory.push(connectionLatency);
      console.log(`✅ [SSE] Connected successfully in ${connectionLatency}ms`);
    }
    
    // Emit connection event
    this.emit('connected');
  }
  
  /**
   * Handle default message
   */
  handleMessage(event) {
    try {
      this.lastActivityTime = Date.now();
      const data = JSON.parse(event.data);
      this.emit('message', data);
    } catch (error) {
      this.errorHandler.handleMessageError(error, 'GenericMessage');
    }
  }
  
  /**
   * Handle chat message
   */
  handleChatMessage(message) {
    const chatStore = useChatStore();
    
    // Format message
    const formattedMessage = {
      id: parseInt(message.id),
      chat_id: message.chat_id,
      chat_type: message.chat_type,
      sender_id: message.sender_id || message.user_id,
      content: message.content,
      files: message.files || [],
      created_at: message.created_at ? new Date(message.created_at).toISOString() : new Date().toISOString(),
      sender_name: message.sender_name,
      sender_fullname: message.sender_fullname,
      sender: message.sender,
      realtime: true,
      status: 'delivered'
    };
    
    // Check if this is our own message
    const authStore = useAuthStore();
    const isOwnMessage = formattedMessage.sender_id === authStore.user?.id;
    
    if (isOwnMessage) {
      // Try to update existing message status
      const updated = chatStore.updateRealtimeMessage(formattedMessage.id, {
        status: 'delivered',
        delivered_at: formattedMessage.created_at,
        server_id: formattedMessage.id
      });
      
      if (updated) {
        console.log(`✅ [SSE] Own message ${formattedMessage.id} marked as delivered via SSE`);
        this.emit('message_delivered', formattedMessage);
        return;
      }
    }
    
    // Add to store
    chatStore.addRealtimeMessage(formattedMessage);
    
    // Mark as read for DM messages
    if (chatStore.currentChatId === message.chat_id && message.chat_type === 'Single') {
      this.markMessageRead(message.id, message.chat_id);
    }
    
    // Emit new message event
    this.emit('new_message', formattedMessage);
  }
  
  /**
   * Handle typing status
   */
  handleTypingStatus(typing) {
    this.emit('typing_status', {
      chatId: typing.chat_id,
      userId: typing.user_id,
      isTyping: typing.is_typing,
      userName: typing.user_name,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle user presence
   */
  handleUserPresence(presence) {
    this.emit('user_presence', presence);
  }
  
  /**
   * Handle message status
   */
  handleMessageStatus(status) {
    const chatStore = useChatStore();
    
    chatStore.updateRealtimeMessage(status.message_id, {
      status: 'read',
      read_at: status.read_at
    });
    
    this.emit('message_status', status);
  }
  
  /**
   * Mark message as read
   */
  async markMessageRead(messageId, chatId) {
    try {
      const { default: api } = await import('@/services/api');
      await api.post(`/realtime/chat/${chatId}/messages/${messageId}/read`, {});
    } catch (error) {
      this.errorHandler.handleGeneralError(error, 'Mark message as read');
    }
  }
  
  /**
   * Handle connection error
   */
  handleError(error) {
    this.retryControl.totalAttempts++;
    this.retryControl.consecutiveFailures++;
    
    const errorType = this.classifyError(error);
    this.errorHistory.push(Date.now());
    
    console.error(`🔌 SSE Enhanced: Connection error (Attempt ${this.retryControl.totalAttempts}/${this.retryControl.maxTotalAttempts})`, { type: errorType, error });
    
    // Check for permanent failure
    if (this.retryControl.totalAttempts >= this.retryControl.maxTotalAttempts ||
        this.retryControl.consecutiveFailures >= this.retryControl.maxConsecutiveFailures) {
      this.retryControl.permanentFailure = true;
      console.error('🔌 SSE Enhanced: Maximum retry attempts reached, connection permanently failed');
      
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      
      this.isConnected = false;
      this.connectionState = 'permanently_failed';
      this.emit('permanently_failed', {
        totalAttempts: this.retryControl.totalAttempts,
        consecutiveFailures: this.retryControl.consecutiveFailures
      });
      return;
    }
    
    this.errorHandler.handleConnectionError(error);
    
    this.isConnected = false;
    this.connectionState = 'disconnected';
    
    this.emit('disconnected', { error, errorType });
    
    this.scheduleReconnect(errorType);
  }
  
  /**
   * Schedule reconnection
   */
  scheduleReconnect(errorType) {
    if (this.retryControl.permanentFailure || !this.networkStatus.isOnline) {
      return;
    }
    
    const baseDelay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    const delay = Math.floor(baseDelay);
    
    console.log(`🔄 [SSE] Reconnect scheduled in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts + 1})`);
    
    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (!this.networkStatus.isOnline) {
        console.log('🔌 [SSE] Network went offline during reconnect delay');
        return;
      }
      
      const authStore = useAuthStore();
      if (authStore.token) {
        this.connect(authStore.token);
      }
    }, delay);
  }
  
  /**
   * Disconnect SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.connectionState = 'disconnected';
    
    console.log('🔌 [SSE] Disconnected');
    this.emit('disconnected');
  }
  
  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      connectionAttempts: this.connectionAttempts,
      reconnectAttempts: this.reconnectAttempts,
      lastActivityTime: this.lastActivityTime,
      connectionQuality: this.connectionQuality,
      retryControl: this.retryControl
    };
  }
}

// Create singleton instance
const enhancedSSEService = new EnhancedSSEService();

export default enhancedSSEService; 