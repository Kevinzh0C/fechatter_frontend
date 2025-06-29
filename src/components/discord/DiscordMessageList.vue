<template>
  <div class="discord-message-wrapper">
    <EmptyChatPlaceholder 
      v-if="!loading && groupedMessages.length === 0" 
      :chat-id="chatId" 
    />
    <div v-else class="discord-message-list" ref="scrollContainer"
         :data-loading="loadingMore" 
         :data-chat-id="chatId"
         :class="{ 
           'scroll-debug-mode': debugMode,
           'history-loading-active': loadingMore,
           'smooth-loading-mode': true
         }">
      
      <!-- 🧠 COGNITIVE: Enhanced Loading State for Reading Flow -->
      <div class="loading-state-container" :class="{ 'loading-active': loadingMore }">
        <!-- 🧠 Reserved space prevents cognitive disruption -->
        <div class="loading-space-reservation" :style="{ height: loadingMore ? '80px' : '0px' }">
          <Transition name="gentle-fade" mode="out-in">
            <div v-if="loadingMore" class="cognitive-load-indicator">
              <div class="reading-context-preservation">
                <!-- 🧠 Visual continuity bridge -->
                <div class="context-bridge">
                  <div class="bridge-line"></div>
                  <div class="bridge-text">Loading earlier messages...</div>
                  <div class="bridge-line"></div>
                </div>
                
                <!-- 🧠 Reading rhythm progress -->
                <div class="reading-rhythm-progress">
                  <div class="progress-dots">
                    <span class="dot" :class="{ active: loadingPhase >= 1 }"></span>
                    <span class="dot" :class="{ active: loadingPhase >= 2 }"></span>
                    <span class="dot" :class="{ active: loadingPhase >= 3 }"></span>
                  </div>
                  <div class="progress-text">{{ getLoadingPhaseText() }}</div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 🧠 COGNITIVE: Messages Container with Reading Flow -->
      <div class="messages-container" ref="messagesContainer" 
           :class="{ 
             'content-loading': loadingMore,
             'reading-flow-mode': true,
             'smooth-rendering': isRenderingMessages 
           }"
           :style="{ 
             opacity: loadingOpacity,
             transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
           }">
        
        <!-- 🧠 COGNITIVE: Content preview with timeline -->
        <Transition name="content-preview" mode="out-in">
          <div v-if="loadingMore" class="content-preview-container">
            <div class="preview-messages">
              <div v-for="i in 3" :key="`preview-${i}`" class="preview-message">
                <div class="preview-timeline">
                  <div class="timeline-dot"></div>
                  <div class="timeline-line"></div>
                </div>
                <div class="preview-content">
                  <div class="preview-header">
                    <div class="preview-avatar"></div>
                    <div class="preview-meta">
                      <div class="preview-name"></div>
                      <div class="preview-time"></div>
                    </div>
                  </div>
                  <div class="preview-text">
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
        
        <!-- 🧠 COGNITIVE: Reading position anchor -->
        <div v-if="readingAnchor" class="reading-anchor" :style="{ top: readingAnchor.position + 'px' }">
          <div class="anchor-indicator">
            <div class="anchor-icon">📖</div>
            <div class="anchor-text">Your reading position</div>
          </div>
        </div>

        <!-- 🔧 NEW: History Loading Placeholder (appears above existing messages) -->
        <div v-if="loadingMore" class="history-loading-placeholder">
          <div class="placeholder-messages">
            <div v-for="i in 3" :key="`placeholder-${i}`" class="message-placeholder">
              <div class="placeholder-avatar"></div>
              <div class="placeholder-content">
                <div class="placeholder-header"></div>
                <div class="placeholder-text"></div>
                <div class="placeholder-text short"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 🔧 Enhanced Message Items with Loading States -->
        <template v-for="(item, index) in groupedMessages"
          :key="item.id ? `msg_${item.id}` : (item.temp_id ? `temp_${item.temp_id}` : `divider_${item.type}_${item.timestamp || index}`)">

          <!-- 🎯 TimeSessionDivider for all divider types -->
          <TimeSessionDivider
            v-if="item.type === 'date-divider' || item.type === 'sub-date-divider' || item.type === 'session-divider'"
            :divider="item" :compact="item.subType === 'short-break'" />

          <!-- 🎯 OPTIMIZED: Simple but effective message animation -->
          <Transition name="message-fade" appear>
            <div v-if="!item.type" 
                 class="message-container-optimized" 
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
                @scroll-to-message="handleScrollToMessage" />
            </div>
          </Transition>
        </template>

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

      <!-- Perfect Search Highlight -->
      <div v-if="searchHighlight" class="search-highlight-overlay"></div>
    </div>

    <!-- 🎯 FIXED: Enhanced Scroll to Bottom Button -->
    <Transition name="fade">
      <button v-if="showScrollToBottom" class="scroll-to-bottom-btn-fixed" @click="scrollToBottom(true)"
        :title="`Jump to latest${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`">
        <Icon name="chevron-down" />
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import DiscordMessageItem from './DiscordMessageItem.vue'
import TimeSessionDivider from '@/components/chat/TimeSessionDivider.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyChatPlaceholder from '@/components/chat/EmptyChatPlaceholder.vue'
import { debounce, throttle } from '@/utils/performance'
import { messageSessionGrouper } from '@/services/MessageSessionGrouper.js'
// 🏆 UNIFIED SCROLL MANAGER INTEGRATION
import { unifiedScrollManager } from '@/utils/UnifiedScrollManager.js'

// Props
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

// Emits
const emit = defineEmits([
  'load-more-messages',
  'user-profile-opened',
  'dm-created',
  'reply-to',
  'edit-message',
  'delete-message',
  'scroll-position-changed',
  'reading-position-updated',
  'history-loading-completed'
])

// Stores
const authStore = useAuthStore()
const chatStore = useChatStore()

// Refs
const scrollContainer = ref(null)
const messagesContainer = ref(null)

// Reactive state
const loadingMore = ref(false)
const isRenderingMessages = ref(false)
const loadingOpacity = ref(1)
const showScrollToBottom = ref(false)
const searchHighlight = ref(null)
const lastScrollTop = ref(0)
const autoScrollEnabled = ref(true)
const readingPosition = ref(null)
const lastLoadTime = ref(0)
const isLoading = ref(false)
const debugMode = ref(import.meta.env.DEV) // Enable debug mode in development

// 🎯 NEW: User scroll detection to prevent bouncing
const isUserScrolling = ref(false)
const userScrollStartTime = ref(0)
const userScrollEndTime = ref(0)
const scrollVelocity = ref(0)
const lastUserScrollDirection = ref('none') // 'up', 'down', 'none'

// 🧠 COGNITIVE: Enhanced loading state for reading flow
const newlyLoadedMessageIds = ref(new Set())
const currentLoadingBatch = ref(0)
const loadingStartTime = ref(0)
const previousMessageCount = ref(0)
const loadingPhase = ref(0)
const readingAnchor = ref(null)

// Computed
const unreadCount = computed(() => {
  // TODO: Calculate actual unread count
  return 0
})

// 🔧 NEW: Process messages with MessageSessionGrouper to include sub-date dividers
const groupedMessages = computed(() => {
  if (!props.messages || props.messages.length === 0) {
    return []
  }

  try {
    // Use MessageSessionGrouper to analyze and group messages with date/session dividers
    const result = messageSessionGrouper.analyzeAndGroupMessages(props.messages, props.chatId)

    if (true) {
      console.log(`📅 [DiscordMessageList] Grouped messages for chat ${props.chatId}:`, {
        originalCount: props.messages.length,
        groupedCount: result.groupedMessages.length,
        dividersCount: result.dividers.length,
        mainDividers: result.dividers.filter(d => d.type === 'date-divider').length,
        subDividers: result.dividers.filter(d => d.type === 'sub-date-divider').length
      })
    }

    return result.groupedMessages
  } catch (error) {
    if (true) {
      console.error('❌ [DiscordMessageList] MessageSessionGrouper failed:', error)
    }
    // Fallback to original messages if grouper fails
    return props.messages
  }
})

const isAtBottom = computed(() => {
  if (!scrollContainer.value) return true
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  return scrollTop + clientHeight >= scrollHeight - 100
})

const isNearTop = computed(() => {
  if (!scrollContainer.value) return false
  return scrollContainer.value.scrollTop < 200
})

