<template>
  <div class="enterprise-message-wrapper">
    <!-- Performance Monitor (Development only) -->
    <div v-if="showPerformanceMonitor" class="performance-monitor">
      <div class="monitor-header">
        <h4>Enterprise Performance Monitor</h4>
        <button @click="showPerformanceMonitor = false" class="close-btn">×</button>
      </div>
      <div class="monitor-metrics">
        <div class="metric">
          <span class="label">Users Online:</span>
          <span class="value">{{ enterpriseStore.totalUsers }}</span>
        </div>
        <div class="metric">
          <span class="label">System Health:</span>
          <span class="value" :class="enterpriseStore.systemHealth">{{ enterpriseStore.systemHealth }}</span>
        </div>
        <div class="metric">
          <span class="label">Memory Usage:</span>
          <span class="value">{{ Math.round(performanceMetrics.memoryUsage) }}MB</span>
        </div>
        <div class="metric">
          <span class="label">Render FPS:</span>
          <span class="value">{{ performanceMetrics.scrollFPS }}</span>
        </div>
        <div class="metric">
          <span class="label">Active Shards:</span>
          <span class="value">{{ enterpriseStore.activeShardCount }}</span>
        </div>
        <div class="metric">
          <span class="label">Virtual Scroll:</span>
          <span class="value" :class="{ enabled: virtualScrollEnabled }">
            {{ virtualScrollEnabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Message List Container -->
    <div 
      class="enterprise-message-list" 
      ref="scrollContainer"
      :data-virtual-scroll="virtualScrollEnabled"
      :data-chat-id="chatId"
      :class="{ 
        'virtual-mode': virtualScrollEnabled,
        'performance-optimized': enterpriseStore.systemHealth === 'optimal'
      }"
    >
      
      <!-- Virtual Scroll Container -->
      <div 
        v-if="virtualScrollEnabled" 
        class="virtual-scroll-container"
        :style="{ height: totalHeight + 'px' }"
      >
        <!-- Virtual Items -->
        <div
          v-for="virtualItem in virtualItems"
          :key="virtualItem.id || virtualItem.temp_id"
          class="virtual-message-item"
          :style="{ 
            transform: `translateY(${virtualItem.offset}px)`,
            height: `${virtualItem.height}px`
          }"
          :data-message-id="virtualItem.id"
          :data-virtual-index="virtualItem.index"
        >
          <!-- Reuse existing DiscordMessageItem -->
          <DiscordMessageItem 
            :message="virtualItem" 
            :current-user-id="currentUserId" 
            :chat-id="chatId"
            :is-grouped="shouldGroupMessage(virtualItem, virtualItem.index)"
            @user-profile-opened="$emit('user-profile-opened', $event)"
            @dm-created="$emit('dm-created', $event)" 
            @reply-to="handleReplyTo" 
            @edit-message="handleEditMessage"
            @delete-message="handleDeleteMessage" 
            @scroll-to-message="handleScrollToMessage"
            @message-rendered="handleMessageRendered"
          />
        </div>
      </div>

      <!-- Fallback: Traditional Message List -->
      <div v-else class="traditional-message-container">
        <!-- Reuse existing message structure from DiscordMessageList -->
        <template v-for="(item, index) in groupedMessages"
          :key="item.id ? `msg_${item.id}` : (item.temp_id ? `temp_${item.temp_id}` : `divider_${item.type}_${item.timestamp || index}`)">

          <!-- Time/Session Dividers -->
          <TimeSessionDivider
            v-if="item.type === 'date-divider' || item.type === 'sub-date-divider' || item.type === 'session-divider'"
            :divider="item" 
            :compact="item.subType === 'short-break'" 
          />

          <!-- Message Items -->
          <Transition name="message-fade" appear>
            <div v-if="!item.type" 
                 class="message-container-enterprise" 
                 :data-message-id="item.id">
              <DiscordMessageItem 
                :message="item" 
                :current-user-id="currentUserId" 
                :chat-id="chatId"
                :is-grouped="shouldGroupMessage(item, index)" 
                @user-profile-opened="$emit('user-profile-opened', $event)"
                @dm-created="$emit('dm-created', $event)" 
                @reply-to="handleReplyTo" 
                @edit-message="handleEditMessage"
                @delete-message="handleDeleteMessage" 
                @scroll-to-message="handleScrollToMessage" 
              />
            </div>
          </Transition>
        </template>
      </div>

      <!-- Loading States -->
      <div v-if="loading" class="enterprise-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <span>Loading messages...</span>
        </div>
      </div>

      <!-- Typing Indicators -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">
          {{ formatTypingText(typingUsers) }}
        </span>
      </div>
    </div>

    <!-- Enhanced Scroll to Bottom Button -->
    <Transition name="fade">
      <button 
        v-if="showScrollToBottom" 
        class="enterprise-scroll-to-bottom" 
        @click="handleScrollToBottom"
        :title="`Jump to latest${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`"
      >
        <Icon name="chevron-down" />
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
        <span v-if="virtualScrollEnabled" class="virtual-indicator">V</span>
      </button>
    </Transition>

    <!-- Enterprise Controls (Development) -->
    <div v-if="import.meta.env.DEV" class="enterprise-controls">
      <button @click="toggleVirtualScroll" class="control-btn">
        {{ virtualScrollEnabled ? 'Disable' : 'Enable' }} Virtual Scroll
      </button>
      <button @click="showPerformanceMonitor = !showPerformanceMonitor" class="control-btn">
        Performance Monitor
      </button>
      <button @click="cleanupMemory" class="control-btn">
        Cleanup Memory
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useEnterpriseMessageList } from '@/composables/useEnterpriseMessageList'
import { useEnterpriseStore } from '@/stores/enterpriseStore'
import { useAuthStore } from '@/stores/auth'
import DiscordMessageItem from '@/components/discord/DiscordMessageItem.vue'
import TimeSessionDivider from '@/components/chat/TimeSessionDivider.vue'
import Icon from '@/components/ui/Icon.vue'
import { messageSessionGrouper } from '@/services/MessageSessionGrouper.js'

