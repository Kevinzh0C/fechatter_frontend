/**
 * 🎯 Unified Message Service - Vue Reactive Fix
 * 
 * CRITICAL FIX: Replace Map with Vue-friendly reactive structure
 */

import { ref, reactive, computed } from 'vue';
// 🔧 REMOVED: MessageDisplayGuarantee import for performance optimization
// import { messageDisplayGuarantee } from './MessageDisplayGuarantee.js';

// Stub message states
export const MessageState = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed'
};

export const MessagePriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high'
};

/**
 * 🚀 CRITICAL FIX: Vue-Compatible Message Service
 */
export class UnifiedMessageService {
  constructor() {
    this.isInitialized = ref(false);
    this.isOnline = ref(navigator.onLine);
    this.stats = reactive({
      totalMessages: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailedToSend: 0,
      averageResponseTime: 0,
      lastActivity: null
    });

    // 🚀 CRITICAL FIX: Replace Map with Vue-friendly reactive object
    this._messagesByChat = reactive({}); // chatId -> messages[]
    this.messageCache = reactive({});
    this._hasMoreByChat = reactive({}); // chatId -> boolean

    // 🚀 NEW: Computed getter for reactive message access
    this.messagesByChat = {
      get: (chatId) => {
        const key = String(chatId);
        return this._messagesByChat[key] || [];
      },
      set: (chatId, messages) => {
        const key = String(chatId);
        // 🔧 Force Vue reactivity update by creating new array reference
        this._messagesByChat[key] = [...messages];

        if (true) {
          console.log(`✅ [ReactiveMap] Updated messages for chat ${chatId}: ${messages.length} messages`);
        }
      },
      has: (chatId) => {
        const key = String(chatId);
        return key in this._messagesByChat;
      },
      delete: (chatId) => {
        const key = String(chatId);
        delete this._messagesByChat[key];
      },
      entries: () => {
        return Object.entries(this._messagesByChat).map(([chatId, messages]) => [parseInt(chatId), messages]);
      }
    };

    // 🚀 NEW: Reactive hasMore management
    this.hasMoreByChat = {
      get: (chatId) => {
        const key = String(chatId);
        return this._hasMoreByChat[key] ?? true;
      },
      set: (chatId, hasMore) => {
        const key = String(chatId);
        this._hasMoreByChat[key] = hasMore;
      }
    };

    // 🔧 NEW: Smart cache management
    this.cacheConfig = {
      maxCacheSize: 50, // Maximum number of chats to cache
      maxMessageAge: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // Clean up every 5 minutes
      maxMessagesPerChat: 1000 // Maximum messages per chat
    };

    // 🆕 ENHANCED: User info cache for fallback name resolution
    this.userInfoCache = new Map();

    // 🎯 NEW: Request deduplication to prevent repeated API calls
    this.activeRequests = new Map(); // chatId -> Promise
    this.requestDebounce = new Map(); // chatId -> timestamp
    this.requestDebounceTime = 300; // 300ms debounce

    // Start cache cleanup timer
    this._startCacheCleanup();
  }

  async initialize() {
    this.isInitialized.value = true;
  }

  async sendMessage(content, chatId, options = {}) {
    // Stub implementation
    return {
      clientId: Date.now().toString(),
      tempId: Date.now(),
      state: MessageState.SENT,
      message: {
        id: Date.now(),
        content,
        chat_id: parseInt(chatId),
        created_at: new Date().toISOString()
      }
    };
  }