// Methods
const shouldGroupMessage = (item, index) => {
  // Skip grouping for dividers
  if (item.type === 'date-divider' || item.type === 'sub-date-divider' || item.type === 'session-divider') {
    return false
  }

  if (index === 0) return false

  // Find the previous message (skip any dividers)
  let prevMessage = null
  for (let i = index - 1; i >= 0; i--) {
    const prevItem = groupedMessages.value[i]
    if (!prevItem.type || (!prevItem.type.includes('divider') && !prevItem.type.includes('date'))) {
      prevMessage = prevItem
      break
    }
  }

  if (!prevMessage) return false

  // Group if same sender and within 5 minutes
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

// 🚀 NEW: Enhanced loading state methods for smooth transitions
const isNewlyLoadedMessage = (message) => {
  return newlyLoadedMessageIds.value.has(message.id)
}

const getLoadingBatch = (message) => {
  if (loadingMore.value) return 'current'
  if (isNewlyLoadedMessage(message)) return currentLoadingBatch.value
  return 'loaded'
}

// 🧠 COGNITIVE: Reading-friendly helper functions
const getLoadingPhaseText = () => {
  switch (loadingPhase.value) {
    case 1: return 'Fetching messages...'
    case 2: return 'Processing content...'
    case 3: return 'Preparing display...'
    default: return 'Starting...'
  }
}

const captureReadingPosition = () => {
  if (!scrollContainer.value) return
  
  const container = scrollContainer.value
  const viewportHeight = container.clientHeight
  const readingLine = container.scrollTop + viewportHeight * 0.4 // Golden ratio reading position
  
  // 🧠 Find the message closest to optimal reading position
  const messageElements = container.querySelectorAll('[data-message-id]')
  let closestElement = null
  let minDistance = Infinity
  
  messageElements.forEach(element => {
    const rect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const elementCenter = rect.top - containerRect.top + container.scrollTop + rect.height / 2
    const distance = Math.abs(elementCenter - readingLine)
    
    if (distance < minDistance) {
      minDistance = distance
      closestElement = element
    }
  })
  
  if (closestElement) {
    const messageId = closestElement.getAttribute('data-message-id')
    const rect = closestElement.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    readingAnchor.value = {
      messageId: parseInt(messageId),
      position: rect.top - containerRect.top + container.scrollTop,
      timestamp: Date.now()
    }
    
    console.log(`🧠 [READING ANCHOR] Captured position for message ${messageId}`)
  }
}

const restoreReadingPosition = async () => {
  if (!readingAnchor.value || !scrollContainer.value) return
  
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  const targetElement = scrollContainer.value.querySelector(`[data-message-id="${readingAnchor.value.messageId}"]`)
  if (!targetElement) return
  
  const container = scrollContainer.value
  const containerRect = container.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  
  // 🧠 Calculate position to maintain reading flow
  const currentOffset = targetRect.top - containerRect.top
  const desiredOffset = container.clientHeight * 0.4 // Maintain golden ratio position
  const scrollAdjustment = currentOffset - desiredOffset
  const targetScrollTop = Math.max(0, container.scrollTop + scrollAdjustment)
  
  // 🧠 Smooth scroll with reading-friendly easing
  container.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  })
  
  console.log(`🧠 [READING ANCHOR] Restored position for message ${readingAnchor.value.messageId}`)
}

// 🧠 COGNITIVE: Reading-friendly loading state
const startLoadingState = () => {
  loadingMore.value = true
  isRenderingMessages.value = true
  loadingOpacity.value = 0.9 // Minimal opacity change for reading continuity
  loadingStartTime.value = Date.now()
  currentLoadingBatch.value++
  loadingPhase.value = 0
  
  // 🧠 Capture reading position before loading
  captureReadingPosition()
  
  // 🧠 Progressive loading phases for cognitive comfort
  setTimeout(() => { loadingPhase.value = 1 }, 100)
  setTimeout(() => { loadingPhase.value = 2 }, 300)
  setTimeout(() => { loadingPhase.value = 3 }, 600)
  
  // Add reading-flow class
  document.body.classList.add('reading-flow-loading')
  
  console.log(`🧠 [COGNITIVE LOADING] Started batch ${currentLoadingBatch.value} with reading flow`)
}

const completeLoadingState = () => {
  const loadingDuration = Date.now() - loadingStartTime.value
  const newMessageCount = props.messages.length - previousMessageCount.value
  
  // 🧠 COGNITIVE: Gentle completion with reading position restoration
  loadingOpacity.value = 1
  loadingPhase.value = 3
  
  // 🧠 Restore reading position with smooth animation
  setTimeout(() => {
    restoreReadingPosition()
  }, 100)
  
  // 🧠 Complete loading with cognitive-friendly timing
  setTimeout(() => {
    loadingMore.value = false
    isRenderingMessages.value = false
    loadingPhase.value = 0
    document.body.classList.remove('reading-flow-loading')
    
    // 🧠 Clear reading anchor after restoration
    setTimeout(() => {
      readingAnchor.value = null
    }, 2000)
  }, 200) // Longer delay for reading comfort
  
  if (import.meta.env.DEV) {
    console.log(`🧠 [COGNITIVE LOADING] Completed in ${loadingDuration}ms, loaded ${newMessageCount} new messages`)
  }
  
  return { loadingDuration, newMessageCount, shouldStop: false }
}

const stopHistoryLoading = (reasons) => {
  console.log(`🛑 [LOADING STOP] Stopping history loading:`, reasons)
  
  // 🔥 IMMEDIATE: Stop ALL loading indicators and UI states
  loadingMore.value = false
  document.body.classList.remove('history-loading-in-progress')
  
  // Stop further loading attempts
  if (scrollInstance && scrollInstance.pauseLoadMore) {
    scrollInstance.pauseLoadMore('History loading completed or conditions met')
    console.log(`🛑 [LOADING STOP] LoadMore paused for chat ${props.chatId}`)
  }
  
  // Emit completion event to parent
  emit('history-loading-completed', {
    chatId: props.chatId,
    totalMessages: props.messages.length,
    newMessagesLoaded: props.messages.length - previousMessageCount.value,
    hasMoreMessages: props.hasMoreMessages,
    reasons: reasons,
    reason: reasons[0] || 'Auto-detected completion'
  })
  
  // Show completion indicator
  showHistoryCompletionIndicator(reasons[0] || 'History loading completed')
}

const showHistoryCompletionIndicator = (message) => {
  if (!scrollContainer.value) return
  
  setTimeout(() => {
    const completionIndicator = document.createElement('div')
    completionIndicator.className = 'history-completion-indicator'
    completionIndicator.innerHTML = `
      <div class="completion-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
        <span>${message}</span>
      </div>
    `
    completionIndicator.style.cssText = `
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95));
      color: white;
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
      backdrop-filter: blur(8px);
      z-index: 1000;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 300px;
      text-align: center;
    `
    
    scrollContainer.value.appendChild(completionIndicator)
    
    // Fade in
    requestAnimationFrame(() => {
      completionIndicator.style.opacity = '1'
      completionIndicator.style.transform = 'translateX(-50%) translateY(0)'
    })
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      completionIndicator.style.opacity = '0'
      completionIndicator.style.transform = 'translateX(-50%) translateY(-20px)'
      setTimeout(() => {
        if (completionIndicator.parentNode) {
          completionIndicator.parentNode.removeChild(completionIndicator)
        }
      }, 400)
    }, 4000)
  }, 500)
}

// 🔧 ENHANCED: 更流畅智能的滚动处理
const handleScroll = throttle((event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 🎯 NEW: Detect user scrolling to prevent conflicts
  const currentTime = Date.now()
  const scrollDelta = scrollTop - lastScrollTop.value
  const timeDelta = currentTime - (userScrollStartTime.value || currentTime)
  
  // Calculate scroll velocity (pixels per millisecond)
  scrollVelocity.value = timeDelta > 0 ? Math.abs(scrollDelta) / timeDelta : 0
  
  // Detect scroll direction
  if (scrollDelta > 0) {
    lastUserScrollDirection.value = 'down'
  } else if (scrollDelta < 0) {
    lastUserScrollDirection.value = 'up'
  }
  
  // Mark as user scrolling if velocity is significant
  const isSignificantScroll = scrollVelocity.value > 0.5 // 0.5px per ms threshold
  if (isSignificantScroll) {
    isUserScrolling.value = true
    userScrollStartTime.value = currentTime
    
    // Update global user scroll tracking
    window.lastUserScrollTime = currentTime
    
    // Clear user scrolling flag after inactivity
    setTimeout(() => {
      if (Date.now() - userScrollStartTime.value > 1000) { // 1 second of inactivity
        isUserScrolling.value = false
        userScrollEndTime.value = Date.now()
      }
    }, 1000)
  }

  // 🚀 IMPROVED: 更准确的滚动到底部按钮显示逻辑
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50
  const hasScrollableContent = scrollHeight > clientHeight + 20
  const shouldShowButton = hasScrollableContent && !isNearBottom && props.messages.length > 3

  showScrollToBottom.value = shouldShowButton

  // Send scroll position change event
  emit('scroll-position-changed', {
    scrollTop,
    scrollHeight,
    clientHeight,
    isAtBottom: isAtBottom.value,
    isNearTop: isNearTop.value,
    isUserScrolling: isUserScrolling.value,
    scrollVelocity: scrollVelocity.value,
    scrollDirection: lastUserScrollDirection.value
  })

  lastScrollTop.value = scrollTop
}, 16) // 提升到60fps (16ms) 获得更流畅的体验

