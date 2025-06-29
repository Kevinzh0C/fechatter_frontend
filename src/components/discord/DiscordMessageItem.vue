<template>
  <div class="group relative flex items-start py-2 px-4 transition-all duration-200 hover:bg-gray-50/50 message-item"
    :class="messageClasses" :data-message-id="message.id || message.temp_id" @contextmenu="handleRightClick"
    @click.right="handleRightClick" @mouseenter="handleShowFloatingToolbar" @mouseleave="handleHideFloatingToolbar"
    ref="messageElementRef">
    <!-- Debug Data Panel (Development Only) -->
    <div v-if="showDebugData && isDevelopment"
      class="absolute top-0 right-0 z-40 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs shadow-lg max-w-md"
      style="transform: translateY(-100%);">
      <div class="font-bold text-yellow-800 mb-2">🔍 数据传输断点诊断</div>
      <div class="space-y-1 text-yellow-700">
        <div><strong>Message ID:</strong> {{ message.id || message.temp_id }}</div>
        <div><strong>Sender ID:</strong> {{ message.sender_id }}</div>
        <div><strong>Raw sender_name:</strong> {{ message.sender_name || 'null' }}</div>
        <div><strong>Raw sender.fullname:</strong> {{ message.sender?.fullname || 'null' }}</div>
        <div><strong>Raw sender.username:</strong> {{ message.sender?.username || 'null' }}</div>
        <div><strong>Computed senderName:</strong> {{ senderName }}</div>
        <div><strong>Avatar URL:</strong> {{ senderAvatar || 'null' }}</div>
        <div class="mt-2 pt-2 border-t border-yellow-300">
          <strong>Raw Message Object:</strong>
          <pre
            class="text-xs mt-1 p-1 bg-yellow-100 rounded overflow-auto max-h-20">{{ JSON.stringify(message, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Avatar -->
    <div class="relative mr-3 mt-0.5 flex-shrink-0">
      <button type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-white font-semibold text-sm shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        :style="{ background: avatarGradient }" @click="handleAvatarClick" @dblclick="toggleDebugData">
        <img v-if="senderAvatar" :src="senderAvatar" :alt="senderName" class="h-full w-full rounded-full object-cover"
          @error="onAvatarError" />
        <span v-else class="text-white font-bold text-xs select-none">
          {{ senderInitials }}
        </span>
      </button>

      <!-- Online Status Indicator -->
      <div v-if="senderOnlineStatus === 'online'"
        class="absolute -bottom-0.5 -right-0.5 bg-green-400 rounded-full w-2.5 h-2.5 border-2 border-white">
      </div>
    </div>

    <!-- Message Content Container - 🎯 OPTIMIZED: Limited width for modern chat layout -->
    <div class="min-w-0 flex-1 max-w-[calc(100%-4rem)]">
      <!-- Message Header -->
      <div class="flex items-baseline space-x-2 mb-1">
        <button type="button"
          class="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-150 focus:outline-none focus:text-blue-600 text-sm leading-4 username-button"
          @click="handleUsernameClick" :title="`原始数据: ${JSON.stringify({
            sender_name: message.sender_name,
            fullname: message.sender?.fullname,
            username: message.sender?.username
          })}`">
          {{ senderName }}
        </button>

        <time
          class="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-medium"
          :datetime="message.created_at" :title="fullTimestamp">
          {{ formatTimestamp(message.created_at) }}
        </time>

        <span v-if="isEdited" class="text-xs text-gray-400 italic" title="This message has been edited">
          (edited)
        </span>

        <!-- Message Status -->
        <div v-if="isCurrentUserMessage" class="flex items-center ml-auto message-status-container">
          <!-- ✅ Green checkmark: delivered or confirmed via SSE -->
          <CheckIcon v-if="message.status === 'delivered' || message.status === 'read' || message.confirmed_via_sse"
            class="h-4 w-4 text-green-500 message-status-delivered" />
          <!-- ⏰ Blue clock: waiting for confirmation -->
          <ClockIcon v-else-if="message.status === 'sending' || message.status === 'sent'"
            class="h-4 w-4 text-blue-400 animate-pulse message-status-pending" title="等待送达确认..." />
          <!-- ❌ Red error: failed messages with retry counter -->
          <div v-else-if="message.status === 'failed' || message.status === 'timeout'"
            class="flex items-center space-x-1 cursor-pointer hover:bg-red-50 rounded px-1 py-0.5 transition-colors message-status-failed"
            @click="retryMessage" :title="getRetryTooltip()">
            <ExclamationTriangleIcon class="h-4 w-4 text-red-500" />
            <span v-if="message.retryAttempts > 0" class="text-xs text-red-600 font-medium">
              {{ message.retryAttempts }}/{{ message.maxRetryAttempts || 3 }}
            </span>
          </div>
          <!-- Debug info removed for clean UI -->
        </div>
      </div>

      <!-- Reply Reference -->
      <div v-if="message.reply_to"
        class="mb-2 flex items-center space-x-2 rounded-lg bg-gray-50 p-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors duration-150 max-w-lg"
        @click="scrollToReplyMessage">
        <ArrowUturnLeftIcon class="h-4 w-4 text-gray-400" />
        <img v-if="replyToAvatar" :src="replyToAvatar" :alt="replyToUsername" class="h-4 w-4 rounded-full" />
        <span class="font-medium text-gray-700">{{ replyToUsername }}</span>
        <span class="text-gray-500 truncate">{{ truncatedReplyContent }}</span>
      </div>

      <!-- 🎯 OPTIMIZED: Message Content with width constraints -->
      <div class="message-content-wrapper max-w-3xl" @dblclick="startEdit">
        <!-- ✨ 代码高亮加载状态 -->
        <div v-if="isHighlightingCode" class="code-highlighting-indicator">
          <div class="highlighting-spinner"></div>
          <span>Highlighting code...</span>
        </div>

        <!-- ✨ 代码高亮错误状态 -->
        <div v-else-if="highlightError" class="code-highlight-error">
          <span>⚠️ Code highlighting failed: {{ highlightError }}</span>
          <button @click="highlightCodeInContent" class="retry-highlight-btn">Retry</button>
        </div>

        <!-- ✨ 正常内容显示 -->
        <div v-else class="content-wrapper" v-html="renderedContent"></div>

        <!-- 🚀 CRITICAL FIX: File Attachments Display -->
        <div v-if="message.files && message.files.length > 0" class="message-files">
          <div v-for="file in message.files" :key="file.id || getFileUrl(file) || 'unknown'" class="file-attachment">
            


            <!-- Image Preview -->
            <div v-if="isImageFile(file)" class="image-attachment">

              
              <!-- Secure Image Loading -->
              <div v-if="loadingImages[file.id || getFileUrl(file)]" class="image-loading">
                <div class="loading-spinner"></div>
                <span class="loading-text">Loading image...</span>
              </div>
              <div v-else-if="imageErrors[file.id || getFileUrl(file)]" class="image-error" 
                   :class="{ 'permanent-error': imageErrors[file.id || getFileUrl(file)] === 'permanent' }">
                <div class="error-icon">
                  <span v-if="imageErrors[file.id || getFileUrl(file)] === 'permanent'">🚫</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'auth'">🔐</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'timeout'">⏱️</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'server'">🛠️</span>
                  <span v-else>📷</span>
                </div>
                <span class="error-text">
                  <span v-if="imageErrors[file.id || getFileUrl(file)] === 'permanent'">File not available</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'auth'">Authentication required</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'timeout'">Load timeout</span>
                  <span v-else-if="imageErrors[file.id || getFileUrl(file)] === 'server'">Server error</span>
                  <span v-else>Failed to load image</span>
                </span>
                <div class="error-details">{{ getFileName(file) || getFileUrl(file) }}</div>
                <div v-if="imageErrors[file.id || getFileUrl(file)] === 'permanent'" class="error-hint">
                  This file may have been deleted or moved
                </div>
                
                <!-- 🚀 NEW: Retry button for non-permanent errors -->
                <button 
                  v-if="imageErrors[file.id || getFileUrl(file)] !== 'permanent'"
                  @click="retryLoadImage(file)" 
                  class="retry-image-btn">
                  Try Again
                </button>
              </div>
              <img v-else :src="getSecureImageUrl(file)" :alt="getFileName(file)" class="attachment-image"
                @load="onImageLoad(file)" @error="onImageError(file)" @click="openImagePreview(file)" loading="lazy" />
              <div class="image-overlay">
                <button @click.stop="downloadFile(file)" class="download-btn" title="Download">
                  <ArrowDownTrayIcon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Generic File Preview -->
            <div v-else class="generic-file-attachment">
              <div class="file-icon">
                <DocumentIcon class="h-6 w-6 text-gray-500" />
              </div>
              <div class="file-info">
                <div class="file-name" :title="getFileName(file)">{{ getFileName(file) }}</div>
                <div class="file-meta">
                  <span v-if="file.file_size || file.size" class="file-size">{{ formatFileSize(file.file_size ||
                    file.size) }}</span>
                  <span v-if="getFileExtension(file)" class="file-ext">{{ getFileExtension(file) }}</span>
                </div>
              </div>
              <button @click="downloadFile(file)" class="download-btn" title="Download">
                <ArrowDownTrayIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Message Toolbar - 完善版本 -->
    <FloatingMessageToolbar :message="message" :is-visible="showFloatingToolbar" :can-edit="canEdit"
      :can-delete="canDelete" @reply="handleReplyToMessage" @translate="handleTranslateMessage" @edit="startEdit"
      @delete="deleteMessage" @more-options="handleRightClick" @hide="handleToolbarHide"
      @keep-visible="keepFloatingToolbar" />

    <!-- Context Menu - 悬浮菜单，不影响消息布局 -->
    <Teleport to="body">
      <Menu v-if="showContextMenu" as="div" class="fixed z-[9999] context-menu" :style="contextMenuStyle">
        <MenuButton class="sr-only">Options</MenuButton>
        <transition enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-100 ease-in" leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0">
          <MenuItems
            class="origin-top-left rounded-lg bg-white py-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none min-w-48 border border-gray-200 backdrop-blur-sm transform-gpu"
            style="transform-origin: top left;">
            <MenuItem v-if="canEdit" v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              @click="startEdit">
              <PencilIcon class="mr-3 h-4 w-4" />
              Edit message
            </button>
            </MenuItem>

            <MenuItem v-if="canDelete" v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors duration-150"
              @click="deleteMessage">
              <TrashIcon class="mr-3 h-4 w-4" />
              Delete message
            </button>
            </MenuItem>

            <MenuItem v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              @click="handleReplyToMessage">
              <ArrowUturnLeftIcon class="mr-3 h-4 w-4" />
              Reply
            </button>
            </MenuItem>

            <MenuItem v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              @click="translateMessage">
              <LanguageIcon class="mr-3 h-4 w-4" />
              Translate
            </button>
            </MenuItem>

            <MenuItem v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              @click="copyMessage">
              <ClipboardDocumentIcon class="mr-3 h-4 w-4" />
              Copy message
            </button>
            </MenuItem>

            <!-- Debug Menu Item -->
            <MenuItem v-if="isDevelopment" v-slot="{ active }">
            <button type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors duration-150"
              @click="logMessageData">
              <svg class="mr-3 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Debug Data
            </button>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
    </Teleport>

    <!-- Image Preview Modal -->
    <!-- Enhanced Image Modal -->
    <EnhancedImageModal ref="imageModal" :images="previewImages" :initial-index="currentImageIndex"
      @close="closeImagePreview" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useVirtualList } from '@vueuse/core'
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import {
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
  PhotoIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  LanguageIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { formatTimestamp, formatFileSize } from '@/utils/formatters'
import { renderMarkdown } from '@/utils/markdown'
import { highlightCodeAsync } from '@/utils/codeHighlight'
import FloatingMessageToolbar from '@/components/chat/FloatingMessageToolbar.vue'
import api from '@/services/api'
import EnhancedImageModal from '@/components/common/EnhancedImageModal.vue'
import { getStandardFileUrl, buildAuthFileUrl } from '@/utils/fileUrlHandler'

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  currentUserId: {
    type: Number,
    required: false,
    default: 0
  },
  chatId: {
    type: [Number, String],
    default: null
  },
  isGrouped: {
    type: Boolean,
    default: false
  },
  isConsecutive: {
    type: Boolean,
    default: false
  },
  previousMessage: {
    type: Object,
    default: null
  },
  showDebugData: {
    type: Boolean,
    default: false
  },
  isDevelopment: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits([
  'user-profile-opened',
  'dm-created',
  'reply-to',
  'edit-message',
  'delete-message',
  'scroll-to-message'
])

// Stores
const authStore = useAuthStore()
const chatStore = useChatStore()

// Reactive data
const imageLoaded = ref({})
const loadingImages = ref({})
const imageErrors = ref({})
const secureImageUrls = ref({})
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const showActions = ref(false)
const showImagePreview = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')
const avatarError = ref(false)
const showDebugData = ref(false)
const messageElementRef = ref(null)
const showFloatingToolbar = ref(false)
const floatingToolbar = ref(null)
const toolbarHovered = ref(false)

// ✨ Enhanced Image Modal State
const imageModal = ref(null)
const previewImages = ref([])
const currentImageIndex = ref(0)

// ✨ Enhanced Code Highlighting State
const highlightedContent = ref('')
const isHighlightingCode = ref(false)
const highlightError = ref(null)

// Development mode detection
const isDevelopment = computed(() => {
  return true || 'development' === 'development'
})

// Safe content extraction function for reuse
const extractSafeMessageContent = () => {
  const rawContent = props.message.content

  if (!rawContent) {
    return ''
  }

  // If it's already a string, check for object serialization issues
  if (typeof rawContent === 'string') {
    if (rawContent.includes('[object Object]')) {
      console.error('Message content serialization error for message:', props.message.id)
      return 'Message content error - please refresh'
    }
    
    // 🔧 BACKEND ALIGNED: Handle auto-generated space for file-only messages
    if (rawContent === ' ' && props.message.files && props.message.files.length > 0) {
      return '' // 显示时忽略自动添加的空格，让文件本身承载信息
    }
    
    return rawContent
  }

  // If it's an object, extract content safely
  if (typeof rawContent === 'object' && rawContent !== null) {
    const extracted = rawContent.text ||
      rawContent.content ||
      rawContent.message ||
      rawContent.body ||
      rawContent.data ||
      // Handle array content
      (Array.isArray(rawContent) ? rawContent.join(' ') : null)

    if (extracted && typeof extracted === 'string') {
      return extracted
    }

    // Last resort: safe JSON stringify
    try {
      return JSON.stringify(rawContent, null, 2)
    } catch (e) {
      console.error('Content extraction failed for message:', props.message.id, e)
      return `Complex object content - ID: ${props.message.id}`
    }
  }

  // Convert any other type to string
  return String(rawContent)
}

// Modern professional color palette
const AVATAR_COLORS = [
  ['#3B82F6', '#8B5CF6'], // Blue to Purple  
  ['#10B981', '#06B6D4'], // Green to Teal
  ['#8B5CF6', '#EC4899'], // Purple to Pink
  ['#EF4444', '#F97316'], // Red to Orange
  ['#F59E0B', '#EAB308'], // Orange to Yellow
  ['#06B6D4', '#0EA5E9'], // Teal to Sky
  ['#EC4899', '#F43F5E'], // Pink to Rose
  ['#6366F1', '#3B82F6'], // Indigo to Blue
]

// Computed properties
const isCurrentUserMessage = computed(() => {
  return props.message.sender_id === props.currentUserId ||
    props.message.sender_id === authStore.user?.id
})

const messageClasses = computed(() => ({
  'bg-blue-50/30': isCurrentUserMessage.value,
  'border-l-2 border-blue-400': isCurrentUserMessage.value,
}))

// Enhanced username detection with source tracking
const senderName = computed(() => {
  let name = 'Unknown User'
  let source = 'fallback'

  // 🚀 CRITICAL FIX: Ensure all name sources are strings, not objects
  const safeString = (value) => {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      // If it's an object, try to extract a meaningful string
      return value.name || value.fullname || value.username || JSON.stringify(value)
    }
    return String(value)
  }

  if (props.message.sender?.fullname) {
    name = safeString(props.message.sender.fullname)
    source = 'sender.fullname'
  } else if (props.message.sender_name) {
    name = safeString(props.message.sender_name)
    source = 'sender_name'
  } else if (props.message.sender?.username) {
    name = safeString(props.message.sender.username)
    source = 'sender.username'
  } else if (props.message.sender?.name) {
    name = safeString(props.message.sender.name)
    source = 'sender.name'
  }

  // 🔧 FINAL SAFETY CHECK: Ensure result is always a string
  if (typeof name !== 'string' || !name || name === 'null' || name === 'undefined') {
    name = 'Unknown User'
  }



  return name
})

// Username source tracking removed for production

const senderInitials = computed(() => {
  const name = senderName.value
  if (name === 'Unknown User') return 'U'

  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

const senderAvatar = computed(() => {
  if (avatarError.value) return null
  return props.message.sender?.avatar_url ||
    props.message.sender_avatar
})

const avatarGradient = computed(() => {
  const userId = props.message.sender_id || senderName.value
  const hash = String(userId).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const index = Math.abs(hash) % AVATAR_COLORS.length
  const colors = AVATAR_COLORS[index]
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
})

const senderOnlineStatus = computed(() => {
  // TODO: Implement real online status
  return props.message.sender?.is_online ? 'online' : 'offline'
})

const fullTimestamp = computed(() => {
  if (!props.message.created_at) return 'Invalid date'

  const date = new Date(props.message.created_at)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  // 基础时间格式：精确到分钟
  const dateString = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  })

  const timeString = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  // 相对时间信息
  let relativeTime = ''
  if (diffInMinutes < 1) {
    relativeTime = '刚刚'
  } else if (diffInMinutes < 60) {
    relativeTime = `${diffInMinutes}分钟前`
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60)
    const remainingMinutes = diffInMinutes % 60
    relativeTime = remainingMinutes > 0
      ? `${hours}小时${remainingMinutes}分钟前`
      : `${hours}小时前`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    relativeTime = `${days}天前`
  }

  return `${dateString} ${timeString} (${relativeTime})`
})

const isEdited = computed(() => {
  return props.message.updated_at &&
    props.message.updated_at !== props.message.created_at
})

const canEdit = computed(() => {
  return isCurrentUserMessage.value &&
    props.message.status !== 'failed'
})

const canDelete = computed(() => {
  return isCurrentUserMessage.value
})

// 🚀 NEW: Get retry tooltip based on message status and attempts
const getRetryTooltip = () => {
  if (!props.message) return ''

  const attempts = props.message.retryAttempts || 0
  const maxAttempts = props.message.maxRetryAttempts || 3

  if (props.message.status === 'timeout') {
    if (attempts >= maxAttempts) {
      return `Message delivery timeout after ${attempts} attempts - click to retry manually`
    } else {
      return `SSE confirmation timeout (attempt ${attempts}/${maxAttempts}) - click to retry`
    }
  } else if (props.message.status === 'failed') {
    if (attempts >= maxAttempts) {
      return `Message sending failed after ${attempts} attempts - click to retry manually`
    } else {
      return `Message sending failed (attempt ${attempts}/${maxAttempts}) - click to retry`
    }
  }

  return 'Click to retry message'
}

const renderedContent = computed(() => {
  const safeContent = extractSafeMessageContent()

  if (highlightedContent.value) {
    return highlightedContent.value
  }

  // Fallback to basic markdown rendering with safe string content
  return renderMarkdown(safeContent)
})

const contextMenuStyle = computed(() => ({
  left: `${contextMenuPosition.value.x}px`,
  top: `${contextMenuPosition.value.y}px`,
}))

// Reply-related computed properties
const replyToMessage = computed(() => {
  if (!props.message.reply_to) return null
  return chatStore.getMessageById(props.message.reply_to)
})

const replyToUsername = computed(() => {
  if (!replyToMessage.value) return ''
  return replyToMessage.value.sender?.fullname ||
    replyToMessage.value.sender_name ||
    'Unknown User'
})

const replyToAvatar = computed(() => {
  if (!replyToMessage.value) return null
  return replyToMessage.value.sender?.avatar_url ||
    replyToMessage.value.sender_avatar ||
    null
})

const truncatedReplyContent = computed(() => {
  if (!replyToMessage.value?.content) return 'Click to see message'
  const content = replyToMessage.value.content
  return content.length > 50 ? content.substring(0, 50) + '...' : content
})

// Methods
const onAvatarError = () => {
  avatarError.value = true
}

const handleAvatarClick = () => {
  if (props.message.sender) {
    emit('user-profile-opened', props.message.sender)
  }
}

const handleUsernameClick = () => {
  handleAvatarClick()
}

// Floating toolbar methods - 简化版本
const handleShowFloatingToolbar = () => {
  showFloatingToolbar.value = true
}

const handleHideFloatingToolbar = () => {
  // 延迟隐藏，给用户时间移动到工具栏上
  setTimeout(() => {
    if (!toolbarHovered.value) {
      showFloatingToolbar.value = false
    }
  }, 150)
}

const keepFloatingToolbar = () => {
  toolbarHovered.value = true
}

const handleToolbarHide = () => {
  toolbarHovered.value = false
  showFloatingToolbar.value = false
}

const handleRightClick = (event) => {
  event.preventDefault()
  event.stopPropagation()



  // 获取菜单预估尺寸
  const menuWidth = 200
  const menuHeight = 280 // 增加高度以适应更多菜单项

  // 获取视口尺寸
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // 计算基础位置 - 使用鼠标点击位置
  let x = event.clientX
  let y = event.clientY

  // 智能水平定位：优先显示在右侧，空间不足时显示在左侧
  if (x + menuWidth > viewportWidth - 20) {
    x = Math.max(20, x - menuWidth) // 显示在鼠标左侧
  } else {
    x = x + 5 // 显示在鼠标右侧，稍微偏移避免遮挡
  }

  // 智能垂直定位：优先显示在下方，空间不足时显示在上方
  if (y + menuHeight > viewportHeight - 20) {
    y = Math.max(20, y - menuHeight) // 显示在鼠标上方
  } else {
    y = y + 5 // 显示在鼠标下方，稍微偏移
  }

  // 最终边界检查
  x = Math.max(20, Math.min(x, viewportWidth - menuWidth - 20))
  y = Math.max(20, Math.min(y, viewportHeight - menuHeight - 20))



  contextMenuPosition.value = { x, y }
  showContextMenu.value = true


}

// 🚀 ADDED: Retry message function for failed/timeout messages
const retryMessage = async () => {
  if (!props.message || !['failed', 'timeout'].includes(props.message.status)) {
    console.warn('Cannot retry message - invalid status:', props.message.status)
    return
  }

  try {
    console.log('🔄 Retrying message:', props.message.id)
    
    // Mark message as sending
    props.message.status = 'sending'
    props.message.retryAttempts = (props.message.retryAttempts || 0) + 1
    
    // Use chat store to retry sending
    await chatStore.retryMessageSend(props.message)
    
    console.log('✅ Message retry initiated successfully')
  } catch (error) {
    console.error('❌ Failed to retry message:', error)
    
    // Mark as failed again if retry fails
    props.message.status = 'failed'
    props.message.error = error.message
  }
}

const closeContextMenu = () => {
  showContextMenu.value = false
}

// 处理点击外部关闭菜单
const handleClickOutside = (event) => {
  if (showContextMenu.value) {
    // 检查点击是否在菜单内部
    const menuElement = document.querySelector('.context-menu')
    if (menuElement && !menuElement.contains(event.target)) {
      closeContextMenu()
    }
  }
}

// 处理ESC键关闭菜单
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && showContextMenu.value) {
    closeContextMenu()
  }
}

const handleImageLoad = (fileId) => {
  imageLoaded.value[fileId] = true
}

const handleImageError = (fileId) => {
  imageLoaded.value[fileId] = false
}

const openImagePreview = (file) => {
  // 🖼️ Enhanced Image Modal: Prepare all images with multi-source loading strategy
  const messageImages = (props.message.files || [])
    .filter(f => isImageFile(f))
    .map(f => {
      // 🔧 CRITICAL FIX: Multi-source loading strategy
      const secureUrl = getSecureImageUrl(f)
      const apiUrl = getFileUrl(f)

      return {
        // 🌟 CRITICAL FIX: Always use API URL as primary - modal will handle authentication
        url: apiUrl,
        // 🔄 OPTIMIZATION: Provide secure URL if already cached for faster loading
        secureUrl: secureUrl || null,
        filename: getFileName(f),
        size: f.file_size || f.size,
        width: f.width,
        height: f.height,
        original: f
      }
    })
    .filter(img => img.url) // Only include images with valid URLs

  if (messageImages.length === 0) {
    console.warn('No valid images found in message')
    return
  }

  // Find the index of the clicked image
  const clickedImageIndex = messageImages.findIndex(img => {
    const clickedApiUrl = getFileUrl(file)
    return img.url === clickedApiUrl
  })

  previewImages.value = messageImages
  currentImageIndex.value = Math.max(0, clickedImageIndex)



  // Use the enhanced modal
  if (imageModal.value) {
    imageModal.value.open(currentImageIndex.value)
  }
}

const closeImagePreview = () => {
  if (imageModal.value) {
    imageModal.value.close()
  }
  showImagePreview.value = false
}

// 🚀 ROBUST: File handling utilities with enhanced test data detection
const getFileUrl = (file) => {
  // Skip URL generation for test/mock files
  if (file && (file.url === 'test-file.txt' || file.filename === 'test-file.txt' || 
      (file.filename && file.filename.startsWith('test-')))) {
    return null;
  }
  
  // Use standard file URL handler with flat storage support
  const staticUrl = getStandardFileUrl(file, {
    workspaceId: props.message?.workspace_id || props.workspaceId,
    preferAuth: false
  })
  
  // Return static URL for initial attempt
  return staticUrl
}

// 🔐 SECURE: Get image URL with API download + cache strategy
const getSecureImageUrl = (file) => {
  const apiUrl = getFileUrl(file)
  const fileKey = file.id || apiUrl || 'unknown'

  if (import.meta.env.DEV) {
    console.log('🔍 [getSecureImageUrl] Processing file for API download:', {
      file,
      apiUrl,
      fileKey,
      hasCached: !!secureImageUrls.value[fileKey]
    });
  }

  // Return cached blob URL if available
  if (secureImageUrls.value[fileKey]) {
      if (import.meta.env.DEV) {
    console.log('✅ [getSecureImageUrl] Returning cached blob URL');
  }
    return secureImageUrls.value[fileKey]
  }

  // Check sessionStorage cache for page refresh persistence
  try {
    const cachedData = sessionStorage.getItem(`cached_image_${fileKey}`);
    if (cachedData) {
      console.log('📦 [getSecureImageUrl] Found sessionStorage cache, converting to blob URL');
      // Convert data URL back to blob URL for consistency
      fetch(cachedData)
        .then(res => res.blob())
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          secureImageUrls.value[fileKey] = objectUrl;
        })
        .catch(err => console.warn('⚠️ [getSecureImageUrl] Cache conversion failed:', err));
      
      // Return cached data URL immediately while blob conversion happens in background
      return cachedData;
    }
  } catch (cacheError) {
    console.warn('⚠️ [getSecureImageUrl] SessionStorage access failed:', cacheError.message);
  }

  if (!apiUrl) {
    console.error('❌ [getSecureImageUrl] No API URL available for file:', file);
    return null;
  }

  // 🔧 ENHANCED: All files now use API download strategy for reliability
  // No more static file service due to path issues
  
  if (import.meta.env.DEV) {
    console.log('🔐 [getSecureImageUrl] Initiating API download strategy for:', apiUrl);
  }
  
  // Start loading if not already loading
  if (!loadingImages.value[fileKey] && !imageErrors.value[fileKey]) {
    loadSecureImage(file)
  }

  // Return placeholder or loading indicator
  // In production, you might want to return a loading image data URL
  return null // Will be replaced with blob URL when download completes
}

// 🚀 ROBUST: Load image with progressive fallback mechanism - PRODUCTION VERSION
const loadSecureImage = async (file) => {
  const fileKey = file.id || getFileUrl(file) || 'unknown'

  if (loadingImages.value[fileKey]) return

  // 🔧 NEW: Skip loading if file is marked as permanently unavailable
  if (imageErrors.value[fileKey] === 'permanent') {
    console.log('🚫 [loadSecureImage] File marked as permanently unavailable, skipping load:', fileKey);
    return;
  }

  loadingImages.value[fileKey] = true
  imageErrors.value[fileKey] = false

  try {
    console.log('🚀 [loadSecureImage] Starting robust fallback strategy:', {
      file,
      fileKey
    });

    // 🚨 VERCEL FIX: Check if we're in Vercel environment
    const isVercelEnv = window.location.hostname.includes('vercel') || window.location.hostname.includes('.app');
    const isProductionEnv = import.meta.env.PROD;

    if (isVercelEnv || isProductionEnv) {
      console.log('🌐 [loadSecureImage] Vercel/Production environment detected, using API-only strategy');
      
      // 🚨 VERCEL STRATEGY: Only use authenticated API downloads in Vercel
      const robustFileName = this.getFileName(file);
      const apiUrl = `/api/files/download/${robustFileName}`;
      
      try {
        const response = await api.get(apiUrl.substring(5), { // Remove '/api/' prefix
          responseType: 'blob',
          skipAuthRefresh: false,
          timeout: 30000
        });

        if (response.status === 200 && response.data) {
          const blob = response.data;
          const objectUrl = URL.createObjectURL(blob);
          
          // Cache successful API download
          secureImageUrls.value[fileKey] = objectUrl;
          
          // Cache to sessionStorage
          try {
            const reader = new FileReader();
            reader.onload = function() {
              try {
                sessionStorage.setItem(`cached_image_${fileKey}`, reader.result);
                console.log('📦 [loadSecureImage] Vercel API download cached to sessionStorage');
              } catch (storageError) {
                console.warn('⚠️ [loadSecureImage] SessionStorage cache failed:', storageError.message);
              }
            };
            reader.readAsDataURL(blob);
          } catch (cacheError) {
            console.warn('⚠️ [loadSecureImage] Cache operation failed:', cacheError.message);
          }
          
          console.log('✅ [loadSecureImage] Vercel API download successful');
          return;
        } else {
          throw new Error(`Vercel API download failed: ${response.status} ${response.statusText}`);
        }
      } catch (vercelError) {
        console.error('❌ [loadSecureImage] Vercel API strategy failed:', vercelError);
        throw vercelError;
      }
    }

    // 🔧 DEVELOPMENT STRATEGY: Use multi-fallback for local development
    // Get static and auth URLs
    const staticUrl = getStandardFileUrl(file, {
      workspaceId: props.message?.workspace_id || props.workspaceId,
      preferAuth: false
    })
    const authUrl = buildAuthFileUrl(file.filename || file.file_name || file.name)

    if (!staticUrl && !authUrl) {
      throw new Error('No file URLs available from file handler')
    }

    console.log('🔧 [loadSecureImage] URLs generated:', { staticUrl, authUrl });

    // 🚀 STRATEGY 1: Try API static file first (fastest)
    if (staticUrl && (staticUrl.startsWith('/api/files/') || staticUrl.startsWith('/files/'))) {
      console.log('📁 [loadSecureImage] Attempting flat static file access:', staticUrl);
      
              try {
        const staticResponse = await fetch(staticUrl);
        if (staticResponse.ok) {
          const blob = await staticResponse.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          // Cache successful static access
          secureImageUrls.value[fileKey] = objectUrl;
          
          // Cache to sessionStorage
          try {
            const reader = new FileReader();
            reader.onload = function() {
              try {
                sessionStorage.setItem(`cached_image_${fileKey}`, reader.result);
                console.log('📦 [loadSecureImage] Static file cached to sessionStorage');
              } catch (storageError) {
                console.warn('⚠️ [loadSecureImage] SessionStorage cache failed:', storageError.message);
              }
            };
            reader.readAsDataURL(blob);
          } catch (cacheError) {
            console.warn('⚠️ [loadSecureImage] Cache operation failed:', cacheError.message);
          }
          
          console.log('✅ [loadSecureImage] Flat static file access successful');
          return;
        } else {
          console.warn(`⚠️ [loadSecureImage] Static file failed: ${staticResponse.status}`);
        }
      } catch (staticError) {
        console.warn('⚠️ [loadSecureImage] Static file access failed:', staticError.message);
      }
    }

    // 🚀 STRATEGY 2: Fallback to authenticated API download
    if (authUrl && authUrl.startsWith('/api/files/download/')) {
      console.log('🔐 [loadSecureImage] Falling back to API download:', authUrl);
      
      const downloadPath = authUrl.substring(5); // Remove '/api/' prefix
      
      const response = await api.get(downloadPath, {
        responseType: 'blob',
        skipAuthRefresh: false,
        timeout: 30000
      });

      if (response.status === 200 && response.data) {
        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);
        
        // Cache successful API download
        secureImageUrls.value[fileKey] = objectUrl;
        
        // Cache to sessionStorage
        try {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              sessionStorage.setItem(`cached_image_${fileKey}`, reader.result);
              console.log('📦 [loadSecureImage] API download cached to sessionStorage');
            } catch (storageError) {
              console.warn('⚠️ [loadSecureImage] SessionStorage cache failed:', storageError.message);
            }
          };
          reader.readAsDataURL(blob);
        } catch (cacheError) {
          console.warn('⚠️ [loadSecureImage] Cache operation failed:', cacheError.message);
        }
        
        console.log('✅ [loadSecureImage] API download fallback successful');
        return;
      } else {
        throw new Error(`API download failed: ${response.status} ${response.statusText}`);
      }
    }

    // 🚀 STRATEGY 3: Handle external URLs or blob URLs
    const directUrl = staticUrl || authUrl;
    if (directUrl && (directUrl.startsWith('http') || directUrl.startsWith('blob:'))) {
      console.log('🔗 [loadSecureImage] Direct external/blob URL access:', directUrl);
      
      const response = await fetch(directUrl);
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        secureImageUrls.value[fileKey] = objectUrl;
        console.log('✅ [loadSecureImage] External URL access successful');
        return;
      } else {
        throw new Error(`External URL responded with ${response.status}: ${response.statusText}`);
      }
    }

    // 🔧 FINAL FALLBACK: 如果所有策略都失败，不抛出错误，而是优雅处理
    console.warn('⚠️ [loadSecureImage] All fallback strategies exhausted, marking as unavailable');
    imageErrors.value[fileKey] = 'permanent';
    return;

  } catch (error) {
    console.error('❌ [loadSecureImage] All strategies failed:', {
      error: error.message,
      file,
      fileKey,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });

    // 🔧 ENHANCED: Categorize errors and mark permanent failures
    let errorType = 'temporary';
    
    if (error.response?.status === 404) {
      console.warn('📷 [loadSecureImage] File not found (404) - marking as permanently unavailable');
      errorType = 'permanent';
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('🔐 [loadSecureImage] Authentication error - token may be expired');
      errorType = 'auth';
    } else if (error.message.includes('timeout')) {
      console.warn('⏱️ [loadSecureImage] Download timeout - file may be too large');
      errorType = 'timeout';
    } else if (error.response?.status >= 500) {
      console.warn('🛠️ [loadSecureImage] Server error - backend issue');
      errorType = 'server';
    } else {
      console.warn('❓ [loadSecureImage] Unknown error:', error.message);
      errorType = 'unknown';
    }

    // Mark error with type for intelligent handling
    imageErrors.value[fileKey] = errorType;
    
    // 🔧 NEW: For permanent failures, don't retry
    if (errorType === 'permanent') {
      console.log('🚫 [loadSecureImage] File permanently unavailable, will show fallback UI');
    }
  } finally {
    loadingImages.value[fileKey] = false
  }
}

const getFileName = (file) => {
  // 🔧 CRITICAL FIX: Add null check for file object
  if (!file) {
    console.warn('❌ [getFileName] Received null or undefined file object');
    return 'Unknown file';
  }

  // 🔧 ENHANCED: Multiple fallback sources for filename with debug logging
  const candidates = [
    file.file_name,
    file.filename, 
    file.name,
    file.original_filename,
    file.original_name
  ];
  
  // Try to extract filename from URL if direct properties fail
  if (!candidates.some(Boolean)) {
    const fileUrl = getFileUrl(file);
    if (fileUrl && typeof fileUrl === 'string') {
      const urlParts = fileUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        candidates.push(lastPart);
      }
    }
  }

  const result = candidates.find(Boolean) || 'Unknown file';
  
  if (import.meta.env.DEV) {
    console.log('🔍 [getFileName] File object:', file);
    console.log('🔍 [getFileName] Candidates:', candidates);
    console.log('🔍 [getFileName] Final result:', result);
  }
  
  return result;
}

const getFileExtension = (file) => {
  const fileName = getFileName(file)
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.substring(lastDot + 1).toUpperCase() : ''
}

const isImageFile = (file) => {
  // 🔧 ENHANCED: More robust image detection with debug logging
  const mimeType = file.mime_type || file.type || ''
  const fileName = getFileName(file)
  const fileExtension = getFileExtension(file).toLowerCase()
  
  // 🎯 CRITICAL FIX: Check multiple conditions for image detection
  const isMimeImage = mimeType.startsWith('image/')
  const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif)$/i.test(fileName)
  const isExtensionImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'heif'].includes(fileExtension)
  
  // 🔧 ENHANCED: Also check if filename contains hash pattern typical for uploaded images
  const hasHashPattern = /^[a-f0-9]{64}\.png$/i.test(fileName) || /^[a-f0-9]{40,}\.png$/i.test(fileName)
  
  const isImage = isMimeImage || hasImageExtension || isExtensionImage || hasHashPattern
  
  if (import.meta.env.DEV) {
    console.log('🔍 [isImageFile] File analysis:', {
      fileName,
      fileExtension,
      mimeType,
      isMimeImage,
      hasImageExtension,
      isExtensionImage,
      hasHashPattern,
      finalResult: isImage,
      fileObject: file
    });
  }
  
  return isImage
}

const onImageLoad = (file) => {
  const fileName = getFileName(file)
  const fileKey = file.id || getFileUrl(file) || fileName
  imageLoaded.value[fileKey] = true

  if (import.meta.env.DEV) {
    console.log('✅ [onImageLoad] Image loaded successfully:', {
      fileName,
      fileKey,
      file
    });
  }
}

const onImageError = (file) => {
  const fileName = getFileName(file)
  const fileUrl = getFileUrl(file)
  const fileKey = file.id || fileUrl || fileName
  imageLoaded.value[fileKey] = false

  console.error('❌ [onImageError] Failed to load image:', {
    fileName,
    fileUrl,
    fileKey,
    file,
    secureUrl: secureImageUrls.value[fileKey],
    isLoading: loadingImages.value[fileKey],
    hasError: imageErrors.value[fileKey]
  });

  // 🔧 ENHANCED: Check if already marked as permanent failure
  const currentError = imageErrors.value[fileKey];
  if (currentError === 'permanent') {
    console.log('🚫 [onImageError] File already marked as permanently unavailable, skipping retry');
    return;
  }

  // 🔧 ENHANCED: Smart retry logic based on error type
  const retryKey = `${fileKey}_retry_count`;
  const currentRetries = window.imageRetryCounter?.[retryKey] || 0;
  const maxRetries = 1; // Reduced retries to prevent excessive network calls

  if (currentRetries < maxRetries && currentError !== 'permanent') {
    // Initialize retry counter if needed
    if (!window.imageRetryCounter) {
      window.imageRetryCounter = {};
    }
    window.imageRetryCounter[retryKey] = currentRetries + 1;

    console.log(`🔄 [onImageError] Scheduling retry ${currentRetries + 1}/${maxRetries} for image:`, fileName);
    
    setTimeout(() => {
      // Double-check error state before retry
      const errorState = imageErrors.value[fileKey];
      if (errorState && errorState !== 'permanent' && !loadingImages.value[fileKey]) {
        console.log(`🔄 [onImageError] Attempting retry ${currentRetries + 1} for failed image:`, fileName);
        
        // Clear error state for retry
        delete imageErrors.value[fileKey];
        delete secureImageUrls.value[fileKey];
        
        // Retry loading
        loadSecureImage(file);
      } else if (errorState === 'permanent') {
        console.log('🚫 [onImageError] File marked as permanent failure during retry delay, aborting retry');
      }
    }, Math.min(3000 * (currentRetries + 1), 8000)); // Longer backoff, max 8s
  } else {
    console.warn(`❌ [onImageError] Max retries (${maxRetries}) reached for image:`, fileName);
    console.log('💡 [onImageError] Marking as permanently failed to prevent further retries');
    
    // Mark as permanently failed
    imageErrors.value[fileKey] = 'permanent';
  }
}

const downloadFile = async (file) => {
  // 🔧 CRITICAL FIX: Add null check for file object
  if (!file) {
    console.error('❌ [downloadFile] Cannot download null or undefined file');
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification('文件下载失败: 无效的文件对象', 'error');
    }
    return;
  }

  const fileName = getFileName(file);
  const fileKey = file.id || getFileUrl(file) || 'unknown';

  try {
    console.log('📥 [downloadFile] Starting robust download for:', fileName);

    // 🚀 PRIORITY 1: Check if we have cached blob URL
    if (secureImageUrls.value[fileKey]) {
      console.log('📦 [downloadFile] Using cached blob URL for instant download');
      
      const link = document.createElement('a');
      link.href = secureImageUrls.value[fileKey];
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ [downloadFile] Instant download from cache completed');
      return;
    }

    // 🚀 PRIORITY 2: Check sessionStorage cache
    try {
      const cachedData = sessionStorage.getItem(`cached_image_${fileKey}`);
      if (cachedData) {
        console.log('📦 [downloadFile] Using sessionStorage cache for download');
        
        const link = document.createElement('a');
        link.href = cachedData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ [downloadFile] Download from sessionStorage completed');
        return;
      }
    } catch (cacheError) {
      console.warn('⚠️ [downloadFile] SessionStorage access failed:', cacheError.message);
    }

    // 🚀 PRIORITY 3: Use robust fallback mechanism
    console.log('🔐 [downloadFile] No cache available, using robust fallback download...');
    
    const urls = getRobustFileUrls(file, {
      workspaceId: props.message?.workspace_id || props.workspaceId
    });

    if (!urls.hasOptions) {
      throw new Error('No download URLs available from robust handler');
    }

    console.log('🔧 [downloadFile] Robust URLs for download:', urls);

    let blob = null;
    let errorMessages = [];

    // Try API static file first
    if (urls.primary && (urls.primary.startsWith('/api/files/') || urls.primary.startsWith('/files/'))) {
      try {
        console.log('📁 [downloadFile] Attempting flat static download:', urls.primary);
        const staticResponse = await fetch(urls.primary);
        if (staticResponse.ok) {
          blob = await staticResponse.blob();
          console.log('✅ [downloadFile] Static file download successful');
        } else {
          const errorMsg = `Static download failed: ${staticResponse.status}`;
          errorMessages.push(errorMsg);
          console.warn(`⚠️ [downloadFile] ${errorMsg}`);
        }
      } catch (staticError) {
        const errorMsg = `Static download error: ${staticError.message}`;
        errorMessages.push(errorMsg);
        console.warn(`⚠️ [downloadFile] ${errorMsg}`);
      }
    }

    // Fallback to API download if static failed
    if (!blob && urls.fallback && urls.fallback.startsWith('/api/files/download/')) {
      try {
        console.log('🔐 [downloadFile] Falling back to API download:', urls.fallback);
        
        const downloadPath = urls.fallback.substring(5); // Remove '/api/' prefix
        
        const response = await api.get(downloadPath, {
          responseType: 'blob',
          skipAuthRefresh: false,
          timeout: 60000 // Longer timeout for downloads
        });

        if (response.status === 200 && response.data) {
          blob = response.data;
          console.log('✅ [downloadFile] API download successful');
        } else {
          const errorMsg = `API download failed: ${response.status} ${response.statusText}`;
          errorMessages.push(errorMsg);
          throw new Error(errorMsg);
        }
      } catch (apiError) {
        const errorMsg = `API download error: ${apiError.message}`;
        errorMessages.push(errorMsg);
        console.error(`❌ [downloadFile] ${errorMsg}`);
      }
    }

    if (!blob) {
      throw new Error(`All download strategies failed: ${errorMessages.join('; ')}`);
    }

    // Validate blob content
    if (blob.size === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }

    // Create object URL and trigger download
    const objectUrl = URL.createObjectURL(blob);

    // 🚀 CACHE: Store for future use
    secureImageUrls.value[fileKey] = objectUrl;
    
    // Also cache to sessionStorage
    try {
      const reader = new FileReader();
      reader.onload = function() {
        try {
          sessionStorage.setItem(`cached_image_${fileKey}`, reader.result);
          console.log('📦 [downloadFile] Cached downloaded file to sessionStorage');
        } catch (storageError) {
          console.warn('⚠️ [downloadFile] SessionStorage cache failed:', storageError.message);
        }
      };
      reader.readAsDataURL(blob);
    } catch (cacheError) {
      console.warn('⚠️ [downloadFile] Cache operation failed:', cacheError.message);
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    console.log('✅ [downloadFile] Robust download completed and cached');

  } catch (error) {
    console.error('❌ [downloadFile] Robust download failed:', {
      fileName,
      error: error.message,
      responseStatus: error.response?.status
    });

    // Show user-friendly error message
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification(`文件下载失败: ${fileName}`, 'error');
    } else {
      alert(`文件下载失败: ${fileName}\n错误: ${error.message}`);
    }
  }
}

const scrollToReplyMessage = () => {
  if (props.message.reply_to) {
    emit('scroll-to-message', props.message.reply_to)
  }
}

const startEdit = () => {
  emit('edit-message', props.message)
  closeContextMenu()
}

const deleteMessage = () => {
  emit('delete-message', props.message)
  closeContextMenu()
}

const handleReplyToMessage = (replyData) => {
  // 🔄 Reply with Mention Integration
  const enhancedReplyData = {
    messageId: props.message.id,
    senderId: props.message.sender_id,
    senderName: props.message.sender?.fullname || props.message.sender_name || 'Unknown User',
    content: props.message.content,
    originalMessage: props.message,
    replyType: 'mention', // 标识这是一个mention回复
    timestamp: new Date().toISOString()
  }

  console.log('🔄 Enhanced Reply with mention integration:', enhancedReplyData)

  // Emit to parent for input field integration
  emit('reply-to', enhancedReplyData)

  // 触发输入栏focus并设置mention
  setTimeout(() => {
    const messageInput = document.querySelector('textarea[placeholder*="message"], input[placeholder*="message"]')
    if (messageInput) {
      const mentionText = `@${enhancedReplyData.senderName} `
      messageInput.value = mentionText
      messageInput.focus()
      // 设置光标位置到末尾
      messageInput.setSelectionRange(mentionText.length, mentionText.length)
      console.log('✅ Message input focused with mention:', mentionText)
    }
  }, 100)

  closeContextMenu()
}

const handleTranslateMessage = async (translateData) => {
  // 🌐 Translation Panel Integration - FIXED: Use proper Vue state management
  const translationRequest = {
    messageId: props.message.id,
    content: props.message.content,
    senderName: props.message.sender?.fullname || props.message.sender_name || 'Unknown User',
    originalMessage: props.message,
    timestamp: new Date().toISOString()
  }

  console.log('🌐 Translation request:', translationRequest)

  // 🔧 FIXED: Use messageUIStore state management with optimal positioning
  try {
    // Import messageUIStore
    const { useMessageUIStore } = await import('@/stores/messageUI')
    const messageUIStore = useMessageUIStore()

    // 🎯 优化：让Chat.vue的getOptimalTranslationPanelPosition处理位置计算
    // 移除position参数，使用最优定位算法
    messageUIStore.openTranslationPanel(props.message.id, {
      showAdvanced: false,
      preserveFormatting: true,
      showConfidence: true
    })

    console.log('✅ Translation panel opened via state management with optimal positioning')
  } catch (error) {
    console.error('🚨 Failed to open translation panel:', error)

    // Fallback to temporary dialog
    showTranslationDialog(translationRequest)
  }

  closeContextMenu()
}

// 临时翻译对话框（如果没有翻译面板时使用）
const showTranslationDialog = (request) => {
  // 创建简单的翻译提示
  const dialog = document.createElement('div')
  dialog.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-50 max-w-sm'
  dialog.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-900">🌐 Translation</h3>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">✕</button>
    </div>
    <p class="text-sm text-gray-600 mb-2">Original: "${request.content.substring(0, 100)}${request.content.length > 100 ? '...' : ''}"</p>
    <p class="text-sm text-blue-600">Translation feature will be integrated with bot service...</p>
  `
  document.body.appendChild(dialog)

  // 3秒后自动移除
  setTimeout(() => {
    if (dialog.parentElement) {
      dialog.remove()
    }
  }, 3000)
}