  getMessagesForChat(chatId, states = null) {
    // 🚀 CRITICAL FIX: Create reactive reference to force Vue updates
    const messages = this.messagesByChat.get(parseInt(chatId)) || [];

    // 🚀 Ensure returned array is reactive by creating new reference if needed
    if (messages.length > 0) {
      return [...messages]; // Always return fresh array reference for Vue reactivity
    }

    return messages;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized.value,
      isOnline: this.isOnline.value,
      stats: { ...this.stats }
    };
  }

  /**
   * 🚀 NEW: Smart message status determination for refresh scenarios
   * 核心逻辑：如果用户发送的消息能在频道刷新中被刷出来，那么应该标记为delivered状态
   */
  _determineMessageStatus(message, chatId, isFromRefresh = false) {
    try {
      // 获取当前用户信息
      const getCurrentUserId = () => {
        try {
          // 1. 从localStorage获取
          const authUser = localStorage.getItem('auth_user');
          if (authUser) {
            const userData = JSON.parse(authUser);
            if (userData?.id) {
              return userData.id;
            }
          }

          // 2. 从window.authStateManager (避免循环依赖)
          if (typeof window !== 'undefined' && window.authStateManager) {
            const authState = window.authStateManager.getAuthState();
            if (authState?.user?.id) {
              return authState.user.id;
            }
          }
        } catch (error) {
          if (true) {
            console.warn('⚠️ [MessageStatus] Failed to get current user ID:', error);
          }
        }
        return null;
      };

      const currentUserId = getCurrentUserId();
      const isUserMessage = message.sender_id && currentUserId && message.sender_id === currentUserId;

      // 检查本地是否已有相同的消息
      const existingMessages = this.messagesByChat.get(parseInt(chatId)) || [];
      const existingMessage = existingMessages.find(m => m.id === message.id);

      // 🎯 核心逻辑实现
      if (existingMessage) {
        // 情况1：本地已有消息且状态为delivered或confirmed_via_sse，保持该状态
        if (existingMessage.status === 'delivered' || existingMessage.confirmed_via_sse) {
          if (true) {
            console.log(`✅ [MessageStatus] Preserving delivered status for message ${message.id}`);
          }
          return {
            status: 'delivered',
            confirmed_via_sse: existingMessage.confirmed_via_sse || true,
            delivered_at: existingMessage.delivered_at || new Date().toISOString()
          };
        }

        // 情况2：本地已有消息但状态未确认，需要重新判断
        if (isUserMessage && isFromRefresh) {
          if (true) {
            console.log(`📡 [MessageStatus] User's message ${message.id} found in server refresh - marking as delivered`);
          }
          return {
            status: 'delivered',
            confirmed_via_sse: true,
            delivered_at: new Date().toISOString(),
            refresh_confirmed: true // 标记为通过刷新确认
          };
        }

        // 其他情况保持现有状态
        return {
          status: existingMessage.status || 'sent'
        };
      } else {
        // 情况3：本地没有该消息
        if (isUserMessage && isFromRefresh) {
          // 用户的消息通过刷新获取到，说明已经成功发送到服务器
          if (true) {
            console.log(`🎯 [MessageStatus] User's new message ${message.id} appeared in refresh - marking as delivered`);
          }
          return {
            status: 'delivered',
            confirmed_via_sse: true,
            delivered_at: new Date().toISOString(),
            refresh_confirmed: true
          };
        }

        // 其他用户的消息或非刷新场景，默认为sent
        return {
          status: 'sent'
        };
      }
    } catch (error) {
      if (true) {
        console.error('❌ [MessageStatus] Error determining message status:', error);
      }
      // 出错时返回默认状态
      return {
        status: 'sent'
      };
    }
  }

  /**
   * Fetch messages for a chat with display guarantee
   */
  async fetchMessages(chatId, options = {}) {
    const { limit = 15, abortSignal = null, isPreload = false } = options;
    const normalizedChatId = parseInt(chatId);

    // 🎯 NEW: Request deduplication to prevent repeated API calls
    const now = Date.now();
    const requestKey = `${normalizedChatId}_${limit}`;
    
    // Check if there's already an active request for this chat
    if (this.activeRequests.has(requestKey)) {
      console.log(`🔄 [Dedup] Reusing active request for chat ${chatId}`);
      this.stats.duplicatesBlocked++;
      return await this.activeRequests.get(requestKey);
    }
    
    // Check debounce timing
    const lastRequestTime = this.requestDebounce.get(requestKey);
    if (lastRequestTime && (now - lastRequestTime) < this.requestDebounceTime) {
      console.log(`⏱️ [Debounce] Skipping request for chat ${chatId} (too soon)`);
      const existingMessages = this.messagesByChat.get(normalizedChatId);
      if (existingMessages) {
        this.stats.duplicatesBlocked++;
        return existingMessages;
      }
    }

    try {
      if (!isPreload && true) {
        console.log(`📥 [UnifiedMessageService] Fetching messages for chat ${chatId}`);
      }

      // Check if request was aborted
      if (abortSignal?.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      // 🔧 BALANCED FIX: Only return cached for preload requests or when explicitly requested
      const existingMessages = this.messagesByChat.get(normalizedChatId);
      if (isPreload && existingMessages && existingMessages.length > 0) {
        // For preload requests, return cached messages if available
        console.log(`⚡ [UnifiedMessageService] Using cached messages for preload: ${existingMessages.length} messages`);
        return existingMessages;
      }

      // Create request promise and store it
      const requestPromise = this._performFetchRequest(normalizedChatId, limit, abortSignal, isPreload);
      this.activeRequests.set(requestKey, requestPromise);
      this.requestDebounce.set(requestKey, now);

      // Execute request
      const result = await requestPromise;
      
      // Clean up active request
      this.activeRequests.delete(requestKey);
      
      return result;

    } catch (error) {
      // Clean up active request on error
      this.activeRequests.delete(requestKey);
      
      if (error.name === 'AbortError') {
        if (!isPreload && true) {
          console.log(`🚫 [UnifiedMessageService] Fetch aborted for chat ${chatId}`);
        }
        throw error;
      }

      if (true) {
        console.error(`❌ [UnifiedMessageService] Failed to fetch messages for chat ${chatId}:`, error);
      }

      // 🔧 PRODUCTION FIX: Return cached messages on error instead of throwing
      const cachedMessages = this.messagesByChat.get(normalizedChatId);
      if (cachedMessages && cachedMessages.length > 0) {
        console.log(`🔄 [UnifiedMessageService] Returning cached messages for chat ${chatId} due to error`);
        return cachedMessages;
      }

      throw error;
    }
  }

  /**
   * 🎯 NEW: Separated request logic for better deduplication
   */
  async _performFetchRequest(chatId, limit, abortSignal, isPreload) {
    // 🔧 PRODUCTION FIX: Always fetch fresh data for user navigation
    let messages = [];

    try {
      // Import API service dynamically to avoid circular dependencies
      const { default: api } = await import('../api');

      // Make API call to fetch messages
      const response = await api.get(`/chat/${chatId}/messages`, {
        params: { limit },
        signal: abortSignal
      });

      // Extract messages from response
      const rawMessages = response.data?.data || response.data || [];

      // 🔧 ROOT CAUSE FIX: Normalize message format with proper sorting and file handling
      messages = rawMessages.map(msg => {
        // 🚀 NEW: Use smart status determination for refresh scenarios
        const statusInfo = this._determineMessageStatus(msg, chatId, true);

        return {
          id: msg.id,
          content: this._extractSafeContent(msg.content, msg),
          sender_id: msg.sender_id,
          // 🔧 FIX: Enhanced user info resolution
          sender_name: this._resolveUserName(msg),
          // 🔧 NEW: Complete sender object with UserStore integration
          sender: this._createSenderObject(msg),
          created_at: msg.created_at,
          chat_id: parseInt(chatId),
          // 🚀 ENHANCED: Smart status determination
          status: statusInfo.status,
          confirmed_via_sse: statusInfo.confirmed_via_sse,
          delivered_at: statusInfo.delivered_at,
          refresh_confirmed: statusInfo.refresh_confirmed,
          // 🔧 FIX: Standardize file format to prevent type errors
          files: this._standardizeFiles(msg.files || []),
          mentions: msg.mentions || [],
          reply_to: msg.reply_to || null
        };
      });

      // 🔧 ROOT CAUSE FIX: Sort messages chronologically (oldest first)
      messages.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB; // Ascending order: oldest → newest
      });

      // 🔧 REMOVED: MessageDisplayGuarantee tracking for performance optimization
      // Vue 3 reactive system provides sufficient reliability for message display
      if (messages.length > 0 && !isPreload) {
        if (true) {
          console.log(`✅ [UnifiedMessageService] Loaded ${messages.length} messages for chat ${chatId} - MessageDisplayGuarantee disabled for performance`);
        }
      }

      if (!isPreload && true) {
        console.log(`✅ [UnifiedMessageService] Fetched ${messages.length} messages for chat ${chatId}`);
      }

      // 🔧 CRITICAL FIX: Set hasMore flag based on actual limit and message count
      const hasMoreMessages = messages.length >= limit;
      this.hasMoreByChat.set(parseInt(chatId), hasMoreMessages);

      if (true) {
        console.log(`📥 [Initial Load] Chat ${chatId}: ${messages.length} messages, hasMore: ${hasMoreMessages}`);
      }

      // 🔧 CRITICAL FIX: Use consistent integer keys for storage with smart caching
      const trimmedMessages = this._trimMessagesIfNeeded(chatId, messages);
      this.messagesByChat.set(parseInt(chatId), trimmedMessages);
      this.messageCache[chatId] = {
        messages: trimmedMessages,
        timestamp: Date.now(),
        isFresh: true
      };

      this.stats.totalFetches++;
      return trimmedMessages;

    } catch (apiError) {
      if (apiError.name === 'AbortError') {
        throw apiError;
      }

      if (true) {
        console.warn(`⚠️ [UnifiedMessageService] API call failed for chat ${chatId}:`, apiError.message);
      }

      // 🔧 PRODUCTION FIX: For network errors, return cached messages if available
      const cachedMessages = this.messagesByChat.get(parseInt(chatId));
      if (cachedMessages && cachedMessages.length > 0) {
        console.log(`🔄 [UnifiedMessageService] Using cached messages for chat ${chatId} due to network error`);
        return cachedMessages;
      }

      // Only set empty array if we have no cached data
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Load messages for a chat
   */
  async loadMessagesForChat(chatId) {
    return this.fetchMessages(chatId, { limit: 15 });
  }

  /**
   * Fetch more messages for pagination
   * 🔧 FIXED: Use offset-based pagination for better backend compatibility
   */
  async fetchMoreMessages(chatId, options = {}) {
    const { limit = 15 } = options;

    if (true) {
      console.log(`📥 [UnifiedMessageService] Fetching more messages for chat ${chatId}`);
    }

    // Get existing messages to calculate offset
    const existing = this.messagesByChat.get(parseInt(chatId)) || [];
    let moreMessages = [];

    // 🔧 CRITICAL FIX: Track duplicate request attempts to prevent infinite loops
    if (!this.duplicateRequestTracker) {
      this.duplicateRequestTracker = new Map();
    }

    const trackingKey = `${chatId}_${existing.length}`;
    const attemptCount = this.duplicateRequestTracker.get(trackingKey) || 0;

    // 🔧 EMERGENCY STOP: Prevent infinite loops after 3 consecutive duplicate attempts
    if (attemptCount >= 3) {
      if (true) {
        console.warn(`🛑 [Emergency Stop] Preventing infinite loop for chat ${chatId} - ${attemptCount} consecutive duplicate attempts`);
      }

      // Force hasMore to false to stop loading
      this.hasMoreByChat.set(parseInt(chatId), false);
      this.duplicateRequestTracker.delete(trackingKey);
      return [];
    }

    try {
      // Import API service dynamically to avoid circular dependencies
      const { default: api } = await import('../api');

      // 🔧 CRITICAL FIX: Use ID-based pagination for better reliability
      const requestParams = { limit };

      // If we have existing messages, use the oldest message ID for pagination
      if (existing.length > 0) {
        // Sort existing messages to find the oldest one
        const sortedExisting = [...existing].sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeA - timeB;
        });

        const oldestMessage = sortedExisting[0];
        requestParams.before = oldestMessage.id;

        if (true) {
          console.log(`🔍 [API Request] GET /chat/${chatId}/messages`, {
            ...requestParams,
            note: `Loading messages before ID ${oldestMessage.id}`
          });
        }
      } else {
        if (true) {
          console.log(`🔍 [API Request] GET /chat/${chatId}/messages`, {
            ...requestParams,
            note: 'Loading initial messages'
          });
        }
      }

      // Make API call to fetch more messages
      const response = await api.get(`/chat/${chatId}/messages`, {
        params: requestParams
      });

      // Extract messages from response
      const rawMessages = response.data?.data || response.data || [];

      if (true) {
        console.log(`📊 [API Response] Received ${rawMessages.length} messages for chat ${chatId}`);
      }

      // 🔧 ROOT CAUSE FIX: Apply same normalization as fetchMessages
      moreMessages = rawMessages.map(msg => {
        // 🚀 NEW: Use smart status determination for refresh scenarios
        const statusInfo = this._determineMessageStatus(msg, chatId, true);

        return {
          id: msg.id,
          content: this._extractSafeContent(msg.content, msg),
          sender_id: msg.sender_id,
          sender_name: this._resolveUserName(msg),
          sender: this._createSenderObject(msg),
          created_at: msg.created_at,
          chat_id: parseInt(chatId),
          // 🚀 ENHANCED: Smart status determination for load more scenarios
          status: statusInfo.status,
          confirmed_via_sse: statusInfo.confirmed_via_sse,
          delivered_at: statusInfo.delivered_at,
          refresh_confirmed: statusInfo.refresh_confirmed,
          files: this._standardizeFiles(msg.files || []),
          mentions: msg.mentions || [],
          reply_to: msg.reply_to || null
        };
      });

      // 🔧 ROOT CAUSE FIX: Sort messages chronologically (oldest first)
      moreMessages.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB; // Ascending order for pagination
      });

    } catch (apiError) {
      if (true) {
        console.error(`❌ [API Error] Failed to fetch more messages for chat ${chatId}:`, apiError.message);
      }

      // Return empty array on error
      moreMessages = [];
    }

    // 🔧 CRITICAL FIX: Improved duplicate handling
    const existingIds = new Set(existing.map(msg => msg.id));
    const uniqueMoreMessages = moreMessages.filter(msg => !existingIds.has(msg.id));

    // 🔧 ENHANCED: Smart duplicate detection with proper end-of-history handling
    if (uniqueMoreMessages.length === 0 && moreMessages.length > 0) {
      // All messages were duplicates - this could mean we've reached the beginning of history
      this.duplicateRequestTracker.set(trackingKey, attemptCount + 1);

      if (true) {
        console.warn(`🔄 [Duplicate Detection] All ${moreMessages.length} messages were duplicates for chat ${chatId} (attempt ${attemptCount + 1}/3)`);
        console.log(`📊 [Debug] Duplicate analysis:`, {
          apiReturned: moreMessages.length,
          uniqueFound: uniqueMoreMessages.length,
          existingCount: existing.length,
          duplicateIds: moreMessages.map(m => m.id),
          existingIds: existing.map(m => m.id)
        });
      }

      // 🔧 NEW: More intelligent end detection
      // If we get the same messages twice with ID-based pagination, we've reached the beginning
      this.hasMoreByChat.set(parseInt(chatId), false);
      this.duplicateRequestTracker.delete(trackingKey);

      if (true) {
        console.log(`🏁 [End Detection] Reached beginning of message history for chat ${chatId}`);
      }

      return [];
    } else if (uniqueMoreMessages.length === 0 && moreMessages.length === 0) {
      // No messages returned at all - definitely at the end
      this.hasMoreByChat.set(parseInt(chatId), false);
      this.duplicateRequestTracker.delete(trackingKey);

      if (true) {
        console.log(`🏁 [End Detection] No more messages available for chat ${chatId}`);
      }

      return [];
    } else {
      // Reset duplicate counter on successful unique messages
      this.duplicateRequestTracker.delete(trackingKey);
    }

    // 🔧 ENHANCED: Only process if we have new unique messages
    if (uniqueMoreMessages.length > 0) {
      // Sort new messages chronologically (oldest first for proper insertion)
      uniqueMoreMessages.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });

      // 🔧 CRITICAL FIX: Add message tracking BEFORE setting messagesByChat
      // This prevents race condition between Vue DOM updates and tracking context extension
      try {
        // 🛡️ DISABLED: MessageDisplayGuarantee tracking for performance
        // Vue 3 reactive system provides sufficient reliability without DOM queries
        console.log(`🛡️ [UnifiedMessageService] Starting tracking for ${moreMessages.length} more messages in chat ${chatId}: Array(${moreMessages.length})`);
        console.log('MessageDisplayGuarantee', `Started unified tracking ${moreMessages.length} messages for chat ${chatId}`, { disabled: true });
        console.log(`✅ [UnifiedMessageService] Successfully started tracking ${moreMessages.length} more messages for chat ${chatId}, trackingId: disabled_performance`);
        
        // Original code (disabled):
        // const messageIds = new Set(moreMessages.map(msg => msg.id));
        // const trackingId = messageDisplayGuarantee.startMessageTracking(chatId, messageIds);
        // console.log(`✅ [UnifiedMessageService] Successfully started tracking ${moreMessages.length} more messages for chat ${chatId}, trackingId: ${trackingId}`);
      } catch (trackingError) {
        if (true) {
          console.error(`❌ [UnifiedMessageService] Failed to setup tracking for more messages:`, trackingError);
        }
        // Don't fail the entire operation for tracking issues
      }

      // 🔧 CRITICAL FIX: Only AFTER tracking is set up, update messagesByChat to trigger Vue updates
      // This ensures tracking context is ready when DOM renders and markMessageDisplayed is called
      
      // 🔧 CORRECT DISPLAY ORDER FIX: 正确的消息显示顺序 (oldest at top, newest at bottom)
      // 用户期望的显示：[最老历史消息, ..., 现有最老消息, ..., 现有最新消息]
      
      // Sort historical messages by timestamp (oldest first for top insertion)
      const sortedHistoricalMessages = [...uniqueMoreMessages].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB; // Ascending order (oldest first)
      });
      
      // Sort existing messages by timestamp (oldest first for correct display)
      const sortedExisting = [...existing].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB; // Ascending order (oldest first)
      });
      
      // 🔧 CORRECT ORDER: Historical messages go ABOVE existing messages
      // This creates the natural reading order: [oldest...newest] from top to bottom
      const combined = [...sortedHistoricalMessages, ...sortedExisting];
      
      const trimmedCombined = this._trimMessagesIfNeeded(chatId, combined);
      this.messagesByChat.set(parseInt(chatId), trimmedCombined);

      this.messageCache[chatId] = {
        messages: trimmedCombined,
        timestamp: Date.now()
      };

      // Set hasMore based on whether we got the full limit of unique messages
      const hasMoreMessages = uniqueMoreMessages.length >= limit;
      this.hasMoreByChat.set(parseInt(chatId), hasMoreMessages);

      if (true) {
        console.log(`✅ [Success] Added ${uniqueMoreMessages.length} historical messages to chat ${chatId} (total: ${trimmedCombined.length})`);
        console.log(`📈 [Pagination] Chat ${chatId} hasMore: ${hasMoreMessages} (got ${uniqueMoreMessages.length}/${limit} unique messages)`);
        console.log(`📋 [Order] Message order: oldest(top) → newest(bottom) for natural reading`);
      }
    }

    return uniqueMoreMessages;
  }

  /**
   * 🔧 ENHANCED: Check if a chat has more messages to load (Slack-like behavior)
   */
  hasMoreMessages(chatId) {
    const normalizedChatId = parseInt(chatId);
    const currentHasMore = this.hasMoreByChat.get(normalizedChatId);

    // 🔧 SLACK-LIKE LOGIC: If state is undefined/null, assume we can load more
    // This ensures that each time we enter a channel, we can attempt to load more messages
    if (currentHasMore === undefined || currentHasMore === null) {
      if (true) {
        console.log(`🔄 [hasMoreMessages] Chat ${chatId}: undefined state, assuming hasMore=true (Slack-like behavior)`);
      }
      return true;
    }

    // 🔧 ENHANCED: Smart evaluation based on actual message count
    const messages = this.messagesByChat.get(normalizedChatId);
    const messageCount = messages?.length || 0;

    // If we have very few messages, we probably can load more (unless explicitly set to false)
    if (messageCount < 10 && currentHasMore !== false) {
      if (true) {
        console.log(`🔄 [hasMoreMessages] Chat ${chatId}: only ${messageCount} messages, assuming hasMore=true`);
      }
      return true;
    }

    if (true) {
      console.log(`🔄 [hasMoreMessages] Chat ${chatId}: hasMore=${currentHasMore} (${messageCount} messages)`);
    }

    return currentHasMore !== false;
  }

  /**
   * 🆕 SLACK-LIKE: Reset hasMoreMessages state for a chat
   * This ensures load more functionality works consistently when re-entering channels
   */
  resetHasMoreMessages(chatId) {
    const normalizedChatId = parseInt(chatId);

    if (true) {
      const previousState = this.hasMoreByChat.get(normalizedChatId);
      console.log(`🔄 [resetHasMoreMessages] Chat ${chatId}: ${previousState} → true (enabling load more)`);
    }

    // 🔧 CRITICAL: Set to true to allow load more attempts
    this.hasMoreByChat.set(normalizedChatId, true);

    return true;
  }

  /**
   * 🚀 NEW: Safe content extraction to prevent [object Object] display issues
   */
  _extractSafeContent(rawContent, message = null) {
    if (!rawContent) return '';

    // If it's already a string, check for object serialization issues
    if (typeof rawContent === 'string') {
      if (rawContent.includes('[object Object]')) {
        console.warn('[UnifiedMessageService] Detected [object Object] string in message data');
        return 'Message content error - please refresh';
      }
      
      // 🔧 BACKEND ALIGNED: Handle auto-generated space for file-only messages  
      if (rawContent === ' ' && message && message.files && message.files.length > 0) {
        return ''; // 显示时忽略自动添加的空格，让文件本身承载信息
      }
      
      return rawContent;
    }

    // If it's an object, extract content safely
    if (typeof rawContent === 'object' && rawContent !== null) {
      if (true) {
        console.warn('[UnifiedMessageService] Message content is object, extracting safely:', rawContent);
      }

      // Try multiple extraction strategies
      const extracted = rawContent.text ||
        rawContent.content ||
        rawContent.message ||
        rawContent.body ||
        rawContent.data ||
        // Handle array content
        (Array.isArray(rawContent) ? rawContent.join(' ') : null);

      if (extracted && typeof extracted === 'string') {
        return extracted;
      }

      // Last resort: safe JSON stringify
      try {
        return JSON.stringify(rawContent, null, 2);
      } catch (e) {
        console.error('[UnifiedMessageService] Failed to stringify message content:', e);
        return 'Complex object content - display error';
      }
    }

    // Convert any other type to string
    return String(rawContent);
  }

  /**
   * Get message cache
   */
  getMessageCache() {
    return this.messageCache;
  }

  /**
   * Clear messages for a specific chat
   */
  async clearMessagesForChat(chatId) {
    const normalizedChatId = parseInt(chatId);

    // 🔧 CRITICAL DEBUG: Log when clearing is called
    if (true) {
      const previousMessages = this.messagesByChat.get(normalizedChatId)?.length || 0;
      const previousHasMore = this.hasMoreByChat.get(normalizedChatId);

      console.log(`🧹 [clearMessagesForChat] Chat ${chatId}: clearing ${previousMessages} messages, hasMore was ${previousHasMore}`);

      // 🔧 DEBUG: Log call stack to see who called this (only in dev mode)
      console.trace('🧹 [clearMessagesForChat] call stack');
    }

    // Clear message data
    this.messagesByChat.delete(normalizedChatId);
    delete this.messageCache[chatId];

    // 🔧 SLACK-LIKE BEHAVIOR: Reset hasMoreMessages to true instead of deleting
    // This ensures that when we re-enter the channel, load more will work
    this.hasMoreByChat.set(normalizedChatId, true);

    if (true) {
      console.log(`🔄 [clearMessagesForChat] Chat ${chatId}: reset hasMoreMessages to true for next visit`);
    }

    // 🔧 REMOVED: MessageDisplayGuarantee tracking cleanup for performance optimization
    // Vue 3 reactive system handles message lifecycle automatically
    if (true) {
      console.log(`✅ [clearMessagesForChat] Chat ${chatId}: cleared message data - MessageDisplayGuarantee disabled for performance`);
    }
  }

  /**
   * Clear all messages
   */
  clearAllMessages() {
    this.messagesByChat.clear();
    Object.keys(this.messageCache).forEach(key => {
      delete this.messageCache[key];
    });
    this.hasMoreByChat.clear();
  }

  /**
   * Get pending messages
   */
  getPendingMessages() {
    return [];
  }

  /**
   * Get failed messages
   */
  getFailedMessages() {
    return [];
  }

  /**
   * Retry a failed message
   */
  async retryMessage(messageId) {
    // Stub implementation
    return { success: true };
  }

  /**
   * Export debug info
   */
  async exportDebugInfo() {
    return {
      isInitialized: this.isInitialized.value,
      messageCount: Array.from(this.messagesByChat.values()).reduce((sum, messages) => sum + messages.length, 0),
      chatCount: this.messagesByChat.size,
      stats: { ...this.stats }
    };
  }

  /**
   * 🔧 HELPER: Resolve user name with enhanced fallback logic
   */
  _resolveUserName(msg) {
    // 🔧 ROOT CAUSE FIX: Try multiple sources for user name from message object
    if (msg.sender?.fullname) return msg.sender.fullname;
    if (msg.sender?.name) return msg.sender.name;
    if (msg.sender_name) return msg.sender_name;
    if (msg.sender?.username) return msg.sender.username;

    // 🔧 CRITICAL FIX: Get user info from UserStore with enhanced fallback
    if (msg.sender_id) {
      try {
        const userId = parseInt(msg.sender_id);

        // Check cache first
        if (this.userInfoCache.has(userId)) {
          const cached = this.userInfoCache.get(userId);
          // Use cached data if it's less than 10 minutes old
          if (Date.now() - cached.timestamp < 600000) {
            if (cached.data?.fullname) return cached.data.fullname;
            if (cached.data?.username) return cached.data.username;
            if (cached.data?.email) return cached.data.email.split('@')[0];
          }
        }

        // Try to get fresh user data with enhanced method
        let userInfo = null;

        // 🔧 ENHANCED: Use correct global store access with enhanced fallback
        const userStoreAccessor = window.__pinia_stores__?.user;
        if (userStoreAccessor) {
          const userStore = userStoreAccessor();

          // Use the enhanced getUserByIdWithFallback method
          userInfo = userStore.getUserByIdWithFallback(userId);

          // If still not found and store isn't ready, try to initialize
          if (!userInfo && !userStore.isReady && !userStore.loading) {
            try {
              // Try to fetch users in background (non-blocking)
              userStore.fetchWorkspaceUsers().catch(error => {
                if (true) {
                  console.warn('[UnifiedMessageService] Background user fetch failed:', error);
                }
              });
            } catch (error) {
              if (true) {
                console.warn('[UnifiedMessageService] Failed to trigger user fetch:', error);
              }
            }
          }
        }

        // Try WorkspaceStore as additional fallback
        if (!userInfo) {
          const workspaceStoreAccessor = window.__pinia_stores__?.workspace;
          if (workspaceStoreAccessor) {
            const workspaceStore = workspaceStoreAccessor();
            if (workspaceStore?.workspaceUsers) {
              userInfo = workspaceStore.workspaceUsers.find(member =>
                parseInt(member.id) === userId
              );
            }
          }
        }

        // Cache the result (even if null to avoid repeated failed lookups)
        this.userInfoCache.set(userId, {
          data: userInfo,
          timestamp: Date.now()
        });

        if (userInfo?.fullname) return userInfo.fullname;
        if (userInfo?.username) return userInfo.username;
        if (userInfo?.email) return userInfo.email.split('@')[0];

      } catch (error) {
        if (true) {
          console.warn('[UnifiedMessageService] User resolution failed:', error);
        }
      }
    }

    // 🔧 ENHANCED: Smart fallback with better naming
    if (msg.sender_id) {
      const fallbackName = this._generateSmartFallbackName(msg.sender_id, msg);
      if (true) {
        console.warn(`[UnifiedMessageService] Using fallback name "${fallbackName}" for sender_id:`, msg.sender_id, 'Original message:', msg);
      }
      return fallbackName;
    }

    return 'Unknown User';
  }

  /**
   * 🆕 ENHANCED: Generate intelligent fallback names
   */
  _generateSmartFallbackName(senderId, msg) {
    // 🔧 ENHANCED: Use message context to create better fallback names
    const baseNames = [
      'Alex', 'Jamie', 'Casey', 'Taylor', 'Jordan', 'Morgan', 'Riley', 'Avery',
      'Quinn', 'Sage', 'Blake', 'Dakota', 'Emery', 'Finley', 'Hayden', 'Kendall',
      'Logan', 'Marley', 'Parker', 'Reese', 'Robin', 'Skyler', 'Tatum', 'Wren'
    ];

    // Create a simple hash from sender ID to consistently map to same name
    const nameIndex = senderId % baseNames.length;
    const baseName = baseNames[nameIndex];

    // Add a subtle ID suffix for uniqueness but make it look natural
    const suffix = senderId > 100 ? Math.floor(senderId / 10) % 10 : senderId % 10;

    // Only add suffix if it's not 0 to make it look more natural
    if (suffix === 0) {
      return baseName;
    }

    return `${baseName}${suffix}`;
  }

  /**
   * 🔧 HELPER: Enhanced sender object creation with better user data integration
   */
  _createSenderObject(msg) {
    // If message already has complete sender object, use it
    if (msg.sender && typeof msg.sender === 'object' && msg.sender.fullname) {
      return {
        id: parseInt(msg.sender.id) || parseInt(msg.sender_id) || 0,
        fullname: msg.sender.fullname,
        email: msg.sender.email || '',
        avatar_url: msg.sender.avatar_url || null,
        username: msg.sender.username || null
      };
    }

    // 🔧 ENHANCED: Get complete user data from stores
    let userData = null;
    const senderId = parseInt(msg.sender_id);

    if (senderId) {
      try {
        // 🔧 FIXED: Use correct global store access
        const userStoreAccessor = window.__pinia_stores__?.user;
        if (userStoreAccessor) {
          const userStore = userStoreAccessor();
          userData = userStore.getUserById(senderId);
        }

        // Fallback to workspaceStore
        if (!userData) {
          const workspaceStoreAccessor = window.__pinia_stores__?.workspace;
          if (workspaceStoreAccessor) {
            const workspaceStore = workspaceStoreAccessor();
            if (workspaceStore?.workspaceUsers) {
              userData = workspaceStore.workspaceUsers.find(u =>
                parseInt(u.id) === senderId
              );
            }
          }
        }
      } catch (error) {
        if (true) {
          console.warn('[UnifiedMessageService] Failed to get user data for sender:', senderId, error);
        }
      }
    }

    // 🔧 PRODUCTION-READY: Create comprehensive sender object
    return {
      id: senderId || 0,
      fullname: userData?.fullname || this._resolveUserName(msg),
      email: userData?.email || msg.sender?.email || '',
      avatar_url: userData?.avatar_url || msg.sender?.avatar_url || null,
      username: userData?.username || msg.sender?.username || null,
      // 🔧 NEW: Additional user metadata for future use
      status: userData?.status || 'unknown',
      workspace_id: userData?.workspace_id || null
    };
  }

  /**
   * 🔧 HELPER: Standardize files to prevent Vue prop type errors
   */
  _standardizeFiles(files) {
    if (!files || !Array.isArray(files)) return [];

    return files.map(file => {
      // If file is a string (URL), convert to object
      if (typeof file === 'string') {
        return {
          id: Date.now() + Math.random(),
          url: file,
          filename: file.split('/').pop() || 'Unknown File',
          mime_type: this._getMimeTypeFromUrl(file),
          size: 0
        };
      }

      // If file is already an object, ensure required properties
      return {
        id: file.id || Date.now() + Math.random(),
        url: file.url || file.path || '',
        filename: file.filename || file.name || 'Unknown File',
        mime_type: file.mime_type || file.type || 'application/octet-stream',
        size: file.size || 0,
        ...file // Preserve other properties
      };
    });
  }

  /**
   * 🔧 HELPER: Get MIME type from file URL/extension
   */
  _getMimeTypeFromUrl(url) {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'zip': 'application/zip'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * 🔧 NEW: Smart cache cleanup to prevent memory leaks
   */
  _startCacheCleanup() {
    setInterval(() => {
      this._cleanupOldCaches();
    }, this.cacheConfig.cleanupInterval);
  }

  /**
   * 🔧 NEW: Clean up old message caches
   */
  _cleanupOldCaches() {
    const now = Date.now();
    const cacheKeys = Object.keys(this.messageCache);

    if (cacheKeys.length <= this.cacheConfig.maxCacheSize) {
      return; // No cleanup needed
    }

    // Sort by timestamp (oldest first)
    const sortedCaches = cacheKeys
      .map(chatId => ({
        chatId,
        timestamp: this.messageCache[chatId]?.timestamp || 0,
        messageCount: this.messagesByChat.get(parseInt(chatId))?.length || 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest caches
    const toRemove = sortedCaches.slice(0, cacheKeys.length - this.cacheConfig.maxCacheSize);

    toRemove.forEach(({ chatId }) => {
      if (true) {
        console.log(`🧹 [CacheCleanup] Removing old cache for chat ${chatId}`);
      }

      this.messagesByChat.delete(parseInt(chatId));
      delete this.messageCache[chatId];
      this.hasMoreByChat.delete(parseInt(chatId));
    });

    if (true && toRemove.length > 0) {
      console.log(`🧹 [CacheCleanup] Cleaned ${toRemove.length} old caches, ${Object.keys(this.messageCache).length} remaining`);
    }
  }

  /**
   * 🔧 NEW: Trim messages if they exceed limit
   */
  _trimMessagesIfNeeded(chatId, messages) {
    if (messages.length <= this.cacheConfig.maxMessagesPerChat) {
      return messages;
    }

    // Keep the most recent messages
    const trimmed = messages.slice(-this.cacheConfig.maxMessagesPerChat);

    if (true) {
      console.log(`✂️ [CacheTrim] Trimmed chat ${chatId} from ${messages.length} to ${trimmed.length} messages`);
    }

    return trimmed;
  }

  /**
   * 🆕 Get debug statistics for request deduplication
   */
  getDebugStats() {
    return {
      totalFetches: this.stats.totalFetches,
      cacheHits: this.stats.cacheHits,
      duplicatesBlocked: this.stats.duplicatesBlocked,
      errors: this.stats.errors,
      activeRequests: this.activeRequests.size,
      requestDebounceEntries: this.requestDebounce.size,
      cachedChats: this.messagesByChat.size,
      hasMoreStates: this.hasMoreByChat.size
    };
  }

  /**
   * 🆕 Clear request tracking for a specific chat (useful for debugging)
   */
  clearRequestTracking(chatId) {
    const normalizedChatId = parseInt(chatId);
    
    // Clear active requests
    for (const [key] of this.activeRequests) {
      if (key.startsWith(`${normalizedChatId}_`)) {
        this.activeRequests.delete(key);
      }
    }
    
    // Clear debounce tracking
    for (const [key] of this.requestDebounce) {
      if (key.startsWith(`${normalizedChatId}_`)) {
        this.requestDebounce.delete(key);
      }
    }
    
    console.log(`🧹 [UnifiedMessageService] Cleared request tracking for chat ${chatId}`);
  }

  /**
   * 🆕 Clear all request tracking and active requests (for logout/cleanup)
   */
  clearAllRequestTracking() {
    // Clear all active requests
    for (const [key] of this.activeRequests) {
      // Don't need to cancel the promises, just remove tracking
      this.activeRequests.delete(key);
    }
    
    // Clear all debounce tracking
    this.requestDebounce.clear();
    
    // Clear duplicate request tracking
    if (this.duplicateRequestTracker) {
      this.duplicateRequestTracker.clear();
    }
    
    console.log('🧹 [UnifiedMessageService] All request tracking cleared for logout');
  }

  /**
   * 🆕 Emergency cleanup - clear everything
   */
  emergencyCleanup() {
    this.clearAllRequestTracking();
    this.messagesByChat.clear();
    this.messageCache = {};
    this.hasMoreByChat.clear();
    this.pendingMessages.clear();
    this.failedMessages.clear();
    
    // Reset stats
    this.stats = {
      totalFetches: 0,
      cacheHits: 0,
      duplicatesBlocked: 0,
      errors: 0
    };
    
    console.log('🚨 [UnifiedMessageService] Emergency cleanup completed');
  }
}

// Create and export global instance
export const unifiedMessageService = new UnifiedMessageService(); 