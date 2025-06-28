<template>
  <div class="chat-content-container">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="chat-header-info">
        <div class="chat-title">
          <span v-if="currentChat?.chat_type === 'PublicChannel'" class="channel-prefix">#</span>
          <span v-else-if="currentChat?.chat_type === 'PrivateChannel'" class="channel-prefix">🔒</span>
          <h1>{{ getDisplayChatName() }}</h1>
        </div>
        <div class="chat-description">
          {{ getDisplayChatDescription() }}
        </div>
      </div>

      <div class="chat-header-actions elegant">
        <button class="header-action elegant-search" @click="openPerfectSearch">
          <svg class="golden-search-icon" width="20" height="20" viewBox="0 0 100 100" fill="none">
            <circle cx="38.2" cy="38.2" r="23.6" stroke="currentColor" stroke-width="6.18" fill="none" stroke-linecap="round" />
            <line x1="55.9" y1="55.9" x2="76.4" y2="76.4" stroke="currentColor" stroke-width="6.18" stroke-linecap="round" />
            <circle cx="32.4" cy="32.4" r="4.8" fill="currentColor" opacity="0.3" />
          </svg>
          <span class="action-text">Search</span>
        </button>
        <button class="header-action elegant-btn" @click="openChatSettings">
          <Icon name="settings" class="action-icon" />
        </button>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" :class="{ 'has-input-preview': hasInputPreview }">
      <!-- Discord Message List Component -->
      <DiscordMessageList 
        v-if="currentChatId" 
        :chat-id="currentChatId" 
        :current-user-id="authStore.user?.id || 0"
        :messages="chatStore.messages" 
        :loading="chatStore.loading" 
        :has-more-messages="chatStore.hasMoreMessages"
        :typing-users="[]" 
        @load-more-messages="handleLoadMoreMessages"
        @user-profile-opened="handleUserProfileOpened" 
        @dm-created="handleDMCreated" 
        @reply-to="handleReplyTo"
        @edit-message="handleEditMessage" 
        @delete-message="handleDeleteMessage"
        @scroll-position-changed="handleScrollPositionChanged"
        @reading-position-updated="handleReadingPositionUpdated" 
      />
      <div v-else class="messages-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading chat messages...</div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="input-container">
      <MessageInput 
        v-if="currentChatId" 
        :chat-id="currentChatId" 
        :current-user-id="authStore.user?.id || 0"
        @message-sent="handleMessageSent" 
        @error="handleMessageError" 
        class="message-input" 
      />
      <div v-else class="loading-input">
        <div class="loading-message">Loading chat...</div>
      </div>
    </div>

    <!-- Perfect Search Modal -->
    <PerfectSearchModal 
      v-if="showPerfectSearch" 
      :is-open="showPerfectSearch" 
      :chat-id="currentChatId"
      @close="handlePerfectSearchClose" 
      @navigate="handlePerfectSearchNavigate" 
    />

    <!-- Member Management Modal -->
    <div v-if="showMemberManagement" class="chat-modal-overlay" @click="showMemberManagement = false">
      <div class="chat-modal chat-modal-large" @click.stop>
        <div class="chat-modal-header">
          <h3>Manage Members</h3>
          <button class="chat-modal-close" @click="showMemberManagement = false">×</button>
        </div>
        <div class="chat-modal-content">
          <MemberManagement :chat-id="currentChatId" :chat="currentChat" @member-updated="handleMemberUpdated" />
        </div>
      </div>
    </div>

    <!-- ChatSettings Modal -->
    <div v-if="showChatSettings" class="chat-modal-overlay" @click="showChatSettings = false">
      <div class="chat-modal" @click.stop>
        <div class="chat-modal-header">
          <h3>Chat Settings</h3>
          <button class="chat-modal-close" @click="showChatSettings = false">×</button>
        </div>
        <div class="chat-modal-content">
          <ChatSettings :chat="currentChat" @close="showChatSettings = false" @save="handleChatSettingsUpdate" />
        </div>
      </div>
    </div>

    <!-- UserProfileModal -->
    <UserProfile 
      v-if="selectedUserProfile" 
      :user="selectedUserProfile" 
      @close="selectedUserProfile = null"
      @dm-created="handleDMCreated" 
    />

    <!-- Translation Panel -->
    <TranslationPanel 
      v-if="activeTranslationPanel && translationPanelMessage" 
      :visible="!!activeTranslationPanel"
      :message="translationPanelMessage" 
      :position="getOptimalTranslationPanelPosition()"
      @close="handleTranslationPanelClose" 
      @translated="handleTranslationCompleted"
      @applied="handleTranslationApplied" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useChatStore } from '@/stores/chat.js'