const translateMessage = () => {
  // 🔄 Redirect to enhanced translate method
  handleTranslateMessage()
}

const copyMessage = () => {
  const safeContent = extractSafeMessageContent()
  if (safeContent) {
    navigator.clipboard.writeText(safeContent)
  }
  closeContextMenu()
}

// Debug methods
const toggleDebugData = () => {
  showDebugData.value = !showDebugData.value
  if (showDebugData.value) {
    logMessageData()
  }
}

const logMessageData = () => {
  console.group(`🔍 数据传输断点分析 - Message ${props.message.id}`)

  console.log('📋 原始消息对象:', props.message)

  console.log('👤 用户名数据源分析:', {
    'sender.fullname': props.message.sender?.fullname || '❌ null',
    'sender_name': props.message.sender_name || '❌ null',
    'sender.username': props.message.sender?.username || '❌ null',
    'sender.name': props.message.sender?.name || '❌ null',
    '最终显示': senderName.value,
    '数据源': userNameSource.value
  })

  console.log('🎨 头像数据源分析:', {
    'sender.avatar_url': props.message.sender?.avatar_url || '❌ null',
    'sender_avatar': props.message.sender_avatar || '❌ null',
    '最终显示': senderAvatar.value || '❌ 使用fallback',
    'fallback初始字母': senderInitials.value
  })

  console.log('🔗 数据传输链路检查:', {
    '消息ID': props.message.id || props.message.temp_id,
    '发送者ID': props.message.sender_id,
    '是否有sender对象': !!props.message.sender,
    'sender对象内容': props.message.sender || '❌ null',
    '创建时间': props.message.created_at,
    '消息内容': props.message.content
  })

  // Check for potential data loss points
  const dataLossIndicators = []
  if (!props.message.sender && !props.message.sender_name) {
    dataLossIndicators.push('❌ 缺少所有用户名数据源')
  }
  if (!props.message.sender?.fullname && !props.message.sender_name) {
    dataLossIndicators.push('⚠️ 只有fallback用户名数据')
  }
  if (!props.message.sender?.avatar_url && !props.message.sender_avatar) {
    dataLossIndicators.push('⚠️ 缺少头像数据，使用生成头像')
  }

  if (dataLossIndicators.length > 0) {
    console.warn('🚨 发现数据传输断点:', dataLossIndicators)
  } else {
    console.log('✅ 数据传输完整')
  }

  console.groupEnd()
  closeContextMenu()
}

