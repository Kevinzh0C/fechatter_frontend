/**
 * useOptimizedReadReceipts Composable
 * 优化的已读回执管理，支持真实的消息可见性检测
 */
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ReadReceiptsService from '@/services/ReadReceiptsService'
import { debounce } from '@/utils/performance'
import type { MessageReceipt } from '@/types/api'

interface OptimizedReadReceiptState {
  receipts: Map<number, MessageReceipt[]>
  visibleMessages: Set<number>
  pendingReads: Set<number>
  loading: Set<number>
  errors: Map<number, string>
  observer: IntersectionObserver | null
}

interface MessageElement {
  id: number
}

export function useOptimizedReadReceipts(chatId: number) {
  const authStore = useAuthStore()
  
  // State
  const state = reactive<OptimizedReadReceiptState>({
    receipts: new Map(),
    visibleMessages: new Set(),
    pendingReads: new Set(),
    loading: new Set(),
    errors: new Map(),
    observer: null
  })
  
  // 缓存已经标记为已读的消息，避免重复请求
  const markedAsRead = new WeakSet<MessageElement>()
  
  // 配置
  const VISIBILITY_THRESHOLD = 0.5 // 消息需要50%可见才算已读
  const VISIBILITY_DURATION = 1000 // 消息需要可见1秒才标记已读
  const BATCH_DELAY = 500 // 批量处理延迟
  
  // 可见性计时器
  const visibilityTimers = new Map<number, number>()
  
  // 创建 IntersectionObserver
  const createObserver = () => {
    if (state.observer) return
    
    state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0')
          if (!messageId) return
          
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
            // 消息进入视口
            if (!visibilityTimers.has(messageId)) {
              const timer = window.setTimeout(() => {
                state.visibleMessages.add(messageId)
                state.pendingReads.add(messageId)
                visibilityTimers.delete(messageId)
                
                // 触发批量处理
                batchMarkAsRead()
              }, VISIBILITY_DURATION)
              
              visibilityTimers.set(messageId, timer)
            }
          } else {
            // 消息离开视口
            if (visibilityTimers.has(messageId)) {
              clearTimeout(visibilityTimers.get(messageId))
              visibilityTimers.delete(messageId)
            }
          }
        })
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '0px'
      }
    )
  }
  
  // 批量标记已读（防抖）
  const batchMarkAsRead = debounce(async () => {
    if (state.pendingReads.size === 0) return
    
    const messageIds = Array.from(state.pendingReads)
    state.pendingReads.clear()
    
    // 过滤掉已经标记过的消息
    const unreadMessageIds = messageIds.filter(id => {
      const message: MessageElement = { id }
      if (markedAsRead.has(message)) return false
      markedAsRead.add(message)
      return true
    })
    
    if (unreadMessageIds.length === 0) return
    
    try {
      const success = await ReadReceiptsService.markMessagesRead(chatId, unreadMessageIds)
      
      if (success) {
        const currentUser = authStore.user as any
        if (currentUser?.id) {
          // 更新本地状态
          unreadMessageIds.forEach(messageId => {
            updateLocalReadStatus(messageId, currentUser.id)
          })
        }
      }
      
      console.log(`✅ [OptimizedReadReceipts] Marked ${unreadMessageIds.length} messages as read`)
    } catch (error) {
      console.error('[OptimizedReadReceipts] Batch mark as read failed:', error)
      // 失败的消息重新加入待处理队列
      unreadMessageIds.forEach(id => state.pendingReads.add(id))
    }
  }, BATCH_DELAY)
  
  // 观察消息元素
  const observeMessage = (element: HTMLElement) => {
    if (!state.observer || !element) return
    
    const messageId = element.getAttribute('data-message-id')
    if (!messageId) return
    
    state.observer.observe(element)
  }
  
  // 停止观察消息元素
  const unobserveMessage = (element: HTMLElement) => {
    if (!state.observer || !element) return
    
    state.observer.unobserve(element)
    
    const messageId = parseInt(element.getAttribute('data-message-id') || '0')
    if (messageId && visibilityTimers.has(messageId)) {
      clearTimeout(visibilityTimers.get(messageId))
      visibilityTimers.delete(messageId)
    }
  }
  
  // 观察所有消息
  const observeAllMessages = () => {
    const messageElements = document.querySelectorAll('[data-message-id]')
    messageElements.forEach(element => {
      observeMessage(element as HTMLElement)
    })
  }
  
  // 更新本地已读状态
  const updateLocalReadStatus = (messageId: number, userId?: number) => {
    if (!userId) return
    
    const existingReceipts = state.receipts.get(messageId) || []
    const userReceiptIndex = existingReceipts.findIndex(r => r.user_id === userId)
    
    const user = authStore.user as any
    const newReceipt: MessageReceipt = {
      id: Date.now(),
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString(),
      user: {
        id: userId,
        fullname: user?.fullname || 'You'
      }
    }
    
    if (userReceiptIndex >= 0) {
      existingReceipts[userReceiptIndex] = newReceipt
    } else {
      existingReceipts.push(newReceipt)
    }
    
    state.receipts.set(messageId, [...existingReceipts])
  }
  
  // 手动标记消息为已读（用于特殊场景）
  const markMessageAsRead = async (messageId: number) => {
    const message: MessageElement = { id: messageId }
    if (markedAsRead.has(message)) return
    
    state.pendingReads.add(messageId)
    batchMarkAsRead()
  }
  
  // 标记所有可见消息为已读（用于焦点事件）
  const markAllVisibleAsRead = () => {
    // 从 DOM 获取当前可见的消息
    const messageElements = document.querySelectorAll('[data-message-id]')
    const visibleMessageIds: number[] = []
    
    messageElements.forEach(element => {
      const rect = element.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0
      if (isVisible) {
        const messageId = parseInt(element.getAttribute('data-message-id') || '0')
        if (messageId) {
          visibleMessageIds.push(messageId)
        }
      }
    })
    
    visibleMessageIds.forEach(id => {
      const message: MessageElement = { id }
      if (!markedAsRead.has(message)) {
        state.pendingReads.add(id)
      }
    })
    
    if (state.pendingReads.size > 0) {
      batchMarkAsRead()
    }
  }
  
  // 获取已读回执状态
  const getReceiptStatus = (messageId: number, totalMembers = 1) => {
    return computed(() => {
      const receipts = state.receipts.get(messageId) || []
      return ReadReceiptsService.formatReceiptStatus(receipts, totalMembers)
    })
  }
  
  // 获取已读回执图标
  const getReceiptIcon = (messageId: number, totalMembers = 1) => {
    return computed(() => {
      const status = getReceiptStatus(messageId, totalMembers).value as any
      return ReadReceiptsService.getReceiptIcon(status.icon || 'sent')
    })
  }
  
  // 清理资源
  const cleanup = () => {
    // 清理所有计时器
    visibilityTimers.forEach(timer => clearTimeout(timer))
    visibilityTimers.clear()
    
    // 断开观察器
    if (state.observer) {
      state.observer.disconnect()
      state.observer = null
    }
    
    // 清理状态
    state.visibleMessages.clear()
    state.pendingReads.clear()
  }
  
  // 生命周期
  onMounted(() => {
    createObserver()
    // 延迟观察，等待消息渲染
    setTimeout(observeAllMessages, 100)
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // State
    state: state as Readonly<OptimizedReadReceiptState>,
    
    // Methods
    observeMessage,
    unobserveMessage,
    observeAllMessages,
    markMessageAsRead,
    markAllVisibleAsRead,
    getReceiptStatus,
    getReceiptIcon,
    cleanup,
    
    // Utilities
    isMessageRead: (messageId: number) => {
      const message: MessageElement = { id: messageId }
      return markedAsRead.has(message)
    }
  }
} 