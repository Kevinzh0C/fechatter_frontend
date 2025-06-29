/**
 * Enterprise Message List Composable
 * 
 * Extends existing DiscordMessageList with enterprise features:
 * - Virtual scrolling for 10k+ messages
 * - State sharding integration
 * - Performance monitoring
 * - Memory optimization
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import { useEnterpriseStore } from '@/stores/enterpriseStore'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

export function useEnterpriseMessageList(props) {
  const enterpriseStore = useEnterpriseStore()
  const chatStore = useChatStore()
  const authStore = useAuthStore()
  
  // ===============================
  // Core Refs - Reuse existing structure
  // ===============================
  const scrollContainer = ref(null)
  const messagesContainer = ref(null)
  
  // ===============================
  // Enterprise Extensions
  // ===============================
  
  // Virtual scrolling state
  const virtualScrollEnabled = ref(true)
  const messageCache = ref(new Map()) // Local message cache
  const renderBudget = ref(50) // Max messages to render
  
  // Performance monitoring
  const performanceMetrics = ref({
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    scrollFPS: 0
  })
  
  // Message sharding
  const messageShards = ref(new Map()) // Map<shardId, messages[]>
  const activeMessageShard = ref(null)
  
  // ===============================
  // Virtual Scrolling Integration
  // ===============================
  
  // Get messages with virtual scrolling optimization
  const virtualizedMessages = computed(() => {
    if (!virtualScrollEnabled.value || !props.messages) {
      return props.messages || []
    }
    
    // Use enterprise store's virtualization manager
    const virtualWindow = enterpriseStore.messageVirtualizationManager
      .getVisibleMessages(props.chatId)
    
    return virtualWindow.length > 0 ? virtualWindow : (props.messages || [])
  })
  
  // Setup virtual scrolling
  const {
    virtualItems,
    totalHeight,
    visibleRange,
    scrollToItem,
    setMeasuredHeight,
    performanceMetrics: virtualMetrics
  } = useVirtualScroll({
    items: computed(() => virtualizedMessages.value),
    containerRef: scrollContainer,
    itemHeight: 80,
    overscan: 5
  })
  
  // ===============================
  // Message Sharding System
  // ===============================
  
  /**
   * Calculate message shard based on chat ID and message count
   */
  const calculateMessageShard = (chatId, messageCount) => {
    const messagesPerShard = 1000
    return Math.floor(messageCount / messagesPerShard)
  }
  
  /**
   * Load messages for current shard
   */
  const loadMessageShard = async (chatId, shardId) => {
    try {
      const cacheKey = `${chatId}_${shardId}`
      
      // Check cache first
      if (messageCache.value.has(cacheKey)) {
        performanceMetrics.value.cacheHitRate++
        return messageCache.value.get(cacheKey)
      }
      
      // Load from chat store with shard-specific pagination
      const offset = shardId * 1000
      const messages = await chatStore.fetchMessages(chatId, {
        limit: 1000,
        offset: offset
      })
      
      // Cache the shard
      messageCache.value.set(cacheKey, messages)
      messageShards.value.set(shardId, messages)
      
      console.log(`📦 [Enterprise] Loaded message shard ${shardId} for chat ${chatId} (${messages.length} messages)`)
      
      return messages
      
    } catch (error) {
      console.error(`❌ [Enterprise] Failed to load message shard ${shardId}:`, error)
      return []
    }
  }
  
  /**
   * Preload adjacent message shards for smooth scrolling
   */
  const preloadAdjacentShards = async (currentShardId) => {
    const shardsToPreload = [currentShardId - 1, currentShardId + 1]
    
    for (const shardId of shardsToPreload) {
      if (shardId >= 0 && !messageShards.value.has(shardId)) {
        // Preload in background
        setTimeout(() => {
          loadMessageShard(props.chatId, shardId)
        }, 100)
      }
    }
  }
  
  // ===============================
  // Performance Optimization
  // ===============================
  
  /**
   * Memory cleanup for inactive shards
   */
  const cleanupInactiveShards = () => {
    const maxCachedShards = 3
    const currentShard = activeMessageShard.value
    
    if (messageShards.value.size > maxCachedShards) {
      const shardsToKeep = new Set([
        currentShard - 1,
        currentShard,
        currentShard + 1
      ])
      
      for (const [shardId] of messageShards.value) {
        if (!shardsToKeep.has(shardId)) {
          messageShards.value.delete(shardId)
          messageCache.value.delete(`${props.chatId}_${shardId}`)
        }
      }
      
      console.log(`🧹 [Enterprise] Cleaned up inactive message shards, keeping ${messageShards.value.size} shards`)
    }
  }
  
  /**
   * Monitor render performance
   */
  const measureRenderPerformance = (fn) => {
    return enterpriseStore.performanceMonitor.measureRenderTime(fn)
  }
  
  /**
   * Optimize message rendering based on viewport
   */
  const optimizeMessageRendering = () => {
    if (!scrollContainer.value) return
    
    const container = scrollContainer.value
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
    // Update enterprise store's virtualization manager
    enterpriseStore.messageVirtualizationManager
      .updateViewport(props.chatId, scrollTop, containerHeight)
    
    // Update local performance metrics
    performanceMetrics.value.scrollFPS = Math.round(1000 / virtualMetrics.value.lastRenderTime)
  }
  
  // ===============================
  // Enhanced Scroll Management
  // ===============================
  
  /**
   * Enterprise scroll to bottom with virtual scrolling
   */
  const enterpriseScrollToBottom = (smooth = false) => {
    if (virtualScrollEnabled.value && virtualItems.value.length > 0) {
      const lastIndex = virtualItems.value.length - 1
      scrollToItem(lastIndex, 'end')
    } else {
      // Fallback to traditional scroll
      if (scrollContainer.value) {
        const behavior = smooth ? 'smooth' : 'auto'
        scrollContainer.value.scrollTo({
          top: scrollContainer.value.scrollHeight,
          behavior
        })
      }
    }
  }
  
  /**
   * Smart scroll to message with shard loading
   */
  const smartScrollToMessage = async (messageId) => {
    try {
      // Find which shard contains this message
      const message = await findMessageInShards(messageId)
      if (!message) {
        console.warn(`🔍 [Enterprise] Message ${messageId} not found in any shard`)
        return false
      }
      
      // Load the appropriate shard if not loaded
      const shardId = message.shardId
      if (!messageShards.value.has(shardId)) {
        await loadMessageShard(props.chatId, shardId)
      }
      
      // Find the message index in virtual items
      const messageIndex = virtualItems.value.findIndex(item => item.id === messageId)
      if (messageIndex >= 0) {
        scrollToItem(messageIndex, 'center')
        return true
      }
      
      return false
      
    } catch (error) {
      console.error(`❌ [Enterprise] Failed to scroll to message ${messageId}:`, error)
      return false
    }
  }
  
  /**
   * Find message across all shards
   */
  const findMessageInShards = async (messageId) => {
    // Check loaded shards first
    for (const [shardId, messages] of messageShards.value) {
      const message = messages.find(m => m.id === messageId)
      if (message) {
        return { ...message, shardId }
      }
    }
    
    // If not found, we might need to search other shards
    // This would typically involve a backend search API
    return null
  }
  
  // ===============================
  // Integration with Existing Components
  // ===============================
  
  /**
   * Enhanced message loading for enterprise scale
   */
  const loadMoreMessages = async () => {
    if (!props.hasMoreMessages) return
    
    try {
      // Calculate current shard
      const currentMessageCount = virtualizedMessages.value.length
      const currentShard = calculateMessageShard(props.chatId, currentMessageCount)
      
      // Load previous shard (older messages)
      const previousShard = currentShard + 1
      await loadMessageShard(props.chatId, previousShard)
      
      // Update active shard
      activeMessageShard.value = previousShard
      
      // Preload adjacent shards
      await preloadAdjacentShards(previousShard)
      
      // Cleanup old shards
      cleanupInactiveShards()
      
    } catch (error) {
      console.error('❌ [Enterprise] Failed to load more messages:', error)
    }
  }
  
  // ===============================
  // Lifecycle Management
  // ===============================
  
  // Watch for chat changes
  watch(() => props.chatId, async (newChatId) => {
    if (newChatId) {
      // Reset state for new chat
      messageShards.value.clear()
      messageCache.value.clear()
      activeMessageShard.value = 0
      
      // Create virtual window for new chat
      enterpriseStore.messageVirtualizationManager
        .createVirtualWindow(newChatId, props.messages?.length || 0)
      
      // Load initial shard
      await loadMessageShard(newChatId, 0)
    }
  })
  
  // Setup performance monitoring
  onMounted(() => {
    if (scrollContainer.value) {
      // Monitor scroll performance
      const scrollHandler = () => {
        requestAnimationFrame(optimizeMessageRendering)
      }
      
      scrollContainer.value.addEventListener('scroll', scrollHandler, { passive: true })
      
      // Cleanup
      onUnmounted(() => {
        scrollContainer.value?.removeEventListener('scroll', scrollHandler)
      })
    }
    
    // Start performance monitoring
    const performanceInterval = setInterval(() => {
      enterpriseStore.performanceMonitor.updateMemoryUsage()
      enterpriseStore.performanceMonitor.calculateThroughput()
    }, 5000)
    
    onUnmounted(() => {
      clearInterval(performanceInterval)
    })
  })
  
  // ===============================
  // Public API
  // ===============================
  
  return {
    // Refs
    scrollContainer,
    messagesContainer,
    
    // Virtual scrolling
    virtualItems,
    totalHeight,
    visibleRange,
    virtualizedMessages,
    
    // Enterprise features
    performanceMetrics,
    messageShards,
    activeMessageShard,
    
    // Methods
    enterpriseScrollToBottom,
    smartScrollToMessage,
    loadMoreMessages,
    loadMessageShard,
    cleanupInactiveShards,
    measureRenderPerformance,
    
    // Virtual scroll methods
    scrollToItem,
    setMeasuredHeight,
    
    // State
    virtualScrollEnabled,
    renderBudget
  }
} 