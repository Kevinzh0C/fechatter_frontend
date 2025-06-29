<template>
  <div class="chat-content-container" :class="{ 'theme-dark': currentTheme === 'dark', 'theme-light': currentTheme === 'light' }">
    <!-- Chat Header -->
    <div class="chat-header">
      <!-- 📱 Mobile Sidebar Button -->
      <button 
        v-if="isMobile" 
        @click="toggleMobileSidebar" 
        class="mobile-sidebar-btn"
        title="Open Sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
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
        <!-- Invite Members Button -->
        <button 
          v-if="showInviteButton" 
          class="header-action elegant-invite" 
          @click="openInviteMembers"
          title="Invite members to this chat"
        >
          <Icon name="user-plus" class="action-icon" />
          <span class="action-text">Invite</span>
        </button>
        
        <!-- Search Button -->
        <button class="header-action elegant-search" @click="openPerfectSearch">
          <svg class="golden-search-icon" width="20" height="20" viewBox="0 0 100 100" fill="none">
            <circle cx="38.2" cy="38.2" r="23.6" stroke="currentColor" stroke-width="6.18" fill="none" stroke-linecap="round" />
            <line x1="55.9" y1="55.9" x2="76.4" y2="76.4" stroke="currentColor" stroke-width="6.18" stroke-linecap="round" />
            <circle cx="32.4" cy="32.4" r="4.8" fill="currentColor" opacity="0.3" />
          </svg>
          <span class="action-text">Search</span>
        </button>

        <!-- Chat Actions Dropdown -->
        <div class="chat-actions-container" ref="chatActionsContainer">
          <button class="header-action elegant-btn" @click="toggleChatMenu" title="Chat settings">
            <Icon name="settings" class="action-icon" />
          </button>
          <Transition name="menu-slide-down">
            <div v-if="showChatMenu" class="chat-actions-menu">
              <button @click="openMemberManagement" class="menu-item">
                <Icon name="users" class="menu-icon" />
                <span>Members</span>
              </button>
              <button @click="openChatSettings" class="menu-item">
                <Icon name="settings" class="menu-icon" />
                <span>Settings</span>
              </button>
              <div class="menu-divider"></div>
              <button @click="leaveChannel" class="menu-item menu-item-danger">
                <Icon name="log-out" class="menu-icon" />
                <span>Leave Channel</span>
              </button>
            </div>
          </Transition>
        </div>
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

    <!-- Invite Members Modal -->
    <InviteMemberModal 
      v-if="showInviteMembersModal"
      :is-open="showInviteMembersModal"
      :chat-id="currentChatId"
      :chat-name="getDisplayChatName()"
      :existing-member-ids="[]"
      @close="showInviteMembersModal = false"
      @members-invited="handleMembersInvited"
    />

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
import { useChatManagementStore } from '@/stores/chatManagement.js'
import minimalSSE from '@/services/sse-minimal.js'
import { createNavigationEventHelper } from '@/services/NavigationEventManager.js'
import themeManager from '@/services/ThemeManager.js'

// Components - reusing existing components
import Icon from '@/components/icons/BaseIcon.vue'
import MessageInput from '@/components/chat/MessageInput/index.vue'
import DiscordMessageList from '@/components/discord/DiscordMessageList.vue'
import MemberManagement from '@/components/chat/MemberManagement.vue'
import ChatSettings from '@/components/chat/ChatSettings.vue'
import UserProfile from '@/components/modals/UserProfile.vue'
import PerfectSearchModal from '@/components/search/PerfectSearchModal.vue'
import TranslationPanel from '@/components/chat/TranslationPanel.vue'
import InviteMemberModal from '@/components/modals/InviteMemberModal.vue'

// Router and stores
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const messageUIStore = useMessageUIStore()
const chatManagementStore = useChatManagementStore()

// 🎯 Initialize navigation event manager for Chat.vue
const navigationHelper = createNavigationEventHelper(router)

// 🎯 Setup navigation event listeners
navigationHelper.addEventListener('navigation-complete', (result) => {
  console.log('🎉 [Chat.vue] Navigation completed via NavigationEventManager:', result)
  
  // Update current chat ID to match the successful navigation
  if (result.chatId && result.chatId !== currentChatId.value) {
    currentChatId.value = result.chatId
    chatStore.currentChatId = result.chatId
  }
})

navigationHelper.addEventListener('navigation-error', (error) => {
  console.error('❌ [Chat.vue] Navigation error via NavigationEventManager:', error)
  
  // Could show user notification here
  if (typeof window !== 'undefined' && window.showNotification) {
    window.showNotification(`Navigation failed: ${error.error}`, 'error')
  }
})

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
const showInviteMembersModal = ref(false)
const hasInputPreview = ref(false)
const showChatMenu = ref(false)
const chatActionsContainer = ref(null)

// 🎨 Theme management - 默认浅色主题，与全局系统同步
const currentTheme = ref(themeManager.getCurrentTheme() || 'light')
let handleThemeChange = null

// 确保主题有效且默认为浅色
const effectiveTheme = computed(() => {
  return ['light', 'dark'].includes(currentTheme.value) ? currentTheme.value : 'light'
})

