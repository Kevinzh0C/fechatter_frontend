<template>
  <div ref="scrollContainer" class="simple-message-list">
    <!-- 🚀 ENHANCED: Progressive batch loading indicator -->
    <div v-if="loadingBatch" class="loading-indicator batch-loading">
      <div class="spinner"></div>
      <span>Loading batch {{ batchLoadCount }} ({{ maxBatchSize }} messages)...</span>
      <div class="batch-progress">
        <small>{{ loadingCooldown ? 'Cooldown active' : 'Ready for next batch' }}</small>
      </div>
    </div>
    <div v-else-if="isLoading" class="loading-indicator">
      <div class="spinner"></div>
      <span>Loading messages...</span>
    </div>

    <!-- Messages wrapper -->
    <div class="messages-wrapper">
      <div v-for="message in props.messages" :key="message.id" class="message-wrapper">
        <DiscordMessageItem :message="message" :current-user-id="currentUserId" />
      </div>
    </div>

    <!-- 🔧 FIXED: Simple scroll to bottom button -->
    <Transition name="fade">
      <button v-if="showScrollButton" @click="scrollToBottom" class="scroll-to-bottom-btn">
        ↓
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import DiscordMessageItem from '@/components/discord/DiscordMessageItem.vue';
// 🏆 UNIFIED SCROLL MANAGER INTEGRATION
import { unifiedScrollManager } from '@/utils/UnifiedScrollManager.js';

// Props
const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  chatId: {
    type: [Number, String],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasMoreMessages: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['load-more']);

// Refs
const scrollContainer = ref(null);
const authStore = useAuthStore();

// State - SIMPLIFIED with unified management
const isLoading = ref(false);
const showScrollButton = ref(false);
const loadingBatch = ref(false);
const batchLoadCount = ref(0);

// 🏆 UNIFIED SCROLL INSTANCE
let scrollInstance = null;

// Initialize unified scroll management
const initializeUnifiedScroll = () => {
  if (scrollContainer.value && props.chatId) {
    // Unregister previous instance if exists
    if (scrollInstance) {
      unifiedScrollManager.unregisterChat(props.chatId);
    }
    
    // Register with unified manager
    scrollInstance = unifiedScrollManager.registerChat(props.chatId, scrollContainer.value, {
      onLoadMore: async () => {
        // UNIFIED LOAD MORE HANDLING
        if (loadingBatch.value || !props.hasMoreMessages) return;
        
        loadingBatch.value = true;
        batchLoadCount.value += 1;
        
        console.log(`🏆 [SimpleMessageListFixed] Unified load more triggered (batch ${batchLoadCount.value})`);
        
        try {
          await emit('load-more', {
            mode: 'unified',
            batchSize: 15,
            batchNumber: batchLoadCount.value
          });
        } finally {
          setTimeout(() => {
            loadingBatch.value = false;
          }, 1000);
        }
      },
      nearBottomThreshold: 150,
      historyLoadThreshold: 200
    });
    
    console.log('🏆 [SimpleMessageListFixed] Unified scroll management initialized');
  }
};

// Scroll to bottom using unified manager
const scrollToBottom = (smooth = true) => {
  if (scrollInstance) {
    scrollInstance.scrollToBottom(smooth);
    showScrollButton.value = false;
  }
};

// UNIFIED: Replace complex message watcher with simple unified approach
watch(() => props.messages?.length, (newLength, oldLength) => {
  if (newLength > (oldLength || 0)) {
    nextTick(() => {
      if (scrollInstance) {
        const isInitialLoad = (oldLength || 0) === 0;
        
        if (isInitialLoad) {
          // Initial load - always scroll to bottom
          scrollInstance.scrollToBottom(false);
        } else {
          // New messages - unified manager handles the logic
          scrollInstance.handleNewMessage();
        }
      }
    });
  }
});

// Watch chat changes and reset state
watch(() => props.chatId, (newChatId, oldChatId) => {
  if (newChatId !== oldChatId) {
    // Reset loading states
    isLoading.value = false;
    loadingBatch.value = false;
    batchLoadCount.value = 0;
    showScrollButton.value = false;

    console.log(`🔄 [SimpleMessageListFixed] Reset state for new chat: ${newChatId}`);

    // Initialize unified scroll for new chat
    initializeUnifiedScroll();
  }
});

// Component lifecycle
onMounted(() => {
  // Initialize unified scroll management
  initializeUnifiedScroll();
});

onUnmounted(() => {
  // Cleanup unified scroll management
  if (scrollInstance && props.chatId) {
    unifiedScrollManager.unregisterChat(props.chatId);
  }
});

// Expose methods
defineExpose({
  scrollToBottom,
  isLoading: () => isLoading.value
});
</script>

<style scoped>
.simple-message-list {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #fdfcfa;
  position: relative;
  scroll-behavior: smooth;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #6b7280;
  font-size: 14px;
}

/* 🚀 NEW: Enhanced batch loading indicator */
.loading-indicator.batch-loading {
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  margin: 8px 16px;
}

.batch-progress {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.batch-progress small {
  opacity: 0.8;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.messages-wrapper {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem 2rem;
  min-height: 100vh;
}

.message-wrapper {
  margin-bottom: 8px;
  transition: background-color 0.15s ease;
  border-radius: 8px;
  padding: 4px 0;
}

.message-wrapper:hover {
  background-color: rgba(124, 58, 237, 0.02);
}

.scroll-to-bottom-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  z-index: 100;
  color: #6b7280;
  font-size: 18px;
  font-weight: bold;
}

.scroll-to-bottom-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #6366f1;
  color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* Scrollbar styling */
.simple-message-list::-webkit-scrollbar {
  width: 6px;
}

.simple-message-list::-webkit-scrollbar-track {
  background: transparent;
}

.simple-message-list::-webkit-scrollbar-thumb {
  background: rgba(124, 58, 237, 0.2);
  border-radius: 3px;
}

.simple-message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 58, 237, 0.35);
}

/* Responsive */
@media (max-width: 768px) {
  .messages-wrapper {
    padding: 1rem;
    max-width: 100%;
  }

  .scroll-to-bottom-btn {
    bottom: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .simple-message-list {
    scroll-behavior: auto;
  }

  .message-wrapper {
    transition: none;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>