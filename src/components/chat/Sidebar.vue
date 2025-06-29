<template>
  <!-- 🎨 现代人体工学设计的侧边栏 -->
  <aside class="modern-sidebar">
    <WorkspaceHeader 
      :workspaceName="workspaceName" 
      @show-member-list="showWorkspaceUsers"
      @show-workspace-settings="showWorkspaceSettings"
    />

    <!-- 📋 导航区域 -->
    <nav class="sidebar-navigation">
      <!-- 🏠 主页导航 -->
      <section class="nav-section home-section">
        <ul class="channel-list">
          <li>
            <button @click="goHome" class="channel-item home-item" :class="{ 'active': activeChannelId === 'home' }">
              <div class="channel-icon home">
                <Icon name="home" />
              </div>
              <div class="channel-info">
                <span class="channel-name">Home</span>
              </div>
            </button>
          </li>
        </ul>
      </section>
      
      <!-- 📢 公开频道 -->
      <section class="nav-section">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <h2>Public Channels</h2>
          </div>
          <button @click="openCreateChatModal('channel')" class="add-button" title="Create public channel"
            aria-label="Create public channel">
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ul class="channel-list">
          <li v-for="channel in publicChannels" :key="`public-${channel.id}`">
            <button @click="selectChannel(channel.id)" class="channel-item"
              :class="{ 'active': channel.id === activeChannelId }" :aria-label="`Public channel ${channel.name}`">
              <div class="channel-icon public">
                <span class="hash">#</span>
              </div>
              <div class="channel-info">
                <span class="channel-name">{{ channel.name }}</span>
                <div v-if="channel.last_message" class="channel-preview">
                  {{ truncateMessage(channel.last_message.content) }}
                </div>
              </div>
              <div v-if="channel.unread_count > 0" class="unread-badge">
                {{ channel.unread_count > 99 ? '99+' : channel.unread_count }}
              </div>
            </button>
          </li>
          <li v-if="publicChannels.length === 0" class="empty-state-item">
            <div class="empty-text">No public channels yet</div>
            <div class="debug-info" v-if="props.channels.length > 0">
              Debug: {{ props.channels.length }} channels received, but none are public
            </div>
          </li>
        </ul>
      </section>

      <!-- 🔒 私有频道 -->
      <section class="nav-section">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2>Private Channels</h2>
          </div>
          <button @click="openCreateChatModal('private-channel')" class="add-button" title="Create private channel"
            aria-label="Create private channel">
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ul class="channel-list">
          <li v-for="channel in privateChannels" :key="`private-${channel.id}`">
            <button @click="selectChannel(channel.id)" class="channel-item"
              :class="{ 'active': channel.id === activeChannelId }" :aria-label="`Private channel ${channel.name}`">
              <div class="channel-icon private">
                <svg class="lock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div class="channel-info">
                <span class="channel-name">{{ channel.name }}</span>
                <!-- 🔧 NEW: 显示最后消息预览 -->
                <div v-if="channel.last_message" class="channel-preview">
                  {{ truncateMessage(channel.last_message.content) }}
                </div>
              </div>
              <div v-if="channel.unread_count > 0" class="unread-badge">
                {{ channel.unread_count > 99 ? '99+' : channel.unread_count }}
              </div>
            </button>
          </li>
          <!-- 🔧 NEW: 空状态提示 -->
          <li v-if="privateChannels.length === 0" class="empty-state-item">
            <div class="empty-text">No private channels yet</div>
            <div class="debug-info" v-if="props.channels.length > 0">
              Debug: {{ props.channels.length }} channels received, but none are private
            </div>
          </li>
        </ul>
      </section>

      <!-- 👥 Group Chats -->
      <section class="nav-section">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m0 0V9a3 3 0 00-6 0v4.341" />
            </svg>
            <h2>Groups</h2>
          </div>
          <button @click="openCreateChatModal('group')" class="add-button" title="Create group" aria-label="Create group">
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ul class="channel-list">
          <li v-for="group in groupChats" :key="`group-${group.id}`">
            <button @click="selectChannel(group.id)" class="channel-item"
              :class="{ 'active': group.id === activeChannelId }" :aria-label="`Group chat ${group.name}`">
              <div class="group-avatars">
                <div v-for="(member, index) in group.members.slice(0, 2)" :key="member.id || index" class="member-avatar"
                  :style="{ zIndex: 10 - index }">
                  {{ (member.name || member.fullname || 'U').charAt(0).toUpperCase() }}
                </div>
                <div v-if="group.members.length > 2" class="more-members">
                  +{{ group.members.length - 2 }}
                </div>
              </div>
              <div class="channel-info">
                <span class="channel-name">{{ group.name || 'Unnamed Group' }}</span>
                <!-- 🔧 NEW: 显示最后消息预览 -->
                <div v-if="group.last_message" class="channel-preview">
                  {{ truncateMessage(group.last_message.content) }}
                </div>
              </div>
              <div v-if="group.unread_count > 0" class="unread-badge">
                {{ group.unread_count > 99 ? '99+' : group.unread_count }}
              </div>
            </button>
          </li>
          <!-- 🔧 NEW: 空状态提示 -->
          <li v-if="groupChats.length === 0" class="empty-state-item">
            <div class="empty-text">No group chats yet</div>
            <div class="debug-info" v-if="props.groupChats.length > 0">
              Debug: {{ props.groupChats.length }} groups received
            </div>
          </li>
        </ul>
      </section>

      <!-- 💬 Direct Messages -->
      <section class="nav-section direct-messages">
        <div class="section-header">
          <div class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2>Direct Messages</h2>
          </div>
          <button @click="openCreateChatModal('direct')" class="add-button" title="Start direct message"
            aria-label="Start direct message">
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div class="dm-container">
          <ul class="dm-list">
            <li v-for="dm in directMessages" :key="`dm-${dm.id}`">
              <button @click="selectChannel(dm.id)" class="dm-item" :class="{ 'active': dm.id === activeChannelId }"
                :aria-label="`Direct message with ${dm.name}`">
                <div class="dm-avatar-container">
                  <div class="dm-avatar">
                    <span class="avatar-text">{{ dm.name.charAt(0).toUpperCase() }}</span>
                    <div class="presence-indicator" :class="{ 'online': dm.online }"></div>
                  </div>
                </div>
                <div class="dm-info">
                  <span class="dm-name">{{ dm.name }}</span>
                  <!-- 🔧 NEW: 显示最后消息预览 -->
                  <div v-if="dm.last_message" class="dm-preview">
                    {{ truncateMessage(dm.last_message.content, 25) }}
                  </div>
                </div>
                <div v-if="dm.unread_count > 0" class="unread-badge">
                  {{ dm.unread_count > 99 ? '99+' : dm.unread_count }}
                </div>
              </button>
            </li>
            <!-- 🔧 NEW: 空状态提示 -->
            <li v-if="directMessages.length === 0" class="empty-state-item">
              <div class="empty-text">No direct messages yet</div>
              <div class="debug-info" v-if="props.directMessages.length > 0">
                Debug: {{ props.directMessages.length }} DMs received
              </div>
            </li>
          </ul>
        </div>
      </section>
    </nav>
  </aside>

  <ChatCreateModal 
    :is-open="showChatCreateModal" 
    :initial-type="initialChatType"
    :is-private-channel="isPrivateChannel"
    @close="showChatCreateModal = false"
    @created="handleChatCreated"
  />

  <!-- Workspace Users Modal -->
  <WorkspaceUsersModal 
    v-if="showWorkspaceUsersModal"
    @close="showWorkspaceUsersModal = false"
    @user-selected="handleUserSelected"
  />

  <!-- Workspace Settings Modal -->
  <WorkspaceSettingsModal 
    v-if="showWorkspaceSettingsModal"
    @close="showWorkspaceSettingsModal = false"
  />

  <!-- User Profile Modal -->
  <UserProfileModal 
    v-if="selectedUser"
    :user="selectedUser"
    @close="selectedUser = null"
    @dm-created="handleDMCreated"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '@/components/ui/Icon.vue';