import { useMessageUIStore } from '@/stores/messageUI.js'
import minimalSSE from '@/services/sse-minimal.js'

// Components - reusing existing components
import Icon from '@/components/icons/BaseIcon.vue'
import MessageInput from '@/components/chat/MessageInput/index.vue'
import DiscordMessageList from '@/components/discord/DiscordMessageList.vue'
import MemberManagement from '@/components/chat/MemberManagement.vue'
import ChatSettings from '@/components/chat/ChatSettings.vue'
import UserProfile from '@/components/modals/UserProfile.vue'
import PerfectSearchModal from '@/components/search/PerfectSearchModal.vue'
import TranslationPanel from '@/components/chat/TranslationPanel.vue'

// Router and stores
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const messageUIStore = useMessageUIStore()

// State - core chat functionality
const initChatId = () => {
  const routeId = route.params.id
  if (routeId && !isNaN(parseInt(routeId))) {
    return parseInt(routeId)
  }
  console.warn('⚠️ Invalid or missing chat ID in route:', routeId)
  return null
}

const currentChatId = ref(initChatId())
const selectedUserProfile = ref(null)
const replyToMessage = ref(null)
const showPerfectSearch = ref(false)
const showMemberManagement = ref(false)
const showChatSettings = ref(false)
const hasInputPreview = ref(false)

// Computed - with safe fallbacks
const currentChat = computed(() => chatStore.getCurrentChat)

// Translation panel integration
const activeTranslationPanel = computed(() => messageUIStore.activeTranslationPanel)
const translationPanelMessage = computed(() => {
  if (!activeTranslationPanel.value) return null
  const messageId = activeTranslationPanel.value.messageId
  return chatStore.messages.find(msg => msg.id === messageId)
})

// Optimized loading prevention
let loadingInProgress = false

// 🚨 DISABLED: Route-level scroll enforcement system
// 原因：与DiscordMessageList和UnifiedScrollManager产生竞争条件
// 解决方案：让专门的滚动组件全权负责滚动管理
let routeScrollEnforcementDisabled = true; // 🔴 PERMANENTLY DISABLED
let routeScrollEnforcementPaused = false;
let routeScrollPauseReason = '';
let routeScrollPausedForChat = null;

// Global pause/resume functions for UnifiedScrollManager integration (kept for compatibility)
window.pauseRouteScrollEnforcement = (chatId, reason) => {
  routeScrollEnforcementPaused = true;
  routeScrollPauseReason = reason;
  routeScrollPausedForChat = chatId;
  console.log(`🚨 [ROUTE SCROLL] PAUSED for chat ${chatId} - reason: ${reason} (DISABLED)`);
};

window.resumeRouteScrollEnforcement = (chatId) => {
  if (routeScrollPausedForChat === chatId || !routeScrollPausedForChat) {
    routeScrollEnforcementPaused = false;
    routeScrollPauseReason = '';
    routeScrollPausedForChat = null;
    console.log(`🚨 [ROUTE SCROLL] RESUMED for chat ${chatId} (DISABLED)`);
  }
};

