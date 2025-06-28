/**
 * SSE Service - Production Stub
 * Server-Sent Events connection management
 */

import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { errorHandler } from '@/utils/errorHandler';
import { getApiBaseUrl } from '@/utils/apiUrlResolver';

class SSEService {
  constructor() {
    this.eventSource = null;
    this.isConnected = ref(false);
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.token = null;
    this.listeners = new Map();
    this.reconnectTimeoutId = null;
  }

  /**
   * Connect to SSE endpoint
   */
  async connect(token) {
    if (!token) {
      console.error('❌ [SSE] Cannot connect without token');
      return;
    }

    this.token = token;

    try {
      if (this.eventSource) {
        console.log('🔍 [SSE] Closing existing connection before creating new one');
        this.disconnect();
      }

      console.log('🔍 [SSE] Establishing SSE connection...');

      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) {
        console.error('❌ [SSE] Cannot connect: User not authenticated');
        return;
      }

      console.log('🔍 [SSE] User authenticated, proceeding with connection');

      // Use getApiBaseUrl from apiUrlResolver instead of environment variable
      const apiBaseUrl = await getApiBaseUrl();
      const sseEndpoint = `${apiBaseUrl}/realtime/sse?token=${encodeURIComponent(token)}`;

      this.eventSource = new EventSource(sseEndpoint);
      this.setupEventListeners();

      if (true) {
        console.log('🔌 SSE: Connecting...');
      }

      return true;
    } catch (error) {
      console.error('🔌 SSE: Connection failed:', error);
      errorHandler.handle(error, {
        context: 'SSE connection',
        silent: false
      });
      return false;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.eventSource) return;

    this.eventSource.onopen = (event) => {
      this.isConnected = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;

      console.log('✅ SSE: Connected');

      this.emit('connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('🔌 SSE: Failed to parse message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      this.isConnected = false;
      this.connectionState = 'disconnected';

      console.error('🔌 SSE: Connection error:', error);

      this.emit('error', error);
      this.scheduleReconnect();
    };

    // Custom event listeners
    this.eventSource.addEventListener('NewMessage', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleNewMessage(data);
      } catch (error) {
        console.error('🔌 SSE: Failed to parse NewMessage:', error);
      }
    });

    this.eventSource.addEventListener('TypingStatus', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('typing_status', data);
      } catch (error) {
        console.error('🔌 SSE: Failed to parse TypingStatus:', error);
      }
    });
  }

  /**
   * Handle new message
   */
  handleNewMessage(message) {
    const chatStore = useChatStore();

    const formattedMessage = {
      id: parseInt(message.id),
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender_name: message.sender_name,
      realtime: true
    };

    chatStore.addRealtimeMessage(formattedMessage);
    this.emit('new_message', formattedMessage);
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 SSE: Max reconnection attempts reached');
      this.emit('permanently_failed');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`🔌 SSE: Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnected = false;
    this.connectionState = 'disconnected';

    console.log('🔌 SSE: Disconnected');

    this.emit('disconnected');
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`🔌 SSE: Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export default new SSEService(); 