// Props - Same as DiscordMessageList for compatibility
const props = defineProps({
  chatId: {
    type: [Number, String],
    required: true
  },
  currentUserId: {
    type: Number,
    default: 0
  },
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasMoreMessages: {
    type: Boolean,
    default: true
  },
  typingUsers: {
    type: Array,
    default: () => []
  }
})

// Emits - Same as DiscordMessageList
const emit = defineEmits([
  'load-more-messages',
  'user-profile-opened',
  'dm-created',
  'reply-to',
  'edit-message',
  'delete-message',
  'scroll-position-changed',
  'reading-position-updated'
])

// Stores
const enterpriseStore = useEnterpriseStore()
const authStore = useAuthStore()

// Enterprise Message List Composable
const {
  scrollContainer,
  messagesContainer,
  virtualItems,
  totalHeight,
  visibleRange,
  virtualizedMessages,
  performanceMetrics,
  messageShards,
  activeMessageShard,
  enterpriseScrollToBottom,
  smartScrollToMessage,
  loadMoreMessages,
  cleanupInactiveShards,
  measureRenderPerformance,
  scrollToItem,
  setMeasuredHeight,
  virtualScrollEnabled,
  renderBudget
} = useEnterpriseMessageList(props)

// UI State
const showScrollToBottom = ref(false)
const showPerformanceMonitor = ref(import.meta.env.DEV)
const lastScrollTop = ref(0)

// Computed Properties
const unreadCount = computed(() => {
  // TODO: Calculate actual unread count
  return 0
})

const groupedMessages = computed(() => {
  if (!props.messages || props.messages.length === 0) {
    return []
  }

  try {
    const result = messageSessionGrouper.analyzeAndGroupMessages(props.messages, props.chatId)
    return result.groupedMessages
  } catch (error) {
    console.error('❌ [EnterpriseMessageList] MessageSessionGrouper failed:', error)
    return props.messages
  }
})