// Discord Message List Event Handlers
const handleLoadMoreMessages = async () => {
  if (!currentChatId.value || chatStore.loading || !chatStore.hasMoreMessages || loadingInProgress) {
    console.log('⏸️ Load more blocked:', {
      chatId: currentChatId.value,
      loading: chatStore.loading,
      hasMore: chatStore.hasMoreMessages,
      inProgress: loadingInProgress
    })
    // 🎯 CRITICAL: 返回一个resolved Promise，避免undefined.then错误
    return Promise.resolve([])
  }

  loadingInProgress = true

  try {
    console.log('📥 Loading more messages for chat:', currentChatId.value)
    const result = await chatStore.fetchMoreMessages(currentChatId.value)
    // 🎯 CRITICAL: 返回实际结果供API生命周期检测器使用
    return result || []
  } catch (error) {
    console.error('Failed to load more messages:', error)
    // 🎯 CRITICAL: 错误情况下也要返回Promise，避免undefined.then错误
    throw error
  } finally {
    setTimeout(() => {
      loadingInProgress = false
    }, 500)
  }
}

const handleUserProfileOpened = (user) => {
  selectedUserProfile.value = user
}

const handleDMCreated = async (chat) => {
  console.log('🔥 DM Created:', chat)
  selectedUserProfile.value = null

  if (chat && chat.id) {
    try {
      await router.push(`/chat/${chat.id}`)
      console.log('✅ Successfully navigated to DM:', chat.id)
    } catch (error) {
      console.error('❌ Failed to navigate to DM:', error)
      window.location.href = `/chat/${chat.id}`
    }
  } else {
    console.error('❌ Invalid chat object received:', chat)
  }
}

const handleReplyTo = (message) => {
  replyToMessage.value = message
}

const handleEditMessage = (message) => {
  console.log('Edit message:', message.id)
}

const handleDeleteMessage = (message) => {
  console.log('Delete message:', message.id)
}

const handleScrollPositionChanged = (position) => {
  console.log('Scroll position changed:', position)
}

const handleReadingPositionUpdated = (position) => {
  console.log('Reading position updated:', position)
}

// SSE Listener Lifecycle Management - Redesigned for stability
const ensureSSEListeners = async () => {
  try {
    console.log('🔗 [Chat.vue] Ensuring SSE listeners for real-time chat...')

    // 🔧 CRITICAL: Multi-layer authentication check
    const authChecks = {
      isAuthenticated: authStore.isAuthenticated,
      hasToken: !!authStore.token,
      hasUser: !!authStore.user,
      tokenLength: authStore.token?.length || 0,
      userId: authStore.user?.id
    }

    console.log('🔍 [SSE] Authentication status:', authChecks)

    if (!authChecks.isAuthenticated || !authChecks.hasToken || !authChecks.hasUser) {
      console.warn('⚠️ [SSE] Incomplete authentication state, skipping SSE connection', authChecks)
      return false
    }

    // 🔧 ENHANCED: Check if we're actually in a chat context
    if (!currentChatId.value) {
      console.log('ℹ️ [SSE] No current chat ID, deferring SSE connection until chat is loaded')
      return false
    }

    if (!minimalSSE) {
      console.error('❌ MinimalSSE service not available')
      return false
    }

    const sseStatus = minimalSSE.getStatus?.() || {}
    console.log('📡 [SSE] Current status:', sseStatus)

    if (!sseStatus.connected) {
      console.log('🚀 [SSE] Initiating connection for chat context...')

      // 🔧 ENHANCED: Comprehensive token validation
      const token = authStore.token
      const tokenValidation = {
        exists: !!token,
        isString: typeof token === 'string',
        hasLength: token?.length > 30, // JWT tokens are typically longer
        hasJWTFormat: token?.includes('.') && token?.split('.').length === 3,
        notExpired: true // We'll trust the authStore for now
      }

      console.log('🔍 [SSE] Token validation:', tokenValidation)

      const isValidToken = Object.values(tokenValidation).every(Boolean)
      if (!isValidToken) {
        console.error('❌ [SSE] Token validation failed', tokenValidation)
        return false
      }

      try {
        console.log('🔌 [SSE] Connecting with validated token for real-time chat updates...')
        
        // 🔧 NEW: Add connection timeout
        const connectionPromise = minimalSSE.connect(token)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SSE connection timeout')), 10000)
        )
        
        await Promise.race([connectionPromise, timeoutPromise])
        console.log('✅ [SSE] Connection attempt completed')
        
        // 🔧 ENHANCED: Verify connection with multiple checks
        await new Promise(resolve => setTimeout(resolve, 1500)) // Longer stabilization
        
        const finalStatus = minimalSSE.getStatus?.() || {}
        const isConnected = finalStatus.connected && minimalSSE.isConnected
        
        if (isConnected) {
          console.log('✅ [SSE] Real-time connection verified and ready for chat')
          return true
        } else {
          console.warn('⚠️ [SSE] Connection completed but verification failed', finalStatus)
          return false
        }
      } catch (error) {
        console.error('❌ [SSE] Connection failed:', error.message || error)
        return false
      }
    } else {
      console.log('✅ [SSE] Already connected and ready for real-time updates')
      return true
    }

    const listeners = minimalSSE.listeners
    if (listeners && listeners.get) {
      const messageListeners = listeners.get('message') || []
      console.log(`📨 Current message listeners: ${messageListeners.length}`)

      if (messageListeners.length === 0) {
        console.warn('⚠️ No message listeners found, setting up SSE message listeners...')

        if (chatStore.setupSSEMessageListeners) {
          chatStore.setupSSEMessageListeners()
          console.log('✅ SSE message listeners re-registered')

          const verifyListeners = listeners.get('message') || []
          console.log(`🔍 Verification: ${verifyListeners.length} message listeners now registered`)

          if (verifyListeners.length === 0) {
            console.error('❌ Failed to register SSE message listeners')
            return false
          }
        } else {
          console.error('❌ chatStore.setupSSEMessageListeners not available')
          return false
        }
      } else {
        console.log('✅ SSE message listeners already configured')
      }
    } else {
      console.error('❌ SSE listeners interface not available')
      return false
    }

    console.log('✅ SSE listeners lifecycle management completed successfully')
    return true

  } catch (error) {
    console.error('❌ Error in SSE listeners lifecycle management:', error)
    return false
  }
}