import ChatCreateModal from '@/components/modals/ChatCreateModal.vue';
import WorkspaceUsersModal from '@/components/modals/WorkspaceUsersModal.vue';
import WorkspaceSettingsModal from '@/components/modals/WorkspaceSettingsModal.vue';
import UserProfileModal from '@/components/user/UserProfileModal.vue';
import WorkspaceHeader from '@/components/sidebar/WorkspaceHeader.vue';
import { createNavigationEventHelper } from '@/services/NavigationEventManager.js';

const router = useRouter();

// 🎯 Initialize navigation event manager for sidebar
const navigationHelper = createNavigationEventHelper(router);

const showChatCreateModal = ref(false);
const initialChatType = ref('channel');
const isPrivateChannel = ref(false);
const showWorkspaceUsersModal = ref(false);
const showWorkspaceSettingsModal = ref(false);
const selectedUser = ref(null);

const props = defineProps({
  workspaceName: { type: String, default: 'Fechatter Workspace' },
  channels: { type: Array, default: () => [] },
  directMessages: { type: Array, default: () => [] },
  groupChats: { type: Array, default: () => [] },
  activeChannelId: { type: String, default: null }
});

const emit = defineEmits(['logout', 'select-channel', 'go-to-admin', 'chat-created']);

// 🔧 FIX: 简化过滤逻辑，增加调试信息
const publicChannels = computed(() => {
  const filtered = props.channels.filter(c => c.type === 'public' || c.chat_type === 'PublicChannel');
  console.log('🔍 [Sidebar] Public channels:', filtered.length, 'out of', props.channels.length);
  return filtered;
});

