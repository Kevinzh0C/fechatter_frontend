<template>
  <div class="enhanced-message-input">
    <!-- 回复消息预览 -->
    <div v-if="replyToMessage" class="reply-preview">
      <div class="reply-content">
        <div class="reply-header">
          <Icon name="reply" />
          <span>Replying to {{ replyToMessage.sender?.fullname }}</span>
          <button @click="cancelReply" class="cancel-reply">
            <Icon name="x" />
          </button>
        </div>
        <div class="reply-message">{{ truncateText(replyToMessage.content, 100) }}</div>
      </div>
    </div>

    <!-- 提及建议框 (只在群聊中显示) -->
    <Transition name="fade-slide" v-if="isGroupChat">
      <div v-if="mentions.hasSuggestions" class="mention-suggestions">
        <div class="suggestions-header">
          <Icon name="at-sign" />
          <span>Mention someone</span>
        </div>
        <div class="suggestions-list">
          <div
            v-for="(suggestion, index) in mentions.activeSuggestions"
            :key="`${suggestion.type}-${suggestion.username}`"
            :class="['suggestion-item', { active: index === selectedSuggestionIndex }]"
            @click="insertSuggestion(suggestion)"
          >
            <div class="suggestion-avatar">
              <img v-if="suggestion.avatar" :src="suggestion.avatar" :alt="suggestion.fullname" />
              <div v-else class="avatar-placeholder">
                {{ suggestion.type === 'user' ? suggestion.username?.charAt(0).toUpperCase() : suggestion.type.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div class="suggestion-info">
              <div class="suggestion-name">{{ suggestion.display }}</div>
              <div class="suggestion-desc">{{ suggestion.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 文件预览 -->
    <div v-if="files.length > 0" class="files-preview">
      <div class="files-header">
        <Icon name="paperclip" />
        <span>{{ files.length }} file(s) attached</span>
      </div>
      <div class="files-list">
        <FilePreview
          v-for="(file, index) in files"
          :key="file.id || index"
          :file="file"
          @remove="removeFile(index)"
        />
      </div>
    </div>

    <!-- 输入状态指示器 -->
    <div v-if="typingIndicator.hasTypingUsers" class="typing-indicator">
      <div class="typing-animation">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="typing-text">{{ typingIndicator.typingText }}</span>
    </div>

    <!-- 主输入区域 -->
    <div class="main-input-area">
      <!-- 文件上传按钮 -->
      <button @click="triggerFileUpload" class="input-btn file-btn" title="Attach file">
        <Icon name="paperclip" />
      </button>

      <!-- 输入容器 -->
      <div class="input-container">
        <textarea
          ref="messageInput"
          v-model="messageContent"
          @keydown="handleKeyDown"
          @input="handleInput"
          @paste="handlePaste"
          @focus="handleFocus"
          @blur="handleBlur"
          :placeholder="placeholderText"
          class="message-textarea"
          rows="1"
        ></textarea>
      </div>

      <!-- 表情按钮 -->
      <button @click="toggleEmojiPicker" class="input-btn emoji-btn" :class="{ active: showEmojiPicker }" title="Add emoji">
        <Icon name="smile" />
      </button>

      <!-- 发送按钮 -->
      <button
        @click="sendMessage"
        :disabled="!canSend"
        class="input-btn send-btn"
        :class="{
          'active': canSend,
          'sending': isSending
        }"
        title="Send message"
      >
        <Icon v-if="!isSending" name="send" />
        <div v-else class="loading-spinner"></div>
      </button>
    </div>

    <!-- 已读回执显示 (只在单聊中显示) -->
    <div v-if="showReadReceipts && lastSentMessageId && isDirectMessage" class="read-receipts">
      <div class="receipts-info">
        <Icon :name="readReceipts.getReceiptIcon(lastSentMessageId).value" />
        <span>{{ readReceipts.getReceiptStatus(lastSentMessageId).value.text }}</span>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" multiple @change="handleFileSelect" style="display: none">

    <!-- 表情选择器 -->
    <EmojiPicker v-if="showEmojiPicker" @emoji-selected="insertEmoji" @close="showEmojiPicker = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useTypingIndicator } from '@/composables/useTypingIndicator'
import { useReadReceipts } from '@/composables/useReadReceipts'
import { useMentions } from '@/composables/useMentions'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import Icon from '@/components/ui/Icon.vue'
import FilePreview from './FilePreview.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import type { ChatMessage, User } from '@/types/api'

// Props
interface Props {
  chatId: number | string
  currentUserId?: number
  replyToMessage?: ChatMessage | null
  disabled?: boolean
  maxLength?: number
  showReadReceipts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentUserId: 0,
  replyToMessage: null,
  disabled: false,
  maxLength: 2000,
  showReadReceipts: true
})

// Emits
const emit = defineEmits<{
  'message-sent': [message: ChatMessage]
  'reply-cancelled': []
  'typing-start': []
  'typing-stop': []
  'error': [error: string]
}>()

// Stores
const authStore = useAuthStore()
const chatStore = useChatStore()
const userStore = useUserStore()

// Refs
const messageInput = ref<HTMLTextAreaElement>()
const fileInput = ref<HTMLInputElement>()

// State
const messageContent = ref('')
const files = ref<File[]>([])
const isSending = ref(false)
const showEmojiPicker = ref(false)
const selectedSuggestionIndex = ref(0)
const lastSentMessageId = ref<number | null>(null)
const isComposing = ref(false)

// Composables
const numericChatId = computed(() => typeof props.chatId === 'string' ? parseInt(props.chatId, 10) : props.chatId)

// Get current chat and determine chat type
const currentChat = computed(() => chatStore.getChatById(numericChatId.value) as any)
const chatType = computed(() => currentChat.value?.chat_type || '')

// Determine if it's a direct message (single chat)
const isDirectMessage = computed(() => {
  return chatType.value === 'Single' || 
         chatType.value === 'DirectMessage' || 
         chatType.value === 'DM' ||
         chatType.value === 'direct_message' ||
         chatType.value === 'dm'
})

// Determine if it's a group chat (includes channels)
const isGroupChat = computed(() => {
  return chatType.value === 'Group' || 
         chatType.value === 'PublicChannel' || 
         chatType.value === 'PrivateChannel' ||
         chatType.value === 'public_channel' ||
         chatType.value === 'private_channel' ||
         chatType.value === 'channel'
})

// Always initialize composables, but only use them conditionally
const typingIndicator = useTypingIndicator(numericChatId.value)
const readReceipts = useReadReceipts()

// Get available users for mentions (only for group chats)
const availableUsers = computed(() => {
  if (!isGroupChat.value) return []
  const chat = currentChat.value
  if (!chat?.chat_members) return []
  
  return chat.chat_members.map((userId: number) => userStore.getUserById(userId)).filter(Boolean) as User[]
})

const mentions = useMentions(availableUsers.value)

// Computed
const canSend = computed(() => {
  const hasContent = messageContent.value.trim().length > 0
  const hasFiles = files.value.length > 0
  const notSending = !isSending.value
  const notDisabled = !props.disabled
  
  return (hasContent || hasFiles) && notSending && notDisabled
})

const placeholderText = computed(() => {
  if (props.replyToMessage) {
    return `Reply to ${props.replyToMessage.sender?.fullname || 'someone'}...`
  }
  if (files.value.length > 0) {
    return 'Add a caption or send files...'
  }
  return 'Type a message...'
})

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value
  
  // Auto-resize textarea
  autoResizeTextarea()
  
  // Handle typing indicator (only for direct messages)
  if (isDirectMessage.value && typingIndicator) {
    if (value.trim() && !isComposing.value) {
      typingIndicator.handleInput()
      emit('typing-start')
    } else if (!value.trim() && typingIndicator.isCurrentUserTyping.value) {
      typingIndicator.stopTyping()
      emit('typing-stop')
    }
  }
  
  // Handle mentions (only for group chats)
  if (isGroupChat.value && mentions) {
    const cursorPosition = target.selectionStart || 0
    mentions.handleTextInput(value, cursorPosition)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLTextAreaElement
  
  // Handle mention suggestions (only for group chats)
  if (isGroupChat.value && mentions && mentions.hasSuggestions.value) {
    const result = mentions.handleKeyDown(event, messageContent.value, target.selectionStart || 0)
    if (result && typeof result === 'object' && 'text' in result) {
      messageContent.value = result.text
      nextTick(() => {
        if (messageInput.value) {
          messageInput.value.setSelectionRange(result.cursorPosition, result.cursorPosition)
        }
      })
      return
    }
    if (result === true) return // Event was handled
  }
  
  // Handle send on Enter (without Shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (canSend.value) {
      sendMessage()
    }
  }
  
  // Handle composition events for IME
  if (event.key === 'Process') {
    isComposing.value = true
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const handleFocus = () => {
  // Mark messages as read when user focuses on input (only for direct messages)
  if (props.showReadReceipts && numericChatId.value && isDirectMessage.value && readReceipts) {
    markVisibleMessagesAsRead()
  }
}

const handleBlur = () => {
  // Stop typing when input loses focus (only for direct messages)
  if (isDirectMessage.value && typingIndicator && typingIndicator.isCurrentUserTyping.value) {
    typingIndicator.stopTyping()
    emit('typing-stop')
  }
}

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        files.value.push(file)
      }
    }
  }
}