// 🆕 ENHANCED: 更智能的阅读位置保存机制
const saveReadingPosition = debounce(() => {
  if (!scrollContainer.value) return

  // Find the message closest to the reading line (1/3 from top)
  const viewport = scrollContainer.value
  const readingLine = viewport.scrollTop + viewport.clientHeight * 0.33 // 1/3 from top is optimal reading position

  const messageElements = viewport.querySelectorAll('[data-message-id]')
  let closestMessage = null
  let minDistance = Infinity

  messageElements.forEach(element => {
    const rect = element.getBoundingClientRect()
    const containerRect = viewport.getBoundingClientRect()
    const elementTop = rect.top - containerRect.top + viewport.scrollTop
    const distance = Math.abs(elementTop - readingLine)

    if (distance < minDistance) {
      minDistance = distance
      closestMessage = element
    }
  })

  if (closestMessage) {
    const messageId = closestMessage.getAttribute('data-message-id')
    const rect = closestMessage.getBoundingClientRect()
    const containerRect = viewport.getBoundingClientRect()

    readingPosition.value = {
      messageId: parseInt(messageId),
      offset: rect.top - containerRect.top, // Precise offset from container top
      scrollTop: viewport.scrollTop,
      timestamp: Date.now(),
      // 🆕 Add viewport context for better restoration
      viewportHeight: viewport.clientHeight,
      messageRect: {
        top: rect.top - containerRect.top,
        height: rect.height
      }
    }

    emit('reading-position-updated', readingPosition.value)

    if (true) {
      console.log('📖 [Reading Position] Saved:', {
        messageId,
        offset: readingPosition.value.offset,
        scrollTop: readingPosition.value.scrollTop
      })
    }
  }
}, 800) // Reduced debounce for better responsiveness

// 🧠 COGNITIVE: Enhanced reading position restoration (moved to helper functions above)

// 🆕 智能的平滑滚动到底部
const scrollToBottom = (smooth = false) => {
  if (!scrollContainer.value) return

  const container = scrollContainer.value
  const targetScrollTop = container.scrollHeight - container.clientHeight

  if (smooth) {
    // 使用自定义平滑滚动，更好的控制
    const startScrollTop = container.scrollTop
    const distance = targetScrollTop - startScrollTop
    const duration = Math.min(500, Math.abs(distance) * 0.5) // 根据距离调整动画时长

    if (distance === 0) return

    const startTime = performance.now()

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用easeOutQuart缓动函数，提供更自然的减速
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentScrollTop = startScrollTop + distance * easeOutQuart

      container.scrollTop = currentScrollTop

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        // 确保到达精确位置
        container.scrollTop = targetScrollTop
        showScrollToBottom.value = false
        autoScrollEnabled.value = true
      }
    }

    requestAnimationFrame(animateScroll)
  } else {
    // 立即滚动
    container.scrollTop = targetScrollTop
    showScrollToBottom.value = false
    autoScrollEnabled.value = true
  }
}

const scrollToMessage = async (messageId, options = {}) => {
  if (!scrollContainer.value || !messageId) return false

  const messageElement = scrollContainer.value.querySelector(`[data-message-id="${messageId}"]`)
  if (!messageElement) {
    console.warn(`🔍 [DiscordMessageList] Message ${messageId} not found for scrolling`)
    return false
  }

  const {
    behavior = 'smooth',
    block = 'center',
    highlight = true,
    duration = 3000
  } = options

  // 🔴 DISABLED: Scroll to message to prevent jumping during history loading
  // messageElement.scrollIntoView({ behavior, block })
  console.log(`🔴 [DiscordMessageList] scrollIntoView disabled for message ${messageId} to prevent jumping`)

  // Highlight message if requested
  if (highlight) {
    messageElement.classList.add('search-highlight')
    setTimeout(() => {
      messageElement.classList.remove('search-highlight')
    }, duration)
  }

  return true
}

// Event handlers
const handleReplyTo = (message) => {
  emit('reply-to', message)
}

const handleEditMessage = (message) => {
  emit('edit-message', message)
}

const handleDeleteMessage = (message) => {
  emit('delete-message', message)
}

const handleScrollToMessage = (messageId) => {
  scrollToMessage(messageId)
}

// Perfect Search integration
const highlightSearchResult = (messageId, query, options = {}) => {
  // 🔴 DISABLED: scrollToMessage to prevent jumping during history loading
  // scrollToMessage(messageId, {
  //   ...options,
  //   highlight: true,
  //   duration: 5000
  // })
  console.log(`🔴 [DiscordMessageList] highlightSearchResult disabled for message ${messageId} to prevent jumping`)

  // Additional highlighting for search terms only (no scrolling)
  if (query) {
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        highlightSearchTerms(messageElement, query)
      }
    }, 100)
  }
}

const highlightSearchTerms = (element, query) => {
  const textElements = element.querySelectorAll('.message-text')
  textElements.forEach(textEl => {
    const originalText = textEl.textContent
    const highlightedText = originalText.replace(
      new RegExp(`(${query})`, 'gi'),
      '<mark class="search-term-highlight">$1</mark>'
    )
    textEl.innerHTML = highlightedText

    // Remove highlight after 5 seconds
    setTimeout(() => {
      textEl.textContent = originalText
    }, 5000)
  })
}

let scrollInstance = null

// Initialize unified scroll management
const initializeUnifiedScroll = () => {
  if (scrollContainer.value && props.chatId) {
    // Unregister previous instance if exists
    if (scrollInstance) {
      unifiedScrollManager.unregisterChat(props.chatId)
    }
    
    // 🎯 SIMPLIFIED: Basic scroll monitoring without complex debugging
    scrollContainer.value.addEventListener('scroll', (event) => {
      lastScrollTop.value = event.target.scrollTop;
    }, { passive: true });
    
    // Register with unified manager
    scrollInstance = unifiedScrollManager.registerChat(props.chatId, scrollContainer.value, {
      onLoadMore: async () => {
        // 🎯 SIMPLIFIED: Direct emit without complex lifecycle detection
        emit('load-more-messages')
        
        // Simple promise that resolves when messages are loaded
        return new Promise((resolve) => {
          const unwatch = watch(() => props.messages.length, (newLength, oldLength) => {
            if (newLength > oldLength) {
              unwatch()
              resolve(props.messages.slice(0, newLength - oldLength))
            }
          })
          
          // Timeout after 5 seconds
          setTimeout(() => {
            unwatch()
            resolve([])
          }, 5000)
        })
      },
      nearBottomThreshold: 150,
      historyLoadThreshold: 200
    })
    
    console.log('🎯 [DiscordMessageList] Simplified scroll management initialized')
    
    // 🔥 IRON LAW: ALWAYS scroll to bottom on chat entry (with history browsing protection + pause awareness)
    // 🔧 ENHANCED: Multiple enforcement strategies with conflict detection
    const enforceScrollToBottom = async () => {
      // 🚨 NEW: Check if Iron Law is paused
      if (ironLawPaused) {
        console.log(`⚡ [IRON LAW] SKIPPED - paused for ${ironLawPauseReason}`);
        return;
      }
      
      // 🚨 NEW: Check if system is in history loading state
      if (document.body.classList.contains('history-loading-in-progress')) {
        console.log(`⚡ [IRON LAW] SKIPPED - system in history loading state`);
        return;
      }
      
      // 🎯 NEW: Respect user scrolling to prevent bouncing
      if (isUserScrolling.value) {
        console.log(`⚡ [IRON LAW] SKIPPED - user is actively scrolling (velocity: ${scrollVelocity.value.toFixed(2)}px/ms)`);
        return;
      }
      
      // 🎯 NEW: Check recent user scroll activity
      const timeSinceUserScroll = Date.now() - (userScrollEndTime.value || 0)
      if (timeSinceUserScroll < 2000) { // 2 seconds grace period
        console.log(`⚡ [IRON LAW] SKIPPED - recent user scroll activity (${timeSinceUserScroll}ms ago)`);
        return;
      }
      
      console.log('⚡ [IRON LAW] Enforcing scroll to bottom on chat entry - Start')
      
      if (!scrollContainer.value) return
      
      const container = scrollContainer.value
      const scrollPercentage = container.scrollTop / (container.scrollHeight - container.clientHeight)
      const isUserBrowsingHistory = scrollPercentage < 0.85 && container.scrollTop > 300
      
      if (isUserBrowsingHistory) {
        console.log('⚡ [IRON LAW] Skipping enforcement - user browsing history (scroll: ' + (scrollPercentage * 100).toFixed(1) + '%)')
        return
      }

      try {
        // Strategy 1: Use UnifiedScrollManager
        if (scrollInstance) {
          await scrollInstance.scrollToBottom(false)
          console.log('⚡ [IRON LAW] Strategy 1: Unified scroll manager executed')
        }

        // Strategy 2: Direct container scroll
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
          console.log('⚡ [IRON LAW] Strategy 2: Direct container scroll executed')
        }

        // Strategy 3: Verification and additional enforcement
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const isAtBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 10
        
        if (!isAtBottom) {
          const scrollPercentage = container.scrollTop / (container.scrollHeight - container.clientHeight)
          const isStillBrowsingHistory = scrollPercentage < 0.85 && container.scrollTop > 300
          
          if (!isStillBrowsingHistory && !isUserScrolling.value) {
            console.log('⚡ [IRON LAW] Strategy 3: Additional enforcement needed')
            await scrollInstance.scrollToBottom(false)
            container.scrollTop = container.scrollHeight
          } else {
            console.log('⚡ [IRON LAW] Strategy 3: Skipped - user still browsing history or scrolling')
          }
        }
        
        console.log('⚡ [IRON LAW] Scroll to bottom enforcement complete')
      } catch (error) {
        console.warn('⚡ [IRON LAW] Enforcement failed:', error)
      }
    }
    
    // Execute immediately (with protection)
    nextTick(() => {
      if (props.messages && props.messages.length > 0) {
        enforceScrollToBottom()
      }
    })
    
    // Backup enforcement after a small delay (with protection)
    setTimeout(() => {
      if (props.messages && props.messages.length > 0) {
        enforceScrollToBottom()
      }
    }, 100)
  }
}