// 监听主题变化，确保与全局主题系统同步
watch(() => themeManager.getCurrentTheme(), (newTheme) => {
  if (currentTheme.value !== newTheme) {
    currentTheme.value = newTheme || 'light'
    console.log('🎨 [Chat.vue] Theme synchronized with global system:', currentTheme.value)
  }
})

// 📱 Mobile detection and sidebar control
const isMobile = ref(false)
const keyboardVisible = ref(false)
const originalViewportHeight = ref(0)
const currentViewportHeight = ref(0)

const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 📱 键盘检测和适配
const detectKeyboard = () => {
  if (!isMobile.value) return
  
  const currentHeight = window.visualViewport?.height || window.innerHeight
  const originalHeight = originalViewportHeight.value || window.screen.height
  
  // 键盘高度阈值：如果视口高度减少超过150px，认为键盘已显示
  const keyboardThreshold = 150
  const heightDifference = originalHeight - currentHeight
  
  const wasKeyboardVisible = keyboardVisible.value
  keyboardVisible.value = heightDifference > keyboardThreshold
  
  currentViewportHeight.value = currentHeight
  
  if (wasKeyboardVisible !== keyboardVisible.value) {
    console.log('📱 [Chat.vue] Keyboard state changed:', {
      visible: keyboardVisible.value,
      originalHeight,
      currentHeight,
      heightDifference,
      threshold: keyboardThreshold
    })
    
    // 应用键盘适配样式
    applyKeyboardAdaptation()
  }
}

// 📱 应用键盘适配
const applyKeyboardAdaptation = () => {
  const chatContainer = document.querySelector('.chat-content-container')
  const inputContainer = document.querySelector('.input-container')
  const messagesContainer = document.querySelector('.messages-container')
  
  if (!chatContainer || !inputContainer || !messagesContainer) return
  
  if (keyboardVisible.value) {
    // 键盘显示时的适配
    console.log('📱 [Chat.vue] Applying keyboard visible adaptations')
    
    // 🔧 FIX: 使用CSS变量而不是直接设置高度
    // 设置容器高度为当前视口高度
    chatContainer.style.setProperty('--keyboard-height', `${originalViewportHeight.value - currentViewportHeight.value}px`)
    chatContainer.style.setProperty('--viewport-height', `${currentViewportHeight.value}px`)
    
    // 添加键盘可见标识
    chatContainer.classList.add('keyboard-visible')
    
  } else {
    // 键盘隐藏时恢复正常
    console.log('📱 [Chat.vue] Applying keyboard hidden adaptations')
    
    // 移除CSS变量
    chatContainer.style.removeProperty('--keyboard-height')
    chatContainer.style.removeProperty('--viewport-height')
    
    // 移除键盘可见标识
    chatContainer.classList.remove('keyboard-visible')
  }
}

// 📱 滚动到输入框（当键盘弹出时）
const scrollToInput = () => {
  if (!keyboardVisible.value || !isMobile.value) return
  
  setTimeout(() => {
    const inputContainer = document.querySelector('.input-container')
    if (inputContainer) {
      inputContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      })
    }
  }, 100)
}

const toggleMobileSidebar = () => {
  console.log('📱 [Chat.vue] Toggling mobile sidebar')
  
  // 优先使用全局的移动端滑动管理器
  if (window.mobileSwipeManager && window.mobileSwipeManager.toggleSidebar) {
    window.mobileSwipeManager.toggleSidebar()
    console.log('📱 [Chat.vue] Using global mobile swipe manager')
    return
  }
  
  // 备用方案：直接操作DOM
  console.log('📱 [Chat.vue] Fallback to direct DOM manipulation')
  const sidebar = document.querySelector('.global-sidebar.mobile-sidebar')
  const overlay = document.querySelector('.mobile-overlay')
  
  if (sidebar) {
    const isVisible = sidebar.classList.contains('mobile-visible')
    
    if (isVisible) {
      // 关闭sidebar
      sidebar.classList.remove('mobile-visible')
      sidebar.style.transform = 'translateX(-100%)'
      if (overlay) {
        overlay.remove()
      }
      document.body.style.overflow = ''
      console.log('📱 [Chat.vue] Sidebar closed via fallback')
    } else {
      // 打开sidebar
      sidebar.classList.add('mobile-visible')
      sidebar.style.transform = 'translateX(0)'
      
      // 添加遮罩层
      if (!overlay) {
        const newOverlay = document.createElement('div')
        newOverlay.className = 'mobile-overlay'
        newOverlay.addEventListener('click', () => {
          sidebar.classList.remove('mobile-visible')
          sidebar.style.transform = 'translateX(-100%)'
          newOverlay.remove()
          document.body.style.overflow = ''
          console.log('📱 [Chat.vue] Sidebar closed via overlay click')
        })
        document.body.appendChild(newOverlay)
      }
      
      document.body.style.overflow = 'hidden'
      console.log('📱 [Chat.vue] Sidebar opened via fallback')
    }
  } else {
    console.warn('📱 [Chat.vue] Sidebar element not found')
  }
}