const autoResizeTextarea = () => {
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.style.height = 'auto'
      messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
    }
  })
}

const sendMessage = async () => {
  if (!canSend.value) return
  
  isSending.value = true
  
  try {
    // Stop typing (only for direct messages)
    if (isDirectMessage.value && typingIndicator && typingIndicator.isCurrentUserTyping.value) {
      typingIndicator.stopTyping()
      emit('typing-stop')
    }
    
    // Extract mentions from content (only for group chats)
    let mentionUserIds: number[] = []
    if (isGroupChat.value && mentions) {
      const extractedMentions = mentions.extractMentions(messageContent.value)
      mentionUserIds = extractedMentions
        .filter((m: any) => m.type === 'user')
        .map((m: any) => {
          const user = availableUsers.value.find((u: User) => u.email?.split('@')[0] === m.username)
          return user?.id
        })
        .filter(Boolean) as number[]
    }
    
    // Send message
    const result = await chatStore.sendMessage(messageContent.value.trim(), {
      chatId: numericChatId.value,
      replyTo: props.replyToMessage?.id as number,
      mentions: mentionUserIds.length > 0 ? mentionUserIds : undefined,
      files: files.value.length > 0 ? files.value : undefined
    })
    
    if (result && result.message) {
      const sentMessage = result.message
      lastSentMessageId.value = sentMessage.id as number
      emit('message-sent', sentMessage as ChatMessage)
      
      // Clear input
      messageContent.value = ''
      files.value = []
      
      // Cancel reply if exists
      if (props.replyToMessage) {
        emit('reply-cancelled')
      }
      
      // Reset textarea height
      autoResizeTextarea()
    }
    
  } catch (error: any) {
    console.error('[EnhancedMessageInput] Send message failed:', error)
    emit('error', error.message || 'Failed to send message')
  } finally {
    isSending.value = false
  }
}

