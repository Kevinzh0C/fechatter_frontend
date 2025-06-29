<template>
  <!-- 🎨 Slack风格的欢迎页面 -->
  <div class="slack-welcome">
    <div class="welcome-container">
      <!-- 🌟 欢迎头部区域 -->
      <header class="welcome-header">
        <div class="user-greeting">
          <div class="avatar-container">
            <Avatar :user="user" size="large" class="welcome-avatar" />
            <div class="status-indicator"></div>
          </div>
          <div class="greeting-text">
            <h1 class="welcome-title">Welcome back, {{ userDisplayName }}!</h1>
            <p class="welcome-subtitle">
              You're in the <strong>{{ workspaceName }}</strong> workspace. Ready to collaborate?
            </p>
          </div>
        </div>

        <!-- 工作区统计 -->
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-number">{{ channelCount }}</div>
            <div class="stat-label">Channels</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ memberCount }}</div>
            <div class="stat-label">Members</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ messageCount }}</div>
            <div class="stat-label">Messages</div>
          </div>
        </div>
      </header>

      <!-- 🔄 加载状态 -->
      <div v-if="loading" class="loading-section">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading workspace data...</div>
        
        <!-- 错误状态 -->
        <div v-if="loadError" class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">{{ loadError }}</div>
          <button @click="retryLoading" class="retry-btn">Retry</button>
        </div>
      </div>

      <!-- 🎯 快速操作区域 -->
      <section class="quick-actions">
        <div class="action-buttons">
          <button @click="createChannel" class="action-btn primary">
            <span class="btn-icon">+</span>
            Create a channel
          </button>
          <button @click="browseChannels" class="action-btn secondary">
            <span class="btn-icon">🔍</span>
            Browse channels
          </button>
          <button @click="sendMessage" class="action-btn secondary">
            <span class="btn-icon">✉️</span>
            Send a message
          </button>
        </div>
      </section>

      <!-- 📋 最近频道 -->
      <section v-if="recentChannels.length > 0" class="recent-channels">
        <h2 class="section-title">Your channels</h2>
        <div class="channels-list">
          <div v-for="channel in recentChannels" :key="channel.id" 
               @click="$emit('navigate-channel', channel.id)"
               class="channel-item">
            <div class="channel-icon">
              {{ channel.chat_type === 'PrivateChannel' ? '🔒' : '#' }}
            </div>
            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-desc">{{ channel.description || 'No description' }}</div>
            </div>
            <div class="channel-arrow">→</div>
          </div>
        </div>
      </section>

      <!-- ✨ 功能介绍 -->
      <section class="features-section">
        <h2 class="section-title">What you can do here</h2>
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon">💬</div>
            <h3>Real-time Chat</h3>
            <p>Instant messaging with your team members across channels</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📁</div>
            <h3>File Sharing</h3>
            <p>Share documents, images, and files with your colleagues</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔍</div>
            <h3>Smart Search</h3>
            <p>Find any message, file, or conversation instantly with powerful search</p>
          </div>
        </div>
      </section>

      <!-- 🚀 快速入门 -->
      <section class="getting-started">
        <h2 class="section-title">Getting started</h2>
        <div class="tips-list">
          <div class="tip-item">
            <div class="tip-number">1</div>
            <div class="tip-content">
              <span class="tip-text">Join existing channels or create new ones to organize conversations</span>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-number">2</div>
            <div class="tip-content">
              <span class="tip-text">Use @ mentions to notify specific team members</span>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-number">3</div>
            <div class="tip-content">
              <span class="tip-text">Share files by dragging and dropping them into the message area</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { useChatStore } from '@/stores/chat';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Avatar from '@/components/common/Avatar.vue';
import { unifiedMessageService } from '@/services/messageSystem/UnifiedMessageService.js';

// Emits
const emit = defineEmits(['create-channel', 'create-dm', 'join-channel', 'navigate-channel', 'browse-channels']);

// Stores
const workspaceStore = useWorkspaceStore();
const chatStore = useChatStore();
const authStore = useAuthStore();
const router = useRouter();

// Computed properties for loading and error state from stores
const loading = computed(() => {
  return (chatStore?.isLoading ?? false) || (workspaceStore?.isLoading ?? false);
});
const loadError = computed(() => {
  return chatStore?.error || workspaceStore?.error || null;
});

// Computed properties for display
const user = computed(() => authStore.user || {});
const userDisplayName = computed(() => {
  const fullname = user.value?.fullname;
  if (!fullname || typeof fullname !== 'string') {
    return user.value?.name || user.value?.username || 'Super';
  }
  const firstName = fullname.trim().split(' ')[0];
  return firstName || 'Super';
});