// Watch for new messages - UNIFIED APPROACH WITH API LIFECYCLE DETECTION ONLY
watch(() => props.messages.length, async (newLength, oldLength) => {
  if (newLength > oldLength) {
    // 🎯 REVOLUTIONARY: 设置previousMessageCount仅用于UI状态管理，不用于检测
    if (previousMessageCount.value === 0) {
      previousMessageCount.value = oldLength || 0
      console.log(`🎯 [LIFECYCLE] Set previousMessageCount for UI: ${previousMessageCount.value}`)
    }
    
    const isInitialLoad = (oldLength || 0) === 0 && newLength > 0
    const isHistoryLoad = oldLength > 0 && newLength > oldLength + 5 // More than 5 messages suggests history load
    
    if (isInitialLoad) {
      console.log('🎯 [DiscordMessageList] Initial load detected - enforcing iron law')
      await nextTick()
      
      // 🔥 IRON LAW: Enhanced initial load scroll enforcement
      const enforceInitialScroll = async () => {
        console.log('⚡ [IRON LAW] Initial message load - enforcing scroll to bottom')
        
        // Multiple scroll attempts to guarantee bottom positioning
        if (scrollInstance) {
          await scrollInstance.scrollToBottom(false)
        }
        
        // Direct backup scroll
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
        }
        
        // Final verification and correction
        await new Promise(resolve => setTimeout(resolve, 50))
        if (scrollContainer.value) {
          const container = scrollContainer.value
          const targetScroll = container.scrollHeight - container.clientHeight
          if (container.scrollTop < targetScroll - 20) {
            container.scrollTop = container.scrollHeight
            console.log('⚡ [IRON LAW] Final correction applied')
          }
        }
      }
      
      await enforceInitialScroll()
      
      // Additional enforcement after DOM updates
      setTimeout(enforceInitialScroll, 200)
      
    } else if (isHistoryLoad) {
      // 🎯 REVOLUTIONARY: 历史加载完全依赖API生命周期检测器
      console.log('🎯 [LIFECYCLE] History load detected - using API lifecycle detector only')
      
      // 🔒 STEP 1: 仅处理滚动位置保护，不进行任何检测
      const container = scrollContainer.value
      if (!container) return
      
      const capturedScrollTop = container.scrollTop
      const capturedScrollHeight = container.scrollHeight
      console.log(`🔒 [SCROLL PROTECTION] Captured position: ${capturedScrollTop}px`)
      
      // 🔒 STEP 2: Wait for DOM updates
      await nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))
      
      // 🔒 STEP 3: Restore scroll position
      const newScrollHeight = container.scrollHeight
      const heightDifference = newScrollHeight - capturedScrollHeight
      const adjustedScrollTop = capturedScrollTop + heightDifference
      
      container.scrollTop = adjustedScrollTop
      
      console.log(`✅ [SCROLL PROTECTION] Position restored: ${adjustedScrollTop}px (+${heightDifference}px adjustment)`)
    } else if (scrollInstance) {
      // Regular new messages - use unified scroll manager with history protection
      const container = scrollContainer.value
      if (container) {
        const scrollPercentage = container.scrollTop / (container.scrollHeight - container.clientHeight)
        const isUserBrowsingHistory = scrollPercentage < 0.8 && container.scrollTop > 200
        
        // 🎯 NEW: Respect user scrolling activity
        const isUserActivelyScrolling = isUserScrolling.value || 
                                       (Date.now() - (userScrollEndTime.value || 0) < 1500)
        
        if (!isUserBrowsingHistory && !isUserActivelyScrolling) {
          scrollInstance.handleNewMessage()
          console.log('📨 [DiscordMessageList] New message handled with auto-scroll')
        } else {
          const reason = isUserActivelyScrolling ? 'user scrolling' : 'browsing history'
          console.log(`📨 [DiscordMessageList] New message - user ${reason}, skip auto-scroll`)
        }
      } else {
        // Only auto-scroll if user is not actively scrolling
        if (!isUserScrolling.value) {
          scrollInstance.handleNewMessage()
        }
      }
    }

    // 🔧 REMOVED: MessageDisplayGuarantee registration for performance
    // Vue 3 reactive system provides sufficient reliability without DOM queries
    console.log(`🔧 [PERFORMANCE] MessageDisplayGuarantee disabled for ${isInitialLoad ? 'initial' : (isHistoryLoad ? 'history' : 'new')} load - using Vue 3 reactive system`)
  }
})

watch(() => props.chatId, async () => {
  console.log('🔄 [DiscordMessageList] Chat changed - conditional iron law enforcement for new chat')
  
  // Reset state when changing chats
  showScrollToBottom.value = false
  autoScrollEnabled.value = true
  readingPosition.value = null

  // Initialize unified scroll for new chat
  initializeUnifiedScroll()
  
  // 🔥 IRON LAW: Enhanced chat switch scroll enforcement with user intent detection
  const enforceChatSwitchScroll = async () => {
    console.log('⚡ [IRON LAW] Chat switch - checking enforcement conditions')
    
    await nextTick()
    
    // 🔧 CRITICAL: Check if this is a navigation-triggered switch (user browsing history)
    const container = scrollContainer.value
    if (container) {
      // If container has meaningful scroll position, user might be navigating to specific content
      const hasScrollPosition = container.scrollTop > 100
      const isNearTop = container.scrollTop < container.scrollHeight * 0.1
      
      if (hasScrollPosition && !isNearTop) {
        console.log('⚡ [IRON LAW] Chat switch - user appears to be navigating to specific content, skipping auto-scroll')
        return
      }
    }
    
    console.log('⚡ [IRON LAW] Chat switch - proceeding with scroll to bottom enforcement')
    
    // Multiple enforcement strategies
    if (scrollInstance) {
      await scrollInstance.scrollToBottom(false)
    }
    
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
    
    // Verify and correct after brief delay
    setTimeout(() => {
      if (scrollContainer.value) {
        const container = scrollContainer.value
        if (container.scrollTop < container.scrollHeight - container.clientHeight - 10) {
          container.scrollTop = container.scrollHeight
          console.log('⚡ [IRON LAW] Chat switch final correction applied')
        }
      }
    }, 100)
  }
  
  await enforceChatSwitchScroll()
  
  // Additional enforcement for robustness (with same conditions)
  setTimeout(async () => {
    const container = scrollContainer.value
    if (container) {
      const hasScrollPosition = container.scrollTop > 100
      const isNearTop = container.scrollTop < container.scrollHeight * 0.1
      
      if (!hasScrollPosition || isNearTop) {
        await enforceChatSwitchScroll()
      } else {
        console.log('⚡ [IRON LAW] Chat switch delayed enforcement - user appears to be navigating, skipping')
      }
    }
  }, 300)
})

// 🚨 NEW: Iron Law Pause/Resume System
let ironLawPaused = false;
let ironLawPauseReason = '';
let ironLawPausedForChat = null;

