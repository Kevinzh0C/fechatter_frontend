<template>
  <div class="channel-list">
    <!-- Channels Section -->
    <div class="channel-section">
      <!-- Section Header -->
      <div class="section-header">
        <button @click="toggleChannelsExpanded" class="section-toggle" :class="{ 'expanded': isChannelsExpanded }">
          <Icon name="chevron-down" class="toggle-icon" />
          <span class="section-title">Channels</span>
          <span class="section-count">{{ channels.length }}</span>
        </button>

        <div class="header-actions">
          <button @click="toggleChannelsDropdown" class="action-btn" title="Add channel" ref="channelsMenuBtn">
            <Icon name="plus" />
          </button>
          <!-- Channels Dropdown Menu -->
          <div v-if="showChannelsDropdown" class="dropdown-menu" @click.stop>
            <div class="dropdown-item" @click="createChannel">
              <Icon name="hash" class="dropdown-icon" />
              <span>Create channel</span>
            </div>
            <div class="dropdown-item" @click="browseChannels">
              <Icon name="search" class="dropdown-icon" />
              <span>Browse channels</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Channels List -->
      <div v-if="isChannelsExpanded && channels.length > 0" class="channels-container">
        <ChannelItem v-for="channel in channels" :key="channel.id" :channel="channel"
          :isActive="currentChatId === channel.id" @click="selectChannel(channel)"
          @context-menu="showChannelContextMenu(channel, $event)" />
      </div>

      <!-- Empty State -->
      <div v-if="isChannelsExpanded && channels.length === 0" class="empty-state">
        <p class="empty-text">No channels yet</p>
        <button @click="createChannel" class="empty-action">
          Create your first channel
        </button>
      </div>
    </div>

    <!-- Direct Messages Section -->
    <div class="channel-section">
      <!-- Section Header -->
      <div class="section-header">
        <button @click="toggleDMsExpanded" class="section-toggle" :class="{ 'expanded': isDMsExpanded }">
          <Icon name="chevron-down" class="toggle-icon" />
          <span class="section-title">Direct Messages</span>
          <span class="section-count">{{ directMessages.length }}</span>
        </button>

        <div class="header-actions">
          <button @click="toggleDMsDropdown" class="action-btn" title="New message" ref="dmsMenuBtn">
            <Icon name="plus" />
          </button>
          <!-- DMs Dropdown Menu -->
          <div v-if="showDMsDropdown" class="dropdown-menu" @click.stop>
            <div class="dropdown-item" @click="startDirectMessage">
              <Icon name="message-circle" class="dropdown-icon" />
              <span>New message</span>
            </div>
            <div class="dropdown-item" @click="browsePeople">
              <Icon name="users" class="dropdown-icon" />
              <span>Find people</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Direct Messages List -->
      <div v-if="isDMsExpanded && directMessages.length > 0" class="channels-container">
        <DMItem v-for="dm in directMessages" :key="dm.id" :dm="dm" :isActive="currentChatId === dm.id"
          @click="selectChannel(dm)" />
      </div>

      <!-- DMs Empty State -->
      <div v-else-if="isDMsExpanded && directMessages.length === 0" class="empty-state">
        <p class="empty-text">No conversations yet</p>
        <button @click="startDirectMessage" class="empty-action">
          Start a conversation
        </button>
      </div>
    </div>

    <!-- Group Messages Section -->
    <div class="channel-section">
      <!-- Section Header -->
      <div class="section-header">
        <button @click="toggleGroupsExpanded" class="section-toggle" :class="{ 'expanded': isGroupsExpanded }">
          <Icon name="chevron-down" class="toggle-icon" />
          <Icon name="user" class="section-icon" />
          <span class="section-title">Groups</span>
          <span class="section-count">{{ groupMessages.length }}</span>
        </button>

        <div class="header-actions">
          <button @click="toggleGroupsDropdown" class="action-btn" title="Create group" ref="groupsMenuBtn">
            <Icon name="plus" />
          </button>
          <!-- Groups Dropdown Menu -->
          <div v-if="showGroupsDropdown" class="dropdown-menu" @click.stop>
            <div class="dropdown-item" @click="createGroupMessage">
              <Icon name="user" class="dropdown-icon" />
              <span>Create group</span>
            </div>
            <div class="dropdown-item" @click="browseGroups">
              <Icon name="search" class="dropdown-icon" />
              <span>Browse groups</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Group Messages List -->
      <div v-if="isGroupsExpanded && groupMessages.length > 0" class="channels-container">
        <DMItem v-for="group in groupMessages" :key="group.id" :dm="group" :isActive="currentChatId === group.id"
          @click="selectChannel(group)" />
      </div>

      <!-- Groups Empty State -->
      <div v-else-if="isGroupsExpanded && groupMessages.length === 0" class="empty-state">
        <p class="empty-text">No groups yet</p>
        <button @click="createGroupMessage" class="empty-action">
          Create a group
        </button>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu v-if="contextMenu.show" :x="contextMenu.x" :y="contextMenu.y" :items="contextMenuItems"
      @close="closeContextMenu" @action="handleContextAction" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import Icon from '@/components/ui/Icon.vue'