const privateChannels = computed(() => {
  const filtered = props.channels.filter(c => c.type === 'private' || c.chat_type === 'PrivateChannel');
  console.log('🔍 [Sidebar] Private channels:', filtered.length, 'out of', props.channels.length);
  return filtered;
});

function openCreateChatModal(type) {
  // 将 'private-channel' 映射为 'channel'，但设置为私有
  if (type === 'private-channel') {
    initialChatType.value = 'channel';
    isPrivateChannel.value = true;
  } else {
    initialChatType.value = type;
    isPrivateChannel.value = false;
  }
  showChatCreateModal.value = true;
}

function handleChatCreated(chat) {
  showChatCreateModal.value = false;
  emit('chat-created', chat);
}

async function selectChannel(channelId) {
  console.log('🎯 [Sidebar] Channel selected:', channelId);
  
  // 确保channelId是数字类型
  const numericChannelId = parseInt(channelId);
  if (isNaN(numericChannelId)) {
    console.error('❌ [Sidebar] Invalid channel ID:', channelId);
    return;
  }
  
  // 更新当前活跃频道
  activeChannelId.value = numericChannelId;
  
  // 🎯 NEW: Use NavigationEventManager for direct navigation from sidebar
  try {
    console.log('🎯 [Sidebar] Using NavigationEventManager for direct navigation to chat:', numericChannelId);
    await navigationHelper.navigateToChat(numericChannelId);
    console.log('✅ [Sidebar] Direct navigation completed successfully');
  } catch (error) {
    console.error('❌ [Sidebar] Direct navigation failed, falling back to parent emit:', error);
    
    // Fallback: emit to parent component
    emit('select-channel', numericChannelId);
  }
  
  console.log('✅ [Sidebar] Channel selection completed:', numericChannelId);
}

function goHome() {
  emit('select-channel', 'home');
}

function handleUserSelected(user) {
  selectedUser.value = user;
}

function handleDMCreated(chat) {
  selectedUser.value = null;
  emit('chat-created', chat);
}

// Workspace header event handlers
function showWorkspaceUsers() {
  showWorkspaceUsersModal.value = true;
}

function showWorkspaceSettings() {
  showWorkspaceSettingsModal.value = true;
}

// 🔧 NEW: 消息截断函数
function truncateMessage(content, maxLength = 30) {
  if (!content) return '';
  if (typeof content !== 'string') return '';
  return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}
</script>