// Chat management
const handleChannelSelected = async (chatId) => {
  if (!chatId) return

  const numericChatId = parseInt(chatId)
  currentChatId.value = numericChatId
  chatStore.currentChatId = numericChatId

  try {
    console.log('🎯 [Chat.vue] Navigating to chat:', chatId)
    await chatStore.navigateToChat(numericChatId)
    console.log('✅ Successfully navigated to chat with messages loaded:', chatId)
    
    // 🔴 DISABLED: Route-level scroll to bottom enforcement
    // 让DiscordMessageList组件自主决定滚动行为
    console.log('🔴 [IRON LAW] Route change scroll enforcement DISABLED - delegating to DiscordMessageList')
    
    // 🎯 ALTERNATIVE: 发送建议信号而不是强制滚动
    const routeChangeSuggestion = new CustomEvent('fechatter:suggest-scroll-to-bottom', {
      detail: { 
        chatId: numericChatId,
        source: 'Chat.vue-route-watch',
        reason: 'route_change_suggestion',
        priority: 'medium' // 中等优先级建议
      }
    })
    window.dispatchEvent(routeChangeSuggestion)
    console.log('💡 [Chat.vue] Sent route change scroll suggestion to DiscordMessageList');
    
    // 🔴 LEGACY: Route scroll enforcement (DISABLED)
    const enforceRouteScrollToBottom = async () => {
      if (routeScrollEnforcementDisabled) {
        console.log('🔴 [IRON LAW] Route scroll enforcement permanently disabled');
        return;
      }
      
      // 🚨 LEGACY CODE (将在下个版本删除)
      console.log('⚠️ [IRON LAW] Route scroll enforcement is deprecated');
    }
    
    await enforceRouteScrollToBottom()
    
    // Then ensure SSE is connected for the new chat context
    // Add a small delay to let chat context settle
    setTimeout(async () => {
      const sseConnected = await ensureSSEListeners()
      if (sseConnected) {
        console.log('✅ [Chat.vue] SSE verified for new chat context:', numericChatId)
      } else {
        console.warn('⚠️ [Chat.vue] SSE connection issue for chat:', numericChatId)
      }
      
      // 🔴 DISABLED: Final enforcement after SSE setup
      // 发送最终建议而不是强制滚动
      setTimeout(() => {
        const finalSuggestionEvent = new CustomEvent('fechatter:suggest-scroll-to-bottom', {
          detail: { 
            chatId: numericChatId,
            source: 'Chat.vue-final',
            reason: 'post_sse_suggestion',
            priority: 'low' // 低优先级最终建议
          }
        })
        window.dispatchEvent(finalSuggestionEvent)
        console.log('💡 [Chat.vue] Final route change suggestion completed')
      }, 100)
    }, 300)
  } catch (error) {
    console.error('Failed to switch chat:', error)
  }
}

