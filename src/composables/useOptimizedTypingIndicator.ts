/**
 * useOptimizedTypingIndicator Composable
 * 优化的输入状态管理，支持重试和性能优化
 */
import { ref, computed, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ChatService from '@/services/ChatService'
import { debounce } from '@/utils/performance'

interface TypingUser {
  userId: number
  userName: string
  startedAt: number
}

interface TypingState {
  isTyping: boolean
  lastTypingTime: number
  retryCount: number
  failedAttempts: number
}

export function useOptimizedTypingIndicator(chatId: number | string) {
  const authStore = useAuthStore()
  
  // State
  const typingUsers = ref<TypingUser[]>([])
  const state = ref<TypingState>({
    isTyping: false,
    lastTypingTime: 0,
    retryCount: 0,
    failedAttempts: 0
  })
  
  // Timers
  let typingTimer: number | null = null
  let cleanupTimer: number | null = null
  
  // Constants
  const TYPING_TIMEOUT = 3000 // 3 seconds
  const CLEANUP_INTERVAL = 1000 // 1 second
  const STALE_THRESHOLD = 5000 // 5 seconds
  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAY = 1000 // 1 second
  const DEBOUNCE_DELAY = 300 // 300ms
  
  // Computed
  const numericChatId = computed(() => 
    typeof chatId === 'string' ? parseInt(chatId, 10) : chatId
  )
  
  const isCurrentUserTyping = computed(() => state.value.isTyping)
  
  const typingText = computed(() => {
    const currentUser = authStore.user as any
    const users = typingUsers.value.filter(u => u.userId !== currentUser?.id)
    const count = users.length
    
    if (count === 0) return ''
    if (count === 1) return `${users[0].userName} is typing...`
    if (count === 2) return `${users[0].userName} and ${users[1].userName} are typing...`
    return `${users[0].userName} and ${count - 1} others are typing...`
  })
  
  const hasTypingUsers = computed(() => typingUsers.value.length > 0)
  
  // Methods with retry mechanism
  const startTypingWithRetry = async (retryCount = 0): Promise<boolean> => {
    try {
      await ChatService.startTyping(numericChatId.value)
      state.value.isTyping = true
      state.value.lastTypingTime = Date.now()
      state.value.failedAttempts = 0
      
      // Auto-stop after timeout
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = window.setTimeout(() => {
        stopTyping()
      }, TYPING_TIMEOUT)
      
      return true
    } catch (error) {
      console.warn(`[OptimizedTypingIndicator] Start typing failed (attempt ${retryCount + 1}):`, error)
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return startTypingWithRetry(retryCount + 1)
      } else {
        state.value.failedAttempts++
        console.error('[OptimizedTypingIndicator] Max retry attempts reached')
        return false
      }
    }
  }
  
  const stopTyping = async () => {
    if (!state.value.isTyping) return
    
    try {
      await ChatService.stopTyping(numericChatId.value)
    } catch (error) {
      console.warn('[OptimizedTypingIndicator] Stop typing failed:', error)
    } finally {
      state.value.isTyping = false
      
      if (typingTimer) {
        clearTimeout(typingTimer)
        typingTimer = null
      }
    }
  }
  
  // Debounced start typing to prevent spam
  const debouncedStartTyping = debounce(async () => {
    const now = Date.now()
    
    // If not currently typing or it's been a while, start typing
    if (!state.value.isTyping || now - state.value.lastTypingTime > TYPING_TIMEOUT / 2) {
      await startTypingWithRetry()
    }
    
    // Reset the auto-stop timer
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = window.setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }, DEBOUNCE_DELAY)
  
  // Optimized input handler
  const handleInput = () => {
    // Skip if too many failed attempts
    if (state.value.failedAttempts >= MAX_RETRY_ATTEMPTS) {
      console.warn('[OptimizedTypingIndicator] Skipping due to too many failed attempts')
      return
    }
    
    debouncedStartTyping()
  }
  
  // Clean up stale typing users
  const cleanupStaleUsers = () => {
    const now = Date.now()
    typingUsers.value = typingUsers.value.filter(
      user => now - user.startedAt < STALE_THRESHOLD
    )
  }
  
  // Add typing user
  const addTypingUser = (userId: number, userName: string) => {
    // Don't add current user
    const currentUser = authStore.user as any
    if (userId === currentUser?.id) return
    
    const existingIndex = typingUsers.value.findIndex(u => u.userId === userId)
    const user: TypingUser = {
      userId,
      userName: userName || `User ${userId}`,
      startedAt: Date.now()
    }
    
    if (existingIndex >= 0) {
      typingUsers.value[existingIndex] = user
    } else {
      typingUsers.value.push(user)
    }
  }
  
  // Remove typing user
  const removeTypingUser = (userId: number) => {
    const index = typingUsers.value.findIndex(u => u.userId === userId)
    if (index >= 0) {
      typingUsers.value.splice(index, 1)
    }
  }
  
  // Handle typing event from SSE
  const handleTypingEvent = (data: any) => {
    if (data.chatId !== numericChatId.value) return
    
    if (data.isTyping) {
      addTypingUser(data.userId, data.userName)
    } else {
      removeTypingUser(data.userId)
    }
  }
  
  // Start cleanup timer
  const startCleanupTimer = () => {
    if (cleanupTimer) return
    
    cleanupTimer = window.setInterval(cleanupStaleUsers, CLEANUP_INTERVAL)
  }
  
  // Stop cleanup timer
  const stopCleanupTimer = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
  }
  
  // Reset state
  const reset = () => {
    typingUsers.value = []
    state.value = {
      isTyping: false,
      lastTypingTime: 0,
      retryCount: 0,
      failedAttempts: 0
    }
    
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    
    stopCleanupTimer()
  }
  
  // Initialize
  startCleanupTimer()
  
  // Cleanup on unmount
  onUnmounted(() => {
    stopTyping()
    stopCleanupTimer()
  })
  
  // Watch for chat ID changes
  watch(() => numericChatId.value, (newChatId, oldChatId) => {
    if (newChatId !== oldChatId) {
      reset()
      if (newChatId) {
        startCleanupTimer()
      }
    }
  })
  
  return {
    // State
    typingUsers: computed(() => typingUsers.value),
    isCurrentUserTyping,
    typingText,
    hasTypingUsers,
    
    // Methods
    startTyping: startTypingWithRetry,
    stopTyping,
    handleInput,
    addTypingUser,
    removeTypingUser,
    handleTypingEvent,
    reset,
    
    // Status
    isHealthy: computed(() => state.value.failedAttempts < MAX_RETRY_ATTEMPTS)
  }
} 