<style scoped>
/* 🎨 现代人体工学侧边栏设计 - 生产级 + 黄金分割 */
.modern-sidebar {
  width: 100%; /* 使用父容器的100%宽度，由MainLayout控制比例 */
  height: 100vh;
  background: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-sidebar-border);
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  
  /* 🔧 GOLDEN RATIO: 字体系统基于黄金比例 - 增大基础字体 */
  --base-font-size: 16px; /* 从14px增加到16px */
  --font-xs: calc(var(--base-font-size) / 1.618); /* ~9.9px */
  --font-sm: calc(var(--base-font-size) / 1.272); /* ~12.6px */
  --font-base: var(--base-font-size); /* 16px */
  --font-md: calc(var(--base-font-size) * 1.127); /* ~18px */
  --font-lg: calc(var(--base-font-size) * 1.272); /* ~20.4px */
  --font-xl: calc(var(--base-font-size) * 1.618); /* ~25.9px */
  
  /* 🔧 GOLDEN RATIO: 间距系统 */
  --space-xs: 4px;
  --space-sm: calc(var(--space-xs) * 1.618); /* ~6.5px */
  --space-base: calc(var(--space-sm) * 1.618); /* ~10.5px */
  --space-md: calc(var(--space-base) * 1.618); /* ~17px */
  --space-lg: calc(var(--space-md) * 1.618); /* ~27.5px */
  --space-xl: calc(var(--space-lg) * 1.618); /* ~44.5px */
  
  /* 🔧 GOLDEN RATIO: 图标系统 */
  --icon-xs: 12px;
  --icon-sm: calc(var(--icon-xs) * 1.272); /* ~15.3px */
  --icon-base: calc(var(--icon-xs) * 1.618); /* ~19.4px */
  --icon-md: calc(var(--icon-base) * 1.272); /* ~24.7px */
  --icon-lg: calc(var(--icon-md) * 1.272); /* ~31.4px */
}

/* 📋 导航区域 */
.sidebar-navigation {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg) 0;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--color-sidebar-text-muted) transparent;
}

.sidebar-navigation::-webkit-scrollbar {
  width: 4px; /* 黄金比例优化 */
}

.sidebar-navigation::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-navigation::-webkit-scrollbar-thumb {
  background: var(--color-sidebar-text-muted);
  border-radius: 2px;
  opacity: 0.3;
}

.sidebar-navigation::-webkit-scrollbar-thumb:hover {
  opacity: 0.6;
}

.nav-section {
  margin-bottom: var(--space-xl);
  padding: 0 var(--space-md);
}

.nav-section:last-child {
  margin-bottom: 0;
}

/* 🏠 Home导航特殊样式 */
.nav-section.home-section {
  margin-bottom: var(--space-xl);
  padding: 0 var(--space-md) var(--space-lg) var(--space-md);
  border-bottom: 1px solid var(--color-sidebar-border);
}

.nav-section.direct-messages {
  flex: 1;
  margin-bottom: 0;
}