// ✨ Enhanced async code highlighting for messages
const highlightCodeInContent = async () => {
  // 🚀 CRITICAL FIX: Use safe content extraction
  const safeContent = extractSafeMessageContent()
  if (!safeContent) return

  // Skip if already highlighting or already highlighted
  if (isHighlightingCode.value || highlightedContent.value) return

  // Check if content contains code blocks
  const hasCodeBlocks = /```[\s\S]*?```/.test(safeContent)
  if (!hasCodeBlocks) {
    // Use basic markdown rendering for non-code content
    highlightedContent.value = renderMarkdown(safeContent)
    return
  }

  isHighlightingCode.value = true
  highlightError.value = null

  try {
    // Import highlighting utilities
    const { highlightMarkdownCode } = await import('@/utils/codeHighlight')

    // First render markdown
    const basicMarkdown = renderMarkdown(safeContent)

    // Then apply code highlighting with light theme
    const highlighted = await highlightMarkdownCode(safeContent, {
      theme: 'light',
      lineNumbers: false,
      cache: true,
      showHeader: true,
      showCopy: true
    })

    // Combine markdown with highlighted code
    highlightedContent.value = highlighted

    if (true) {
      console.log(`✨ Message ${props.message.id} code highlighted successfully`)
    }
  } catch (error) {
    console.error('💥 Message code highlighting failed:', error)
    highlightError.value = error.message

    // Fallback to basic markdown
    highlightedContent.value = renderMarkdown(safeContent)
  } finally {
    isHighlightingCode.value = false
  }
}