// Global pause/resume functions for UnifiedScrollManager
window.pauseIronLaw = (chatId, reason) => {
  ironLawPaused = true;
  ironLawPauseReason = reason;
  ironLawPausedForChat = chatId;
  console.log(`⚡ [IRON LAW] PAUSED for chat ${chatId} - reason: ${reason}`);
};

window.resumeIronLaw = (chatId) => {
  if (ironLawPausedForChat === chatId) {
    ironLawPaused = false;
    ironLawPauseReason = '';
    ironLawPausedForChat = null;
    console.log(`⚡ [IRON LAW] RESUMED for chat ${chatId}`);
  }
};

// Lifecycle
onMounted(() => {
  // Initialize unified scroll management
  initializeUnifiedScroll()
  
  // 🎯 SIMPLIFIED: Minimal debug setup
  console.log('🎯 [DiscordMessageList] Simplified message list ready');
  
  // Setup Perfect Search listener
  window.addEventListener('fechatter:navigate-to-message', (event) => {
    const { messageId, query, options } = event.detail
    if (parseInt(props.chatId) === parseInt(event.detail.chatId)) {
      highlightSearchResult(messageId, query, options)
    }
  })
  
  // Setup force scroll to bottom listener (for compatibility)
  window.addEventListener('fechatter:force-scroll-to-bottom', (event) => {
    const { chatId } = event.detail
    if (parseInt(props.chatId) === parseInt(chatId)) {
      console.log('🎯 [DiscordMessageList] Force scroll event received')
      if (scrollInstance) {
        scrollInstance.scrollToBottom(false)
      }
    }
  })

  // 🆕 NEW: Setup intelligent scroll suggestion listener
  window.addEventListener('fechatter:suggest-scroll-to-bottom', (event) => {
    const { chatId, priority, reason } = event.detail
    if (parseInt(props.chatId) === parseInt(chatId)) {
      console.log(`💡 [DiscordMessageList] Scroll suggestion received: ${reason} (priority: ${priority})`)
      
      // 🤖 INTELLIGENT DECISION: Should we scroll based on user context?
      const shouldAcceptSuggestion = () => {
        if (!scrollContainer.value) return false
        
        const container = scrollContainer.value
        
        // 🎯 NEW: Respect active user scrolling
        if (isUserScrolling.value) {
          console.log(`💡 [DiscordMessageList] Suggestion DECLINED - user actively scrolling (velocity: ${scrollVelocity.value.toFixed(2)}px/ms)`)
          return false
        }
        
        // 🎯 NEW: Check recent user scroll activity
        const timeSinceUserScroll = Date.now() - (userScrollEndTime.value || 0)
        if (timeSinceUserScroll < 3000) { // 3 seconds grace period for suggestions
          console.log(`💡 [DiscordMessageList] Suggestion DECLINED - recent user scroll activity (${timeSinceUserScroll}ms ago)`)
          return false
        }
        
        // 1. Check if user is actively browsing history
        const scrollPercentage = container.scrollTop / (container.scrollHeight - container.clientHeight)
        const isUserBrowsingHistory = scrollPercentage < 0.85 && container.scrollTop > 300
        
        if (isUserBrowsingHistory) {
          console.log(`💡 [DiscordMessageList] Suggestion DECLINED - user browsing history (${(scrollPercentage * 100).toFixed(1)}%)`)
          return false
        }
        
        // 2. Check priority level
        if (priority === 'low' && isUserBrowsingHistory) {
          console.log(`💡 [DiscordMessageList] Low priority suggestion DECLINED - user activity detected`)
          return false
        }
        
        // 3. Check if system is in history loading state
        if (document.body.classList.contains('history-loading-in-progress')) {
          console.log(`💡 [DiscordMessageList] Suggestion DECLINED - system in history loading`)
          return false
        }
        
        // 4. Check if user recently scrolled (within 3 seconds)
        const timeSinceLastScroll = Date.now() - (window.lastUserScrollTime || 0)
        if (timeSinceLastScroll < 3000) {
          console.log(`💡 [DiscordMessageList] Suggestion DECLINED - recent user scroll (${timeSinceLastScroll}ms ago)`)
          return false
        }
        
        return true
      }
      
      if (shouldAcceptSuggestion()) {
        console.log(`✅ [DiscordMessageList] Scroll suggestion ACCEPTED: ${reason}`)
        if (scrollInstance) {
          scrollInstance.scrollToBottom(false)
        }
      } else {
        console.log(`❌ [DiscordMessageList] Scroll suggestion DECLINED: ${reason}`)
      }
    }
  })

  // 🆕 NEW: Track user scroll activity for intelligent suggestions
  let userScrollTracker = null
  if (scrollContainer.value) {
    userScrollTracker = (event) => {
      // Update last user scroll time for suggestion system
      window.lastUserScrollTime = Date.now()
    }
    scrollContainer.value.addEventListener('scroll', userScrollTracker, { passive: true })
  }

  // 🔧 REMOVED: MessageDisplayGuarantee registration to improve performance
  // The Vue 3 reactive system provides sufficient reliability for message display
  console.log(`✅ [DiscordMessageList] Mounted for chat ${props.chatId} with ${props.messages.length} messages - MessageDisplayGuarantee disabled for performance`)
})

onUnmounted(() => {
  // Cleanup unified scroll management
  if (scrollInstance && props.chatId) {
    unifiedScrollManager.unregisterChat(props.chatId)
  }
  
  // Remove event listeners
  window.removeEventListener('fechatter:navigate-to-message', () => { })
  window.removeEventListener('fechatter:force-scroll-to-bottom', () => { })
  window.removeEventListener('fechatter:suggest-scroll-to-bottom', () => { })
})

// Expose methods for parent components
defineExpose({
  scrollToBottom,
  scrollToMessage,
  highlightSearchResult,
  saveReadingPosition,
  restoreReadingPosition,
  getScrollPosition: () => ({
    scrollTop: scrollContainer.value?.scrollTop || 0,
    scrollHeight: scrollContainer.value?.scrollHeight || 0,
    clientHeight: scrollContainer.value?.clientHeight || 0
  }),
  // 🎯 NEW: Expose scroll state for debugging
  getScrollState: () => ({
    isUserScrolling: isUserScrolling.value,
    scrollVelocity: scrollVelocity.value,
    scrollDirection: lastUserScrollDirection.value,
    userScrollStartTime: userScrollStartTime.value,
    userScrollEndTime: userScrollEndTime.value,
    timeSinceUserScroll: Date.now() - (userScrollEndTime.value || 0)
  })
})

// Console log for verification
console.log(`✅ [DiscordMessageList] Mounted for chat ${props.chatId} with ${props.messages.length} messages`)

// 🎯 REMOVED: 旧的精准检测器 - 已被API生命周期检测器替代

// 🎯 REMOVED: 旧的绝对精准检测系统 - 已被API生命周期检测器替代

// 🎯 REMOVED: 旧的延迟检测和事件检测系统 - 已被API生命周期检测器替代

// 🎯 REMOVED: Complex API lifecycle detector that causes DOM queries and performance issues

// 🎯 NEW: Debounced DOM operations to reduce forced reflows
const debouncedDOMOperations = debounce(() => {
  // Batch DOM operations to minimize reflows
  requestAnimationFrame(() => {
    // Perform any necessary DOM updates here
    if (scrollContainer.value) {
      // Use transform instead of direct scroll changes when possible
      const container = scrollContainer.value
      if (container.style.transform) {
        container.style.transform = ''
      }
    }
  })
}, 16) // 60fps timing

  // 🔧 REMOVED: MessageDisplayGuarantee fallback registration for performance
  // Vue 3 reactive system handles message display reliability without DOM queries
  console.log(`🔧 [PERFORMANCE] MessageDisplayGuarantee system disabled - using Vue 3 reactive system for reliability`)
</script>

<style scoped>
.discord-message-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  /* 🎯 FIXED: wrapper不处理滚动，只作为定位容器 */
}

.discord-message-list {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bg-primary);
  position: relative;
  scroll-behavior: auto;
  /* 🎯 确保瞬时滚动，避免平滑滚动干扰 */
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 🎯 Enhanced scrolling performance - 优化滚动性能 */
  will-change: scroll-position;
  contain: layout style paint;
  /* 🎯 NEW: 减少重排和重绘 */
  transform: translateZ(0);
  /* 启用硬件加速 */
  -webkit-overflow-scrolling: touch;
  /* iOS平滑滚动 */
  /* 🎯 NEW: 优化滚动时的渲染性能 */
  overscroll-behavior: contain;
  /* 防止过度滚动 */
  /* 🎯 PERFORMANCE: Optimize rendering during loading */
  backface-visibility: hidden;
  perspective: 1000px;
}

.discord-message-list::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}

.discord-message-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(47, 49, 54, 0.6));
  border-radius: 4px;
  margin: 4px 0;
}

