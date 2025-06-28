/**
 * Industry-Standard SSE Service
 * Following best practices from MDN, WHATWG, and real-world implementations
 * 
 * Key principles:
 * 1. Trust the browser's EventSource API
 * 2. Keep it simple and stupid (KISS)
 * 3. Let the browser handle reconnection
 * 4. Minimal application-level intervention
 */

class StandardSSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.listenerRegistrators = new Set(); // 🆕 Store registrator functions
    this.isConnected = false;
    this.url = null;
    this.fallbackTimer = null;
    this.useFallback = false;
    this.connectionAttempts = 0;
    this.lastPollTime = 0; // 🆕 Track last poll to avoid duplicates
    this.seenMessageIds = new Set(); // 🆕 Track seen messages to avoid duplicates
  }

  /**
   * 🆕 Add listener registrator function (required by chat store)
   */
  addListenerRegistrator(registratorFn) {
    if (typeof registratorFn === 'function') {
      this.listenerRegistrators.add(registratorFn);
      console.log('[SSE] Listener registrator added');
    } else {
      console.warn('[SSE] Invalid registrator function provided');
    }
  }

  /**
   * 🆕 Re-register all listeners (called after reconnection)
   */
  reregisterListeners() {
    this.listenerRegistrators.forEach(registrator => {
      try {
        registrator();
        console.log('[SSE] Listener re-registered successfully');
      } catch (error) {
        console.warn('[SSE] Failed to re-register listener:', error);
      }
    });
  }

  /**
   * Connect to SSE endpoint
   * 🔧 ENHANCED: Better authentication and error handling
   */
  async connect(token = null) {
    this.connectionAttempts++;
    
    // 🔧 ENHANCED: Better environment detection
    const currentPort = window.location.port;
    const isViteEnv = currentPort === '5173' || currentPort === '5174';
    
    let baseUrl;
    if (isViteEnv) {
      baseUrl = '/events'; // Force proxy
      console.log('[SSE] Using Vite proxy URL:', baseUrl);
    } else {
      // Production or staging environment
      try {
        const { getSseUrl } = await import('@/utils/apiUrlResolver.js');
        baseUrl = await getSseUrl();
        console.log('[SSE] Using resolved URL:', baseUrl);
      } catch (error) {
        console.warn('[SSE] Failed to resolve URL, using fallback:', error);
        baseUrl = '/events'; // Fallback to relative path
      }
    }
    
    if (!baseUrl) {
      console.error('[SSE] No base URL available');
      return;
    }

    // 🔧 ENHANCED: Better token retrieval with multiple strategies
    if (!token) {
      token = await this.getTokenWithMultipleStrategies();
    }

    if (!token) {
      console.error('[SSE] No authentication token available for SSE connection');
      this.startPollingFallback(null); // Start polling without auth to check connectivity
      return;
    }

    // 🆕 NEW: Attempt to refresh token if expired/expiring
    token = await this.refreshTokenIfNeeded(token);
    
    if (!token) {
      console.error('[SSE] Token expired and refresh failed, user needs to re-login');
      // Clear auth state to trigger re-login
      this.clearAuthState();
      return;
    }

    // 🔧 ENHANCED: Better token validation
    if (!this.isValidJWTFormat(token)) {
      console.error('[SSE] Invalid token format for SSE:', token.substring(0, 20) + '...');
      return;
    }

    // Clean URL construction with proper token format
    this.url = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    
    console.log('[SSE] Attempting connection to:', this.url.replace(/access_token=[^&]+/, 'access_token=***'));
    
    // 🔧 NEW: Try SSE first, fallback to polling if fails
    try {
      await this.trySSEConnection();
    } catch (error) {
      console.warn('[SSE] SSE connection failed, falling back to polling:', error);
      this.startPollingFallback(token);
    }
  }

  /**
   * 🔧 ENHANCED: Multi-strategy token retrieval with proper error handling
   */
  async getTokenWithMultipleStrategies() {
    const strategies = [
      // Strategy 1: Direct localStorage (fastest, most reliable)
      () => {
        const token = localStorage.getItem('auth_token');
        if (token && token.length > 20) {
          console.log('[SSE] Using auth_token from localStorage');
          return token;
        }
        return null;
      },

      // Strategy 2: Auth store (Vue/Pinia store)
      async () => {
        try {
          const { useAuthStore } = await import('@/stores/auth');
          const authStore = useAuthStore();
          const token = authStore.token;
          if (token && token.length > 20) {
            console.log('[SSE] Using token from auth store');
            return token;
          }
        } catch (error) {
          console.warn('[SSE] Failed to get token from auth store:', error);
        }
        return null;
      },

      // Strategy 3: TokenManager (memory-based)
      async () => {
        try {
          if (window.tokenManager) {
            const token = window.tokenManager.getAccessToken();
            if (token && token.length > 20) {
              console.log('[SSE] Using token from tokenManager');
              return token;
            }
          }
        } catch (error) {
          console.warn('[SSE] Failed to get token from tokenManager:', error);
        }
        return null;
      },

      // Strategy 4: Alternative localStorage keys
      () => {
        const keys = ['access_token', 'token', 'fechatter_auth'];
        for (const key of keys) {
          const token = localStorage.getItem(key);
          if (token && token.length > 20) {
            console.log(`[SSE] Using token from localStorage key: ${key}`);
            return token;
          }
        }
        return null;
      }
    ];

    for (const strategy of strategies) {
      try {
        const token = await strategy();
        if (token) {
          return token;
        }
      } catch (error) {
        console.warn('[SSE] Token strategy failed:', error);
      }
    }

    console.error('[SSE] All token retrieval strategies failed');
    return null;
  }

  /**
   * 🔧 NEW: Validate JWT format and expiry
   */
  isValidJWTFormat(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every(part => part.length > 0)) return false;
    
    // 🆕 NEW: Check token expiry
    try {
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp <= now) {
        console.warn('[SSE] Token is expired:', {
          exp: payload.exp,
          expDate: new Date(payload.exp * 1000).toISOString(),
          now: now,
          nowDate: new Date(now * 1000).toISOString(),
          expiredSecondsAgo: now - payload.exp
        });
        return false;
      }
      
      // 🆕 Warn if token expires soon (within 5 minutes)
      if (payload.exp && (payload.exp - now) < 300) {
        console.warn('[SSE] Token expires soon:', {
          expiresIn: payload.exp - now,
          expiresAt: new Date(payload.exp * 1000).toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.warn('[SSE] Failed to decode JWT payload:', error);
      return false;
    }
  }

  /**
   * 🆕 NEW: Attempt to refresh expired token before connecting
   */
  async refreshTokenIfNeeded(token) {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return token; // Not JWT, return as-is
      
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // If token is expired or expires within 2 minutes, try to refresh
      if (payload.exp && (payload.exp - now) < 120) {
        console.log('[SSE] Token expired or expiring soon, attempting refresh...');
        
        // Try to refresh using auth store
        try {
          const { useAuthStore } = await import('@/stores/auth');
          const authStore = useAuthStore();
          
          // Check if auth store has token available (auth store doesn't refresh directly)
          const storeToken = authStore.token;
          if (storeToken && storeToken !== token && storeToken.length > 20) {
            console.log('[SSE] Using fresh token from auth store');
            return storeToken;
          }
        } catch (refreshError) {
          console.warn('[SSE] Token refresh via auth store failed:', refreshError);
        }
        
        // Try to refresh using token manager
        try {
          if (window.tokenManager && typeof window.tokenManager.refreshToken === 'function') {
            await window.tokenManager.refreshToken();
            const newToken = window.tokenManager.getAccessToken();
            
            if (newToken && newToken !== token) {
              console.log('[SSE] Token refreshed via tokenManager');
              return newToken;
            }
          }
        } catch (refreshError) {
          console.warn('[SSE] Token refresh via tokenManager failed:', refreshError);
        }
        
        console.error('[SSE] Unable to refresh expired token, user needs to re-login');
        return null; // Token expired and can't refresh
      }
      
      return token; // Token is still valid
    } catch (error) {
      console.warn('[SSE] Token validation failed:', error);
      return token; // Return original token if validation fails
    }
  }

  /**
   * Try SSE connection with timeout
   */
  async trySSEConnection() {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.warn('[SSE] Connection timeout, SSE service may be unavailable');
        console.warn('[SSE] EventSource readyState:', this.eventSource?.readyState);
        console.warn('[SSE] EventSource URL:', this.eventSource?.url);
        
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        reject(new Error('SSE connection timeout'));
      }, 10000); // 🔧 Increased timeout from 5s to 10s

      try {
        this.eventSource = new EventSource(this.url);
        
        // 🔧 ENHANCED: Better connection monitoring
        let connectionMonitorInterval = setInterval(() => {
          if (this.eventSource) {
            const readyState = this.eventSource.readyState;
            const states = ['CONNECTING', 'OPEN', 'CLOSED'];
            console.log(`[SSE] Connection monitor: ${states[readyState]} (${readyState})`);
            
            if (readyState === EventSource.CLOSED) {
              console.warn('[SSE] Connection closed unexpectedly during connection attempt');
              clearInterval(connectionMonitorInterval);
              clearTimeout(connectionTimeout);
              reject(new Error('SSE connection closed unexpectedly'));
            }
          }
        }, 2000); // Check every 2 seconds
        
        // Success handler
        this.eventSource.onopen = () => {
          clearTimeout(connectionTimeout);
          clearInterval(connectionMonitorInterval);
          this.isConnected = true;
          this.useFallback = false; // 🔧 Clear fallback flag on successful SSE
          console.log('[SSE] EventSource connected successfully');
          console.log('[SSE] EventSource URL:', this.eventSource.url);
          console.log('[SSE] EventSource readyState:', this.eventSource.readyState);
          // 🆕 Re-register listeners after successful connection
          this.reregisterListeners();
          resolve();
        };

        // Message handler
        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        // Error handler - 🔧 ENHANCED with better diagnostics
        this.eventSource.onerror = (error) => {
          clearTimeout(connectionTimeout);
          clearInterval(connectionMonitorInterval);
          this.isConnected = false;
          
          const readyState = this.eventSource?.readyState;
          const url = this.eventSource?.url;
          const states = ['CONNECTING', 'OPEN', 'CLOSED'];
          
          console.warn('[SSE] EventSource error occurred');
          console.warn('[SSE] Error readyState:', readyState, `(${states[readyState] || 'UNKNOWN'})`);
          console.warn('[SSE] Error URL:', url);
          console.warn('[SSE] Error event:', error);
          
          // 🔧 ENHANCED: Provide specific error diagnostics
          if (readyState === EventSource.CONNECTING) {
            console.warn('[SSE] Error during connection - likely network or CORS issue');
          } else if (readyState === EventSource.CLOSED) {
            console.warn('[SSE] Connection was closed - likely authentication or server issue');
          }
          
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          
          reject(new Error(`SSE connection failed - readyState: ${readyState}`));
        };

        console.log('[SSE] EventSource created, waiting for connection...');
        console.log('[SSE] EventSource URL:', this.url.replace(/access_token=[^&]+/, 'access_token=***'));
        console.log('[SSE] EventSource initial readyState:', this.eventSource.readyState);
        
      } catch (error) {
        clearTimeout(connectionTimeout);
        console.error('[SSE] Failed to create EventSource:', error);
        console.error('[SSE] Error name:', error.name);
        console.error('[SSE] Error message:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Start HTTP polling as fallback
   * 🔧 ENHANCED: Smarter polling with current chat awareness
   */
  async startPollingFallback(token) {
    console.log('[SSE] Starting HTTP polling fallback');
    this.useFallback = true;
    this.isConnected = true; // Mark as "connected" for API compatibility
    
    // 🆕 Re-register listeners for fallback mode too
    this.reregisterListeners();
    
    // 🔧 ENHANCED: Smarter polling interval based on activity
    const getPollingInterval = () => {
      const currentChatId = this.getCurrentChatId();
      if (!currentChatId) return 5000; // 5 seconds if no active chat
      return 2000; // 2 seconds for active chat
    };
    
    // Poll with dynamic interval
    this.fallbackTimer = setInterval(async () => {
      try {
        await this.pollForMessages(token);
      } catch (error) {
        console.warn('[SSE] Polling error:', error);
      }
    }, getPollingInterval());

    // Initial poll
    setTimeout(() => this.pollForMessages(token), 100);
  }

  /**
   * Poll for messages using HTTP
   * 🔧 COMPLETELY FIXED: Use correct existing endpoints with proper auth
   */
  async pollForMessages(token) {
    try {
      const currentChatId = this.getCurrentChatId();
      
      if (!currentChatId) {
        // 🔧 NEW: If no current chat, poll workspace chats for any new activity
        await this.pollWorkspaceActivity(token);
        return;
      }
      
      // 🔧 RATE LIMITING: Avoid too frequent polls
      const now = Date.now();
      if (now - this.lastPollTime < 1000) { // Minimum 1 second between polls
        return;
      }
      this.lastPollTime = now;
      
      const apiBase = window.location.port === '5173' || window.location.port === '5174' ? 
                     '' : 'https://hook-nav-attempt-size.trycloudflare.com';
      
      if (!token) {
        console.debug('[SSE] No token available for polling');
        return;
      }
      
      // 🔧 FIXED: Use correct working chat messages endpoint
      const response = await fetch(`${apiBase}/api/chat/${currentChatId}/messages?limit=3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Extract messages from API response (various response formats)
        const messages = data.data || data.messages || data || [];
        
        if (Array.isArray(messages) && messages.length > 0) {
          // Process messages (they're usually sorted newest first)
          messages.slice(0, 2).forEach(message => { // Only process latest 2 to avoid spam
            const messageId = message.id || message.message_id;
            
            // 🔧 DEDUPLICATION: Skip if we've already seen this message
            if (this.seenMessageIds.has(messageId)) {
              return;
            }
            this.seenMessageIds.add(messageId);
            
            // Clean up old seen IDs (keep only last 100)
            if (this.seenMessageIds.size > 100) {
              const idsArray = Array.from(this.seenMessageIds);
              this.seenMessageIds.clear();
              idsArray.slice(-50).forEach(id => this.seenMessageIds.add(id));
            }
            
            // Simulate SSE message format for new messages
            this.handleMessage({
              data: JSON.stringify({
                type: 'new_message',
                id: messageId,
                content: message.content,
                sender_id: message.sender_id,
                sender: message.sender,
                chat_id: message.chat_id || currentChatId,
                created_at: message.created_at,
                files: message.files || [],
                mentions: message.mentions || []
              })
            });
          });
        }
      } else if (response.status === 401) {
        console.warn('[SSE] Polling auth failed, token may be expired');
        
        // 🆕 Try to refresh token once before giving up
        try {
          const refreshedToken = await this.refreshTokenIfNeeded(token);
          if (refreshedToken && refreshedToken !== token) {
            console.log('[SSE] Token refreshed during polling, will retry');
            // Update token for next poll
            token = refreshedToken;
            return; // Continue polling with new token
          }
        } catch (refreshError) {
          console.warn('[SSE] Token refresh during polling failed:', refreshError);
        }
        
        // If refresh failed, clear auth state and stop polling
        console.error('[SSE] Authentication failed and refresh unsuccessful, clearing auth state');
        this.clearAuthState();
        
        // Stop polling to avoid spam
        if (this.fallbackTimer) {
          clearInterval(this.fallbackTimer);
          this.fallbackTimer = null;
        }
        
        // Disconnect SSE service
        this.isConnected = false;
        this.useFallback = false;
      } else {
        console.warn('[SSE] Polling response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('[SSE] Polling request failed:', error);
      
      // On network error, reduce polling frequency
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = setInterval(async () => {
          try {
            await this.pollForMessages(token);
          } catch (error) {
            console.warn('[SSE] Polling error:', error);
          }
        }, 10000); // Reduce to every 10 seconds on error
      }
    }
  }

  /**
   * 🔧 NEW: Poll workspace activity when no active chat
   */
  async pollWorkspaceActivity(token) {
    if (!token) return;
    
    try {
      const apiBase = window.location.port === '5173' || window.location.port === '5174' ? 
                     '' : 'https://hook-nav-attempt-size.trycloudflare.com';
      
      const response = await fetch(`${apiBase}/api/workspace/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Could process workspace-level updates here
        console.debug('[SSE] Workspace activity poll successful');
      }
    } catch (error) {
      console.debug('[SSE] Workspace activity poll failed:', error);
    }
  }

  /**
   * 🔧 ENHANCED: Get current chat ID from various sources with better reliability
   */
  getCurrentChatId() {
    // Try to get from URL first (most reliable)
    const urlChatId = window.location.pathname.match(/\/chat\/(\d+)/)?.[1];
    if (urlChatId) {
      return parseInt(urlChatId);
    }
    
    // Try Vue router
    try {
      if (window.$router?.currentRoute?.value?.params?.id) {
        const routerId = window.$router.currentRoute.value.params.id;
        return parseInt(routerId);
      }
    } catch (error) {
      // Router not available
    }
    
    // Try to get from store if available
    try {
      const chatStore = window.useChatStore?.();
      if (chatStore?.currentChatId) {
        return chatStore.currentChatId;
      }
    } catch (error) {
      // Store not available
    }
    
    // Try from global store access
    try {
      if (window.__pinia_stores__?.chat) {
        const chatStore = window.__pinia_stores__.chat();
        if (chatStore?.currentChatId) {
          return chatStore.currentChatId;
        }
      }
    } catch (error) {
      // Global store not available
    }
    
    return null;
  }

  /**
   * Handle incoming messages
   * Parse and dispatch to listeners
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Dispatch to type-specific listeners
      const eventType = data.type || 'message';
      const listeners = this.listeners.get(eventType) || [];
      
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('[SSE] Listener error:', error);
        }
      });
      
    } catch (error) {
      // Invalid JSON - ignore gracefully
      console.warn('[SSE] Invalid JSON in message:', event.data);
    }
  }

  /**
   * Subscribe to events
   * Industry standard event listener pattern
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Disconnect
   * Clean shutdown including fallback timer
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 🔧 NEW: Clean up fallback timer
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    
    this.isConnected = false;
    this.useFallback = false;
    this.listeners.clear();
    this.listenerRegistrators.clear(); // 🆕 Clear registrators too
    this.seenMessageIds.clear(); // 🆕 Clear seen messages
    console.log('[SSE] Disconnected and cleaned up');
  }

  /**
   * 🆕 NEW: Clear authentication state when token is expired and can't be refreshed
   */
  clearAuthState() {
    try {
      // Clear localStorage auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth');
      localStorage.removeItem('auth_user');
      
      // Clear tokenManager if available
      if (window.tokenManager && typeof window.tokenManager.clearTokens === 'function') {
        window.tokenManager.clearTokens();
      }
      
      // Clear auth store if available
      import('@/stores/auth').then(({ useAuthStore }) => {
        const authStore = useAuthStore();
        if (typeof authStore.clearAuth === 'function') {
          authStore.clearAuth();
        }
      }).catch(() => {
        // Auth store not available, ignore
      });
      
      console.log('[SSE] Authentication state cleared due to expired token');
    } catch (error) {
      console.warn('[SSE] Failed to clear auth state:', error);
    }
  }

  /**
   * Get authentication token (DEPRECATED - use getTokenWithMultipleStrategies)
   * Kept for backward compatibility
   */
  async getToken() {
    return this.getTokenWithMultipleStrategies();
  }

  /**
   * Get connection status
   */
  get connected() {
    return this.isConnected && (this.eventSource?.readyState === EventSource.OPEN || this.useFallback);
  }

  /**
   * Get ready state
   */
  get readyState() {
    if (this.useFallback) return 1; // Simulate OPEN state for fallback
    return this.eventSource?.readyState || EventSource.CLOSED;
  }

  /**
   * 🔧 NEW: Diagnostic method to test SSE connection independently
   */
  async diagnoseSSEConnection(token = null) {
    console.log('🔍 [SSE DIAGNOSIS] Starting SSE connection diagnosis...');
    
    if (!token) {
      token = await this.getTokenWithMultipleStrategies();
    }
    
    if (!token) {
      console.error('🔍 [SSE DIAGNOSIS] No token available for diagnosis');
      return { success: false, error: 'No authentication token' };
    }
    
    // Validate token format
    if (!this.isValidJWTFormat(token)) {
      console.error('🔍 [SSE DIAGNOSIS] Invalid token format');
      return { success: false, error: 'Invalid token format' };
    }
    
    // Test URL construction
    const currentPort = window.location.port;
    const isViteEnv = currentPort === '5173' || currentPort === '5174';
    const baseUrl = isViteEnv ? '/events' : 'https://hook-nav-attempt-size.trycloudflare.com/events';
    const testUrl = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    
    console.log('🔍 [SSE DIAGNOSIS] Test URL:', testUrl.replace(/access_token=[^&]+/, 'access_token=***'));
    console.log('🔍 [SSE DIAGNOSIS] Environment:', isViteEnv ? 'Vite (proxy)' : 'Production');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (testEventSource) {
          testEventSource.close();
        }
        console.warn('🔍 [SSE DIAGNOSIS] Connection test timed out after 15 seconds');
        resolve({ 
          success: false, 
          error: 'Connection timeout',
          readyState: testEventSource?.readyState,
          url: testUrl
        });
      }, 15000);
      
      let testEventSource;
      
      try {
        testEventSource = new EventSource(testUrl);
        console.log('🔍 [SSE DIAGNOSIS] EventSource created, initial readyState:', testEventSource.readyState);
        
        testEventSource.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ [SSE DIAGNOSIS] Connection successful!');
          console.log('🔍 [SSE DIAGNOSIS] Final readyState:', testEventSource.readyState);
          console.log('🔍 [SSE DIAGNOSIS] Connection URL:', testEventSource.url);
          
          testEventSource.close();
          resolve({ 
            success: true, 
            readyState: testEventSource.readyState,
            url: testEventSource.url
          });
        };
        
        testEventSource.onmessage = (event) => {
          console.log('📨 [SSE DIAGNOSIS] Received message:', event.data.substring(0, 100) + '...');
        };
        
        testEventSource.onerror = (error) => {
          clearTimeout(timeout);
          const readyState = testEventSource?.readyState;
          const states = ['CONNECTING', 'OPEN', 'CLOSED'];
          
          console.error('❌ [SSE DIAGNOSIS] Connection failed');
          console.error('🔍 [SSE DIAGNOSIS] Error readyState:', readyState, `(${states[readyState] || 'UNKNOWN'})`);
          console.error('🔍 [SSE DIAGNOSIS] Error event:', error);
          
          let errorReason = 'Unknown error';
          if (readyState === EventSource.CONNECTING) {
            errorReason = 'Failed to establish connection (network/CORS issue)';
          } else if (readyState === EventSource.CLOSED) {
            errorReason = 'Connection closed by server (auth/server issue)';
          }
          
          testEventSource.close();
          resolve({ 
            success: false, 
            error: errorReason,
            readyState: readyState,
            url: testUrl
          });
        };
        
        // Monitor connection progress
        let progressCount = 0;
        const progressMonitor = setInterval(() => {
          progressCount++;
          if (testEventSource) {
            const readyState = testEventSource.readyState;
            const states = ['CONNECTING', 'OPEN', 'CLOSED'];
            console.log(`🔍 [SSE DIAGNOSIS] Progress check ${progressCount}: ${states[readyState]} (${readyState})`);
            
            if (readyState === EventSource.CLOSED) {
              clearInterval(progressMonitor);
            }
          } else {
            clearInterval(progressMonitor);
          }
        }, 3000);
        
        // Clear progress monitor on completion
        setTimeout(() => clearInterval(progressMonitor), 15000);
        
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ [SSE DIAGNOSIS] Failed to create EventSource:', error);
        resolve({ 
          success: false, 
          error: `EventSource creation failed: ${error.message}`,
          url: testUrl
        });
      }
    });
  }
}