// ✨ Watch for message content changes and re-highlight
watch(() => extractSafeMessageContent(), (newContent, oldContent) => {
  if (newContent !== oldContent) {
    // Reset highlighting state when content changes
    highlightedContent.value = ''
    highlightError.value = null

    // Re-highlight if needed
    if (newContent && /```[\s\S]*?```/.test(newContent)) {
      nextTick(() => {
        highlightCodeInContent()
      })
    }
  }
}, { immediate: false })

// 🧹 CLEANUP: Clean up object URLs when component unmounts
const cleanupObjectUrls = () => {
  Object.values(secureImageUrls.value).forEach(url => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  secureImageUrls.value = {}

  if (true) {
    console.log('🧹 [SecureImage] Object URLs cleaned up')
  }
}

// Lifecycle hooks
onMounted(() => {
  // 🚀 Auto-highlight code on component mount
  nextTick(() => {
    const safeContent = extractSafeMessageContent()
    if (safeContent && /```[\s\S]*?```/.test(safeContent)) {
      console.log('🎨 [MOUNTED] Auto-highlighting code for message', props.message.id)
      highlightCodeInContent()
    }
  })
})

onUnmounted(() => {
  cleanupObjectUrls()
})

</script>

<style scoped>
/* 🎯 优化字体层次 - 让消息正文成为视觉焦点 */
.message-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Text', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #1f2937;
  letter-spacing: 0.01em;
}