// Computed - with safe fallbacks
const currentChat = computed(() => chatStore.getCurrentChat)

// 🔧 ENHANCED: Show invite button for group chats and channels
const showInviteButton = computed(() => {
  if (!currentChat.value && !currentChatId.value) return false;
  
  // Check cached details first
  const cachedDetails = chatManagementStore.getCachedChatDetails(currentChatId.value);
  if (cachedDetails) {
    return ['PublicChannel', 'PrivateChannel', 'Group'].includes(cachedDetails.type);
  }
  
  // Fallback to current chat data
  if (currentChat.value) {
    return ['PublicChannel', 'PrivateChannel', 'Group'].includes(currentChat.value.chat_type);
  }
  
  return false;
})

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

// Chat management - Enhanced error handling and validation
const handleChannelSelected = async (chatId) => {
  if (!chatId) {
    console.warn('⚠️ [Chat.vue] handleChannelSelected called with empty chatId');
    return;
  }

  // Validate and convert chatId
  const numericChatId = parseInt(chatId);
  if (isNaN(numericChatId)) {
    console.error('❌ [Chat.vue] Invalid chatId provided:', chatId);
    return;
  }

  // Avoid processing the same chat twice
  if (numericChatId === currentChatId.value) {
    console.log('ℹ️ [Chat.vue] Already on the same chat, skipping navigation:', numericChatId);
    return;
  }

  console.log('🎯 [Chat.vue] Switching to chat:', numericChatId, 'from:', currentChatId.value);

  // Update chat ID state
  currentChatId.value = numericChatId;
  chatStore.currentChatId = numericChatId;

  try {
    console.log('🔄 [Chat.vue] Loading chat data and messages...');
    await chatStore.navigateToChat(numericChatId);
    console.log('✅ [Chat.vue] Successfully navigated to chat with messages loaded:', numericChatId);
    
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
    
    // 🔧 ENHANCED: Load enhanced chat details
    setTimeout(async () => {
      await loadChatDetails(numericChatId);
    }, 100);
    
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

const toggleChatMenu = () => {
  showChatMenu.value = !showChatMenu.value
}

const closeChatMenu = () => {
  showChatMenu.value = false
}

const openMemberManagement = () => {
  showMemberManagement.value = true
  closeChatMenu()
}

const openChatSettings = () => {
  showChatSettings.value = true
  closeChatMenu()
}

const leaveChannel = async () => {
  closeChatMenu()
  if (!currentChatId.value) return
  
  const confirmed = confirm(`Are you sure you want to leave "${getDisplayChatName()}"?`)
  if (confirmed) {
    try {
      await chatManagementStore.leaveChat(currentChatId.value)
      router.push('/home') // Redirect to a safe page after leaving
    } catch (error) {
      console.error('Failed to leave channel:', error)
      // You might want to show a notification to the user here
    }
  }
}

const openInviteMembers = () => {
  showInviteMembersModal.value = true
}

const handleMemberUpdated = () => {
  console.log('Member updated')
}

const handleChatSettingsUpdate = () => {
  console.log('Chat settings updated')
  showChatSettings.value = false
}

const handleMembersInvited = async (inviteResult) => {
  console.log('✅ [Chat.vue] Members invited to chat:', inviteResult);
  showInviteMembersModal.value = false;
  
  // 🔧 ENHANCED: Refresh chat details to get updated member count
  if (currentChatId.value) {
    setTimeout(async () => {
      await loadChatDetails(currentChatId.value);
    }, 1000);
  }
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

// Enhanced chat details loading
const loadChatDetails = async (chatId) => {
  if (!chatId) return null;
  
  try {
    console.log('🔍 [Chat.vue] Loading enhanced chat details for:', chatId);
    
    // 🔧 ENHANCED: Get detailed chat information via new API
    const chatDetails = await chatManagementStore.getChatDetails(chatId);
    
    if (chatDetails) {
      console.log('✅ [Chat.vue] Enhanced chat details loaded:', {
        name: chatDetails.name,
        type: chatDetails.type,
        memberCount: chatDetails.member_count,
        isPrivate: chatDetails.is_private
      });
      
      // Update chat store with enhanced details if needed
      const existingChat = chatStore.getChatById(chatId);
      if (existingChat && chatDetails.member_count !== existingChat.member_count) {
        console.log('🔄 [Chat.vue] Updating chat with enhanced details');
        existingChat.member_count = chatDetails.member_count;
        existingChat.settings = chatDetails.settings;
      }
    }
    
    return chatDetails;
  } catch (error) {
    console.error('❌ [Chat.vue] Failed to load enhanced chat details:', error);
    return null;
  }
};

// Chat display utilities
const getDisplayChatName = () => {
  if (!currentChatId.value) return 'Loading...'
  
  // 🔧 ENHANCED: Check cached chat details first
  const cachedDetails = chatManagementStore.getCachedChatDetails(currentChatId.value);
  if (cachedDetails && cachedDetails.name) {
    return cachedDetails.name;
  }
  
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
  
  // 🔧 ENHANCED: Check cached chat details first
  const cachedDetails = chatManagementStore.getCachedChatDetails(currentChatId.value);
  if (cachedDetails) {
    if (cachedDetails.description) {
      return cachedDetails.description;
    }
    
    // Enhanced description with member count
    const memberText = cachedDetails.member_count ? ` • ${cachedDetails.member_count} members` : '';
    
    switch (cachedDetails.type) {
      case 'PublicChannel':
        return `Public channel${memberText}`;
      case 'PrivateChannel':
        return `Private channel${memberText}`;
      case 'Single':
        return 'Direct message';
      case 'Group':
        return `Group chat${memberText}`;
      default:
        return `Chat channel${memberText}`;
    }
  }
  
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

  // 🎨 Initialize theme management
  handleThemeChange = (newTheme) => {
    currentTheme.value = newTheme
    console.log('🎨 [Chat.vue] Theme changed to:', newTheme)
  }
  themeManager.addListener(handleThemeChange)

  // 📱 Initialize mobile detection
  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)

  // 📱 Initialize keyboard detection for mobile
  if (isMobile.value) {
    // 记录初始视口高度
    originalViewportHeight.value = window.innerHeight
    currentViewportHeight.value = window.innerHeight
    
    // 监听视口变化（键盘弹出/收起）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', detectKeyboard)
      console.log('📱 [Chat.vue] Visual Viewport API available, using for keyboard detection')
    } else {
      // 备用方案：监听window resize
      window.addEventListener('resize', detectKeyboard)
      console.log('📱 [Chat.vue] Using window resize for keyboard detection (fallback)')
    }
    
    // 监听输入框聚焦事件
    setTimeout(() => {
      const messageInput = document.querySelector('.message-textarea')
      if (messageInput) {
        messageInput.addEventListener('focus', () => {
          console.log('📱 [Chat.vue] Input focused, will check for keyboard')
          setTimeout(detectKeyboard, 300) // 延迟检测，等待键盘动画
          setTimeout(scrollToInput, 500) // 延迟滚动，确保键盘完全显示
        })
        
        messageInput.addEventListener('blur', () => {
          console.log('📱 [Chat.vue] Input blurred, will check for keyboard')
          setTimeout(detectKeyboard, 300) // 延迟检测，等待键盘动画
        })
      }
    }, 1000) // 等待组件完全加载
  }

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

    // Ensure SSE connection is established when entering chat
    try {
      if (!minimalSSE.isConnected && authStore.isAuthenticated && authStore.token) {
        console.log('🔄 [Chat] Initializing SSE connection that was skipped during login');
        await minimalSSE.connect(authStore.token);
        console.log('✅ [Chat] SSE connection established successfully');
      } else if (minimalSSE.isConnected) {
        console.log('✅ [Chat] SSE connection already established');
      } else {
        console.log('⚠️ [Chat] Cannot establish SSE connection - not authenticated');
      }
    } catch (error) {
      console.error('❌ [Chat] Failed to establish SSE connection:', error);
    }

  } catch (error) {
    console.error('❌ [Chat.vue] Failed to initialize chat system:', error)
  }

  // Step 5: Setup global event listeners
  document.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('click', handleClickOutside)
  
  console.log('🎯 [Chat.vue] Chat component fully initialized and ready')
})