// Event handlers
const openPerfectSearch = () => {
  showPerfectSearch.value = true
}

const openChatSettings = () => {
  showChatSettings.value = true
}

const handleMemberUpdated = () => {
  console.log('Member updated')
}

const handleChatSettingsUpdate = () => {
  console.log('Chat settings updated')
  showChatSettings.value = false
}

// Translation Panel Event Handlers
const handleTranslationPanelClose = () => {
  console.log('🌐 Translation panel closed')
  messageUIStore.closeTranslationPanel()
}

const handleTranslationCompleted = (translationResult) => {
  console.log('🌐 Translation completed:', translationResult)
}

const handleTranslationApplied = (applicationResult) => {
  console.log('🌐 Translation applied:', applicationResult)
}

// Chat display utilities
const getDisplayChatName = () => {
  if (!currentChatId.value) return 'Loading...'
  
  if (!currentChat.value) {
    const chat = chatStore.getChatById(currentChatId.value)
    if (chat) {
      return chat.display_name || chat.name || `Chat ${currentChatId.value}`
    }
    return 'Loading...'
  }
  
  return currentChat.value.display_name || currentChat.value.name || `Chat ${currentChatId.value}`
}

const getDisplayChatDescription = () => {
  if (!currentChatId.value) return 'Loading chat...'
  
  if (!currentChat.value) return 'Loading chat information...'
  
  if (currentChat.value.description) {
    return currentChat.value.description
  }
  
  switch (currentChat.value.chat_type) {
    case 'PublicChannel':
      return 'Public channel'
    case 'PrivateChannel':
      return 'Private channel'
    case 'Single':
      return 'Direct message'
    case 'Group':
      return 'Group chat'
    default:
      return 'Chat channel'
  }
}