/* 📏 OPTIMIZED: Modern chat message spacing */
.message-item {
  margin-bottom: 0.125rem;
  /* Reduced spacing between consecutive messages */
  border-radius: 0;
  /* Remove individual message rounding for cleaner look */
  margin-left: 0;
  margin-right: 0;
}

.message-item:hover {
  background-color: rgba(243, 244, 246, 0.3) !important;
  /* Subtle hover effect */
}

/* 🎯 OPTIMIZED: Message content wrapper for width constraints */
.message-content-wrapper {
  max-width: min(calc(100vw - 200px), 42rem);
  /* Responsive max width, similar to Discord */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 🔧 消息内容优化 - 增强可读性 */
.content-wrapper {
  color: #111827;
  font-weight: 400;
  font-size: 15px;
  line-height: 1.5;
  margin-top: 0.25rem;
  /* Reduced spacing from username to content */
}

/* 🚀 CRITICAL FIX: File Attachments Styling */
.message-files {
  margin-top: 0.5rem;
  /* Reduced from 0.75rem */
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  /* Reduced gap between files */
}

.file-attachment {
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  width: fit-content;
  /* Prevent full-width stretching */
}

.file-attachment:hover {
  border-color: #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 📸 OPTIMIZED: Image Attachments - Modern Chat Standards */
.image-attachment {
  position: relative;
  /* 🎯 Optimized thumbnail sizes for better chat experience */
  max-width: 240px;
  /* Reduced from 280px for better space utilization */
  max-height: 180px;
  /* Reduced from 300px */
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  /* 📱 Responsive design for different screen sizes */
  width: fit-content;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 📐 Responsive breakpoints for different image sizes */
@media (max-width: 768px) {
  .image-attachment {
    max-width: 200px;
    max-height: 150px;
  }

  .message-content-wrapper {
    max-width: calc(100vw - 120px);
    /* Adjust for mobile */
  }
}

@media (max-width: 480px) {
  .image-attachment {
    max-width: 180px;
    max-height: 135px;
  }

  .message-content-wrapper {
    max-width: calc(100vw - 100px);
    /* Further adjust for small screens */
  }
}

.attachment-image {
  width: 100%;
  height: auto;
  /* 🎯 Smart sizing based on image dimensions */
  max-height: 180px;
  /* Matches container */
  object-fit: contain;
  /* Changed from cover to contain for better display */
  transition: transform 0.2s ease;
  /* 🔧 Ensure minimum readable size */
  min-width: 120px;
  min-height: 80px;
}

/* 🖼️ Special handling for different image ratios */
.attachment-image[data-ratio="square"] {
  max-width: 200px;
  max-height: 200px;
}

.attachment-image[data-ratio="wide"] {
  max-width: 240px;
  max-height: 160px;
}

.attachment-image[data-ratio="tall"] {
  max-width: 160px;
  max-height: 180px;
}

.image-attachment:hover .attachment-image {
  transform: scale(1.02);
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  /* 🎯 Better visual hierarchy */
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, transparent 50%);
  border-radius: 0 8px 0 8px;
}

.image-attachment:hover .image-overlay {
  opacity: 1;
}

.download-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.download-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.05);
}