onUnmounted(() => {
  console.log('🔥 Chat.vue unmounted')
  loadingInProgress = false
  document.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('click', handleClickOutside)
  
  // 🎨 Clean up theme listener
  themeManager.removeListener(handleThemeChange)
  
  // 📱 Clean up mobile detection
  window.removeEventListener('resize', checkIsMobile)
  
  // 📱 Clean up keyboard detection
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', detectKeyboard)
  } else {
    window.removeEventListener('resize', detectKeyboard)
  }
  
  // 📱 Clean up input event listeners
  const messageInput = document.querySelector('.message-textarea')
  if (messageInput) {
    messageInput.removeEventListener('focus', detectKeyboard)
    messageInput.removeEventListener('blur', detectKeyboard)
  }
  
  // 📱 Reset any keyboard adaptations
  const chatContainer = document.querySelector('.chat-content-container')
  if (chatContainer) {
    chatContainer.classList.remove('keyboard-visible')
    chatContainer.style.height = ''
    chatContainer.style.maxHeight = ''
  }
})

// Global keyboard shortcuts
const handleGlobalKeydown = (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    openPerfectSearch()
  }
}

const handleClickOutside = (event) => {
  if (chatActionsContainer.value && !chatActionsContainer.value.contains(event.target)) {
    closeChatMenu()
  }
}