// Enhanced message sending with file upload support
const handleMessageSent = async (messageData) => {
  if (!currentChatId.value) {
    console.error('❌ No chat ID available for handling sent message')
    return
  }

  try {
    console.log('📨 [Chat.vue] Processing message for sending:', {
      chatId: currentChatId.value,
      content: messageData.content || '(empty)',
      contentLength: messageData.content?.length || 0,
      contentTrimmed: messageData.content?.trim() || '(empty)',
      contentTrimmedLength: messageData.content?.trim()?.length || 0,
      filesCount: messageData.files?.length || 0,
      hasFiles: messageData.files?.length > 0,
      messageData: messageData
    })

    // 🔧 BACKEND ALIGNED: Backend requires content to be non-empty even with files
    // 注意：不要再次trim，因为MessageInput可能已经添加了必要的空格
    const contentToSend = messageData.content || '';
    const hasValidContent = contentToSend.length > 0;
    const hasValidFiles = messageData.files && messageData.files.length > 0;

    // 🔧 BACKEND REQUIREMENT: Content must always be non-empty
    if (!hasValidContent) {
      console.error('❌ [Chat.vue] Message validation failed: Empty content not allowed', {
        originalContent: messageData.content,
        contentToSend: contentToSend,
        files: messageData.files,
        backendRequirement: 'Content must be 1-4000 characters even with files'
      })
      emit('error', {
        type: 'validation',
        message: hasValidFiles 
          ? 'Message content is required even with files (backend requirement)'
          : 'Message content cannot be empty'
      })
      return
    }

    if (contentToSend.length > 4000) {
      console.error('❌ [Chat.vue] Message validation failed: Content too long', {
        contentLength: contentToSend.length,
        maxLength: 4000
      })
      emit('error', {
        type: 'validation', 
        message: 'Message content must be less than 4000 characters'
      })
      return
    }

    const sendOptions = {
      formatMode: messageData.formatMode,
      replyTo: messageData.reply_to,
      mentions: messageData.mentions
    }

    let result

    if (hasValidFiles) {
      console.log('📤 [Chat.vue] Sending message with files using enhanced system', {
        content: contentToSend,
        contentLength: contentToSend.length,
        filesCount: messageData.files.length
      })

      result = await chatStore.sendMessageWithFiles(
        contentToSend, // 🔧 Use validated content
        messageData.files,
        sendOptions
      )

      console.log('✅ [Chat.vue] File message sent with enhanced system:', {
        messageId: result?.message?.id,
        filesUploaded: result?.message?.files?.length || 0
      })

    } else if (hasValidContent) {
      console.log('📨 [Chat.vue] Sending text-only message', {
        content: contentToSend,
        contentLength: contentToSend.length
      })

      result = await chatStore.sendMessage(contentToSend, sendOptions) // 🔧 Use validated content

      console.log('✅ [Chat.vue] Text message sent:', {
        messageId: result?.message?.id
      })
    } else {
      console.error('❌ [Chat.vue] No valid content or files to send')
      return
    }

    replyToMessage.value = null
    return result

  } catch (error) {
    console.error('❌ [Chat.vue] Failed to send message:', error)
    
    // 🔧 Enhanced error handling with more specific messages
    let errorMessage = 'Failed to send message'
    if (error.response?.status === 400) {
      const errorData = error.response.data
      if (errorData.message?.includes('content')) {
        errorMessage = 'Message content validation failed'
      } else if (errorData.message?.includes('file')) {
        errorMessage = 'File validation failed'
      } else {
        errorMessage = errorData.message || 'Invalid request'
      }
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed. Please login again.'
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to send messages in this chat'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server error. Please try again later.'
    }

    emit('error', {
      type: 'send_failed',
      message: errorMessage,
      error
    })
    
    throw error
  }
}

// Handle errors from MessageInput
const handleMessageError = (errorMessage) => {
  console.error('❌ [Chat.vue] MessageInput error:', errorMessage)

  if (typeof window !== 'undefined' && window.showNotification) {
    window.showNotification(errorMessage, 'error')
  } else {
    alert(errorMessage)
  }
}

// Lifecycle - Optimized for SSE stability
onMounted(async () => {
  console.log('🔥 [Chat.vue] Chat component mounted - initializing real-time system')

  try {
    // Step 1: Initialize chat store foundation
    if (!chatStore.isInitialized) {
      console.log('🔄 [Chat.vue] Initializing chat store...')
      await chatStore.initialize()
    }

    // Step 2: Load chat list for navigation
    if (chatStore.chats.length === 0) {
      console.log('🔄 [Chat.vue] Fetching chats for sidebar...')
      await chatStore.fetchChats()
    }

    console.log('✅ [Chat.vue] Chat store ready, chats loaded:', chatStore.chats.length)

    // Step 3: Setup current chat context
    const chatId = route.params.id
    if (currentChatId.value) {
      console.log('✅ [Chat.vue] Valid chat ID confirmed on mount:', currentChatId.value)
      chatStore.currentChatId = currentChatId.value
      await handleChannelSelected(currentChatId.value)
    } else {
      console.warn('⚠️ [Chat.vue] No valid chat ID available on mount, route param:', chatId)
    }

    // Step 4: ONLY NOW attempt SSE connection (after chat context is established)
    console.log('🔌 [Chat.vue] Chat context ready, setting up real-time connection...')
    
    // Add a small delay to ensure all state is stabilized
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const sseConnected = await ensureSSEListeners()
    if (sseConnected) {
      console.log('✅ [Chat.vue] Real-time connection established for chat updates')
    } else {
      console.warn('⚠️ [Chat.vue] Real-time connection not established, will retry when needed')
    }

  } catch (error) {
    console.error('❌ [Chat.vue] Failed to initialize chat system:', error)
  }

  // Step 5: Setup global event listeners
  document.addEventListener('keydown', handleGlobalKeydown)
  
  console.log('🎯 [Chat.vue] Chat component fully initialized and ready')
})