const cancelReply = () => {
  emit('reply-cancelled')
}

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const selectedFiles = Array.from(target.files || [])
  files.value.push(...selectedFiles)
  
  // Clear input for future selections
  if (target) target.value = ''
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
}

const insertEmoji = (emoji: string) => {
  const cursorPosition = messageInput.value?.selectionStart || messageContent.value.length
  const before = messageContent.value.substring(0, cursorPosition)
  const after = messageContent.value.substring(cursorPosition)
  
  messageContent.value = before + emoji + after
  
  nextTick(() => {
    if (messageInput.value) {
      const newPosition = cursorPosition + emoji.length
      messageInput.value.setSelectionRange(newPosition, newPosition)
      messageInput.value.focus()
    }
  })
  
  showEmojiPicker.value = false
}

const insertSuggestion = (suggestion: any) => {
  if (!messageInput.value || !mentions) return
  
  const cursorPosition = messageInput.value.selectionStart || 0
  const result = mentions.insertMention(messageContent.value, cursorPosition, suggestion)
  
  messageContent.value = result.text
  
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.setSelectionRange(result.cursorPosition, result.cursorPosition)
      messageInput.value.focus()
    }
  })
}

const markVisibleMessagesAsRead = async () => {
  if (!readReceipts) return
  
  try {
    const visibleMessages = chatStore.messages
      .filter(m => m.sender_id !== authStore.user?.id)
      .slice(-10) // Last 10 messages
    
    if (visibleMessages.length > 0) {
      const messageIds = visibleMessages.map(m => m.id as number)
      await readReceipts.markMultipleMessagesRead(numericChatId.value, messageIds)
    }
  } catch (error) {
    console.warn('[EnhancedMessageInput] Mark messages as read failed:', error)
  }
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Lifecycle
onMounted(() => {
  if (messageInput.value) {
    messageInput.value.addEventListener('compositionstart', handleCompositionStart)
    messageInput.value.addEventListener('compositionend', handleCompositionEnd)
  }
})

onUnmounted(() => {
  if (messageInput.value) {
    messageInput.value.removeEventListener('compositionstart', handleCompositionStart)
    messageInput.value.removeEventListener('compositionend', handleCompositionEnd)
  }
  
  // Stop typing when component unmounts (only for direct messages)
  if (isDirectMessage.value && typingIndicator && typingIndicator.isCurrentUserTyping.value) {
    typingIndicator.stopTyping()
  }
})

// Watch for chat changes
watch(() => numericChatId.value, () => {
  messageContent.value = ''
  files.value = []
  lastSentMessageId.value = null
  if (mentions) {
    mentions.clearMentionContext()
  }
})
</script>

<style scoped>
.enhanced-message-input {
  position: relative;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Reply Preview */
.reply-preview {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
}

.reply-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.cancel-reply {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.cancel-reply:hover {
  background: var(--color-background-muted);
}

.reply-message {
  font-size: 13px;
  color: var(--color-text-soft);
  font-style: italic;
}

/* Mention Suggestions */
.mention-suggestions {
  position: absolute;
  bottom: 100%;
  left: 16px;
  right: 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow: hidden;
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.suggestions-list {
  max-height: 160px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: var(--color-background-soft);
}

.suggestion-avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.suggestion-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.suggestion-info {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-weight: 500;
  color: var(--color-text);
}

.suggestion-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Files Preview */
.files-preview {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
}

.files-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 16px;
  font-size: 13px;
  color: var(--color-text-muted);
  align-self: flex-start;
}

.typing-animation {
  display: flex;
  gap: 2px;
}

.typing-animation span {
  width: 4px;
  height: 4px;
  background: var(--color-text-muted);
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(1) { animation-delay: 0s; }
.typing-animation span:nth-child(2) { animation-delay: 0.2s; }
.typing-animation span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Main Input Area */
.main-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.input-btn:hover {
  background: var(--color-background-muted);
  border-color: var(--color-border-hover);
  color: var(--color-text);
}

.input-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-btn.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.send-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.send-btn.sending {
  background: var(--color-primary-soft);
  cursor: not-allowed;
}

.input-container {
  flex: 1;
}

.message-textarea {
  width: 100%;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.message-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}

.message-textarea::placeholder {
  color: var(--color-text-muted);
}

/* Read Receipts */
.read-receipts {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0;
}

.receipts-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .enhanced-message-input {
    padding: 12px;
    gap: 8px;
  }
  
  .input-btn {
    width: 36px;
    height: 36px;
  }
  
  .mention-suggestions {
    left: 12px;
    right: 12px;
  }
}
</style> 