.discord-message-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(32, 34, 37, 0.8));
  border-radius: 4px;
  transition: background 0.2s ease;
}

.discord-message-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(26, 29, 33, 0.9));
}

.discord-message-list::-webkit-scrollbar-thumb:active {
  background: var(--accent-primary);
}

.messages-container {
  max-width: 960px;
  width: 100%;
  padding: 0 16px 48px 16px;
  /* 🎯 OPTIMIZED: 添加底部padding - 黄金分割比例优化 */
  display: flex;
  flex-direction: column;
  /* 🎯 NEW: 优化加载时的布局稳定性 */
  min-height: 0;
  /* 防止flex容器过度增长 */
  flex-shrink: 0;
  /* 防止收缩导致的布局变化 */
  /* 🎯 NEW: 提供更好的渲染性能 */
  contain: layout style;
  /* 限制重排影响范围 */
}

/* 🔧 REMOVED: Old date-separator and time-separator styles - now handled by TimeSessionDivider component */

.load-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-20px);
  opacity: 0;
  position: relative;
  background: linear-gradient(180deg,
      rgba(88, 101, 242, 0.08) 0%,
      rgba(88, 101, 242, 0.03) 50%,
      transparent 100%);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  margin: 6px 12px;
  border: 1px solid rgba(88, 101, 242, 0.12);
  z-index: 10;
  will-change: transform, opacity;
  contain: layout style;
}

.load-more-indicator.loading {
  transform: translateY(0);
  opacity: 1;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(88, 101, 242, 0.2);
  border-top: 2px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite, pulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4);
}

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

.scroll-to-bottom-btn-fixed {
  position: fixed;
  bottom: 130px;
  right: 24px;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  color: var(--text-secondary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9999;
  backdrop-filter: blur(12px);
  /* 🚀 Enhanced visibility */
  will-change: transform, opacity;
  contain: layout style;
}

.scroll-to-bottom-btn-fixed:hover {
  background: rgba(255, 255, 255, 1);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

.scroll-to-bottom-btn-fixed:active {
  transform: translateY(0) scale(0.95);
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--danger-color);
  color: white;
  border-radius: 12px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  border: 2px solid var(--bg-primary, #36393f);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: badgePulse 2s infinite;
}

@keyframes badgePulse {

  0%,
  70%,
  100% {
    transform: scale(1);
  }

  35% {
    transform: scale(1.1);
  }
}

.search-highlight-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5;
}

/* Message highlighting */
:deep(.search-highlight) {
  background-color: var(--warning-color, rgba(255, 212, 59, 0.3));
  border-left: 3px solid var(--warning-color);
  animation: highlight-pulse 0.6s ease-in-out;
}

:deep(.search-term-highlight) {
  background-color: var(--warning-color);
  color: var(--text-dark, #000);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes typing {

  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

@keyframes highlight-pulse {
  0% {
    background-color: var(--warning-color, rgba(255, 212, 59, 0.6));
  }

  100% {
    background-color: var(--warning-color, rgba(255, 212, 59, 0.3));
  }
}

@keyframes timeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4);
  }

  50% {
    box-shadow: 0 0 0 4px rgba(88, 101, 242, 0);
  }
}

/* Smooth loading text animation */
.load-more-indicator span {
  position: relative;
  overflow: hidden;
}

.load-more-indicator span::after {
  content: '...';
  position: absolute;
  animation: dots 1.5s infinite;
}

@keyframes dots {

  0%,
  20% {
    opacity: 0;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

/* 🎯 Smooth scroll position indicator */
.scroll-position-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
      var(--accent-primary) 0%,
      rgba(88, 101, 242, 0.6) 50%,
      rgba(88, 101, 242, 0.2) 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 20;
}

.scroll-position-indicator.active {
  transform: scaleX(1);
}

/* Enhanced message highlighting for better reading continuity */
:deep(.message-loading-context) {
  position: relative;
}

:deep(.message-loading-context::before) {
  content: '';
  position: absolute;
  left: -4px;
  top: -2px;
  bottom: -2px;
  width: 3px;
  background: linear-gradient(180deg,
      transparent 0%,
      var(--accent-primary) 20%,
      var(--accent-primary) 80%,
      transparent 100%);
  border-radius: 2px;
  opacity: 0;
  animation: contextHighlight 2s ease-out;
}

@keyframes contextHighlight {
  0% {
    opacity: 0;
    transform: scaleY(0);
  }

  20% {
    opacity: 1;
    transform: scaleY(1);
  }

  80% {
    opacity: 1;
    transform: scaleY(1);
  }

  100% {
    opacity: 0;
    transform: scaleY(1);
  }
}

/* Tablet responsive */
@media (max-width: 1024px) and (min-width: 769px) {
  .messages-container {
    padding: 0 14px 42px 14px;
    /* 🎯 TABLET: 平板端中间值优化 */
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .messages-container {
    padding: 0 12px 36px 12px;
    /* 🎯 MOBILE: 移动端优化底部间距，减少左右padding */
  }

  .scroll-to-bottom-btn-fixed {
    bottom: 150px;
    right: 16px;
    width: 40px;
    height: 40px;
  }

  .date-text {
    font-size: 11px;
    padding: 0 12px;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {

  .date-separator::before,
  .date-separator::after {
    background: var(--text-primary);
  }

  .search-highlight {
    background-color: yellow !important;
    color: black !important;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .discord-message-wrapper {
    scroll-behavior: auto;
  }

  .typing-dots span {
    animation: none;
  }

  .scroll-to-bottom-btn-fixed {
    transition: none;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}

/* Dark mode time separators with golden ratio optimization */
@media (prefers-color-scheme: dark) {
  .date-separator::before {
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.08) 38.2%,
        rgba(255, 255, 255, 0.12) 50%,
        rgba(255, 255, 255, 0.08) 61.8%,
        transparent 100%);
  }

  .date-separator::after {
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.08) 38.2%,
        rgba(255, 255, 255, 0.12) 50%,
        rgba(255, 255, 255, 0.08) 61.8%,
        transparent 100%);
  }

  .date-text {
    color: rgba(220, 221, 222, 0.85);
    background: var(--bg-primary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 1.618px 6.18px rgba(0, 0, 0, 0.15);
  }

  .date-text:hover {
    color: rgba(220, 221, 222, 0.95);
    background: var(--bg-primary, rgba(47, 49, 54, 0.95));
    box-shadow: 0 4.85px 19.4px rgba(0, 0, 0, 0.2);
  }

  .time-separator::before {
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.06) 38.2%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.06) 61.8%,
        transparent 100%);
  }

  .time-separator::after {
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.06) 38.2%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.06) 61.8%,
        transparent 100%);
  }

  .time-text {
    color: rgba(220, 221, 222, 0.6);
    background: var(--bg-primary, rgba(47, 49, 54, 0.85));
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 0.618px 2.36px rgba(0, 0, 0, 0.1);
  }

  .time-text::before {
    background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.03) 0%,
        rgba(255, 255, 255, 0.015) 61.8%,
        rgba(255, 255, 255, 0.008) 100%);
  }

  .time-text:hover {
    color: rgba(220, 221, 222, 0.8);
    background: var(--bg-primary, rgba(47, 49, 54, 0.95));
    box-shadow: 0 6.18px 24.72px rgba(0, 0, 0, 0.15);
  }
}

/* 🚀 NEW: Enhanced Smooth Loading Styles */

/* Loading state container with reserved space */
.loading-state-container {
  position: relative;
  width: 100%;
  z-index: 15;
}

.loading-space-reservation {
  width: 100%;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* Enhanced loading indicator */
.enhanced-load-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
      rgba(88, 101, 242, 0.08) 0%,
      rgba(88, 101, 242, 0.05) 50%,
      rgba(88, 101, 242, 0.02) 100%);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  margin: 8px 16px;
  border: 1px solid rgba(88, 101, 242, 0.15);
  box-shadow: 0 4px 16px rgba(88, 101, 242, 0.1);
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
  position: relative;
}

/* Enhanced spinner */
.loading-spinner-enhanced {
  width: 20px;
  height: 20px;
  position: relative;
}

.spinner-icon {
  width: 100%;
  height: 100%;
  animation: smoothSpin 2s linear infinite;
}

.spinner-circle {
  stroke: var(--accent-primary);
  animation: circleProgress 1.5s ease-in-out infinite;
}

.loading-text-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loading-primary-text {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.loading-sub-text {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 400;
}

/* Subtle wave effect */
.loading-wave-effect {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
}

.wave {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(88, 101, 242, 0.6) 50%,
      transparent 100%);
  border-radius: 1px;
}

.wave-1 {
  width: 30%;
  animation: waveMove 2s ease-in-out infinite;
}