const workspaceName = computed(() => workspaceStore.workspaceName);

// 修复频道计数 - 考虑所有可能的频道类型
const channelCount = computed(() => {
  try {
    // 获取所有类型的频道（不包括DM/Single类型）
    const channels = chatStore.chats.filter(c => {
      // 规范化频道类型以处理不一致的命名
      const chatType = c.chat_type?.toLowerCase() || '';
      
      // 排除DM/Single类型
      const isDM = chatType.includes('single') || 
                  chatType.includes('dm') || 
                  chatType.includes('direct');
      
      return !isDM && c.is_active !== false;
    });
    
    return channels.length;
  } catch (error) {
    console.warn('[WelcomeContent] Error calculating channel count:', error);
    return 0;
  }
});

// 修复成员计数 - 综合多种数据源获取最准确的成员数量
const memberCount = computed(() => {
  try {
    // 首先尝试从workspaceStore获取成员数量
    const storeCount = workspaceStore.memberCount;
    if (storeCount && storeCount > 0) {
      return storeCount;
    }
    
    // 如果workspaceStore没有数据，尝试从workspaceUsers获取
    const usersCount = workspaceStore.workspaceUsers?.length;
    if (usersCount && usersCount > 0) {
      return usersCount;
    }
    
    // 如果上述方法都失败，尝试从聊天成员中获取唯一用户ID
    if (chatStore.chats && chatStore.chats.length > 0) {
      // 收集所有聊天中的唯一成员ID
      const uniqueMembers = new Set();
      
      chatStore.chats.forEach(chat => {
        if (chat.chat_members && Array.isArray(chat.chat_members)) {
          chat.chat_members.forEach(memberId => {
            if (memberId) uniqueMembers.add(memberId);
          });
        }
      });
      
      // 如果找到了成员，返回数量
      if (uniqueMembers.size > 0) {
        return uniqueMembers.size;
      }
    }
    
    // 如果所有方法都失败，返回1（至少有当前用户）
    return 1;
  } catch (error) {
    console.warn('[WelcomeContent] Error calculating member count:', error);
    return 1; // 至少有当前用户
  }
});

// 修复消息计数 - 使用更高效的方法计算消息总数
const messageCount = computed(() => {
  try {
    // 首先尝试从统计数据中获取
    if (unifiedMessageService.stats && typeof unifiedMessageService.stats.totalMessages === 'number') {
      return unifiedMessageService.stats.totalMessages;
    }
    
    // 如果统计数据不可用，则使用最近聊天的最后消息ID作为估计值
    // 这比遍历所有消息更高效
    if (chatStore.chats && chatStore.chats.length > 0) {
      const chatWithLastMessage = chatStore.chats
        .filter(chat => chat.last_message && chat.last_message.id)
        .sort((a, b) => {
          const idA = parseInt(a.last_message?.id || 0);
          const idB = parseInt(b.last_message?.id || 0);
          return idB - idA; // 降序排列
        })[0];
      
      if (chatWithLastMessage?.last_message?.id) {
        // 使用最大消息ID作为估计值，这通常与消息总数相关
        return parseInt(chatWithLastMessage.last_message.id);
      }
    }
    
    // 如果上述方法都失败，则返回聊天数量的10倍作为估计值
    return Math.max(chatStore.chats.length * 10, 0);
  } catch (error) {
    console.warn('[WelcomeContent] Error calculating message count:', error);
    return 0;
  }
});

const recentChannels = computed(() => {
  return chatStore.chats?.slice(0, 3) || [];
});

// Methods
const retryLoading = () => {
  console.log('[WelcomeContent] Retrying workspace data load via store.');
  // 同时刷新聊天和工作区数据
  Promise.all([
    chatStore.fetchChats({ force: true }),
    workspaceStore.fetchWorkspaceUsers(),
    workspaceStore.fetchWorkspaceChats()
  ]).catch(error => {
    console.error('[WelcomeContent] Retry failed:', error);
  });
};

const createChannel = () => {
  // 使用emit事件触发创建频道模态框
  console.log('[WelcomeContent] Emitting create-channel event');
  emit('create-channel');
};

const sendMessage = () => {
  // 使用emit事件触发创建DM模态框
  console.log('[WelcomeContent] Emitting create-dm event');
  emit('create-dm');
};

