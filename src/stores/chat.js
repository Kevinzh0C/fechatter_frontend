/**
 * 🎯 Refactored Chat Store - Using Unified Message Service
 * 
 * Simplified chat store that delegates message management to UnifiedMessageService
 * Provides clean interface for chat management with complete closed-loop message logic
 */

import { defineStore } from 'pinia';
import { computed, ref, reactive, nextTick } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { errorHandler } from '@/utils/errorHandler';
import { unifiedMessageService, MessageState } from '@/services/messageSystem/UnifiedMessageService.js';
import messageConfirmationService from '@/services/messageConfirmationService';
// 🚀 CRITICAL FIX: Import SSE service for real-time message handling
import minimalSSE from '@/services/sse-minimal';
import tokenSynchronizer from '../services/tokenSynchronizer';
// 🎯 CRITICAL FIX: Import data consistency manager
import { dataConsistencyManager } from '@/services/DataConsistencyManager';

export const useChatStore = defineStore('chat', {
  state: () => ({
    // Chat management
    chats: [],
    currentChatId: null,
    loading: false,
    error: null,

    // UI state
    isInitialized: false,
    _forceUpdate: 0, // 🚀 Force Vue reactivity trigger for message updates

    // Cache for chat metadata
    chatMembers: {},

    // Upload state
    uploadProgress: 0,

    // 🔧 ENHANCED: Add request deduplication
    _fetchingChats: false,
    _fetchingStartTime: null,
    _lastChatsFetchTime: null,
  }),

  getters: {
    // Current chat getter
    getCurrentChat: (state) => {
      return state.chats.find(chat => chat.id === state.currentChatId);
    },

    // Get chat members
    getChatMembers: (state) => (chatId) => {
      return state.chatMembers[chatId] || [];
    },

    // Get chat by ID
    getChatById: (state) => (chatId) => {
      return state.chats.find(chat => chat.id === chatId);
    },

    // Get current user ID - REMOVED: Moved to actions to avoid conflict
    // getCurrentUserId moved to actions section for better error handling

    // Get messages for current chat using unified service
    messages: (state) => {
      if (!state.currentChatId) return [];
      // 🚀 Include _forceUpdate in dependency to trigger reactivity
      state._forceUpdate; // Touch the reactive property
      return unifiedMessageService.getMessagesForChat(state.currentChatId);
    },

    // Get pending messages for UI indicators
    pendingMessages: () => {
      return unifiedMessageService.getPendingMessages();
    },

    // Get failed messages for retry UI
    failedMessages: () => {
      return unifiedMessageService.getFailedMessages();
    },

    // Get visible chats (can add filtering logic here)
    visibleChats: (state) => {
      return state.chats.filter(chat => chat.is_active !== false);
    },

    // Get message service status
    messageServiceStatus: () => {
      return unifiedMessageService.getStatus();
    },

    // Check if current chat has more messages to load
    hasMoreMessages: (state) => {
      if (!state.currentChatId) return false;

      // 🔧 CRITICAL FIX: Use UnifiedMessageService's hasMoreMessages method
      try {
        return unifiedMessageService.hasMoreMessages(state.currentChatId);
      } catch (error) {
        if (true) {
          console.warn(`[ChatStore] Failed to check hasMoreMessages for chat ${state.currentChatId}:`, error);
        }
        return false;
      }
    },

    // Get message cache for compatibility
    messageCache: () => {
      return unifiedMessageService.getMessageCache();
    }
  },

  actions: {
    /**
     * Initialize the chat store
     */
    async initialize() {
      if (this.isInitialized) return;

      try {
        if (true) {
          console.log('🎯 Initializing Chat Store (Refactored)...');
        }

        // Wait for unified message service to initialize
        if (!unifiedMessageService.isInitialized.value) {
          if (true) {
            console.log('⏳ Waiting for message service to initialize...');
          }
          // Since UnifiedMessageService already uses ref, just initialize it directly
          await unifiedMessageService.initialize();
        }

        // 🚀 CRITICAL FIX: Setup SSE message listeners for real-time updates
        this.setupSSEMessageListeners();

        // Fetch initial chat list
        await this.fetchChats();

        this.isInitialized = true;
        if (true) {
          console.log('✅ Chat Store (Refactored) initialized with SSE listeners');
        }

      } catch (error) {
        if (true) {
          console.error('Failed to initialize chat store:', error);
        }
        this.error = error.message;
      }
    },

    /**
     * 🚀 NEW: Safe content extraction to prevent [object Object] display issues
     */
    extractSafeContent(rawContent, message = null) {
      // 🔧 FIX: 特殊处理空内容
      if (!rawContent && rawContent !== 0 && rawContent !== false) {
        // 如果有文件且无文本，返回空字符串
        if (message && message.files && message.files.length > 0) {
          return '';
        }
        return '';
      }

      // If it's already a string, check for object serialization issues
      if (typeof rawContent === 'string') {
        if (rawContent.includes('[object Object]')) {
          console.warn('[ChatStore] Detected [object Object] string in SSE data');
          // 🔧 FIX: 更友好的错误提示
          return '';
        }
        
        // 🔧 BACKEND ALIGNED: Handle auto-generated space for file-only messages
        if (rawContent.trim() === '' && message && message.files && message.files.length > 0) {
          return ''; // 显示时忽略自动添加的空格，让文件本身承载信息
        }
        
        return rawContent;
      }

      // If it's an object, extract content safely
      if (typeof rawContent === 'object' && rawContent !== null) {
        if (true) {
          console.warn('[ChatStore] SSE content is object, extracting safely:', rawContent);
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

        // 🔧 FIX: 不显示JSON字符串，只返回空串
        console.error('[ChatStore] Unexpected object content in message:', rawContent);
        return '';
      }

      // 🔧 FIX: 对于其他类型，安全转换为字符串
      if (typeof rawContent === 'number' || typeof rawContent === 'boolean') {
        return String(rawContent);
      }
      
      // 默认返回空字符串
      return '';
    },

    /**
     * 🚀 CRITICAL FIX: Enhanced SSE message listeners with auto-reregistration
     */
    setupSSEMessageListeners() {
      if (true) {
        console.log('🔗 Setting up SSE message listeners...');
      }

      // 🚀 CRITICAL FIX: Create registrator function for auto-reregistration
      const registerListeners = () => {
        if (true) {
          console.log('📡 [SSE] Registering message listeners...');
        }

        // Listen for new messages via SSE
        minimalSSE.on('message', (data) => {
          try {
            if (true) {
              console.log('📨 [Real SSE] Raw event received:', data);
            }

            // Check if this is a new message event
            if (data.type === 'new_message' || data.type === 'NewMessage') {
              if (true) {
                console.log('📨 [Real SSE] New message event:', data);
              }

              // Convert SSE message to our message format with enhanced content safety
              const formattedMessage = {
                id: parseInt(data.id),                              // ✅ 后端发送 id
                chat_id: parseInt(data.chat_id),                   // ✅ 后端发送 chat_id  
                sender_id: data.sender_id,                         // ✅ 后端发送 sender_id
                content: this.extractSafeContent(data.content || '', data), // ✅ 后端发送 content
                files: data.files || [],                           // ✅ 后端发送 files (可能为空)
                created_at: data.created_at || new Date().toISOString(), // ✅ 后端发送 created_at
                sender_name: 'User',                               // 🔧 暂时使用默认值，后端Message没有sender_name
                sender: {                                          // 🔧 构造sender对象，后端Message没有sender
                  id: data.sender_id,
                  fullname: 'User',                                // 暂时使用默认值
                  email: '',                                       // 暂时为空
                  avatar_url: null                                 // 暂时为空
                },
                status: 'delivered',                               // ✅ SSE事件代表已送达
                mentions: [],                                      // 🔧 后端Message没有mentions
                reply_to: null,                                    // 🔧 后端Message没有reply_to
                isOptimistic: false,                               // ✅ 真实SSE消息
                confirmed_via_sse: true,                           // ✅ 通过SSE确认
                idempotency_key: data.idempotency_key              // ✅ 后端发送 idempotency_key
              };

              // 🚀 CRITICAL FIX: Check if this is our own message for delivery confirmation
              const authStore = useAuthStore();
              const isOwnMessage = formattedMessage.sender_id === authStore.user?.id;

              if (true) {
                console.log(`🔍 [Real SSE] Message analysis - ID: ${formattedMessage.id}, Sender: ${formattedMessage.sender_id}, Current User: ${authStore.user?.id}, IsOwnMessage: ${isOwnMessage}`);
              }

              if (isOwnMessage) {
                // This is our own message - update existing message status to delivered
                const updated = this.updateRealtimeMessage(formattedMessage.id, {
                  status: 'delivered',
                  delivered_at: formattedMessage.created_at,
                  server_id: formattedMessage.id,
                  confirmed_via_sse: true
                });

                if (true) {
                  console.log(`✅ [Real SSE] Own message ${formattedMessage.id} marked as delivered via REAL SSE, updateResult: ${updated}`);
                }

                // If ID matching failed, try content matching as fallback
                if (!updated) {
                  if (true) {
                    console.log(`🔄 [Real SSE] ID matching failed, trying content matching for message: "${formattedMessage.content}"`);
                  }
                  const contentMatched = this.updateRealtimeMessageByContent(formattedMessage);
                  if (true) {
                    console.log(`🔄 [Real SSE] Content matching result: ${contentMatched}`);
                  }
                }
              } else {
                // Someone else's message - add to real-time messages
                this.addRealtimeMessage(formattedMessage);
                if (true) {
                  console.log(`📨 [Real SSE] Added someone else's message: ${formattedMessage.id}`);
                }
              }
            }
            // Handle typing indicators
            else if (data.type === 'typing_status' || data.type === 'TypingStatus') {
              if (true) {
                console.log('⌨️ [Real SSE] Typing status:', data);
              }
              // Could emit this to components that need typing indicators
            }
            // Handle presence updates
            else if (data.type === 'presence' || data.type === 'Presence') {
              if (true) {
                console.log('👋 [Real SSE] Presence update:', data);
              }
              // Could update user online status
            }
            else {
              if (true) {
                console.log(`❓ [Real SSE] Unknown event type: ${data.type}`, data);
                console.log(`💡 [Real SSE] Available event types: NewMessage, TypingStatus, UserPresence`);
                console.log(`💡 [Real SSE] Raw event data:`, JSON.stringify(data, null, 2));
              }
            }
          } catch (error) {
            if (true) {
              console.error('❌ [Real SSE] Error processing message:', error, data);
            }
          }
        });

        if (true) {
          const totalListeners = Array.from(minimalSSE.listeners.values()).reduce((sum, arr) => sum + arr.length, 0);
          console.log(`✅ [Real SSE] Message listeners registered. Total SSE listeners: ${totalListeners}`);
        }
      };

      // 🚀 CRITICAL FIX: Register this setup function for auto-reregistration
      minimalSSE.addListenerRegistrator(registerListeners);

      // Initial registration
      registerListeners();

      if (true) {
        console.log('✅ SSE message listeners configured with auto-reregistration');
      }
    },

    /**
     * 🎯 Fetch all chats with data consistency management
     */
    async fetchChats() {
      const forceRefresh = window.location.search.includes('force_refresh=true');
      
      try {
        // 🎯 使用数据一致性管理器进行请求去重和缓存
        const chatsData = await dataConsistencyManager.deduplicatedFetch(
          'workspace_chats',
          async () => {
            console.log('🔍 [ChatStore] Fetching chats via consistency manager...');
            
            this.loading = true;
            
            // 确保token初始化
            await tokenSynchronizer.initialize();
            const token = await tokenSynchronizer.getToken();
            
            if (!token) {
              throw new Error('未找到认证token');
            }
            
            // 🔧 CRITICAL FIX: Use correct workspace chats endpoint
            const response = await api.get('/workspace/chats', {
              timeout: 30000, // 增加到30秒，适应网络延迟
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            return response.data?.data || response.data || [];
          },
          {
            forceRefresh,
            timeout: 15000,
            cacheTime: 30000 // 30秒缓存
          }
        );
        
        // 🎯 处理获取到的数据
        await this.processChatsData(chatsData);
        
        this.loading = false;
        this.error = null;
        
        console.log(`✅ [ChatStore] Chats loaded: ${this.chats.length} items`);
        return this.chats;
        
      } catch (error) {
        this.loading = false;
        this.error = error.message;
        
        console.error('❌ [ChatStore] Fetch chats failed:', error);
        
        // 尝试使用缓存数据
        if (this.chats.length > 0) {
          console.log('📦 [ChatStore] Using cached chat data after error');
          return this.chats;
        }
        
        throw error;
      }
    },

    /**
     * 📝 Process chats data from API response with consistency management
     */
    async processChatsData(chatsData) {
      console.log('🔍 [ChatStore] Processing chats data:', chatsData?.length || 0, 'items');
      
      // Normalize chat data structure
      let normalizedChats = [];
      
      if (Array.isArray(chatsData)) {
        normalizedChats = chatsData.map(chat => this.normalizeChat(chat));
      } else if (chatsData?.data && Array.isArray(chatsData.data)) {
        normalizedChats = chatsData.data.map(chat => this.normalizeChat(chat));
      } else if (chatsData?.chats && Array.isArray(chatsData.chats)) {
        normalizedChats = chatsData.chats.map(chat => this.normalizeChat(chat));
      }
      
      // Ensure user consistency for all chats
      await this.ensureChatUserConsistency(normalizedChats);
      
      // Update store with consistent data
      this.chats = normalizedChats;
      
      // Cache the processed data
      this.cacheChats();
      
      console.log('✅ [ChatStore] Processed and cached', normalizedChats.length, 'chats');
    },

    /**
     * 👤 Ensure consistent user information across all chats
     */
    async ensureChatUserConsistency(chatsData) {
      console.log('🔍 [ChatStore] Ensuring user consistency for chats...');
      
      // Collect all unique user IDs from chats
      const userIds = new Set();
      
      chatsData.forEach(chat => {
        // Add creator
        if (chat.created_by) userIds.add(chat.created_by);
        
        // Add last message sender
        if (chat.last_message?.sender_id) {
          userIds.add(chat.last_message.sender_id);
        }
        
        // Add participants
        if (chat.participants) {
          chat.participants.forEach(participant => {
            if (participant.id || participant.user_id) {
              userIds.add(participant.id || participant.user_id);
            }
          });
        }
        
        // Add members from chat members cache
        if (this.chatMembers[chat.id]) {
          this.chatMembers[chat.id].forEach(member => {
            if (member.id) userIds.add(member.id);
          });
        }
      });
      
      // Pre-fetch user information for consistency using DataConsistencyManager
      const userPromises = Array.from(userIds).map(userId => 
        dataConsistencyManager.getUserInfo(userId).catch(error => {
          console.warn(`⚠️ [ChatStore] Failed to fetch user ${userId}:`, error.message);
          return null;
        })
      );
      
      const users = await Promise.all(userPromises);
      const validUsers = users.filter(user => user !== null);
      
      console.log('✅ [ChatStore] User consistency ensured for', validUsers.length, '/', userIds.size, 'users');
      
      // Update last message sender names using consistent user data
      chatsData.forEach(chat => {
        if (chat.last_message?.sender_id) {
          const sender = validUsers.find(user => user.id === chat.last_message.sender_id);
          if (sender) {
            chat.last_message.sender_name = sender.fullname;
            chat.last_message.sender = sender;
          }
        }
      });
    },

    /**
     * Set current chat and load messages
     */
    async setCurrentChat(chatId) {
      if (this.currentChatId === chatId) {
        if (true) {
          console.log(`🎯 Already in chat ${chatId}, but resetting hasMoreMessages state for consistency`);
        }

        // 🔧 CRITICAL FIX: Even for same chat, reset hasMoreMessages for load more functionality
        try {
          unifiedMessageService.resetHasMoreMessages(parseInt(chatId));
          if (true) {
            console.log(`✅ Reset hasMoreMessages state for chat ${chatId}`);
          }
        } catch (error) {
          if (true) {
            console.warn('Failed to reset hasMoreMessages:', error);
          }
        }
        return;
      }

      if (true) {
        console.log(`🎯 Switching to chat: ${chatId}`);
      }

      // Set current chat
      this.currentChatId = parseInt(chatId);

      // 🔧 CRITICAL FIX: Reset hasMoreMessages state when switching chats
      // This ensures "load more messages" works consistently every time we enter a channel
      try {
        unifiedMessageService.resetHasMoreMessages(parseInt(chatId));
        if (true) {
          console.log(`🔄 [ChatStore] Reset hasMoreMessages state for chat ${chatId} (Slack-like behavior)`);
        }
      } catch (error) {
        if (true) {
          console.warn('[ChatStore] Failed to reset hasMoreMessages:', error);
        }
      }

      // Fetch chat members if not cached
      if (!this.chatMembers[chatId]) {
        try {
          await this.fetchChatMembers(chatId);
        } catch (error) {
          if (true) {
            console.warn('Failed to fetch chat members:', error);
          }
        }
      }

      // Reset chat unread count
      this.resetChatUnreadCount(chatId);
    },

    /**
     * Send message using unified service
     */
    async sendMessage(content, options = {}) {
      if (!this.currentChatId) {
        throw new Error('No chat selected');
      }

      // 🔧 BACKEND ALIGNED: Backend requires content to be non-empty even with files
      // 注意：不要trim，因为MessageInput可能已经添加了必要的空格字符
      const contentToSend = content || '';
      const hasFiles = options.files && options.files.length > 0;
      
      // 🔧 BACKEND REQUIREMENT: Content must always be non-empty (1-4000 chars)
      if (contentToSend.length === 0) {
        if (hasFiles) {
          throw new Error('Message content is required even with files (backend requirement)');
        } else {
          throw new Error('Message content cannot be empty');
        }
      }
      
      if (contentToSend.length > 4000) {
        throw new Error('Message content must be less than 4000 characters');
      }

      try {
        if (true) {
          console.log(`📤 Sending message to chat ${this.currentChatId}:`, {
            content: contentToSend,
            contentLength: contentToSend.length,
            hasFiles: hasFiles,
            filesCount: options.files?.length || 0
          });
        }

        // 🔧 CRITICAL FIX: Generate proper UUID for idempotency
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
          }
          // Fallback UUID v4 generation
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const idempotencyKey = options.idempotency_key || generateUUID();

        // 🔧 CRITICAL FIX: Get consistent user info from DataConsistencyManager
        const authStore = useAuthStore();
        const currentUser = authStore.user;
        const userId = currentUser?.id || this.getCurrentUserId();
        
        // Use DataConsistencyManager to ensure consistent user data
        let currentUserInfo;
        try {
          currentUserInfo = await dataConsistencyManager.getUserInfo(userId);
        } catch (error) {
          console.warn('⚠️ [ChatStore] Failed to get consistent user info, falling back to authStore');
          currentUserInfo = {
            id: userId,
            fullname: currentUser?.fullname || 'User',
            email: currentUser?.email || '',
            avatar_url: currentUser?.avatar_url || null
          };
        }

        // Create optimistic message for immediate UI update
        const optimisticMessage = {
          id: tempId,
          temp_id: tempId,
          content: contentToSend,
          sender_id: currentUserInfo.id,
          sender_name: currentUserInfo.fullname, // ✅ Use real fullname
          sender: {
            id: currentUserInfo.id,
            fullname: currentUserInfo.fullname, // ✅ Use real fullname
            email: currentUserInfo.email, // ✅ Use real email
            avatar_url: currentUserInfo.avatar_url // ✅ Use real avatar
          },
          created_at: new Date().toISOString(),
          chat_id: this.currentChatId,
          status: 'sending',
          files: options.files || [],
          mentions: options.mentions || [],
          reply_to: options.replyTo || null,
          isOptimistic: true,
          sentAt: Date.now()
        };

        // 🔧 IMMEDIATE UI UPDATE: Add to UnifiedMessageService to show instantly
        let currentMessages = unifiedMessageService.getMessagesForChat(this.currentChatId) || [];
        currentMessages.push(optimisticMessage);
        unifiedMessageService.messagesByChat.set(this.currentChatId, currentMessages);

        if (true) {
          console.log('✅ Optimistic message added to UI:', optimisticMessage);
        }

        // Send to backend with proper UUID
        const payload = {
          content: contentToSend,
          files: options.files || [],
          mentions: options.mentions || [],
          reply_to: options.replyTo || null,
          idempotency_key: idempotencyKey
        };

        const response = await api.post(`/chat/${chatId}/messages`, payload);
        const sentMessage = response.data?.data || response.data;

        if (sentMessage) {
          // 🔧 REPLACE optimistic with real message
          currentMessages = unifiedMessageService.getMessagesForChat(this.currentChatId) || [];
          const optimisticIndex = currentMessages.findIndex(m => m.temp_id === tempId);

          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const realMessage = {
              id: sentMessage.id,
              content: this.extractSafeContent(sentMessage.content, sentMessage),
              sender_id: sentMessage.sender_id,
              sender_name: sentMessage.sender?.fullname || currentUserInfo.fullname, // ✅ Use real user info as fallback
              sender: sentMessage.sender || {
                id: sentMessage.sender_id || currentUserInfo.id,
                fullname: currentUserInfo.fullname, // ✅ Use real fullname as fallback
                email: currentUserInfo.email, // ✅ Use real email as fallback
                avatar_url: currentUserInfo.avatar_url // ✅ Use real avatar as fallback
              },
              created_at: sentMessage.created_at,
              chat_id: sentMessage.chat_id,
              // 🚀 CRITICAL FIX: Set to 'delivered' immediately since notify-server doesn't send SSE to sender
              status: 'delivered',
              delivered_at: new Date().toISOString(),
              confirmed_via_api: true, // Mark as API confirmed instead of SSE confirmed
              files: sentMessage.files || [],
              mentions: sentMessage.mentions || [],
              reply_to: sentMessage.reply_to || null,
              isOptimistic: false,
              sentAt: Date.now()
            };

            currentMessages[optimisticIndex] = realMessage;
            unifiedMessageService.messagesByChat.set(this.currentChatId, currentMessages);

            // Update chat's last message
            this.updateChatLastMessage(realMessage);

            if (true) {
              console.log('✅ Message immediately marked as delivered via API success (notify-server doesn\'t send SSE to sender):', realMessage);
              console.log('🎯 API confirmed delivery, no SSE needed for own messages');
            }

            return { message: realMessage };
          }
        }

        return { message: sentMessage };

      } catch (error) {
        if (true) {
          console.error('Failed to send message:', error);
        }

        // 🔧 Mark optimistic message as failed
        const currentMessages = unifiedMessageService.getMessagesForChat(this.currentChatId) || [];
        const failedMessage = currentMessages.find(m => m.temp_id && m.status === 'sending');
        if (failedMessage) {
          failedMessage.status = 'failed';
          failedMessage.error = error.message;
          unifiedMessageService.messagesByChat.set(this.currentChatId, currentMessages);
        }

        errorHandler.handle(error, {
          context: 'Send message',
          silent: false
        });
        throw error;
      }
    },

    /**
     * 🔧 CRITICAL FIX: Add realtime message to UI (called by SSE service)
     */
    async addRealtimeMessage(message) {
      if (true) {
        console.log(`📨 Adding realtime message for chat ${message.chat_id}:`, message);
      }

      // 🔧 Add message to UnifiedMessageService for UI display
      const chatId = parseInt(message.chat_id);
      const currentMessages = unifiedMessageService.getMessagesForChat(chatId) || [];

      // Check if message already exists (prevent duplicates)
      const existingMessage = currentMessages.find(m => m.id === message.id);
      if (existingMessage) {
        if (true) {
          console.log('📨 Message already exists, skipping duplicate:', message.id);
        }
        return;
      }

      // 🎯 CRITICAL FIX: Ensure consistent user data for incoming messages
      if (message.sender_id && !message.sender?.fullname) {
        try {
          const senderInfo = await dataConsistencyManager.getUserInfo(message.sender_id);
          message.sender = senderInfo;
          message.sender_name = senderInfo.fullname;
          console.log(`✅ [ChatStore] Enhanced incoming message with consistent user data: ${senderInfo.fullname}`);
        } catch (error) {
          console.warn(`⚠️ [ChatStore] Failed to get sender info for ${message.sender_id}:`, error.message);
        }
      }

      // Add the new message
      currentMessages.push(message);
      unifiedMessageService.messagesByChat.set(chatId, currentMessages);

      if (true) {
        console.log(`✅ Realtime message added to chat ${chatId}, total messages: ${currentMessages.length}`);
      }

      // Update chat metadata
      this.handleIncomingMessage(message);
    },

    /**
     * 🚀 ENHANCED: Update message status via SSE (for delivery confirmation)
     */
    updateRealtimeMessage(messageId, updates) {
      if (true) {
        console.log(`📨 [Real SSE] Updating message ${messageId} via REAL SSE:`, updates);
      }

      // 🔧 Find and update message in all chats where it might exist
      let updated = false;

      for (const [chatId, messages] of unifiedMessageService.messagesByChat.entries()) {
        const messageIndex = messages.findIndex(m =>
          m.id === messageId ||
          m.temp_id === messageId ||
          m.server_id === messageId
        );

        if (messageIndex !== -1) {
          const message = messages[messageIndex];

          // 🚀 CRITICAL: Clear SSE timeout when confirmation arrives
          if (message.sseTimeout) {
            clearTimeout(message.sseTimeout);
            message.sseTimeout = null;
            if (true) {
              console.log(`⏰ [Real SSE] SSE timeout cleared for message ${messageId} - REAL SSE confirmation received!`);
            }
          }

          // Update message properties
          Object.assign(message, updates);

          // 🚀 ENSURE PERMANENT DELIVERY STATUS: Once delivered, always delivered
          if (updates.status === 'delivered' || updates.delivered_at || updates.status === 'read') {
            message.status = 'delivered';
            message.delivered_at = updates.delivered_at || new Date().toISOString();
            message.confirmed_via_sse = true; // Mark as permanently confirmed

            if (true) {
              console.log(`✅ [Real SSE] Message ${messageId} permanently marked as delivered via REAL SSE`);
            }
          }

          // 🚀 CRITICAL FIX: Use simplified reactive update with new architecture
          unifiedMessageService.messagesByChat.set(chatId, messages);

          updated = true;

          if (true) {
            console.log(`✅ [Real SSE] Message ${messageId} updated in chat ${chatId} via REAL SSE:`, message);
          }
          break;
        }
      }

      // 🔧 Also try to match by content for recently sent messages (fallback)
      if (!updated) {
        const now = Date.now();

        for (const [chatId, messages] of unifiedMessageService.messagesByChat.entries()) {
          const recentMessage = messages.find(m => {
            if (m.status !== 'sent') return false;

            const messageTime = new Date(m.created_at || m.sentAt).getTime();
            if (now - messageTime > 60000) return false; // Within 60 seconds

            // Match by content and sender (for messages that haven't been assigned server IDs yet)
            return m.content === updates.content &&
              m.sender_id === updates.sender_id &&
              m.chat_id === parseInt(chatId);
          });

          if (recentMessage) {
            // 🚀 CRITICAL: Clear SSE timeout when confirmation arrives
            if (recentMessage.sseTimeout) {
              clearTimeout(recentMessage.sseTimeout);
              recentMessage.sseTimeout = null;
            }

            // Update the message
            Object.assign(recentMessage, updates);
            if (updates.status === 'delivered' || updates.delivered_at || updates.status === 'read') {
              recentMessage.status = 'delivered';
              recentMessage.delivered_at = updates.delivered_at || new Date().toISOString();
              recentMessage.confirmed_via_sse = true; // Mark as permanently confirmed
            }

            // Update server ID if provided
            if (updates.id && !recentMessage.id) {
              recentMessage.id = updates.id;
            }

            // 🚀 CRITICAL FIX: Use simplified reactive update
            unifiedMessageService.messagesByChat.set(parseInt(chatId), messages);

            updated = true;

            if (true) {
              console.log(`✅ [Real SSE] Message matched by content and updated to delivered via REAL SSE:`, recentMessage);
            }
            break;
          }
        }
      }

      if (!updated && true) {
        console.warn(`⚠️ Could not find message ${messageId} to update with:`, updates);
      }

      return updated;
    },

    /**
     * 🚀 NEW: Update message status by content matching (fallback for SSE delivery confirmation)
     */
    updateRealtimeMessageByContent(sseMessage) {
      if (true) {
        console.log(`🔍 [SSE] Attempting content matching for message:`, sseMessage);
      }

      const now = Date.now();
      let matched = false;

      for (const [chatId, messages] of unifiedMessageService.messagesByChat.entries()) {
        const recentMessage = messages.find(m => {
          // Only match 'sent' status messages within last 60 seconds
          if (m.status !== 'sent') return false;

          const messageTime = new Date(m.created_at || m.sentAt).getTime();
          if (now - messageTime > 60000) return false; // Within 60 seconds

          // Match by content, sender, and chat with safe content comparison
          const safeSSEContent = this.extractSafeContent(sseMessage.content, sseMessage);
          return m.content === safeSSEContent &&
            m.sender_id === sseMessage.sender_id &&
            m.chat_id === sseMessage.chat_id;
        });

        if (recentMessage) {
          // Clear SSE timeout if exists
          if (recentMessage.sseTimeout) {
            clearTimeout(recentMessage.sseTimeout);
            recentMessage.sseTimeout = null;
          }

          // Update message status
          recentMessage.status = 'delivered';
          recentMessage.delivered_at = sseMessage.created_at || new Date().toISOString();
          recentMessage.confirmed_via_sse = true;
          recentMessage.id = sseMessage.id; // Update with server ID

          // Update in the messages array with simplified reactivity
          unifiedMessageService.messagesByChat.set(chatId, messages);

          matched = true;

          if (true) {
            console.log(`✅ [Real SSE] Message matched by content and updated to delivered via REAL SSE:`, recentMessage);
          }
          break;
        }
      }

      if (!matched && true) {
        console.warn(`⚠️ [SSE] Could not match message by content:`, sseMessage);
      }

      return matched;
    },

    /**
     * Update chat's last message
     */
    updateChatLastMessage(message) {
      const chat = this.getChatById(message.chat_id);
      if (chat) {
        chat.last_message = {
          id: message.id,
          content: message.content,
          created_at: message.created_at,
          sender_id: message.sender_id
        };
        chat.updated_at = message.created_at;
      }
    },

    /**
     * Handle incoming real-time message (called by SSE service)
     */
    handleIncomingMessage(message) {
      if (true) {
        console.log(`📨 Handling incoming message for chat ${message.chat_id}`);
      }

      // The unified message service handles all the logic
      // We just need to update chat metadata here

      const chat = this.getChatById(message.chat_id);
      if (chat) {
        // Update chat's last message
        this.updateChatLastMessage(message);

        // Update unread count if not current chat
        if (message.chat_id !== this.currentChatId) {
          this.incrementChatUnreadCount(message.chat_id);

          // Move chat to top
          const chatIndex = this.chats.findIndex(c => c.id === message.chat_id);
          if (chatIndex > 0) {
            const [movedChat] = this.chats.splice(chatIndex, 1);
            this.chats.unshift(movedChat);
          }
        }
      }
    },

    /**
     * Get current user ID for message status determination
     */
    getCurrentUserId() {
      try {
        const authStore = useAuthStore();
        if (authStore?.user?.id) {
          return authStore.user.id;
        }

        // Fallback: try localStorage
        const authUser = localStorage.getItem('auth_user');
        if (authUser) {
          const userData = JSON.parse(authUser);
          if (userData?.id) {
            return userData.id;
          }
        }

        if (true) {
          console.warn('⚠️ [Chat Store] Could not determine current user ID');
        }
        return null;
      } catch (error) {
        if (true) {
          console.error('❌ [Chat Store] Error getting current user ID:', error);
        }
        return null;
      }
    },

    /**
     * Create new chat
     */
    async createChat(name, members = [], description = '', chatType = 'PrivateChannel') {
      this.loading = true;
      this.error = null;

      try {
        const payload = {
          name,
          chat_type: chatType,
          members,
          description
        };

        const response = await api.post('/workspace/chats', payload);
        const newChat = this.normalizeChat(response.data?.data || response.data);

        // Add to local chats
        this.chats.unshift(newChat);

        // Cache updated chats
        this.cacheChats();

        return newChat;

      } catch (error) {
        errorHandler.handle(error, {
          context: 'Create chat',
          silent: false
        });
        this.error = error.response?.data?.message || 'Failed to create chat';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch chat members
     */
    async fetchChatMembers(chatId) {
      try {
        const response = await api.get(`/chat/${chatId}/members`);
        this.chatMembers[chatId] = response.data;
        return response.data;
      } catch (error) {
        errorHandler.handle(error, {
          context: 'Fetch chat members',
          silent: true
        });
        return [];
      }
    },

    /**
     * Unread count management
     */
    updateChatUnreadCount(chatId, count) {
      const chat = this.getChatById(chatId);
      if (chat) {
        chat.unread_count = count;
      }
    },

    incrementChatUnreadCount(chatId) {
      const chat = this.getChatById(chatId);
      if (chat) {
        chat.unread_count = (chat.unread_count || 0) + 1;
      }
    },

    resetChatUnreadCount(chatId) {
      this.updateChatUnreadCount(chatId, 0);
    },

    /**
     * Normalize chat data
     */
    normalizeChat(chat) {
      const userStore = useUserStore();
      const authStore = useAuthStore();

      const normalizedChat = {
        id: chat.id,
        name: chat.name || 'Unnamed Chat',
        chat_type: this.normalizeChatType(chat.chat_type),
        description: chat.description || '',
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        chat_members: chat.chat_members || [],
        member_count: chat.member_count || chat.chat_members?.length || 0,
        creator_id: chat.creator_id,
        is_active: chat.is_active !== false,
        unread_count: chat.unread_count || 0,
        last_message: chat.last_message || null,
        display_name: chat.name,
        display_avatar: null
      };

      // Special handling for DM chats
      if (normalizedChat.chat_type === 'Single') {
        normalizedChat.display_name = chat.name;

        // Find the other user for avatar and name
        const otherMemberId = chat.chat_members?.find(id => id !== authStore.user?.id);
        if (otherMemberId) {
          const user = userStore.getUserById(otherMemberId);
          if (user) {
            normalizedChat.display_name = user.fullname;
            normalizedChat.display_avatar = user.avatar_url;
          }
        }

        if (normalizedChat.display_name === 'Direct Message' || !normalizedChat.display_name) {
          normalizedChat.display_name = 'Unknown User';
        }
      }

      return normalizedChat;
    },

    /**
     * Normalize chat type
     */
    normalizeChatType(chatType) {
      if (!chatType) return 'PublicChannel';

      const lowerType = chatType.toLowerCase();
      const typeMap = {
        'publicchannel': 'PublicChannel',
        'public_channel': 'PublicChannel',
        'public': 'PublicChannel',
        'privatechannel': 'PrivateChannel',
        'private_channel': 'PrivateChannel',
        'private': 'PrivateChannel',
        'single': 'Single',
        'dm': 'Single',
        'direct': 'Single',
        'directmessage': 'Single',
        'direct_message': 'Single'
      };

      return typeMap[lowerType] || chatType;
    },

    /**
     * Cache chats to localStorage
     */
    cacheChats() {
      try {
        localStorage.setItem('chatsCache', JSON.stringify({
          timestamp: Date.now(),
          chats: this.chats
        }));
      } catch (error) {
        if (true) {
          console.warn('Failed to cache chats:', error);
        }
      }
    },

    /**
     * Load chats from cache
     */
    loadChatsFromCache() {
      try {
        const cached = localStorage.getItem('chatsCache');
        if (cached) {
          const { timestamp, chats } = JSON.parse(cached);
          // Cache valid for 10 minutes
          if (Date.now() - timestamp < 10 * 60 * 1000) {
            this.chats = Array.isArray(chats) ? chats : [];
            return true;
          }
        }
      } catch (error) {
        if (true) {
          console.warn('Failed to load chats from cache:', error);
        }
      }
      return false;
    },

    /**
     * Clear all data
     */
    clearAll() {
      this.chats = [];
      this.currentChatId = null;
      this.chatMembers = {};
      this.error = null;
      this.loading = false;

      // Clear unified message service
      unifiedMessageService.clearAllMessages();

      // Clear cache
      localStorage.removeItem('chatsCache');

      if (true) {
        console.log('🧹 Chat store cleared');
      }
    },

    /**
     * Fetch messages with signal for abort control
     */
    async fetchMessagesWithSignal(chatId, abortSignal = null, limit = 15, isPreload = false) {
      try {
        if (true && !isPreload) {
          console.log(`📥 Fetching messages for chat ${chatId} with limit ${limit}`);
        }

        // Use unified message service to fetch messages
        const result = await unifiedMessageService.fetchMessages(
          chatId,
          {
            limit,
            abortSignal,
            isPreload
          }
        );

        return result || [];

      } catch (error) {
        if (error.name === 'AbortError') {
          if (true && !isPreload) {
            console.log(`🚫 Fetch aborted for chat ${chatId}`);
          }
          return [];
        }

        if (true) {
          console.error(`❌ Failed to fetch messages for chat ${chatId}:`, error);
        }

        errorHandler.handle(error, {
          context: `Fetch messages for chat ${chatId}`,
          silent: isPreload
        });

        throw error;
      }
    },

    /**
     * Navigate to chat with optimized loading
     */
    async navigateToChat(chatId) {
      try {
        if (true) {
          console.log(`🚀 Navigating to chat: ${chatId}`);
        }

        // Set current chat first
        await this.setCurrentChat(chatId);

        // Load messages using unified service
        await unifiedMessageService.loadMessagesForChat(chatId);

        if (true) {
          console.log(`✅ Navigation to chat ${chatId} completed`);
        }

        return true;

      } catch (error) {
        if (true) {
          console.error(`❌ Failed to navigate to chat ${chatId}:`, error);
        }

        errorHandler.handle(error, {
          context: `Navigate to chat ${chatId}`,
          silent: false
        });

        throw error;
      }
    },

    /**
     * Fetch more messages for pagination
     */
    async fetchMoreMessages(chatId, limit = 15) {
      try {
        if (true) {
          console.log(`📥 Fetching more messages for chat ${chatId}`);
        }

        // Use unified message service for pagination
        const result = await unifiedMessageService.fetchMoreMessages(chatId, { limit });

        return result || [];

      } catch (error) {
        if (true) {
          console.error(`❌ Failed to fetch more messages for chat ${chatId}:`, error);
        }

        errorHandler.handle(error, {
          context: `Fetch more messages for chat ${chatId}`,
          silent: false
        });

        throw error;
      }
    },

    /**
     * Fetch messages (legacy method for compatibility)
     */
    async fetchMessages(chatId, limit = 15) {
      return this.fetchMessagesWithSignal(chatId, null, limit, false);
    }
  }
});