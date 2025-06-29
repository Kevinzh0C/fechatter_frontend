/**
 * useTypingIndicator Composable
 * 管理输入状态的完整实现
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ChatService from '@/services/ChatService'
import { debounce } from '@/utils/performance'

interface TypingUser {
  userId: number
  userName: string
  startedAt: number
}

export function useTypingIndicator(chatId: number | string) {
  const authStore = useAuthStore()
  
  // State
  const typingUsers = ref<TypingUser[]>([])
  const isCurrentUserTyping = ref(false)
  const lastTypingTime = ref(0)
  
  // Timers
  let typingTimer: number | null = null
  let cleanupTimer: number | null = null
  let fetchTimer: number | null = null
  
  // Constants
  const TYPING_TIMEOUT = 3000 // 3 seconds
  const CLEANUP_INTERVAL = 1000 // 1 second
  const FETCH_INTERVAL = 5000 // 5 seconds
  const STALE_THRESHOLD = 5000 // 5 seconds
  
  // Computed
  const numericChatId = computed(() => 
    typeof chatId === 'string' ? parseInt(chatId, 10) : chatId
  )
  
  const typingText = computed(() => {
    const users = typingUsers.value.filter(u => u.userId !== authStore.user?.id)
    const count = users.length
    
    if (count === 0) return ''
    if (count === 1) return `${users[0].userName} is typing...`
    if (count === 2) return `${users[0].userName} and ${users[1].userName} are typing...`
    return `${users[0].userName} and ${count - 1} others are typing...`
  })
  
  const hasTypingUsers = computed(() => typingUsers.value.length > 0)
  
  // Methods
  const startTyping = async () => {
    if (isCurrentUserTyping.value) return
    
    try {
      await ChatService.startTyping(numericChatId.value)
      isCurrentUserTyping.value = true
      lastTypingTime.value = Date.now()
      
      // Auto-stop after timeout
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = window.setTimeout(() => {
        stopTyping()
      }, TYPING_TIMEOUT)
      
    } catch (error) {
      console.warn('[useTypingIndicator] Start typing failed:', error)
    }
  }
  
  const stopTyping = async () => {
    if (!isCurrentUserTyping.value) return
    
    try {
      await ChatService.stopTyping(numericChatId.value)
      isCurrentUserTyping.value = false
      
      if (typingTimer) {
        clearTimeout(typingTimer)
        typingTimer = null
      }
      
    } catch (error) {
      console.warn('[useTypingIndicator] Stop typing failed:', error)
    }
  }
  
  // Debounced typing start to prevent spam
  const debouncedStartTyping = debounce(startTyping, 300)
  
  const handleInput = () => {
    const now = Date.now()
    
    // If not currently typing or it's been a while, start typing
    if (!isCurrentUserTyping.value || now - lastTypingTime.value > TYPING_TIMEOUT / 2) {
      debouncedStartTyping()
    }
    
    // Reset the auto-stop timer
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = window.setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }
  
  const updateTypingUsers = async () => {
    try {
      const users = await ChatService.getTypingUsers(numericChatId.value)
      
      // Update typing users with current timestamp
      typingUsers.value = users.map(user => ({
        userId: user.userId,
        userName: user.userName || `User ${user.userId}`,
        startedAt: user.startedAt || Date.now()
      }))
      
    } catch (error) {
      console.warn('[useTypingIndicator] Update typing users failed:', error)
    }
  }
  
  const cleanupStaleUsers = () => {
    const now = Date.now()
    typingUsers.value = typingUsers.value.filter(
      user => now - user.startedAt < STALE_THRESHOLD
    )
  }
  
  const addTypingUser = (userId: number, userName: string) => {
    // Don't add current user
    if (userId === authStore.user?.id) return
    
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
  
  const removeTypingUser = (userId: number) => {
    const index = typingUsers.value.findIndex(u => u.userId === userId)
    if (index >= 0) {
      typingUsers.value.splice(index, 1)
    }
  }
  
  const handleTypingEvent = (data: any) => {
    if (data.chatId !== numericChatId.value) return
    
    if (data.isTyping) {
      addTypingUser(data.userId, data.userName)
    } else {
      removeTypingUser(data.userId)
    }
  }
  
  const startTimers = () => {
    // Cleanup stale users periodically
    cleanupTimer = window.setInterval(cleanupStaleUsers, CLEANUP_INTERVAL)
    
    // Fetch typing users periodically
    fetchTimer = window.setInterval(updateTypingUsers, FETCH_INTERVAL)
  }
  
  const stopTimers = () => {
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
    
    if (fetchTimer) {
      clearInterval(fetchTimer)
      fetchTimer = null
    }
  }
  
  const reset = () => {
    typingUsers.value = []
    isCurrentUserTyping.value = false
    lastTypingTime.value = 0
    stopTimers()
  }
  
  // Lifecycle
  onMounted(() => {
    startTimers()
  })
  
  onUnmounted(() => {
    stopTyping() // Ensure we stop typing when component unmounts
    stopTimers()
  })
  
  // Watch for chat ID changes
  watch(() => numericChatId.value, (newChatId, oldChatId) => {
    if (newChatId !== oldChatId) {
      reset()
      if (newChatId) {
        startTimers()
      }
    }
  })
  
  return {
    // State
    typingUsers: computed(() => typingUsers.value),
    isCurrentUserTyping: computed(() => isCurrentUserTyping.value),
    typingText,
    hasTypingUsers,
    
    // Methods
    startTyping,
    stopTyping,
    handleInput,
    updateTypingUsers,
    addTypingUser,
    removeTypingUser,
    handleTypingEvent,
    reset
  }
} 