.wave-2 {
  width: 20%;
  animation: waveMove 2s ease-in-out infinite 0.4s;
}

.wave-3 {
  width: 25%;
  animation: waveMove 2s ease-in-out infinite 0.8s;
}

/* History loading placeholder */
.history-loading-placeholder {
  padding: 16px;
  opacity: 0.6;
}

.placeholder-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-placeholder {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
}

.placeholder-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.3) 0%, 
      rgba(114, 118, 125, 0.1) 50%, 
      rgba(114, 118, 125, 0.3) 100%);
  background-size: 200% 200%;
  animation: placeholderPulse 2s ease-in-out infinite;
}

.placeholder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placeholder-header {
  width: 120px;
  height: 12px;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.3) 0%, 
      rgba(114, 118, 125, 0.1) 50%, 
      rgba(114, 118, 125, 0.3) 100%);
  background-size: 200% 200%;
  border-radius: 6px;
  animation: placeholderPulse 2s ease-in-out infinite 0.2s;
}

.placeholder-text {
  height: 10px;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.2) 0%, 
      rgba(114, 118, 125, 0.05) 50%, 
      rgba(114, 118, 125, 0.2) 100%);
  background-size: 200% 200%;
  border-radius: 5px;
  animation: placeholderPulse 2s ease-in-out infinite 0.4s;
}

.placeholder-text:first-of-type {
  width: 80%;
}

.placeholder-text.short {
  width: 60%;
}

/* Message container enhancements */
.message-container-enhanced {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-container-enhanced.newly-loaded {
  animation: messageSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-container-enhanced.loading-context {
  opacity: 0.8;
}

.message-container-enhanced.stable-position {
  opacity: 1;
}

/* Enhanced loading states */
.discord-message-list.history-loading-active {
  position: relative;
}

.discord-message-list.history-loading-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
      var(--accent-primary) 0%,
      rgba(88, 101, 242, 0.6) 50%,
      var(--accent-primary) 100%);
  background-size: 200% 100%;
  animation: loadingProgress 2s ease-in-out infinite;
  z-index: 20;
}

.messages-container.content-loading {
  position: relative;
}

/* Smooth loading transitions */
.loading-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.loading-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.98);
}

.message-appear-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-appear-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* Enhanced animations */
@keyframes smoothSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes circleProgress {
  0% {
    stroke-dashoffset: 60;
  }
  50% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -60;
  }
}

@keyframes waveMove {
  0% {
    left: -30%;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes placeholderPulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes messageSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
  }
  60% {
    opacity: 0.8;
    transform: translateY(-2px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes loadingProgress {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive enhancements for smooth loading */
@media (max-width: 768px) {
  .enhanced-load-indicator {
    height: 50px;
    margin: 6px 12px;
  }
  
  .loading-space-reservation {
    height: 50px !important;
  }
  
  .loading-primary-text {
    font-size: 12px;
  }
  
  .loading-sub-text {
    font-size: 10px;
  }
  
  .placeholder-messages {
    gap: 8px;
  }
  
  .message-placeholder {
    padding: 6px 0;
  }
}

/* Reduced motion support for smooth loading */
@media (prefers-reduced-motion: reduce) {
  .enhanced-load-indicator,
  .message-container-enhanced,
  .loading-space-reservation {
    transition: none;
  }
  
  .spinner-icon,
  .spinner-circle,
  .wave,
  .placeholder-avatar,
  .placeholder-header,
  .placeholder-text {
    animation: none;
  }
  
  .discord-message-list.history-loading-active::before {
    animation: none;
    background: var(--accent-primary);
  }
}

/* 🚀 NEW: Enhanced Smooth Loading Styles */

/* Loading state container with reserved space */
.loading-state-container {
  position: relative;
  width: 100%;
  z-index: 15;
}

.loading-space-reservation {
  width: 100%;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* Enhanced loading indicator */
.enhanced-load-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
      rgba(88, 101, 242, 0.08) 0%,
      rgba(88, 101, 242, 0.05) 50%,
      rgba(88, 101, 242, 0.02) 100%);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  margin: 8px 16px;
  border: 1px solid rgba(88, 101, 242, 0.15);
  box-shadow: 0 4px 16px rgba(88, 101, 242, 0.1);
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
  position: relative;
}

/* Enhanced spinner */
.loading-spinner-enhanced {
  width: 20px;
  height: 20px;
  position: relative;
}

.spinner-icon {
  width: 100%;
  height: 100%;
  animation: smoothSpin 2s linear infinite;
}

.spinner-circle {
  stroke: var(--accent-primary);
  animation: circleProgress 1.5s ease-in-out infinite;
}

.loading-text-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loading-primary-text {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.loading-sub-text {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 400;
}

/* Subtle wave effect */
.loading-wave-effect {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
}

.wave {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(88, 101, 242, 0.6) 50%,
      transparent 100%);
  border-radius: 1px;
}

.wave-1 {
  width: 30%;
  animation: waveMove 2s ease-in-out infinite;
}

.wave-2 {
  width: 20%;
  animation: waveMove 2s ease-in-out infinite 0.4s;
}

.wave-3 {
  width: 25%;
  animation: waveMove 2s ease-in-out infinite 0.8s;
}

/* History loading placeholder */
.history-loading-placeholder {
  padding: 16px;
  opacity: 0.6;
}

.placeholder-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-placeholder {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
}

.placeholder-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.3) 0%, 
      rgba(114, 118, 125, 0.1) 50%, 
      rgba(114, 118, 125, 0.3) 100%);
  background-size: 200% 200%;
  animation: placeholderPulse 2s ease-in-out infinite;
}

.placeholder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placeholder-header {
  width: 120px;
  height: 12px;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.3) 0%, 
      rgba(114, 118, 125, 0.1) 50%, 
      rgba(114, 118, 125, 0.3) 100%);
  background-size: 200% 200%;
  border-radius: 6px;
  animation: placeholderPulse 2s ease-in-out infinite 0.2s;
}

.placeholder-text {
  height: 10px;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.2) 0%, 
      rgba(114, 118, 125, 0.05) 50%, 
      rgba(114, 118, 125, 0.2) 100%);
  background-size: 200% 200%;
  border-radius: 5px;
  animation: placeholderPulse 2s ease-in-out infinite 0.4s;
}

.placeholder-text:first-of-type {
  width: 80%;
}

.placeholder-text.short {
  width: 60%;
}

/* Message container enhancements */
.message-container-enhanced {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-container-enhanced.newly-loaded {
  animation: messageSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-container-enhanced.loading-context {
  opacity: 0.8;
}

.message-container-enhanced.stable-position {
  opacity: 1;
}

/* Enhanced loading states */
.discord-message-list.history-loading-active {
  position: relative;
}

.discord-message-list.history-loading-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
      var(--accent-primary) 0%,
      rgba(88, 101, 242, 0.6) 50%,
      var(--accent-primary) 100%);
  background-size: 200% 100%;
  animation: loadingProgress 2s ease-in-out infinite;
  z-index: 20;
}

.messages-container.content-loading {
  position: relative;
}

/* Smooth loading transitions */
.loading-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.loading-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.98);
}

.message-appear-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-appear-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* Enhanced animations */
@keyframes smoothSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes circleProgress {
  0% {
    stroke-dashoffset: 60;
  }
  50% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -60;
  }
}