import ChannelItem from './ChannelItem.vue'
import DMItem from './DMItem.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import { errorHandler } from '@/utils/errorHandler'

// Props
const props = defineProps({
  channels: {
    type: Array,
    default: () => []
  },
  directMessages: {
    type: Array,
    default: () => []
  },
  groupMessages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  currentChatId: {
    type: [Number, String],
    default: null
  }
})

// Emits
const emit = defineEmits([
  'channel-selected',
  'create-channel',
  'create-dm',
  'refresh'
])

// State
const router = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const isChannelsExpanded = ref(true)
const isDMsExpanded = ref(true)
const isGroupsExpanded = ref(true)
const isRefreshing = ref(false)
const showChannelsDropdown = ref(false)
const showDMsDropdown = ref(false)
const showGroupsDropdown = ref(false)

// Context Menu
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  channel: null
})

// Computed
const isDev = computed(() => true)
const totalChats = computed(() => props.channels.length + props.directMessages.length + props.groupMessages.length)
const currentListType = computed(() => {
  if (props.channels.length > 0 && props.directMessages.length > 0 && props.groupMessages.length > 0) return 'mixed'
  if (props.channels.length > 0) return 'channels'
  if (props.directMessages.length > 0) return 'dms'
  if (props.groupMessages.length > 0) return 'groups'
  return 'empty'
})

const contextMenuItems = computed(() => [
  { id: 'view', label: 'View Channel', icon: 'eye' },
  { id: 'edit', label: 'Edit Channel', icon: 'edit' },
  { id: 'members', label: 'Manage Members', icon: 'users' },
  { type: 'divider' },
  { id: 'mute', label: 'Mute Channel', icon: 'bell-off' },
  { id: 'leave', label: 'Leave Channel', icon: 'log-out', danger: true }
])

// Methods
const toggleChannelsExpanded = () => {
  isChannelsExpanded.value = !isChannelsExpanded.value
  localStorage.setItem('channels_expanded', isChannelsExpanded.value.toString())
}

const toggleDMsExpanded = () => {
  isDMsExpanded.value = !isDMsExpanded.value
  localStorage.setItem('dms_expanded', isDMsExpanded.value.toString())
}

const toggleGroupsExpanded = () => {
  isGroupsExpanded.value = !isGroupsExpanded.value
  localStorage.setItem('groups_expanded', isGroupsExpanded.value.toString())
}

const toggleChannelsDropdown = () => {
  showChannelsDropdown.value = !showChannelsDropdown.value
  showDMsDropdown.value = false // Close other dropdown
  showGroupsDropdown.value = false
}

const toggleDMsDropdown = () => {
  showDMsDropdown.value = !showDMsDropdown.value
  showChannelsDropdown.value = false // Close other dropdown
  showGroupsDropdown.value = false
}

const toggleGroupsDropdown = () => {
  showGroupsDropdown.value = !showGroupsDropdown.value
  showChannelsDropdown.value = false // Close other dropdown
  showDMsDropdown.value = false
}

const closeAllDropdowns = () => {
  showChannelsDropdown.value = false
  showDMsDropdown.value = false
  showGroupsDropdown.value = false
}

const selectChannel = (channel) => {
  console.log('🎯 [ChannelList] Channel selected:', channel);
  
  // 发出事件给父组件处理导航
  emit('channel-selected', channel);
  
  // 🚨 MOBILE FIX: 在移动端点击channel后自动关闭sidebar
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    // 检查是否有移动端滑动管理器
    const mobileSwipeManager = window.mobileSwipeManager;
    if (mobileSwipeManager && mobileSwipeManager.sidebarVisible.value) {
      console.log('📱 [ChannelList] Auto-closing sidebar on mobile after channel selection');
      mobileSwipeManager.closeSidebar();
    }
    
    // 备用方案：直接操作DOM
    const sidebar = document.querySelector('.global-sidebar.mobile-sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    if (sidebar && sidebar.classList.contains('mobile-visible')) {
      sidebar.classList.remove('mobile-visible');
      sidebar.style.transform = 'translateX(-100%)';
      if (overlay) {
        overlay.remove();
      }
      document.body.style.overflow = '';
    }
  }
}

const refreshChannels = async () => {
  if (isRefreshing.value) return

  isRefreshing.value = true
  try {
    emit('refresh')
    await new Promise(resolve => setTimeout(resolve, 500)) // Minimum visual feedback
  } catch (error) {
    errorHandler.handle(error, { context: 'Refresh channels' })
  } finally {
    isRefreshing.value = false
  }
}