onUnmounted(() => {
  console.log('🔥 Chat.vue unmounted')
  loadingInProgress = false
  document.removeEventListener('keydown', handleGlobalKeydown)
})

// Global keyboard shortcuts
const handleGlobalKeydown = (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    openPerfectSearch()
  }
}

// Watch route changes - Optimized for SSE stability
watch(
  () => route.params.id,
  async (newChatId) => {
    console.log('🔄 [Chat.vue] Route changed to chat:', newChatId)

    if (newChatId && !isNaN(parseInt(newChatId))) {
      const validChatId = parseInt(newChatId)
      if (validChatId !== currentChatId.value) {
        console.log('🎯 [Chat.vue] Switching chat context from', currentChatId.value, 'to', validChatId)
        
        currentChatId.value = validChatId
        chatStore.currentChatId = validChatId
        loadingInProgress = false
        
        // First switch chat context
        await handleChannelSelected(validChatId)
        
        // 🔴 DISABLED: Route-level scroll to bottom enforcement
        // 让DiscordMessageList组件自主决定滚动行为
        console.log('🔴 [IRON LAW] Route change scroll enforcement DISABLED - delegating to DiscordMessageList')
        
        // 🎯 ALTERNATIVE: 发送建议信号而不是强制滚动
        const routeChangeSuggestion = new CustomEvent('fechatter:suggest-scroll-to-bottom', {
          detail: { 
            chatId: validChatId,
            source: 'Chat.vue-route-watch',
            reason: 'route_change_suggestion',
            priority: 'medium' // 中等优先级建议
          }
        })
        window.dispatchEvent(routeChangeSuggestion)
        console.log('💡 [Chat.vue] Sent route change scroll suggestion to DiscordMessageList');
        
        // 🔴 LEGACY: Route scroll enforcement (DISABLED)
        const enforceRouteScrollToBottom = async () => {
          if (routeScrollEnforcementDisabled) {
            console.log('🔴 [IRON LAW] Route scroll enforcement permanently disabled');
            return;
          }
          
          // 🚨 LEGACY CODE (将在下个版本删除)
          console.log('⚠️ [IRON LAW] Route scroll enforcement is deprecated');
        }
        
        await enforceRouteScrollToBottom()
        
        // Then ensure SSE is connected for the new chat context
        // Add a small delay to let chat context settle
        setTimeout(async () => {
          const sseConnected = await ensureSSEListeners()
          if (sseConnected) {
            console.log('✅ [Chat.vue] SSE verified for new chat context:', validChatId)
          } else {
            console.warn('⚠️ [Chat.vue] SSE connection issue for chat:', validChatId)
          }
          
          // 🔴 DISABLED: Final enforcement after SSE setup
          // 发送最终建议而不是强制滚动
          setTimeout(() => {
            const finalSuggestionEvent = new CustomEvent('fechatter:suggest-scroll-to-bottom', {
              detail: { 
                chatId: validChatId,
                source: 'Chat.vue-final',
                reason: 'post_sse_suggestion',
                priority: 'low' // 低优先级最终建议
              }
            })
            window.dispatchEvent(finalSuggestionEvent)
            console.log('💡 [Chat.vue] Final route change suggestion completed')
          }, 100)
        }, 300)
      }
    } else {
      console.warn('⚠️ [Chat.vue] Invalid chat ID in route watch:', newChatId)
      currentChatId.value = null
      chatStore.currentChatId = null
    }
  }
)