/* 📎 Generic File Attachments */
.generic-file-attachment {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
  max-width: 320px;
  /* Consistent with image max-width */
}

/* 🔐 SECURE IMAGE LOADING STATES */
.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
  /* 🎯 Consistent with optimized thumbnail size */
  min-height: 120px;
  max-width: 240px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #6c757d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.loading-text {
  font-size: 14px;
  color: #6c757d;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f8d7da;
  border-radius: 8px;
  color: #721c24;
  /* 🎯 Consistent with optimized thumbnail size */
  min-height: 120px;
  max-width: 240px;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-text {
  font-size: 14px;
  color: #721c24;
}

.error-details {
  font-size: 11px;
  color: #721c24;
  opacity: 0.7;
  margin-top: 4px;
  text-align: center;
  word-break: break-all;
}

/* 🚫 ENHANCED: Permanent error styling */
.permanent-error {
  background: #f3f4f6 !important;
  border: 1px solid #d1d5db !important;
  color: #6b7280 !important;
}

.permanent-error .error-icon {
  opacity: 0.8;
}

.permanent-error .error-text {
  color: #6b7280 !important;
  font-weight: 500;
}

.permanent-error .error-details {
  color: #9ca3af !important;
  opacity: 0.8;
}

.error-hint {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 6px;
  text-align: center;
  font-style: italic;
}