// Dropdown menu actions
const createChannel = () => {
  closeAllDropdowns()
  console.log('🎯 [ChannelList] Emitting create-channel event')
  emit('create-channel')
}

const browseChannels = () => {
  closeAllDropdowns()
  // TODO: Implement browse channels functionality
  console.log('Browse channels clicked')
}

const startDirectMessage = () => {
  closeAllDropdowns()
  console.log('🎯 [ChannelList] Emitting create-dm event')
  emit('create-dm')
}

const browsePeople = () => {
  closeAllDropdowns()
  // TODO: Implement browse people functionality
  console.log('Browse people clicked')
}

const createGroupMessage = () => {
  closeAllDropdowns()
  // TODO: Implement create group message functionality
  console.log('Create group message clicked')
}

const browseGroups = () => {
  closeAllDropdowns()
  // TODO: Implement browse groups functionality
  console.log('Browse groups clicked')
}

const showChannelContextMenu = (channel, event) => {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    channel
  }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

const handleContextAction = (action) => {
  const channel = contextMenu.value.channel
  closeContextMenu()

  switch (action.id) {
    case 'view':
      selectChannel(channel)
      break
    case 'edit':
      // Handle edit channel
      break
    case 'members':
      // Handle manage members
      break
    case 'mute':
      // Handle mute channel
      break
    case 'leave':
      // Handle leave channel
      break
  }
}

// Click outside handler
const handleClickOutside = (event) => {
  // Close dropdowns if clicking outside
  if (!event.target.closest('.dropdown-container')) {
    closeAllDropdowns()
  }

  // Close context menu if clicking outside
  if (contextMenu.value.show && !event.target.closest('.context-menu')) {
    closeContextMenu()
  }
}

// Lifecycle
onMounted(() => {
  // Restore expansion states
  const channelsExpanded = localStorage.getItem('channels_expanded')
  const dmsExpanded = localStorage.getItem('dms_expanded')
  const groupsExpanded = localStorage.getItem('groups_expanded')

  if (channelsExpanded !== null) {
    isChannelsExpanded.value = channelsExpanded === 'true'
  }
  if (dmsExpanded !== null) {
    isDMsExpanded.value = dmsExpanded === 'true'
  }
  if (groupsExpanded !== null) {
    isGroupsExpanded.value = groupsExpanded === 'true'
  }

  // Add global click listener for closing dropdowns
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Remove global click listener
  document.removeEventListener('click', handleClickOutside)
  closeContextMenu()
  closeAllDropdowns()
})
</script>

<style scoped>
/* 🎨 Modern Channel List Design - Inspired by Discord & Linear */
.channel-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
}

/* 📱 Section Container */
.channel-section {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
}

.channel-section:last-child {
  margin-bottom: 0;
}

/* 🏷️ Section Header - Clean & Minimal */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  margin-bottom: 4px;
  height: 28px;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--color-sidebar-text-muted);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  padding: 6px;
  margin: -6px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex: 1;
  line-height: 1.2;
}

.section-toggle:hover {
  color: var(--color-sidebar-text);
  background: var(--color-sidebar-hover);
}

.section-toggle:active {
  background: var(--color-background-muted);
}

.toggle-icon {
  width: 10px;
  height: 10px;
  transition: transform 0.15s ease;
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.section-toggle:hover .toggle-icon {
  color: var(--color-sidebar-text-muted);
}

.section-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--color-text-muted);
  margin-right: 2px;
}

.section-toggle:hover .section-icon {
  color: var(--color-sidebar-text-muted);
}

.section-toggle.expanded .toggle-icon {
  transform: rotate(0deg);
}

.section-toggle:not(.expanded) .toggle-icon {
  transform: rotate(-90deg);
}

.section-title {
  flex: 1;
  text-align: left;
}

.section-count {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
  margin-left: 6px;
  background: var(--color-background-muted);
  padding: 2px 6px;
  border-radius: 10px;
  line-height: 1;
  min-width: 18px;
  text-align: center;
}

/* 🎯 Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  position: relative;
}

.action-btn:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text-muted);
}

.action-btn:active {
  background: var(--color-background-muted);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* 📋 Dropdown Menu - Discord Style */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--bg-floating);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  z-index: var(--z-dropdown, 1000);
  overflow: hidden;
  animation: dropdownSlide 0.15s ease-out;
  /* Ensure proper stacking context */
  isolation: isolate;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.1s ease;
  line-height: 1.3;
  min-height: 40px;
}

.dropdown-item:hover {
  background: var(--color-primary);
  color: white;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.dropdown-item:hover .dropdown-icon {
  color: white;
}

/* 📦 Channels Container */
.channels-container {
  display: flex;
  flex-direction: column;
  padding: 0 8px;
}

/* 🎯 Empty State - Minimal & Elegant */
.empty-state {
  padding: 16px 16px;
  text-align: center;
}

.empty-text {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 400;
  line-height: 1.4;
}

.empty-action {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.15s ease;
  line-height: 1.3;
}

.empty-action:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-primary-hover);
}