// Watch route changes - Optimized for stable navigation
watch(
  () => route.params.id,
  async (newChatId, oldChatId) => {
    console.log('🔄 [Chat.vue] Route changed from', oldChatId, 'to', newChatId);

    if (newChatId && !isNaN(parseInt(newChatId))) {
      const validChatId = parseInt(newChatId);
      
      // 避免重复处理相同的chat ID
      if (validChatId === currentChatId.value) {
        console.log('ℹ️ [Chat.vue] Same chat ID, skipping route change handling');
        return;
      }
      
      console.log('🎯 [Chat.vue] Processing chat context switch from', currentChatId.value, 'to', validChatId);
      
      // 重置加载状态
      loadingInProgress = false;
      
      // 更新chat ID
      currentChatId.value = validChatId;
      chatStore.currentChatId = validChatId;
      
      try {
        // 切换聊天上下文
        await handleChannelSelected(validChatId);
        
        console.log('✅ [Chat.vue] Chat context switch completed successfully');
        
        // 发送导航完成事件
        const navigationCompleteEvent = new CustomEvent('fechatter:navigation-complete', {
          detail: { 
            chatId: validChatId,
            source: 'Chat.vue-route-watch',
            oldChatId: parseInt(oldChatId) || null,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(navigationCompleteEvent);
        
      } catch (error) {
        console.error('❌ [Chat.vue] Failed to switch chat context:', error);
        
        // 发送导航失败事件
        const navigationErrorEvent = new CustomEvent('fechatter:navigation-error', {
          detail: { 
            chatId: validChatId,
            error: error.message,
            source: 'Chat.vue-route-watch'
          }
        });
        window.dispatchEvent(navigationErrorEvent);
      }
      
    } else {
      console.warn('⚠️ [Chat.vue] Invalid chat ID in route watch:', newChatId);
      currentChatId.value = null;
      chatStore.currentChatId = null;
    }
  },
  { immediate: false } // 不立即执行，避免与onMounted冲突
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
  height: 100%;
  /* 🔧 FIX: 使用100%继承父容器高度，避免多层vh嵌套 */
  overflow: hidden;
  background: var(--color-background);
  position: relative;
  transition: background-color 0.3s ease;
}

/* 🎨 双主题系统支持 - 确保浅色主题为默认 */
.chat-content-container.theme-light {
  /* 🌟 浅色主题（默认） - 基于Discord亮色主题 */
  --color-background: #ffffff;
  --color-background-secondary: #f2f3f5;
  --color-text: #060607;
  --color-text-secondary: #4e5058;
  --color-text-muted: #6b7280;
  --color-border: #e3e5e8;
  --color-primary: #5865f2;
  --color-primary-hover: #4752c4;
}

.chat-content-container.theme-dark {
  /* 🌙 暗色主题 - 基于Discord暗色主题 */
  --color-background: #36393f;
  --color-background-secondary: #2f3136;
  --color-text: #dcddde;
  --color-text-secondary: #b9bbbe;
  --color-text-muted: #8e9297;
  --color-border: #202225;
  --color-primary: #5865f2;
  --color-primary-hover: #4752c4;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-secondary);
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
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
  color: var(--color-text-secondary);
}

.chat-title h1 {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-text);
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
  position: relative;
}

.chat-actions-container {
  position: relative;
}

.chat-actions-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background-color: var(--color-background-secondary);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  z-index: 10;
  border: 1px solid var(--color-border);
  overflow: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  background-color: transparent;
  border: none;
  text-align: left;
  width: 100%;
}

.menu-item:hover {
  background-color: var(--color-background-muted);
}

.menu-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.menu-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 0;
}

.menu-item-danger {
  color: var(--color-danger);
}

.menu-item-danger:hover {
  background-color: var(--color-danger);
  color: white;
}

.menu-item-danger:hover .menu-icon {
  color: white;
}