/* 📂 节区头部 - 黄金比例优化 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-base);
  padding: var(--space-xs) var(--space-sm);
  height: calc(var(--space-xl) * 0.618); /* 黄金比例高度 */
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-title h2 {
  font-size: var(--font-xs); /* 黄金比例字体 */
  font-weight: 700; /* 加强权重提升可读性 */
  color: var(--color-sidebar-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em; /* 优化字母间距 */
  margin: 0;
  line-height: 1.2;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.section-icon {
  width: var(--icon-sm); /* 黄金比例图标 */
  height: var(--icon-sm);
  color: var(--color-sidebar-text-muted);
  flex-shrink: 0;
  stroke-width: 2.5;
  opacity: 0.8;
}

/* 📋 频道列表 */
.channel-list,
.dm-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 🔧 GOLDEN RATIO: 消息预览样式 */
.channel-preview,
.dm-preview {
  font-size: var(--font-xs); /* 黄金比例字体 */
  color: var(--color-sidebar-text-muted);
  margin-top: calc(var(--space-xs) / 2); /* 精确间距 */
  line-height: 1.272; /* 黄金比例行高 */
  opacity: 0.72; /* 黄金比例透明度 */
  max-width: calc(var(--icon-lg) * 5.09); /* ~160px 黄金比例宽度 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.dm-preview {
  max-width: calc(var(--icon-lg) * 4.46); /* ~140px DM preview shorter */
}

/* 🔧 GOLDEN RATIO: 空状态样式 */
.empty-state-item {
  padding: var(--space-md);
  text-align: center;
  opacity: 0.618; /* 黄金比例透明度 */
}

.empty-text {
  font-size: var(--font-sm); /* 黄金比例字体 */
  color: var(--color-sidebar-text-muted);
  font-style: italic;
  font-weight: 400;
  margin-bottom: var(--space-xs);
  line-height: 1.272;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.debug-info {
  font-size: var(--font-xs); /* 黄金比例字体 */
  color: var(--color-sidebar-text-muted);
  opacity: 0.5;
  margin-top: var(--space-xs);
  line-height: 1.2;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.channel-list li,
.dm-list li {
  margin-bottom: calc(var(--space-xs) / 2); /* 精确间距 */
}

/* 📂 频道项目 - 黄金比例设计 */
.channel-item,
.dm-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-base); /* 黄金比例间距 */
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  color: var(--color-sidebar-text-muted);
  font-size: var(--font-sm); /* 黄金比例字体 */
  font-weight: 500;
  border-radius: calc(var(--space-sm) * 1.272); /* 黄金比例圆角 */
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  min-height: calc(var(--space-xl) * 0.618); /* 黄金比例高度 */
  line-height: 1.272; /* 黄金比例行高 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.channel-item:hover,
.dm-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text);
  transform: translateX(var(--space-xs));
}

.channel-item.active,
.dm-item.active {
  background: var(--color-sidebar-active);
  color: var(--color-sidebar-text);
  font-weight: 600;
  box-shadow: inset var(--space-xs) 0 0 var(--color-primary-light);
}

/* 🎭 频道图标 - 黄金比例设计 */
.channel-icon {
  width: var(--icon-base); /* 黄金比例图标 */
  height: var(--icon-base);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.channel-icon.public {
  background: transparent;
  border: 1.5px solid var(--color-sidebar-text-muted);
}

.channel-icon.public .hash {
  font-size: var(--font-sm); /* 黄金比例字体 */
  font-weight: 700;
  color: var(--color-sidebar-text-muted);
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.channel-item:hover .channel-icon.public {
  border-color: var(--color-sidebar-text);
  transform: scale(1.05);
}

.channel-item:hover .channel-icon.public .hash {
  color: var(--color-sidebar-text);
}

.channel-item.active .channel-icon.public {
  border-color: var(--color-sidebar-text);
  background: var(--color-sidebar-text);
}

.channel-item.active .channel-icon.public .hash {
  color: var(--color-sidebar-bg);
}

.channel-icon.private {
  background: transparent;
  border: 1.5px solid var(--color-sidebar-text-muted);
}

.lock-icon {
  width: var(--icon-sm); /* 黄金比例图标 */
  height: var(--icon-sm);
  color: var(--color-sidebar-text-muted);
  transition: all 0.2s ease;
  stroke-width: 2.5;
}

.channel-item:hover .channel-icon.private {
  border-color: var(--color-sidebar-text);
  transform: scale(1.05);
}

.channel-item:hover .lock-icon {
  color: var(--color-sidebar-text);
}

.channel-item.active .channel-icon.private {
  border-color: var(--color-sidebar-text);
  background: var(--color-sidebar-text);
}

.channel-item.active .lock-icon {
  color: var(--color-sidebar-bg);
}

/* 📝 频道信息 - 黄金比例布局 */
.channel-info,
.dm-info {
  flex: 1;
  min-width: 0;
  overflow: hidden; /* 防止内容溢出 */
}

.channel-name,
.dm-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.272; /* 黄金比例行高 */
  font-size: var(--font-sm); /* 黄金比例字体 */
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

/* 👥 群组头像 - 黄金比例设计 */
.group-avatars {
  display: flex;
  align-items: center;
  position: relative;
  width: var(--icon-base); /* 黄金比例尺寸 */
  height: var(--icon-base);
  flex-shrink: 0;
}

.member-avatar {
  width: calc(var(--icon-base) * 0.8); /* 16px */
  height: calc(var(--icon-base) * 0.8);
  border-radius: 50%;
  background: transparent;
  border: 1.5px solid var(--color-sidebar-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-xs); /* 黄金比例字体 */
  font-weight: 600;
  color: var(--color-sidebar-text-muted);
  position: absolute;
  transition: all 0.15s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.member-avatar:first-child {
  left: 0;
  top: 0;
}

.member-avatar:last-child {
  right: 0;
  bottom: 0;
}

.more-members {
  position: absolute;
  right: calc(var(--space-xs) * -2);
  bottom: calc(var(--space-xs) * -1);
  font-size: var(--font-xs);
  color: var(--color-sidebar-text-muted);
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.channel-item:hover .member-avatar {
  border-color: var(--color-sidebar-text);
  color: var(--color-sidebar-text);
}

.channel-item.active .member-avatar {
  border-color: var(--color-sidebar-text);
  background: var(--color-sidebar-text);
  color: var(--color-sidebar-bg);
}

/* 💬 DM Avatar - Golden Ratio Design */
.dm-avatar-container {
  position: relative;
  flex-shrink: 0;
}

.dm-avatar {
  width: var(--icon-base); /* 黄金比例尺寸 */
  height: var(--icon-base);
  border-radius: 50%;
  background: transparent;
  border: 1.5px solid var(--color-sidebar-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.15s ease;
}

.avatar-text {
  font-size: var(--font-sm); /* 黄金比例字体 */
  font-weight: 600;
  color: var(--color-sidebar-text-muted);
  line-height: 1;
  transition: all 0.15s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.dm-item:hover .dm-avatar {
  border-color: var(--color-sidebar-text);
}

.dm-item:hover .avatar-text {
  color: var(--color-sidebar-text);
}

.dm-item.active .dm-avatar {
  border-color: var(--color-sidebar-text);
  background: var(--color-sidebar-text);
}

.dm-item.active .avatar-text {
  color: var(--color-sidebar-bg);
}

.presence-indicator {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: calc(var(--space-sm) * 1.272); /* 黄金比例尺寸 */
  height: calc(var(--space-sm) * 1.272);
  border-radius: 50%;
  border: 1px solid var(--color-sidebar-bg);
  background: var(--color-sidebar-text-muted);
  transition: all 0.15s ease;
}

.presence-indicator.online {
  background: var(--color-online);
}

/* 📊 未读消息指示器 - 黄金比例设计 */
.unread-badge {
  background: var(--color-danger);
  color: var(--color-sidebar-text);
  font-size: var(--font-xs); /* 黄金比例字体 */
  font-weight: 700;
  border-radius: calc(var(--space-sm) * 1.618); /* 黄金比例圆角 */
  padding: calc(var(--space-xs) / 2) var(--space-sm);
  min-width: calc(var(--icon-sm) * 1.2);
  text-align: center;
  line-height: 1.2;
  flex-shrink: 0;
  margin-left: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

/* 🏠 Home按钮特殊样式 - 黄金比例设计 */
.channel-item.home-item {
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
  background: transparent;
  border-radius: calc(var(--space-sm) * 1.272);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  min-height: calc(var(--space-xl) * 0.764); /* 黄金比例高度 */
}

.channel-item.home-item:hover {
  background: var(--color-sidebar-hover);
  transform: translateX(var(--space-xs));
}

.channel-item.home-item.active {
  background: var(--color-sidebar-active);
  box-shadow: inset var(--space-xs) 0 0 var(--color-sidebar-text);
}

.channel-icon.home {
  background: transparent;
  width: var(--icon-md); /* 黄金比例图标 */
  height: var(--icon-md);
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.channel-item.home-item:hover .channel-icon.home {
  transform: scale(1.1);
}

.channel-item.home-item.active .channel-icon.home {
  background: rgba(255, 255, 255, 0.1);
}

.channel-icon.home :deep(.icon) {
  width: var(--icon-base); /* 黄金比例图标 */
  height: var(--icon-base);
  color: var(--color-sidebar-text-muted);
  transition: all 0.2s ease;
}

.channel-item.home-item:hover .channel-icon.home :deep(.icon) {
  color: var(--color-sidebar-text);
}

.channel-item.home-item.active .channel-icon.home :deep(.icon) {
  color: var(--color-sidebar-text);
}

/* ➕ 添加按钮 - 黄金比例设计 */
.add-button {
  width: calc(var(--icon-md) * 0.9); /* 黄金比例尺寸 */
  height: calc(var(--icon-md) * 0.9);
  border: none;
  background: transparent;
  color: var(--color-sidebar-text-muted);
  border-radius: calc(var(--space-xs) * 1.272);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.add-button:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text);
  transform: scale(1.1);
  border-radius: calc(var(--space-sm) * 1.272);
}

.add-button:active {
  transform: scale(0.95);
}

.add-icon {
  width: var(--icon-sm); /* 黄金比例图标 */
  height: var(--icon-sm);
  stroke-width: 2.5;
}
</style>