.empty-action:active {
  background: var(--color-background-muted);
}

/* 🎬 Removed channel list animations to ensure sidebar stability */
.channel-list-enter-active,
.channel-list-leave-active,
.channel-list-enter-from,
.channel-list-leave-to,
.channel-list-move {
  transition: none !important;
}

/* 🔄 Spinning Animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* 📱 Mobile Responsive Design */
@media (max-width: 768px) {
  .channel-list {
    /* 📱 移动端滚动优化 */
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    /* 启用硬件加速 */
    transform: translateZ(0);
    will-change: scroll-position;
  }

  /* 📱 隐藏滚动条但保持功能 */
  .channel-list::-webkit-scrollbar {
    display: none;
  }

  .channel-list {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .channel-section {
    margin-bottom: 20px;
    /* 📱 移动端触摸优化 */
    touch-action: manipulation;
  }

  .section-header {
    padding: 0 8px;
    height: 32px;
    /* 📱 移动端点击区域优化 */
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .section-toggle {
    font-size: 13px;
    padding: 6px;
    margin: -6px;
    /* 📱 触摸友好的点击区域 */
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    touch-action: manipulation;
  }

  .section-count {
    font-size: 12px;
  }

  .action-btn {
    width: 24px;
    height: 24px;
    /* 📱 移动端按钮优化 */
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }

  .dropdown-menu {
    min-width: 200px;
    /* 📱 移动端下拉菜单优化 */
    max-width: 90vw;
    left: 50%;
    transform: translateX(-50%);
    right: auto;
  }

  .dropdown-item {
    padding: 10px 14px;
    font-size: 15px;
    /* 📱 触摸友好的菜单项 */
    min-height: 48px;
    display: flex;
    align-items: center;
    touch-action: manipulation;
  }

  .empty-state {
    padding: 20px 16px;
    /* 📱 移动端空状态优化 */
    text-align: center;
  }

  .empty-text {
    font-size: 14px;
    line-height: 1.5;
  }

  .empty-action {
    font-size: 14px;
    padding: 6px 12px;
    /* 📱 触摸友好的按钮 */
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  /* 📱 频道容器滚动优化 */
  .channels-container {
    padding: 0 8px;
    /* 📱 确保容器不会阻止滚动 */
    overflow: visible;
    height: auto;
    max-height: none;
  }

  /* 🎯 Touch-friendly enhancements */
  @media (hover: none) and (pointer: coarse) {
    .section-toggle,
    .action-btn,
    .dropdown-item,
    .empty-action {
      min-height: 44px;
      /* 📱 增加触摸反馈 */
      transition: background-color 0.15s ease, transform 0.1s ease;
    }

    .section-toggle:active,
    .action-btn:active,
    .dropdown-item:active,
    .empty-action:active {
      transform: scale(0.98);
      background-color: rgba(255, 255, 255, 0.1);
    }

    /* 📱 移动端悬停状态调整 */
    .section-toggle:hover,
    .action-btn:hover,
    .dropdown-item:hover,
    .empty-action:hover {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }

  /* 🎭 Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .channel-list {
      scroll-behavior: auto;
    }

    .toggle-icon,
    .action-btn,
    .dropdown-item,
    .empty-action {
      transition: none;
    }

    .dropdown-menu {
      animation: none;
    }

    .channel-list-enter-active,
    .channel-list-leave-active,
    .channel-list-move {
      transition: none;
    }
  }

  /* 🌙 Focus States for Accessibility */
  .section-toggle:focus-visible,
  .action-btn:focus-visible,
  .dropdown-item:focus-visible,
  .empty-action:focus-visible {
    outline: 2px solid rgba(88, 101, 242, 0.5);
    outline-offset: 2px;
  }

  /* 🎨 High Contrast Mode */
  @media (prefers-contrast: high) {
    .section-toggle {
      color: white;
    }

    .section-count {
      color: rgba(255, 255, 255, 0.7);
    }

    .dropdown-menu {
      border: 2px solid white;
    }

    .empty-text {
      color: rgba(255, 255, 255, 0.7);
    }
  }

  /* 📱 移动端性能优化 */
  .channel-section,
  .channels-container,
  .dropdown-menu {
    /* 启用硬件加速 */
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  /* 📱 移动端滚动指示器 */
  .channel-list::before {
    content: '';
    position: sticky;
    top: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
    z-index: 1;
    pointer-events: none;
  }

  .channel-list::after {
    content: '';
    position: sticky;
    bottom: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
    z-index: 1;
    pointer-events: none;
  }
}
</style>