/* 🎨 Enhanced hover effects for better UX */
.image-attachment:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* 💡 Add click hint for images */
.image-attachment::after {
  content: "🔍 Click to view full size";
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(4px);
}

.image-attachment:hover::after {
  opacity: 1;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 🎭 确保用户名更subtle */
.username-button {
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #6b7280 !important;
  opacity: 0.85;
  transition: all 0.2s ease;
}

.username-button:hover {
  opacity: 1;
  color: #3b82f6 !important;
}

/* ✨ 增强正文中的markdown元素 */
.content-wrapper :deep(p) {
  margin: 0.25rem 0;
  /* Reduced paragraph spacing */
  font-size: 15px;
  font-weight: 400;
  color: #111827;
  line-height: 1.5;
}

.content-wrapper :deep(strong) {
  font-weight: 600;
  color: #000;
}

.content-wrapper :deep(em) {
  font-style: italic;
  color: #374151;
}

.content-wrapper :deep(a) {
  color: #2563eb;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
}

.content-wrapper :deep(a:hover) {
  color: #1d4ed8;
  text-decoration: underline;
}

/* 📝 内联代码优化 */
.content-wrapper :deep(code:not(.hljs code)) {
  background-color: #f3f4f6;
  color: #1f2937;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 500;
}

/* 🎯 时间戳subtle化 */
time {
  font-size: 11px !important;
  font-weight: 400 !important;
  color: #9ca3af !important;
}

/* ✨ 代码高亮状态样式 - 浅色调主题 */
.code-highlighting-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(9, 105, 218, 0.1);
  border: 1px solid rgba(9, 105, 218, 0.3);
  border-radius: 6px;
  color: #0969da;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.highlighting-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(9, 105, 218, 0.2);
  border-top: 2px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.code-highlight-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: rgba(209, 36, 47, 0.1);
  border: 1px solid rgba(209, 36, 47, 0.3);
  border-radius: 6px;
  color: #d1242f;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.retry-highlight-btn {
  background-color: #d1242f;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-highlight-btn:hover {
  background-color: #b91c1c;
}