const browseChannels = () => {
  // 如果有频道，则展示频道列表
  if (chatStore.chats && chatStore.chats.length > 0) {
    console.log('[WelcomeContent] Emitting browse-channels event');
    emit('browse-channels');
  } else {
    // 如果没有频道，则触发创建频道事件
    console.log('[WelcomeContent] No channels found, emitting create-channel event');
    emit('create-channel');
  }
};

// Lifecycle hooks - no longer needed for data loading
onMounted(() => {
  // 如果没有数据或数据不完整，尝试刷新
  const needsRefresh = (
    (chatStore?.chats && chatStore.chats.length === 0) || 
    (workspaceStore?.workspaceUsers && workspaceStore.workspaceUsers.length === 0)
  ) && !loading.value;
  
  if (needsRefresh) {
    console.log('[WelcomeContent] 数据不完整，触发刷新');
    // 添加延时以避免竞态条件
    setTimeout(() => {
      retryLoading();
    }, 100);
  } else {
    console.log('[WelcomeContent] 数据已加载，无需刷新');
  }
});
</script>

<style scoped>
/* 🎨 Slack风格设计系统 */
.slack-welcome {
  height: 100vh;
  width: 100vw;
  background-color: #f8f9fa;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  position: relative;
}

.welcome-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 🌟 欢迎头部 */
.welcome-header {
  text-align: center;
  margin-bottom: 2rem;
}

.user-greeting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.avatar-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.welcome-avatar {
  border-radius: 50%;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #f8f9fa;
  background-color: #00d26a;
}

.greeting-text {
  flex: 1;
  text-align: left;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #1d1c1d;
}

.welcome-subtitle {
  font-size: 1.1rem;
  color: #616061;
  line-height: 1.5;
}

/* 统计数据 */
.stats-row {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 100px;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1264a3;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #616061;
  font-weight: 500;
}

/* 🔄 加载状态 */
.loading-section {
  text-align: center;
  padding: 2rem;
  margin-bottom: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  margin-bottom: 1rem;
  border: 3px solid #e1e5e9;
  border-radius: 50%;
  border-top-color: #1264a3;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1rem;
  color: #616061;
  margin-bottom: 1rem;
}

.error-state {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8d7da;
  border-radius: 8px;
  color: #721c24;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.error-icon {
  font-size: 1.5rem;
}

.error-message {
  font-size: 0.95rem;
  text-align: center;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1.5rem;
  background-color: #d73527;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #b52d20;
}

/* 🎯 快速操作 */
.quick-actions {
  margin-bottom: 2rem;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  font-size: 14px;
  border: none;
}

.primary {
  background-color: #1264a3;
  color: white;
}

.primary:hover {
  background-color: #0f5582;
}

.secondary {
  background-color: white;
  color: #1264a3;
  border: 1px solid #e1e5e9;
}

.secondary:hover {
  background-color: #f8f9fa;
  border-color: #1264a3;
}

.btn-icon {
  font-size: 1rem;
}

.section-title {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #1d1c1d;
  font-weight: 700;
}

/* 📋 最近频道 */
.recent-channels {
  margin-bottom: 2rem;
}

.channels-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.channel-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.channel-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.channel-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e1e5e9;
  color: #616061;
  border-radius: 4px;
  margin-right: 0.75rem;
  font-size: 1rem;
}

.channel-info {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  color: #1d1c1d;
  margin-bottom: 0.25rem;
}

.channel-desc {
  font-size: 0.85rem;
  color: #616061;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel-arrow {
  color: #616061;
  font-size: 1.2rem;
  margin-left: 0.5rem;
}

/* ✨ 功能介绍 */
.features-section {
  margin-bottom: 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.feature-item:hover {
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-item h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #1d1c1d;
  font-weight: 600;
}

.feature-item p {
  font-size: 0.9rem;
  color: #616061;
  line-height: 1.4;
}

/* 🚀 快速入门 */
.getting-started {
  margin-bottom: 2rem;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tip-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1264a3;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-text {
  font-size: 0.95rem;
  color: #1d1c1d;
  line-height: 1.4;
}

/* 滚动条样式 */
.slack-welcome::-webkit-scrollbar {
  width: 8px;
}

.slack-welcome::-webkit-scrollbar-track {
  background: transparent;
}

.slack-welcome::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.slack-welcome::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 📱 响应式设计 */
@media (max-width: 768px) {
  .welcome-container {
    padding: 1.5rem;
  }
  
  .welcome-title {
    font-size: 1.5rem;
  }
  
  .user-greeting {
    flex-direction: column;
    gap: 1rem;
  }
  
  .greeting-text {
    text-align: center;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stat-item {
    min-width: auto;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .channels-list {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>