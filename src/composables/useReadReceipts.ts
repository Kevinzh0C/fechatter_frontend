/**
 * useReadReceipts Composable
 * 管理消息已读回执的完整实现
 */
import { ref, computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ReadReceiptsService from '@/services/ReadReceiptsService'
import type { MessageReceipt } from '@/types/api'

interface ReadReceiptState {
  receipts: Map<number, MessageReceipt[]>
  loading: Set<number>
  errors: Map<number, string>
}

export function useReadReceipts() {
  const authStore = useAuthStore()
  
  // State
  const state = reactive<ReadReceiptState>({
    receipts: new Map(),
    loading: new Set(),
    errors: new Map()
  })
  
  // Computed
  const getReceiptsForMessage = (messageId: number) => {
    return computed(() => state.receipts.get(messageId) || [])
  }
  
  const isLoadingReceipts = (messageId: number) => {
    return computed(() => state.loading.has(messageId))
  }
  
  const getReceiptError = (messageId: number) => {
    return computed(() => state.errors.get(messageId) || null)
  }
  
  // Methods
  const loadBasicReceipts = async (messageId: number) => {
    state.loading.add(messageId)
    state.errors.delete(messageId)
    
    try {
      const receipts = await ReadReceiptsService.getBasicReceipts(messageId)
      state.receipts.set(messageId, receipts)
      return receipts
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load receipts'
      state.errors.set(messageId, errorMessage)
      console.error('[useReadReceipts] Load basic receipts failed:', error)
      return []
    } finally {
      state.loading.delete(messageId)
    }
  }
  
  const loadDetailedReceipts = async (messageId: number) => {
    state.loading.add(messageId)
    state.errors.delete(messageId)
    
    try {
      const receipts = await ReadReceiptsService.getDetailedReceipts(messageId)
      state.receipts.set(messageId, receipts)
      return receipts
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load detailed receipts'
      state.errors.set(messageId, errorMessage)
      console.error('[useReadReceipts] Load detailed receipts failed:', error)
      return []
    } finally {
      state.loading.delete(messageId)
    }
  }
  
  const markMessageRead = async (chatId: number, messageId: number) => {
    try {
      const success = await ReadReceiptsService.markMessageReadEnhanced(chatId, messageId)
      
      if (success) {
        // Update local state to reflect the read status
        updateLocalReadStatus(messageId, authStore.user?.id)
      }
      
      return success
    } catch (error) {
      console.error('[useReadReceipts] Mark message read failed:', error)
      return false
    }
  }
  
  const markMultipleMessagesRead = async (chatId: number, messageIds: number[]) => {
    try {
      const success = await ReadReceiptsService.markMessagesRead(chatId, messageIds)
      
      if (success && authStore.user?.id) {
        // Update local state for all messages
        messageIds.forEach(messageId => {
          updateLocalReadStatus(messageId, authStore.user?.id)
        })
      }
      
      return success
    } catch (error) {
      console.error('[useReadReceipts] Mark multiple messages read failed:', error)
      return false
    }
  }
  
  const updateLocalReadStatus = (messageId: number, userId?: number) => {
    if (!userId) return
    
    const existingReceipts = state.receipts.get(messageId) || []
    const userReceiptIndex = existingReceipts.findIndex(r => r.user_id === userId)
    
    const newReceipt: MessageReceipt = {
      id: Date.now(), // Temporary ID
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString(),
      user: {
        id: userId,
        fullname: authStore.user?.fullname || 'You'
      }
    }
    
    if (userReceiptIndex >= 0) {
      // Update existing receipt
      existingReceipts[userReceiptIndex] = newReceipt
    } else {
      // Add new receipt
      existingReceipts.push(newReceipt)
    }
    
    state.receipts.set(messageId, [...existingReceipts])
  }
  
  const getReceiptStatus = (messageId: number, totalMembers = 1) => {
    return computed(() => {
      const receipts = state.receipts.get(messageId) || []
      return ReadReceiptsService.formatReceiptStatus(receipts, totalMembers)
    })
  }
  
  const getReceiptDetails = (messageId: number) => {
    return computed(() => {
      const receipts = state.receipts.get(messageId) || []
      return ReadReceiptsService.generateReceiptDetails(receipts)
    })
  }
  
  const shouldShowReceipts = (messageId: number, senderId: number) => {
    return computed(() => {
      return ReadReceiptsService.shouldShowReceipts(
        { sender_id: senderId } as any,
        authStore.user
      )
    })
  }
  
  const getReceiptIcon = (messageId: number, totalMembers = 1) => {
    return computed(() => {
      const status = getReceiptStatus(messageId, totalMembers).value
      return ReadReceiptsService.getReceiptIcon(status.icon)
    })
  }
  
  const updateReceiptRealtime = (messageId: number, receipt: MessageReceipt) => {
    const existingReceipts = state.receipts.get(messageId) || []
    const userReceiptIndex = existingReceipts.findIndex(r => r.user_id === receipt.user_id)
    
    if (userReceiptIndex >= 0) {
      existingReceipts[userReceiptIndex] = receipt
    } else {
      existingReceipts.push(receipt)
    }
    
    state.receipts.set(messageId, [...existingReceipts])
  }
  
  const clearReceipts = (messageId?: number) => {
    if (messageId) {
      state.receipts.delete(messageId)
      state.loading.delete(messageId)
      state.errors.delete(messageId)
    } else {
      state.receipts.clear()
      state.loading.clear()
      state.errors.clear()
    }
  }
  
  const preloadReceipts = async (messageIds: number[]) => {
    const promises = messageIds.map(messageId => {
      // Only load if not already loaded or loading
      if (!state.receipts.has(messageId) && !state.loading.has(messageId)) {
        return loadBasicReceipts(messageId)
      }
      return Promise.resolve([])
    })
    
    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.warn('[useReadReceipts] Preload receipts failed:', error)
    }
  }
  
  return {
    // State
    state: state as Readonly<ReadReceiptState>,
    
    // Computed getters
    getReceiptsForMessage,
    isLoadingReceipts,
    getReceiptError,
    getReceiptStatus,
    getReceiptDetails,
    shouldShowReceipts,
    getReceiptIcon,
    
    // Methods
    loadBasicReceipts,
    loadDetailedReceipts,
    markMessageRead,
    markMultipleMessagesRead,
    updateLocalReadStatus,
    updateReceiptRealtime,
    clearReceipts,
    preloadReceipts
  }
} 