// Methods
const shouldGroupMessage = (item, index) => {
  if (item.type === 'date-divider' || item.type === 'sub-date-divider' || item.type === 'session-divider') {
    return false
  }

  if (index === 0) return false

  const messages = virtualScrollEnabled.value ? virtualItems.value : groupedMessages.value
  let prevMessage = null
  
  for (let i = index - 1; i >= 0; i--) {
    const prevItem = messages[i]
    if (!prevItem.type || (!prevItem.type.includes('divider') && !prevItem.type.includes('date'))) {
      prevMessage = prevItem
      break
    }
  }

  if (!prevMessage) return false

  const isSameSender = item.sender_id === prevMessage.sender_id
  const timeDiff = new Date(item.created_at) - new Date(prevMessage.created_at)
  const withinTimeLimit = timeDiff < 5 * 60 * 1000 // 5 minutes

  return isSameSender && withinTimeLimit
}

const formatTypingText = (users) => {
  if (users.length === 1) {
    return `${users[0].name} is typing...`
  } else if (users.length === 2) {
    return `${users[0].name} and ${users[1].name} are typing...`
  } else {
    return 'Several people are typing...'
  }
}

const handleScrollToBottom = () => {
  measureRenderPerformance(() => {
    enterpriseScrollToBottom(true)
  })
}

const handleReplyTo = (message) => {
  emit('reply-to', message)
}

const handleEditMessage = (message) => {
  emit('edit-message', message)
}

const handleDeleteMessage = (message) => {
  emit('delete-message', message)
}

const handleScrollToMessage = async (messageId) => {
  const success = await smartScrollToMessage(messageId)
  if (!success) {
    console.warn(`🔍 [EnterpriseMessageList] Could not scroll to message ${messageId}`)
  }
}

const handleMessageRendered = (messageData) => {
  if (virtualScrollEnabled.value && messageData.height) {
    setMeasuredHeight(messageData.id, messageData.height)
  }
}

// Enterprise Controls
const toggleVirtualScroll = () => {
  virtualScrollEnabled.value = !virtualScrollEnabled.value
  console.log(`🔄 [EnterpriseMessageList] Virtual scroll ${virtualScrollEnabled.value ? 'enabled' : 'disabled'}`)
}

const cleanupMemory = () => {
  cleanupInactiveShards()
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc()
  }
  
  console.log('🧹 [EnterpriseMessageList] Memory cleanup completed')
}

// Scroll handling
const handleScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // Update scroll to bottom button
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50
  showScrollToBottom.value = scrollHeight > clientHeight + 20 && !isNearBottom && props.messages.length > 3

  // Load more messages when near top
  if (scrollTop < 200 && props.hasMoreMessages) {
    loadMoreMessages()
  }

  // Emit scroll position change
  emit('scroll-position-changed', {
    scrollTop,
    scrollHeight,
    clientHeight,
    isAtBottom: isNearBottom,
    isNearTop: scrollTop < 200
  })

  lastScrollTop.value = scrollTop
}

// Lifecycle
onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll, { passive: true })
    
    // Add user to enterprise store
    const currentUser = authStore.user
    if (currentUser) {
      enterpriseStore.addUserToShard(currentUser)
    }
  }
  
  console.log('✅ [EnterpriseMessageList] Mounted with enterprise features')
})

onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll)
  }
  
  // Remove user from enterprise store
  const currentUser = authStore.user
  if (currentUser) {
    enterpriseStore.removeUserFromShard(currentUser.id)
  }
})

// Watch for chat changes
watch(() => props.chatId, (newChatId) => {
  if (newChatId) {
    showScrollToBottom.value = false
    
    // Reset enterprise state for new chat
    if (virtualScrollEnabled.value) {
      enterpriseStore.messageVirtualizationManager.createVirtualWindow(newChatId, props.messages?.length || 0)
    }
  }
})