/* 🎯 生产级表情在消息中的1.5x显示 */
.message-content-wrapper :deep(*) {
  /* 匹配Unicode表情符号并放大 */
  font-variant-emoji: emoji;
}

.message-content-wrapper :deep(.emoji),
.message-content-wrapper :deep(span[data-emoji]),
.message-content-wrapper :deep([class*="emoji"]) {
  font-size: 1.5em !important;
  line-height: 1.2 !important;
  vertical-align: middle !important;
  display: inline-block !important;
  margin: 0 0.1em !important;
}

/* 🎯 自动检测文本中的表情符号 */
.message-content-wrapper :deep(p),
.message-content-wrapper :deep(span),
.message-content-wrapper :deep(div) {
  /* 增强表情符号渲染 */
  font-feature-settings: "liga" 1, "calt" 1;
  text-rendering: optimizeQuality;
}

/* 🎯 增强表情符号在不同内容类型中的显示 */
.content-wrapper :deep(p),
.content-wrapper :deep(span),
.content-wrapper :deep(div) {
  /* Unicode表情符号自动检测和放大 */
  font-variant-emoji: text;
  font-size: inherit;
}

/* 🎯 表情符号通用增强样式 */
.content-wrapper :deep(p *),
.content-wrapper :deep(span *),
.content-wrapper :deep(div *) {
  font-feature-settings: "liga" 1, "calt" 1, "kern" 1;
}

/* 🎯 确保表情符号在Markdown内容中也正确显示 */
.markdown-content :deep(.emoji) {
  font-size: 1.5em !important;
  vertical-align: middle !important;
  margin: 0 0.1em !important;
}
</style>