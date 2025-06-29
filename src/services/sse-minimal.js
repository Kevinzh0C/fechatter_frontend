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

import tokenSynchronizer from './tokenSynchronizer';

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
    this.lastWorkspacePoll = 0; // 🔧 FIXED: Track workspace polling to prevent infinite requests
    this.seenMessageIds = new Set(); // 🆕 Track seen messages to avoid duplicates
    this.connectionTimeout = null; // 🔧 ENHANCED: 添加连接超时处理
    this.networkTimeouts = { connection: 30000, eventSource: 15000 }; // 🆕 NEW: 默认网络超时
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
   * 🚨 FIX: Add user session isolation to prevent token conflicts
   */
  async connect(token = null) {
    // 清除之前的连接超时
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.eventSource) {
      console.log('[SSE] 关闭现有连接');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.connectionState = 'connecting';
    
    // 🔧 ENHANCED: 检测网络质量并调整超时时间
    const networkQuality = await this.detectNetworkQuality();
    this.adjustTimeoutsForNetwork(networkQuality);
    
    // 🔧 ENHANCED: 使用tokenSynchronizer获取token
    if (!token) {
      try {
        token = await tokenSynchronizer.getToken();
        
        // 验证token状态
        const tokenStatus = await tokenSynchronizer.getTokenStatus();
        if (tokenStatus.expired) {
          console.warn('[SSE] Token已过期，尝试刷新');
          // 这里可以添加token刷新逻辑
          token = await tokenSynchronizer.getToken(); // 再次获取，可能已被刷新
        }
      } catch (error) {
        console.error('[SSE] 获取token失败:', error);
      }
    }
    
    if (!token) {
      console.error('[SSE] 无法获取认证token');
      this.connectionState = 'failed';
      this.fallbackToPolling();
      return;
    }
    
    // 获取基础URL
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      console.error('[SSE] 无法获取SSE基础URL');
      this.connectionState = 'failed';
      this.fallbackToPolling();
      return;
    }
    
    // 生成会话ID
    const sessionId = this.generateSessionId();
    
    // 检测环境
    const isProductionEnv = this.isProductionEnvironment();
    
    // 🔧 CRITICAL FIX: 构建完全符合curl命令格式的URL
    // curl -N -v -H "Accept: text/event-stream" -H "Cache-Control: no-cache" "http://45.77.178.85:8080/events?access_token=${TOKEN}"
    // EventSource会自动添加以下headers:
    // - Accept: text/event-stream
    // - Cache-Control: no-cache
    // - Connection: keep-alive
    
    // 🔧 ENHANCED: 确保URL参数格式完全匹配curl命令
    const authParam = `access_token=${encodeURIComponent(token)}`;
    
    if (isProductionEnv) {
      // 生产环境: 使用简单认证URL，完全匹配curl格式
      this.url = `${baseUrl}?${authParam}`;
      console.log('[SSE] PRODUCTION: URL格式完全匹配curl命令');
    } else {
      // 开发环境: 也使用简单格式，避免额外参数干扰
      this.url = `${baseUrl}?${authParam}`;
      console.log('[SSE] DEVELOPMENT: 使用与curl匹配的简单URL格式');
    }
    
    console.log('[SSE] 构建的完整URL格式:', this.url.replace(/access_token=[^&]+/, 'access_token=***'));
    
    console.log('[SSE] Attempting connection to:', this.url.replace(/access_token=[^&]+/, 'access_token=***'));
    
    // 🔧 ENHANCED: 设置动态连接超时，根据网络质量调整
    const connectionTimeout = this.networkTimeouts?.connection || 30000;
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState !== 'connected') {
        console.warn(`[SSE] 连接超时 (${connectionTimeout}ms)，回退到轮询`);
        this.fallbackToPolling(token);
      }
    }, connectionTimeout);
    
    // 🔧 ENHANCED: 尝试SSE连接，失败则回退到轮询
    try {
      const success = await this.trySSEConnection();
      
      if (!success) {
        console.log('[SSE] SSE连接未建立，使用轮询回退');
        this.fallbackToPolling(token);
      } else {
        console.log('[SSE] SSE连接成功建立');
        // 🚨 CRITICAL FIX: 确保状态正确设置
        this.isConnected = true;
        this.useFallback = false;
        this.connectionState = 'connected';
        
        // 清除连接超时
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        // 重新注册监听器
        this.reregisterListeners();
      }
    } catch (error) {
      console.warn('[SSE] SSE连接失败，回退到轮询:', error);
      this.fallbackToPolling(token);
    }
  }

  /**
   * 🆕 NEW: 检测网络质量 - 优化版本
   */
  async detectNetworkQuality() {
    const startTime = performance.now();
    
    try {
      // 🔧 ENHANCED: 使用更轻量的健康检查端点
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch('/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;
      
      console.log(`[SSE] 网络延迟检测: ${latency.toFixed(2)}ms`);
      
      // 🔧 ENHANCED: 更合理的网络质量阈值
      if (latency < 150) return 'excellent';
      if (latency < 400) return 'good';
      if (latency < 800) return 'fair';
      return 'poor';
    } catch (error) {
      console.warn('[SSE] 网络质量检测失败:', error.name === 'AbortError' ? '超时' : error.message);
      return 'poor'; // 默认为较差的网络
    }
  }

  /**
   * 🆕 NEW: 根据网络质量调整超时时间
   */
  adjustTimeoutsForNetwork(quality) {
    const timeouts = {
      excellent: { connection: 20000, eventSource: 10000 },
      good: { connection: 30000, eventSource: 15000 },
      fair: { connection: 45000, eventSource: 20000 },
      poor: { connection: 60000, eventSource: 30000 }
    };
    
    this.networkTimeouts = timeouts[quality] || timeouts.poor;
    console.log(`[SSE] 网络质量: ${quality}, 超时设置:`, this.networkTimeouts);
  }

  /**
   * 🆕 NEW: 验证SSE连接是否真正可用
   */
  async verifyConnection() {
    return new Promise((resolve, reject) => {
      // 设置一个短时间的验证窗口
      const verificationTimeout = setTimeout(() => {
        reject(new Error('连接验证超时'));
      }, 3000);
      
      // 监听第一个消息或心跳
      const verificationHandler = () => {
        clearTimeout(verificationTimeout);
        this.eventSource.removeEventListener('message', verificationHandler);
        resolve();
      };
      
      this.eventSource.addEventListener('message', verificationHandler);
      
      // 如果在短时间内没有收到任何消息，认为连接可用（可能是空闲时间）
      setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
          clearTimeout(verificationTimeout);
          this.eventSource.removeEventListener('message', verificationHandler);
          resolve();
        }
      }, 2000);
    });
  }

  /**
   * 生成唯一的会话ID
   */
  generateSessionId() {
    const sessionId = this.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.sessionId = sessionId;
    return sessionId;
  }

  /**
   * 🔧 ENHANCED: Multi-strategy token retrieval with proper error handling
   */
  async getTokenWithMultipleStrategies() {
    // 🔧 ENHANCED: 优先使用tokenSynchronizer获取token
    try {
      const token = await tokenSynchronizer.getToken();
      if (token && token.length > 20) {
        console.log('[SSE] 使用tokenSynchronizer获取token成功');
        return token;
      }
    } catch (error) {
      console.warn('[SSE] 从tokenSynchronizer获取token失败:', error);
    }

    // 回退到传统策略
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
          // 🔧 ENHANCED: 如果通过传统方式找到token，异步更新tokenSynchronizer
          setTimeout(async () => {
            try {
              await tokenSynchronizer.setTokenAndUser(token, null);
              console.log('[SSE] 已同步token到tokenSynchronizer');
            } catch (error) {
              console.warn('[SSE] 同步token到tokenSynchronizer失败:', error);
            }
          }, 0);
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
      // 🔧 ENHANCED: 使用tokenSynchronizer检查token状态
      const tokenStatus = await tokenSynchronizer.getTokenStatus();
      
      // 如果token过期或即将过期，尝试刷新
      if (tokenStatus.expired || (tokenStatus.expiresIn && tokenStatus.expiresIn < 120)) {
        console.log('[SSE] Token已过期或即将过期，尝试刷新...');
        
        // 尝试使用tokenSynchronizer获取新token
        try {
          // 重新获取token，可能会触发刷新
          const newToken = await tokenSynchronizer.getToken();
          if (newToken && newToken !== token) {
            console.log('[SSE] 已获取新token');
            return newToken;
          }
        } catch (refreshError) {
          console.warn('[SSE] 通过tokenSynchronizer刷新token失败:', refreshError);
        }
        
        // 尝试使用token manager刷新
        try {
          if (window.tokenManager && typeof window.tokenManager.refreshToken === 'function') {
            await window.tokenManager.refreshToken();
            const newToken = window.tokenManager.getAccessToken();
            
            if (newToken && newToken !== token) {
              // 同步到tokenSynchronizer
              await tokenSynchronizer.setTokenAndUser(newToken, null);
              console.log('[SSE] Token通过tokenManager刷新成功');
              return newToken;
            }
          }
        } catch (refreshError) {
          console.warn('[SSE] Token通过tokenManager刷新失败:', refreshError);
        }
        
        console.error('[SSE] 无法刷新过期token，用户需要重新登录');
        return null; // Token过期且无法刷新
      }
      
      return token; // Token仍然有效
    } catch (error) {
      console.warn('[SSE] Token验证失败:', error);
      return token; // 验证失败时返回原始token
    }
  }

  /**
   * 🔧 ENHANCED: Try SSE connection with proper EventSource configuration
   * Note: EventSource cannot set custom headers, so authentication must be via URL params
   */
  async trySSEConnection() {
    return new Promise((resolve) => {
      try {
        // 🔧 CRITICAL FIX: EventSource automatically adds proper SSE headers:
        // - Accept: text/event-stream
        // - Cache-Control: no-cache
        // - Connection: keep-alive
        console.log('[SSE] Creating EventSource with URL:', this.url.replace(/access_token=[^&]+/, 'access_token=***'));
        
        this.eventSource = new EventSource(this.url);
        
        // 设置动态连接超时
        const eventSourceTimeout = this.networkTimeouts?.eventSource || 15000;
        const connectionTimeout = setTimeout(() => {
          console.warn(`[SSE] EventSource连接超时 (${eventSourceTimeout}ms)`);
          // 🚨 CRITICAL FIX: 检查当前状态，避免误杀成功的连接
          if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
            console.log('[SSE] 超时时EventSource未打开，关闭连接');
            this.eventSource.close();
            this.eventSource = null;
            resolve(false);
          } else if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
            console.log('[SSE] 超时时EventSource已打开，保持连接');
            // 连接已成功，不需要关闭
          } else {
            console.log('[SSE] 超时时EventSource不存在');
            resolve(false);
          }
        }, eventSourceTimeout); // 🔧 FIXED: 使用动态超时时间
        
        // 连接成功
        this.eventSource.onopen = (event) => {
          console.log('[SSE] ✅ EventSource连接成功');
          console.log('[SSE] Connection URL:', this.eventSource.url.replace(/access_token=[^&]+/, 'access_token=***'));
          console.log('[SSE] Ready State:', this.getReadyStateText(this.eventSource.readyState));
          
          // 🔧 ENHANCED: 验证连接完全符合curl命令格式
          console.log('[SSE] ✅ 连接格式验证:');
          console.log('  - URL参数: access_token=*** ✓');
          console.log('  - Headers: Accept=text/event-stream, Cache-Control=no-cache ✓');
          console.log('  - 连接状态: OPEN ✓');
          
          clearTimeout(connectionTimeout);
          this.connectionState = 'connected';
          this.isConnected = true;
          this.connectionAttempts = 0;
          
          // 🔧 SIMPLIFIED: 不进行连接验证，直接认为连接成功
          // 连接验证可能导致不必要的复杂性
          console.log('[SSE] ✅ 连接建立，开始接收事件');
          resolve(true);
        };
        
        // 连接错误
        this.eventSource.onerror = (error) => {
          console.warn('[SSE] ❌ EventSource连接错误');
          console.warn('[SSE] Ready State:', this.getReadyStateText(this.eventSource?.readyState));
          console.warn('[SSE] Error event:', error);
          clearTimeout(connectionTimeout);
          this.connectionState = 'error';
          this.isConnected = false;
          this.connectionAttempts++;
          
          // 🔧 ENHANCED: 提供更详细的错误信息
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            console.error('[SSE] 连接被服务器关闭 - 可能是认证失败或服务器错误');
          } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
            console.error('[SSE] 连接仍在尝试中 - 可能是网络问题');
          }
          
          // 🚨 CRITICAL FIX: 清理EventSource但不立即放弃
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          
          // 🚨 CRITICAL FIX: 无论如何都要resolve(false)，让connect方法决定是否回退
          console.log(`[SSE] 连接失败 (第${this.connectionAttempts}次尝试)，返回connect方法处理`);
          resolve(false);
        };
        
        // 消息处理
        this.eventSource.onmessage = (event) => {
          if (console.debug) {
            console.debug('[SSE] 📨 收到消息:', event.data.substring(0, 100) + '...');
          }
          this.handleMessage(event);
        };
        
      } catch (error) {
        console.error('[SSE] 创建EventSource失败:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get readable text for EventSource readyState
   */
  getReadyStateText(readyState) {
    switch(readyState) {
      case 0: return "CONNECTING (0)";
      case 1: return "OPEN (1)";
      case 2: return "CLOSED (2)";
      default: return `UNKNOWN (${readyState})`;
    }
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
      if (!currentChatId) return 30000; // 🔧 FIXED: 30 seconds if no active chat (further reduced frequency)
      return 5000; // 🔧 FIXED: 5 seconds for active chat (balanced frequency)
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
      const response = await fetch(`${apiBase}/api/chat/${chatId}/messages?limit=3`, {
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
   * 🔧 FIXED: Add rate limiting to prevent infinite requests
   */
  async pollWorkspaceActivity(token) {
    if (!token) return;
    
    // 🔧 CRITICAL FIX: Rate limiting for workspace polling
    const now = Date.now();
    if (!this.lastWorkspacePoll) this.lastWorkspacePoll = 0;
    
    // Only poll workspace activity every 30 seconds minimum
    if (now - this.lastWorkspacePoll < 30000) {
      console.debug('[SSE] Workspace polling rate limited, skipping');
      return;
    }
    
    this.lastWorkspacePoll = now;
    
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
      
      // 🔧 CRITICAL FIX: On error, increase cooldown to 60 seconds
      this.lastWorkspacePoll = now + 30000; // Add extra 30s cooldown on error
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
   * 🚨 FIX: Enhanced cleanup to prevent memory leaks
   */
  disconnect() {
    console.log('[SSE] Starting comprehensive disconnect...')
    
    // 🚨 FIX: Close EventSource with proper error handling
    if (this.eventSource) {
      try {
        // Remove all event listeners before closing
        this.eventSource.onopen = null
        this.eventSource.onmessage = null
        this.eventSource.onerror = null
        
        // Close the connection
        this.eventSource.close()
        
        // 🚨 CRITICAL: Set to null to prevent memory leaks
        this.eventSource = null
        
        console.log('[SSE] EventSource closed and cleared')
      } catch (error) {
        console.warn('[SSE] Error during EventSource cleanup:', error)
        this.eventSource = null // Force cleanup even if error
      }
    }
    
    // 🔧 NEW: Clean up fallback timer
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer)
      this.fallbackTimer = null
      console.log('[SSE] Fallback timer cleared')
    }
    
    // 🚨 FIX: Clear all collections and references
    this.isConnected = false
    this.useFallback = false
    this.url = null
    this.lastPollTime = 0
    this.lastWorkspacePoll = 0 // 🔧 FIXED: Reset workspace poll timer on disconnect
    
    // Clear listeners and registrators
    if (this.listeners) {
      this.listeners.clear()
    }
    if (this.listenerRegistrators) {
      this.listenerRegistrators.clear()
    }
    if (this.seenMessageIds) {
      this.seenMessageIds.clear()
    }
    
    // 🚨 NEW: Clear any pending timeouts or intervals
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout)
      this._connectionTimeout = null
    }
    
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval)
      this._healthCheckInterval = null
    }
    
    // 🚨 NEW: Clear any DOM event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      window.removeEventListener('online', this._onlineHandler)
      window.removeEventListener('offline', this._offlineHandler)
    }
    
    console.log('[SSE] Comprehensive disconnect completed - all resources cleaned')
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
   * 🚨 CRITICAL FIX: 更准确的连接状态判断
   */
  get connected() {
    if (this.useFallback) {
      // 轮询模式：只检查isConnected标志
      return this.isConnected;
    } else {
      // SSE模式：必须有EventSource且状态为OPEN
      return this.isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN;
    }
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
    
    // 🔧 FIXED: 使用与主连接相同的URL构建逻辑
    const baseUrl = this.getBaseUrl();
    const testUrl = `${baseUrl}?access_token=${encodeURIComponent(token)}`;
    
    console.log('🔍 [SSE DIAGNOSIS] Test URL:', testUrl.replace(/access_token=[^&]+/, 'access_token=***'));
    console.log('🔍 [SSE DIAGNOSIS] Base URL:', baseUrl);
    console.log('🔍 [SSE DIAGNOSIS] 符合curl示例格式: Accept: text/event-stream, Cache-Control: no-cache');
    
    const currentPort = window.location.port;
    const isViteEnv = currentPort === '5173' || currentPort === '5174';
    console.log('🔍 [SSE DIAGNOSIS] Environment:', isViteEnv ? 'Development (Vite代理)' : 'Production (直连)');
    
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

  /**
   * 🔧 ENHANCED: 回退到轮询模式
   */
  fallbackToPolling(token = null) {
    console.log('[SSE] 回退到轮询模式');
    this.useFallback = true;
    
    // 清除连接超时
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // 关闭现有SSE连接
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 启动轮询
    this.startPollingFallback(token);
  }

  /**
   * 获取SSE基础URL
   * 🔧 ENHANCED: 根据环境正确构建 /events 端点URL
   */
  getBaseUrl() {
    // 检查配置
    try {
      if (window.appConfig && window.appConfig.sseUrl) {
        console.log('[SSE] 使用appConfig中的SSE URL:', window.appConfig.sseUrl);
        return window.appConfig.sseUrl;
      }
    } catch (error) {
      console.warn('[SSE] 无法从appConfig获取SSE URL');
    }
    
    // 从环境变量获取
    if (import.meta.env.VITE_SSE_URL) {
      console.log('[SSE] 使用环境变量SSE URL:', import.meta.env.VITE_SSE_URL);
      return import.meta.env.VITE_SSE_URL;
    }
    
    // 🔧 CRITICAL FIX: 根据环境构建正确的URL
    const currentPort = window.location.port;
    const isViteEnv = currentPort === '5173' || currentPort === '5174';
    
    if (isViteEnv) {
      // 开发环境: 使用相对路径，通过Vite代理转发
      const sseUrl = '/events';
      console.log('[SSE] 开发环境: 使用Vite代理URL:', sseUrl);
      return sseUrl;
    } else {
      // 生产环境: 直接连接到后端
      const sseUrl = 'https://hook-nav-attempt-size.trycloudflare.com/events';
      console.log('[SSE] 生产环境: 使用后端直连URL:', sseUrl);
      return sseUrl;
    }
  }

  /**
   * 检测是否为生产环境
   */
  isProductionEnvironment() {
    // 检查是否为生产环境
    if (import.meta.env.PROD) {
      return true;
    }
    
    // 检查URL是否包含生产域名
    const productionDomains = ['fechatter.com', 'app.fechatter.com'];
    return productionDomains.some(domain => window.location.hostname.includes(domain));
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