@keyframes waveMove {
  0% {
    left: -30%;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes placeholderPulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes messageSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
  }
  60% {
    opacity: 0.8;
    transform: translateY(-2px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes loadingProgress {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive enhancements for smooth loading */
@media (max-width: 768px) {
  .enhanced-load-indicator {
    height: 50px;
    margin: 6px 12px;
  }
  
  .loading-space-reservation {
    height: 50px !important;
  }
  
  .loading-primary-text {
    font-size: 12px;
  }
  
  .loading-sub-text {
    font-size: 10px;
  }
  
  .placeholder-messages {
    gap: 8px;
  }
  
  .message-placeholder {
    padding: 6px 0;
  }
}

/* Reduced motion support for smooth loading */
@media (prefers-reduced-motion: reduce) {
  .enhanced-load-indicator,
  .message-container-enhanced,
  .loading-space-reservation {
    transition: none;
  }
  
  .spinner-icon,
  .spinner-circle,
  .wave,
  .placeholder-avatar,
  .placeholder-header,
  .placeholder-text {
    animation: none;
  }
  
  .discord-message-list.history-loading-active::before {
    animation: none;
    background: var(--accent-primary);
  }
}

/* 🎯 OPTIMIZED: Lightweight message animations */
.message-container-optimized {
  position: relative;
  contain: layout style;
}

/* 🎯 Simple fade animation for new messages */
.message-fade-enter-active {
  transition: all 0.3s ease-out;
}

.message-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.message-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 🎯 Loading pulse for message placeholders */
@keyframes messagePulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
}

.message-loading-placeholder {
  animation: messagePulse 1.5s ease-in-out infinite;
  background: linear-gradient(90deg, 
    rgba(0,0,0,0.05) 25%, 
    rgba(0,0,0,0.1) 50%, 
    rgba(0,0,0,0.05) 75%);
  background-size: 200% 100%;
  animation: messageShimmer 2s infinite;
}

@keyframes messageShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 🎯 Smooth history loading indicator */
.history-loading-smooth {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  margin: 8px 16px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-primary);
  animation: loadingDots 1.4s ease-in-out infinite both;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes loadingDots {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 🎯 Performance optimizations */
@media (prefers-reduced-motion: reduce) {
  .message-fade-enter-active {
    transition: opacity 0.1s ease;
  }
  
  .message-fade-enter-from {
    transform: none;
  }
  
  .message-loading-placeholder,
  .loading-dot {
    animation: none;
  }
}

/* 🎯 Smooth loading transitions */
.smooth-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.smooth-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.smooth-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.smooth-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.98);
}

/* 🎯 Smooth loading placeholder */
.smooth-loading-placeholder {
  padding: 16px;
  opacity: 0.6;
}

/* 🎯 Shimmer effect for smooth loading */
.loading-shimmer-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shimmer-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
}

.shimmer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, 
      rgba(114, 118, 125, 0.3) 0%, 
      rgba(114, 118, 125, 0.1) 50%, 
      rgba(114, 118, 125, 0.3) 100%);
  background-size: 200% 200%;
  animation: shimmerPulse 2s infinite;
}

.shimmer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shimmer-line {
  height: 10px;
  background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.2) 0%, 
      rgba(255, 255, 255, 0.1) 50%, 
      rgba(255, 255, 255, 0.2) 100%);
  background-size: 200% 100%;
  border-radius: 5px;
  animation: shimmerMove 2s infinite;
}

.shimmer-line.shimmer-header {
  width: 80%;
}

.shimmer-line.shimmer-text {
  width: 100%;
}

.shimmer-line.shimmer-text.short {
  width: 60%;
}

@keyframes shimmerPulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes shimmerMove {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 🎯 Enhanced message container for smooth rendering */
.messages-container.smooth-rendering {
  will-change: opacity;
  transform: translateZ(0); /* Hardware acceleration */
  /* 🎯 PERFORMANCE: Reduce layout thrashing during loading */
  contain: layout style;
  backface-visibility: hidden;
}

.messages-container.content-loading {
  /* 🎯 PERFORMANCE: Optimize rendering during content loading */
  transform: translate3d(0, 0, 0);
  will-change: transform, opacity;
}

/* 🎯 Global smooth loading state */
:global(.smooth-history-loading) {
  .discord-message-list {
    transition: all 0.2s ease-out;
    /* 🎯 PERFORMANCE: Prevent unnecessary repaints */
    contain: strict;
  }
  
  /* 🎯 PERFORMANCE: Optimize message rendering during loading */
  .message-container-optimized {
    will-change: transform;
    backface-visibility: hidden;
  }
}

/* 🎯 Optimize message fade transitions */
.message-fade-enter-active {
  transition: all 0.3s ease-out;
  /* 🎯 PERFORMANCE: Use transform instead of position changes */
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

/* 🎯 Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .smooth-fade-enter-active,
  .smooth-fade-leave-active,
  .shimmer-avatar,
  .shimmer-line,
  .message-fade-enter-active {
    animation: none;
    transition: none;
  }
  
  .messages-container {
    transition: none !important;
  }
  
  .discord-message-list {
    scroll-behavior: auto !important;
  }
}

/* 🎯 PERFORMANCE: Optimize scroll container during loading */
.discord-message-list[data-loading="true"] {
  /* Reduce rendering complexity during loading */
  will-change: scroll-position, contents;
  contain: layout style;
}

/* 🎯 PERFORMANCE: Optimize individual message containers */
.message-container-optimized {
  /* 🎯 Simple but effective message animation */
  position: relative;
  contain: layout style;
  /* 🎯 PERFORMANCE: Reduce paint complexity */
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 🎯 PERFORMANCE: Optimize loading indicators */
.enhanced-load-indicator,
.smooth-loading-placeholder {
  /* Ensure loading indicators don't cause layout shifts */
  contain: layout style paint;
  will-change: opacity;
  transform: translateZ(0);
}

/* 🧠 COGNITIVE: Reading-Friendly Loading Styles */

/* 🧠 Cognitive load indicator with reading context */
.cognitive-load-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.08) 0%,
      rgba(139, 92, 246, 0.05) 50%,
      rgba(168, 85, 247, 0.03) 100%);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  margin: 8px 16px;
  border: 1px solid rgba(99, 102, 241, 0.12);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.08);
}

/* 🧠 Visual continuity bridge */
.context-bridge {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  width: 100%;
  justify-content: center;
}

.bridge-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.3) 50%,
      transparent 100%);
  max-width: 80px;
}

.bridge-text {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.025em;
}

/* 🧠 Reading rhythm progress */
.reading-rhythm-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.dot.active {
  background: rgb(99, 102, 241);
  transform: scale(1.2);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
}

.progress-text {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 400;
}

/* 🧠 Content preview with timeline */
.content-preview-container {
  padding: 16px;
  opacity: 0.7;
}

.preview-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.preview-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.6) 0%, 
      rgba(139, 92, 246, 0.4) 100%);
  margin-bottom: 4px;
  animation: timelinePulse 2s ease-in-out infinite;
}

.timeline-line {
  width: 2px;
  height: 32px;
  background: linear-gradient(180deg,
      rgba(99, 102, 241, 0.3) 0%,
      rgba(99, 102, 241, 0.1) 100%);
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.3) 0%, 
      rgba(139, 92, 246, 0.2) 100%);
  animation: avatarShimmer 2s ease-in-out infinite;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-name {
  width: 80px;
  height: 12px;
  background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.2) 0%, 
      rgba(99, 102, 241, 0.1) 50%, 
      rgba(99, 102, 241, 0.2) 100%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: contentShimmer 2s ease-in-out infinite;
}

.preview-time {
  width: 60px;
  height: 10px;
  background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.15) 0%, 
      rgba(99, 102, 241, 0.08) 50%, 
      rgba(99, 102, 241, 0.15) 100%);
  background-size: 200% 100%;
  border-radius: 5px;
  animation: contentShimmer 2s ease-in-out infinite 0.3s;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-line {
  height: 10px;
  background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.12) 0%, 
      rgba(99, 102, 241, 0.06) 50%, 
      rgba(99, 102, 241, 0.12) 100%);
  background-size: 200% 100%;
  border-radius: 5px;
  animation: contentShimmer 2s ease-in-out infinite 0.6s;
}

.preview-line:first-child {
  width: 85%;
}

.preview-line.short {
  width: 60%;
}

/* 🧠 Reading position anchor */
.reading-anchor {
  position: absolute;
  left: -40px;
  z-index: 20;
  pointer-events: none;
}

.anchor-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.95);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  backdrop-filter: blur(8px);
  animation: anchorFloat 3s ease-in-out infinite;
}

.anchor-icon {
  font-size: 14px;
}

/* 🧠 Reading flow optimizations */
.messages-container.reading-flow-mode {
  /* Optimize for reading comfort */
  line-height: 1.6;
  letter-spacing: 0.01em;
}

/* 🧠 Gentle transitions */
.gentle-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.gentle-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.gentle-fade-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

.gentle-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

.content-preview-enter-active {
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.content-preview-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.content-preview-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.96);
}

.content-preview-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

/* 🧠 Cognitive-friendly animations */
@keyframes timelinePulse {
  0%, 100% { 
    opacity: 0.6;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes avatarShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes contentShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes anchorFloat {
  0%, 100% { 
    transform: translateY(0px);
  }
  50% { 
    transform: translateY(-4px);
  }
}

/* 🧠 Global reading flow state */
:global(.reading-flow-loading) {
  .discord-message-list {
    /* Optimize scrolling during loading */
    scroll-behavior: auto;
    overscroll-behavior: contain;
  }
  
  .message-container-optimized {
    /* Reduce visual noise during loading */
    transition: opacity 0.2s ease-out;
  }
}

/* 🧠 Accessibility and reduced motion */
@media (prefers-reduced-motion: reduce) {
  .gentle-fade-enter-active,
  .gentle-fade-leave-active,
  .content-preview-enter-active,
  .content-preview-leave-active,
  .timeline-dot,
  .preview-avatar,
  .preview-name,
  .preview-time,
  .preview-line,
  .anchor-indicator {
    animation: none;
    transition: none;
  }
  
  .dot {
    transition: none;
  }
}
</style>