.menu-slide-down-enter-active,
.menu-slide-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-slide-down-enter-from,
.menu-slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.header-action {
  width: 40px;
  height: 40px;
  padding: 8px;
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

.elegant-invite {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 8px 12px;
  gap: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.elegant-invite:hover {
  background-color: rgba(34, 197, 94, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
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

/* 📱 移动端布局优化 */
@media (max-width: 768px) {
  .chat-content-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 📱 移动端独占全屏 */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 1;
  }

  /* 📱 移动端聊天头部 */
  .chat-header {
    height: 56px;
    min-height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    /* 📱 固定头部 */
    position: sticky;
    top: 0;
    z-index: 10;
    /* 📱 防止滚动穿透 */
    overflow: hidden;
  }

  .chat-header-info {
    flex: 1;
    min-width: 0;
  }

  .chat-title {
    margin-bottom: 2px;
  }

  .chat-title h1 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    /* 📱 移动端文本截断 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-description {
    font-size: 12px;
    color: #6b7280;
    /* 📱 移动端描述截断 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-header-actions {
    gap: 6px;
    /* 📱 确保按钮组合适的间距 */
    align-items: center;
  }

  .header-action {
    width: 40px;
    height: 40px;
    padding: 8px;
    /* 📱 触摸友好的按钮 */
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    /* 📱 基础样式重置 */
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .header-action .action-text {
    display: none; /* 📱 移动端隐藏文本 */
  }

  /* 📱 移动端搜索按钮优化 */
  .elegant-search {
    /* 📱 搜索按钮移动端样式 */
    background: rgba(99, 102, 241, 0.1) !important;
    color: #6366f1 !important;
    border: 1px solid rgba(99, 102, 241, 0.2) !important;
    border-radius: 12px !important;
    padding: 10px !important;
    /* 📱 确保足够的触摸目标 */
    min-width: 48px !important;
    min-height: 48px !important;
    /* 📱 触摸反馈 */
    transition: all 0.2s ease;
    transform: translateZ(0);
  }

  .elegant-search:hover,
  .elegant-search:active {
    background: rgba(99, 102, 241, 0.2) !important;
    border-color: rgba(99, 102, 241, 0.4) !important;
    transform: scale(1.05);
  }

  .elegant-search:active {
    transform: scale(0.95);
  }

  /* 📱 搜索图标移动端优化 */
  .elegant-search .golden-search-icon {
    width: 22px !important;
    height: 22px !important;
    stroke-width: 2.5 !important;
    color: #6366f1 !important;
  }

  /* 📱 邀请按钮移动端优化 */
  .elegant-invite {
    background: rgba(34, 197, 94, 0.1) !important;
    color: #22c55e !important;
    border: 1px solid rgba(34, 197, 94, 0.2) !important;
    border-radius: 12px !important;
    padding: 10px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    transition: all 0.2s ease;
  }

  .elegant-invite:hover,
  .elegant-invite:active {
    background: rgba(34, 197, 94, 0.2) !important;
    border-color: rgba(34, 197, 94, 0.4) !important;
    transform: scale(1.05);
  }

  .elegant-invite:active {
    transform: scale(0.95);
  }

  .elegant-invite .action-text {
    display: none; /* 📱 移动端隐藏文本 */
  }

  /* 📱 设置按钮移动端优化 */
  .elegant-btn {
    background: rgba(107, 114, 128, 0.1) !important;
    color: #6b7280 !important;
    border: 1px solid rgba(107, 114, 128, 0.2) !important;
    border-radius: 12px !important;
    padding: 10px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    transition: all 0.2s ease;
  }

  .elegant-btn:hover,
  .elegant-btn:active {
    background: rgba(107, 114, 128, 0.2) !important;
    border-color: rgba(107, 114, 128, 0.4) !important;
    transform: scale(1.05);
  }

  .elegant-btn:active {
    transform: scale(0.95);
  }

  .elegant-btn .action-icon {
    width: 20px !important;
    height: 20px !important;
  }

  /* 📱 移动端消息容器 */
  .messages-container {
    flex: 1;
    overflow: hidden;
    /* 📱 确保消息区域可滚动 */
    position: relative;
    background: white;
    /* 📱 启用硬件加速 */
    transform: translateZ(0);
    -webkit-overflow-scrolling: touch;
  }

  .messages-container.has-input-preview {
    /* 📱 输入预览时调整 */
    padding-bottom: 0;
  }

  /* 📱 移动端消息列表优化 */
  .messages-container :deep(.discord-message-list) {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    /* 📱 平滑滚动 */
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* 📱 移动端消息项目优化 */
  .messages-container :deep(.message-item) {
    padding: 12px 16px;
    /* 📱 触摸友好 */
    touch-action: manipulation;
  }

  .messages-container :deep(.message-content) {
    /* 📱 移动端消息内容优化 */
    word-break: break-word;
    overflow-wrap: break-word;
  }

  /* 📱 移动端加载状态 */
  .messages-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    margin-bottom: 16px;
  }

  .loading-text {
    font-size: 14px;
    color: #6b7280;
  }

  /* 📱 移动端输入容器 */
  .input-container {
    /* 📱 固定底部输入 */
    position: sticky;
    bottom: 0;
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 12px 16px;
    /* 📱 确保输入区域不被键盘遮挡 */
    z-index: 10;
  }

  .input-container :deep(.message-input) {
    width: 100%;
    /* 📱 移动端输入框优化 */
    min-height: 44px;
  }

  .input-container :deep(.input-field) {
    /* 📱 移动端输入字段 */
    font-size: 16px; /* 防止iOS缩放 */
    padding: 12px 16px;
    border-radius: 24px;
  }

  .loading-input {
    padding: 16px;
    text-align: center;
    color: #6b7280;
    font-size: 14px;
  }

  /* 📱 移动端模态框优化 */
  .chat-modal-overlay {
    /* 📱 全屏遮罩 */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    /* 📱 防止背景滚动 */
    overflow: hidden;
  }

  .chat-modal {
    /* 📱 移动端模态框 */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
    overflow: hidden;
    /* 📱 滑入动画 */
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-modal-large {
    /* 📱 大型模态框 */
    max-height: 95vh;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .chat-modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .chat-modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .chat-modal-close {
    width: 32px;
    height: 32px;
    border: none;
    background: var(--color-background-soft);
    border-radius: 50%;
    font-size: 18px;
    color: var(--color-text-muted);
    cursor: pointer;
    /* 📱 触摸友好 */
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .chat-modal-content {
    padding: 20px;
    overflow-y: auto;
    max-height: calc(90vh - 80px);
    /* 📱 平滑滚动 */
    -webkit-overflow-scrolling: touch;
  }

  /* 📱 移动端搜索模态框 */
  .chat-modal-overlay :deep(.perfect-search-modal) {
    /* 📱 搜索模态框全屏 */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 0;
    max-height: 100vh;
  }

  /* 📱 移动端翻译面板 */
  .chat-content-container :deep(.translation-panel) {
    /* 📱 翻译面板底部固定 */
    position: fixed;
    bottom: 80px;
    left: 16px;
    right: 16px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  /* 📱 移动端用户资料模态框 */
  .chat-content-container :deep(.user-profile-modal) {
    /* 📱 用户资料全屏 */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 0;
    max-height: 100vh;
  }
}

/* 📱 移动端横屏适配 */
@media (max-width: 768px) and (orientation: landscape) {
  .chat-header {
    height: 48px;
    min-height: 48px;
  }

  .chat-title h1 {
    font-size: 14px;
  }

  .chat-description {
    font-size: 11px;
  }

  .input-container {
    padding: 8px 16px;
  }

  .chat-modal {
    max-height: 85vh;
  }
}

/* 📱 移动端超小屏幕适配 */
@media (max-width: 480px) {
  .chat-header {
    padding: 0 12px;
  }

  .header-action {
    width: 36px;
    height: 36px;
    min-width: 40px;
    min-height: 40px;
  }

  /* 📱 超小屏幕搜索按钮优化 */
  .elegant-search {
    min-width: 42px !important;
    min-height: 42px !important;
    padding: 9px !important;
    border-radius: 10px !important;
  }

  .elegant-search .golden-search-icon {
    width: 20px !important;
    height: 20px !important;
  }

  .elegant-btn {
    min-width: 42px !important;
    min-height: 42px !important;
    padding: 9px !important;
    border-radius: 10px !important;
  }

  .elegant-btn .action-icon {
    width: 18px !important;
    height: 18px !important;
  }

  .chat-header-actions {
    gap: 4px;
  }

  .input-container {
    padding: 10px 12px;
  }

  .messages-container :deep(.message-item) {
    padding: 10px 12px;
  }

  .chat-modal-content {
    padding: 16px;
  }
}

/* 📱 移动端键盘适配 */
@media (max-width: 768px) {
  /* 📱 iOS Safari viewport fix */
  .chat-content-container {
    height: 100%;
    /* 🔧 FIX: 使用CSS变量动态适配 */
    height: var(--viewport-height, 100vh);
    height: -webkit-fill-available;
    /* 📱 键盘适配：确保容器可以动态调整 */
    transition: height 0.3s ease;
    overflow: hidden;
  }

  /* 📱 键盘显示时的特殊适配 */
  .chat-content-container.keyboard-visible {
    /* 🔧 FIX: 使用CSS变量而不是直接设置高度 */
    height: var(--viewport-height, 100vh) !important;
    /* 📱 键盘显示时禁用过渡动画，避免闪烁 */
    transition: none;
    /* 📱 确保容器不会超出视口 */
    max-height: var(--viewport-height, 100vh);
  }
  
  /* 🔧 FIX: 添加消息容器的动态高度计算 */
  .chat-content-container.keyboard-visible .messages-container {
    height: calc(var(--viewport-height, 100vh) - 56px - 80px);
    /* 56px = header, 80px = input */
  }
  
  /* 🔧 FIX: 输入容器固定在底部 */
  .chat-content-container.keyboard-visible .input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-background);
    border-top: 1px solid var(--color-border);
    z-index: 100;
  }

  /* 📱 键盘弹出时的消息容器适配 */
  .keyboard-visible .messages-container {
    /* 📱 键盘显示时确保消息区域可滚动 */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* 📱 平滑过渡 */
    transition: height 0.3s ease;
  }

  /* 📱 键盘弹出时的输入容器适配 */
  .keyboard-visible .input-container {
    /* 📱 确保输入框始终可见 */
    position: sticky !important;
    bottom: 0 !important;
    z-index: 100 !important;
    background: var(--color-background) !important;
    border-top: 1px solid var(--color-border) !important;
    /* 📱 防止输入框被键盘遮挡 */
    margin-bottom: env(keyboard-inset-height, 0px);
    /* 📱 iOS安全区域适配 */
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* 📱 输入框聚焦时的额外适配 */
  .input-container :deep(.message-textarea:focus) {
    /* 📱 防止iOS缩放 */
    font-size: 16px !important;
    /* 📱 确保输入框可见 */
    transform: translateZ(0);
    /* 📱 硬件加速 */
    -webkit-transform: translateZ(0);
  }

  /* 📱 键盘弹出时的消息项目优化 */
  .keyboard-visible .messages-container :deep(.message-item) {
    /* 📱 减少内边距，节省空间 */
    padding: 8px 12px;
  }

  /* 📱 键盘弹出时的头部适配 */
  .keyboard-visible .chat-header {
    /* 📱 确保头部不被遮挡 */
    position: sticky;
    top: 0;
    z-index: 10;
    /* 📱 减小头部高度，节省空间 */
    height: 48px;
    min-height: 48px;
    padding: 0 12px;
  }

  .keyboard-visible .chat-header .chat-title h1 {
    font-size: 14px;
  }

  .keyboard-visible .chat-header .chat-description {
    font-size: 11px;
  }

  /* 📱 键盘环境下的搜索按钮优化 */
  .keyboard-visible .chat-header-actions {
    gap: 4px;
  }

  .keyboard-visible .elegant-search {
    /* 📱 键盘显示时压缩搜索按钮 */
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 8px !important;
    border-radius: 10px !important;
  }

  .keyboard-visible .elegant-search .golden-search-icon {
    width: 18px !important;
    height: 18px !important;
  }

  .keyboard-visible .elegant-btn {
    /* 📱 键盘显示时压缩设置按钮 */
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 8px !important;
    border-radius: 10px !important;
  }

  .keyboard-visible .elegant-btn .action-icon {
    width: 18px !important;
    height: 18px !important;
  }

  /* 📱 键盘环境下Sidebar按钮优化 */
  .keyboard-visible .mobile-sidebar-btn {
    min-width: 40px !important;
    min-height: 40px !important;
    margin-right: 8px !important;
  }

  /* 📱 键盘环境下的模态框适配 */
  .keyboard-visible .chat-modal-overlay {
    /* 📱 键盘显示时模态框也要适配 */
    height: 100vh;
    height: -webkit-fill-available;
  }

  /* 📱 Visual Viewport API支持 */
  @supports (height: 100dvh) {
    .chat-content-container {
      height: 100dvh;
    }
    
    .keyboard-visible {
      height: 100dvh;
    }
  }

  /* 📱 键盘收起时的平滑过渡 */
  .chat-content-container:not(.keyboard-visible) {
    transition: height 0.3s ease;
  }

  .chat-content-container:not(.keyboard-visible) .messages-container {
    transition: height 0.3s ease;
  }

  .chat-content-container:not(.keyboard-visible) .input-container {
    transition: all 0.3s ease;
  }
}

/* 📱 特殊的iOS键盘适配 */
@supports (-webkit-touch-callout: none) {
  @media (max-width: 768px) {
    .keyboard-visible .input-container {
      /* 📱 iOS特殊处理：使用transform而不是position */
      transform: translateY(0);
      -webkit-transform: translateY(0);
    }
    
    .keyboard-visible .messages-container {
      /* 📱 iOS特殊处理：确保消息区域不被键盘遮挡 */
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
    }
  }
}

/* 📱 Android键盘适配 */
@media (max-width: 768px) and (not (-webkit-touch-callout: none)) {
  .keyboard-visible .input-container {
    /* 📱 Android特殊处理 */
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
  }
}

/* 📱 键盘弹出动画优化 */
@media (max-width: 768px) and (prefers-reduced-motion: no-preference) {
  .chat-content-container {
    transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .messages-container {
    transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .input-container {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* 📱 减少动画的用户偏好适配 */
@media (max-width: 768px) and (prefers-reduced-motion: reduce) {
  .chat-content-container,
  .messages-container,
  .input-container {
    transition: none !important;
  }
}

/* 📱 移动端Sidebar按钮 */
.mobile-sidebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: var(--color-primary-alpha);
  color: var(--color-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12px;
  /* 🚨 确保足够的触摸目标 */
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}

.mobile-sidebar-btn:hover {
  background: var(--color-primary-light);
  transform: scale(1.05);
}

.mobile-sidebar-btn:active {
  transform: scale(0.95);
  background: var(--color-primary-dark);
}

.mobile-sidebar-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

/* 📱 高对比度模式搜索按钮适配 */
@media (prefers-contrast: high) {
  .elegant-search {
    background: var(--color-primary-light) !important;
    border: 2px solid var(--color-primary) !important;
    color: var(--color-primary-dark) !important;
  }

  .elegant-search:hover,
  .elegant-search:active {
    background: var(--color-primary-dark) !important;
    border-color: var(--color-primary-darker) !important;
  }

  .elegant-search .golden-search-icon {
    stroke-width: 3 !important;
    color: var(--color-primary-dark) !important;
  }

  .elegant-btn {
    background: var(--color-background-muted) !important;
    border: 2px solid var(--color-border) !important;
    color: var(--color-text-muted) !important;
  }

  .elegant-btn:hover,
  .elegant-btn:active {
    background: var(--color-background-soft) !important;
    border-color: var(--color-border-hover) !important;
  }
}

/* 📱 无障碍适配：减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .elegant-search,
  .elegant-btn {
    transition: none !important;
  }

  .elegant-search:hover,
  .elegant-search:active,
  .elegant-btn:hover,
  .elegant-btn:active {
    transform: none !important;
  }
}

/* 📱 触摸设备优化 */
@media (pointer: coarse) {
  .elegant-search,
  .elegant-btn {
    /* 📱 增大触摸目标 */
    min-width: 48px !important;
    min-height: 48px !important;
  }

  .elegant-search:hover,
  .elegant-btn:hover {
    /* 📱 触摸设备不需要hover效果 */
    transform: none !important;
  }

  .elegant-search:active,
  .elegant-btn:active {
    /* 📱 触摸反馈 */
    transform: scale(0.96) !important;
    transition: transform 0.1s ease !important;
  }
}
</style>