// Expose methods for parent components
defineExpose({
  scrollToBottom: enterpriseScrollToBottom,
  scrollToMessage: smartScrollToMessage,
  toggleVirtualScroll,
  cleanupMemory,
  getPerformanceMetrics: () => performanceMetrics.value,
  getEnterpriseStats: () => ({
    virtualScrollEnabled: virtualScrollEnabled.value,
    activeShards: messageShards.value.size,
    renderBudget: renderBudget.value,
    systemHealth: enterpriseStore.systemHealth
  })
})
</script>

<style scoped>
.enterprise-message-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.enterprise-message-list {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bg-primary);
  position: relative;
  scroll-behavior: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  /* Performance optimizations */
  will-change: scroll-position;
  contain: layout style paint;
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  backface-visibility: hidden;
  perspective: 1000px;
}

.enterprise-message-list.virtual-mode {
  /* Additional optimizations for virtual scrolling */
  contain: strict;
}

.enterprise-message-list.performance-optimized {
  /* Enhanced performance for optimal system health */
  will-change: transform, scroll-position;
}

/* Virtual Scroll Container */
.virtual-scroll-container {
  position: relative;
  width: 100%;
  max-width: 960px;
  padding: 0 16px;
}

.virtual-message-item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  contain: layout style paint;
  will-change: transform;
}

/* Traditional Message Container */
.traditional-message-container {
  max-width: 960px;
  width: 100%;
  padding: 0 16px 48px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-shrink: 0;
  contain: layout style;
}

.message-container-enterprise {
  position: relative;
  contain: layout style;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Performance Monitor */
.performance-monitor {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  z-index: 10000;
  min-width: 250px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.monitor-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.monitor-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric .label {
  color: rgba(255, 255, 255, 0.7);
}

.metric .value {
  font-weight: 600;
}

.metric .value.optimal {
  color: #22c55e;
}

.metric .value.degraded {
  color: #f59e0b;
}

.metric .value.critical {
  color: #ef4444;
}

.metric .value.enabled {
  color: #22c55e;
}

/* Enterprise Loading */
.enterprise-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(88, 101, 242, 0.2);
  border-top: 2px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Enhanced Scroll to Bottom Button */
.enterprise-scroll-to-bottom {
  position: fixed;
  bottom: 130px;
  right: 24px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  color: var(--text-secondary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9999;
  backdrop-filter: blur(12px);
  will-change: transform, opacity;
  contain: layout style;
}

.enterprise-scroll-to-bottom:hover {
  background: rgba(255, 255, 255, 1);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-2px) scale(1.05);
}

.virtual-indicator {
  position: absolute;
  top: -2px;
  left: -2px;
  background: #22c55e;
  color: white;
  font-size: 8px;
  font-weight: 700;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Enterprise Controls */
.enterprise-controls {
  position: fixed;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  z-index: 9999;
}

.control-btn {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: var(--accent-primary);
}

/* Typing Indicators */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

.message-fade-enter-active {
  transition: all 0.3s ease-out;
  will-change: transform, opacity;
}

.message-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px) translateZ(0);
}

.message-fade-enter-to {
  opacity: 1;
  transform: translateY(0) translateZ(0);
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

/* Responsive Design */
@media (max-width: 768px) {
  .performance-monitor {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: unset;
  }
  
  .enterprise-controls {
    bottom: 10px;
    left: 10px;
    flex-direction: column;
  }
  
  .enterprise-scroll-to-bottom {
    bottom: 150px;
    right: 16px;
    width: 44px;
    height: 44px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .enterprise-message-list {
    scroll-behavior: auto !important;
  }
  
  .virtual-message-item,
  .message-container-enterprise,
  .enterprise-scroll-to-bottom {
    transition: none !important;
  }
  
  .loading-spinner,
  .typing-dots span {
    animation: none !important;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .performance-monitor {
    background: black;
    border: 2px solid white;
  }
  
  .enterprise-scroll-to-bottom {
    background: white;
    border: 2px solid black;
    color: black;
  }
}
</style> 