// Translation Panel position logic
const getOptimalTranslationPanelPosition = () => {
  if (typeof window === 'undefined') {
    return { x: 400, y: 80 }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const panelWidth = 420
  const panelHeight = 500
  const topMargin = 80
  const rightMargin = 20
  const messageAreaWidth = Math.min(860, viewportWidth * 0.7)

  const messageAreaLeft = (viewportWidth - messageAreaWidth) / 2
  const messageAreaRight = messageAreaLeft + messageAreaWidth

  let left, top

  if (viewportWidth - messageAreaRight >= panelWidth + rightMargin) {
    left = messageAreaRight + 16
  } else if (messageAreaLeft >= panelWidth + rightMargin) {
    left = messageAreaLeft - panelWidth - 16
  } else {
    left = viewportWidth - panelWidth - rightMargin
  }

  top = topMargin

  left = Math.max(rightMargin, Math.min(left, viewportWidth - panelWidth - rightMargin))
  top = Math.max(topMargin, Math.min(top, viewportHeight - panelHeight - 20))

  return { x: left, y: top }
}

const handlePerfectSearchClose = () => {
  showPerfectSearch.value = false
}

const handlePerfectSearchNavigate = (navigationResult) => {
  console.log('🎯 Perfect Search navigation:', navigationResult)
  showPerfectSearch.value = false

  if (navigationResult.chatId && navigationResult.chatId !== currentChatId.value) {
    router.push(`/chat/${navigationResult.chatId}`)
  }
}

console.log('✅ Chat.vue fully restored with all components:', currentChatId.value)
</script>

<style scoped>
.chat-content-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: #f8f9fa;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e1e5e9;
  background: white;
  flex-shrink: 0;
}

.chat-header-info {
  flex: 1;
  min-width: 0;
}

.chat-title {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.channel-prefix {
  font-size: 16px;
  margin-right: 6px;
  color: #616061;
}

.chat-title h1 {
  font-size: 18px;
  font-weight: 900;
  color: #1d1c1d;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-description {
  font-size: 13px;
  color: #616061;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action {
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #616061;
  transition: all 0.2s ease;
}

.header-action:hover {
  background-color: #e8f4fd;
  color: #1d1c1d;
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
}

.messages-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #616061;
  font-size: 14px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e1e5e9;
  border-top: 3px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.messages-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  color: #616061;
  font-size: 14px;
}

.input-container {
  flex-shrink: 0;
  border-top: 1px solid #e1e5e9;
  background: white;
  padding: 16px;
}

.chat-header-actions.elegant {
  display: flex;
  align-items: center;
  gap: 8px;
}

.elegant-search {
  background-color: #f6f6f6;
  padding: 8px 12px;
  gap: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.elegant-search:hover {
  background-color: #e8f4fd;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.15);
}

.elegant-btn {
  width: 36px;
  height: 36px;
}

.action-icon {
  width: 20px;
  height: 20px;
}

.golden-search-icon {
  transition: all 0.2s ease;
  color: inherit;
}

.golden-search-icon:hover {
  transform: scale(1.1);
}

.elegant-search:hover .golden-search-icon {
  color: #007AFF;
}

.has-input-preview {
  transform: translateY(-150px);
}

.message-input {
  width: 100%;
}

.loading-input {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #616061;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.loading-message {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-message::before {
  content: "";
  width: 16px;
  height: 16px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Modals */
.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.chat-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
}

.chat-modal-large {
  max-width: 800px;
}

.chat-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: none;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.6));
  border-radius: 24px 24px 0 0;
}

.chat-modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1d1c1d;
  margin: 0;
}

.chat-modal-close {
  background: rgba(255, 255, 255, 0.6);
  border: none;
  cursor: pointer;
  color: #616061;
  padding: 8px;
  border-radius: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chat-modal-close:hover {
  background: rgba(255, 255, 255, 0.9);
  color: #1d1c1d;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.chat-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>