// Export singleton instance
export const sseService = new StandardSSEService();

// Development debugging
if (import.meta.env.DEV) {
  window.sseService = sseService;
  
  // 🔧 NEW: Global diagnostic function for easy testing
  window.testSSEConnection = async () => {
    console.log('🧪 [GLOBAL TEST] Starting SSE connection test...');
    const result = await sseService.diagnoseSSEConnection();
    
    if (result.success) {
      console.log('✅ [GLOBAL TEST] SSE connection test PASSED');
      console.log('🔧 [GLOBAL TEST] The SSE endpoint is working correctly');
      console.log('🔧 [GLOBAL TEST] If automatic connection still fails, check service initialization');
    } else {
      console.error('❌ [GLOBAL TEST] SSE connection test FAILED');
      console.error('🔧 [GLOBAL TEST] Error:', result.error);
      console.error('🔧 [GLOBAL TEST] This explains why SSE falls back to HTTP polling');
      
      // Provide specific troubleshooting advice
      if (result.error.includes('timeout')) {
        console.error('💡 [GLOBAL TEST] Troubleshooting: Check if backend SSE endpoint is running');
        console.error('💡 [GLOBAL TEST] Troubleshooting: Verify Vite proxy configuration');
      } else if (result.error.includes('auth')) {
        console.error('💡 [GLOBAL TEST] Troubleshooting: Check authentication token validity');
        console.error('💡 [GLOBAL TEST] Troubleshooting: Verify token format and expiration');
      } else if (result.error.includes('network') || result.error.includes('CORS')) {
        console.error('💡 [GLOBAL TEST] Troubleshooting: Check network connectivity');
        console.error('💡 [GLOBAL TEST] Troubleshooting: Verify CORS headers on backend');
      }
    }
    
    return result;
  };
  
  // 🔧 NEW: Force SSE connection test (bypasses normal flow)
  window.forceSSETest = async () => {
    console.log('🚀 [FORCE TEST] Forcing SSE connection test...');
    
    // Disconnect current connection
    sseService.disconnect();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try diagnosis first
    const diagnosis = await sseService.diagnoseSSEConnection();
    
    if (diagnosis.success) {
      console.log('✅ [FORCE TEST] Diagnosis passed, attempting normal connection...');
      
      // Try normal connection
      try {
        await sseService.connect();
        console.log('✅ [FORCE TEST] Normal connection successful');
      } catch (error) {
        console.error('❌ [FORCE TEST] Normal connection failed despite diagnosis success:', error);
      }
    } else {
      console.error('❌ [FORCE TEST] Diagnosis failed, normal connection will also fail');
    }
    
    return diagnosis;
  };
  
  console.log('🔧 [DEV] SSE diagnostic functions available:');
  console.log('  - testSSEConnection() - Test SSE connection independently');
  console.log('  - forceSSETest() - Force SSE connection test');
  console.log('  - sseService.diagnoseSSEConnection() - Detailed diagnosis');
}

export default sseService; 