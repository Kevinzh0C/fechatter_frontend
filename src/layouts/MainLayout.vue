<template>
  <div class="app-container" :class="{ 'mobile-mode': isMobile }">
    <!-- 📱 移动端滑动提示指示器 -->
    <div v-if="isMobile && !sidebarVisible" class="mobile-swipe-indicator"></div>
    
    <!-- 📱 移动端遮罩层 -->
    <div v-if="isMobile && sidebarVisible" class="mobile-overlay" @click="closeSidebar"></div>
    
    <aside class="global-sidebar mobile-sidebar" :class="{ 'mobile-visible': sidebarVisible }">
      <div class="global-sidebar-content">
        <Sidebar 
          :workspaceName="workspaceStore.workspaceName"
          :channels="channels" 
          :directMessages="directMessages" 
          :groupChats="groupMessages"
          :activeChannelId="currentChatId" 
          @select-channel="handleChannelSelected"
          @chat-created="handleChatCreated"
        />
      </div>
      <UserBottomBar @logout="handleLogout" />
    </aside>
    <main class="global-main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sidebar from '@/components/chat/Sidebar.vue';
import UserBottomBar from '@/components/layout/UserBottomBar.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useWorkspaceStore } from '@/stores/workspace';
import { useMobileSwipe } from '@/composables/useMobileSwipe';
import presenceService from '@/services/presence.js';
import { createNavigationEventHelper } from '@/services/NavigationEventManager.js';

const authStore = useAuthStore();
const chatStore = useChatStore();
const workspaceStore = useWorkspaceStore();
const route = useRoute();
const router = useRouter();

// 🎯 Initialize navigation event manager
const navigationHelper = createNavigationEventHelper(router);

// 📱 移动端滑动管理
const {
  isMobile,
  sidebarVisible,
  openSidebar,
  closeSidebar,
  toggleSidebar
} = useMobileSwipe({
  sidebarWidth: 260,
  edgeThreshold: 20,
  swipeThreshold: 50,
  velocityThreshold: 0.3
});

// 🔧 FIX: 修复数据流问题 - 正确分类并映射聊天类型
const channels = computed(() => {
  return chatStore.chats
    .filter(c => c.chat_type === 'PublicChannel' || c.chat_type === 'PrivateChannel')
    .map(chat => ({
      ...chat,
      type: chat.chat_type === 'PublicChannel' ? 'public' : 'private', // 📝 映射到Sidebar期望的字段
      name: chat.name || chat.display_name || 'Unnamed Channel',
      unread_count: chat.unread_count || 0,
      id: chat.id
    }));
});

const directMessages = computed(() => {
  return chatStore.chats
    .filter(c => c.chat_type === 'Single' || c.chat_type === 'DirectMessage')
    .map(chat => ({
      ...chat,
      name: chat.display_name || chat.name || 'Unknown User',
      unread_count: chat.unread_count || 0,
      online: true, // 🔧 TODO: 从presence服务获取真实状态
      id: chat.id
    }));
});

const groupMessages = computed(() => {
  return chatStore.chats
    .filter(c => c.chat_type === 'Group')
    .map(chat => ({
      ...chat,
      name: chat.name || chat.display_name || 'Unnamed Group',
      members: chat.chat_members || [],
      unread_count: chat.unread_count || 0,
      id: chat.id
    }));
});
const currentChatId = computed(() => route.params.id ? parseInt(route.params.id, 10) : null);

const handleChannelSelected = async (channel) => {
  console.log('🎯 [MainLayout] Channel selected:', channel);
  
  const chatId = channel.id || channel;
  
  // Handle home navigation
  if (chatId === 'home') {
    console.log('🏠 [MainLayout] Navigating to home');
    try {
      await router.push('/home');
      // 📱 移动端自动关闭侧边栏
      if (isMobile.value && sidebarVisible.value) {
        console.log('📱 [MainLayout] Auto-closing mobile sidebar after home navigation');
        closeSidebar();
      }
    } catch (error) {
      console.error('❌ [MainLayout] Home navigation failed:', error);
      window.location.href = '/home';
    }
    return;
  }

  // Validate chat ID
  const numericChatId = parseInt(chatId, 10);
  if (isNaN(numericChatId)) {
    console.error('❌ [MainLayout] Invalid chat ID:', chatId);
    return;
  }
  
  // Use systematic navigation event manager
  try {
    console.log('🎯 [MainLayout] Using NavigationEventManager for systematic navigation to chat:', numericChatId);
    await navigationHelper.navigateToChat(numericChatId);
    console.log('✅ [MainLayout] Systematic navigation completed successfully');
  } catch (error) {
    console.error('❌ [MainLayout] Systematic navigation failed:', error);
    
    // Final fallback: direct navigation
    console.log('🔄 [MainLayout] Using final fallback navigation');
    window.location.href = `/chat/${numericChatId}`;
  }
};

const refreshData = async () => {
  console.log('🔄 [MainLayout] Starting comprehensive data refresh...');
  
  try {
    // 并行获取工作区数据和聊天数据
    const [workspaceChats, chatData] = await Promise.allSettled([
      workspaceStore.fetchWorkspaceChats(),
      chatStore.fetchChats({ skipDeduplication: false })
    ]);
    
    // 检查工作区聊天数据结果
    if (workspaceChats.status === 'fulfilled' && workspaceChats.value) {
      console.log('✅ [MainLayout] Workspace chats loaded:', workspaceChats.value.length);
      
      // 合并工作区数据到聊天store，避免覆盖现有数据
      const existingChatIds = new Set(chatStore.chats.map(c => c.id));
      const newChats = workspaceChats.value.filter(chat => !existingChatIds.has(chat.id));
      
      if (newChats.length > 0) {
        chatStore.chats.push(...newChats);
        console.log(`📝 [MainLayout] Added ${newChats.length} new chats from workspace`);
      }
    } else if (workspaceChats.status === 'rejected') {
      console.warn('⚠️ [MainLayout] Workspace chats fetch failed:', workspaceChats.reason);
    }
    
    // 检查聊天数据结果
    if (chatData.status === 'fulfilled') {
      console.log('✅ [MainLayout] Chat data refreshed');
    } else {
      console.warn('⚠️ [MainLayout] Chat data fetch failed:', chatData.reason);
    }
    
    // 获取工作区用户信息
    await workspaceStore.fetchWorkspaceUsers();
    console.log('✅ [MainLayout] Workspace users loaded');
    
  } catch (error) {
    console.error('❌ [MainLayout] Data refresh failed:', error);
  }
};

const handleLogout = async () => {
  await presenceService.cleanup();
  await authStore.logout(undefined, false);
};

const handleChatCreated = (chat) => {
  console.log('🎯 [MainLayout] Chat created:', chat);
  refreshData();
  if (chat && chat.id) {
    router.push(`/chat/${chat.id}`);
  }
};

onMounted(async () => {
  console.log('🚀 [MainLayout] Initializing...');
  
  // 🔧 FIX: 确保数据正确加载
  try {
    await chatStore.initialize();
    await workspaceStore.fetchCurrentWorkspace(); // 📝 获取workspace信息
    await refreshData();
    console.log('✅ [MainLayout] Data initialized:', {
      totalChats: chatStore.chats.length,
      channels: channels.value.length,
      directMessages: directMessages.value.length,
      groupMessages: groupMessages.value.length,
      workspaceName: workspaceStore.workspaceName
    });
  } catch (error) {
    console.error('❌ [MainLayout] Initialization failed:', error);
  }
  
  // 📱 全局移动端滑动管理器暴露给其他组件
  if (typeof window !== 'undefined') {
    window.mobileSwipeManager = {
      isMobile,
      sidebarVisible,
      openSidebar,
      closeSidebar,
      toggleSidebar
    };
    
    console.log('📱 [MainLayout] Mobile swipe manager initialized:', {
      isMobile: isMobile.value,
      sidebarVisible: sidebarVisible.value
    });
  }
});
</script>

<style scoped>
/* 📐 黄金比例布局系统 - 最佳视觉比例 */
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  --golden-ratio: 1.618;
  --sidebar-ratio: 0.236; /* φ^-2 ≈ 23.6% */
  --content-ratio: 0.764; /* 1 - sidebar-ratio ≈ 76.4% */
}

/* 🎯 桌面端最佳比例布局 */
.global-sidebar {
  width: calc(100vw * var(--sidebar-ratio));
  min-width: 240px;
  max-width: 320px;
  background: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-sidebar-border);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.global-sidebar-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.global-main-content {
  width: calc(100vw * var(--content-ratio));
  flex: 1;
  background: var(--color-background);
  color: var(--color-text);
  overflow-y: auto;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 📏 大屏幕优化 (>1600px) - 调整比例以避免过宽 */
@media (min-width: 1600px) {
  .app-container {
    --sidebar-ratio: 0.2; /* 20% */
    --content-ratio: 0.8; /* 80% */
  }
  
  .global-sidebar {
    max-width: 280px;
  }
}

/* 📏 中等屏幕优化 (1200px-1600px) - 标准黄金比例 */
@media (min-width: 1200px) and (max-width: 1599px) {
  .app-container {
    --sidebar-ratio: 0.236; /* φ^-2 */
    --content-ratio: 0.764;
  }
}

/* 📏 小屏幕优化 (900px-1199px) - 稍微增加sidebar比例 */
@media (min-width: 900px) and (max-width: 1199px) {
  .app-container {
    --sidebar-ratio: 0.28; /* 28% */
    --content-ratio: 0.72; /* 72% */
  }
  
  .global-sidebar {
    min-width: 220px;
    max-width: 260px;
  }
}

/* 📏 平板端优化 (769px-899px) - 增加sidebar可见性 */
@media (min-width: 769px) and (max-width: 899px) {
  .app-container {
    --sidebar-ratio: 0.32; /* 32% */
    --content-ratio: 0.68; /* 68% */
  }
  
  .global-sidebar {
    min-width: 200px;
    max-width: 240px;
  }
}

/* 📱 移动端滑动侧边栏样式 */
@media (max-width: 768px) {
  .app-container {
    position: relative;
    overflow: hidden;
    --sidebar-ratio: 0; /* 移动端隐藏 */
    --content-ratio: 1; /* 100% */
  }
  
  .app-container.mobile-mode {
    /* 📱 移动模式下的特殊处理 */
  }
  
  .global-sidebar.mobile-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: min(85vw, 280px); /* 最大85%屏幕宽度或280px */
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 0 8px var(--shadow-lg);
  }
  
  .global-sidebar.mobile-sidebar.mobile-visible {
    transform: translateX(0);
  }
  
  .global-main-content {
    width: 100vw;
    margin-left: 0;
  }
  
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
}

/* 📱 移动端横屏适配 */
@media (max-width: 768px) and (orientation: landscape) {
  .global-sidebar.mobile-sidebar {
    width: min(75vw, 240px); /* 横屏时稍微减少宽度 */
  }
}

/* 📱 移动端超小屏幕适配 */
@media (max-width: 480px) {
  .global-sidebar.mobile-sidebar {
    width: min(90vw, 280px); /* 超小屏幕增加到90% */
  }
}

/* 🎯 超宽屏优化 (>2000px) - 防止sidebar过宽 */
@media (min-width: 2000px) {
  .app-container {
    --sidebar-ratio: 0.18; /* 18% */
    --content-ratio: 0.82; /* 82% */
  }
  
  .global-sidebar {
    max-width: 320px;
  }
}

/* 📱 触摸设备优化 */
@media (pointer: coarse) {
  .sidebar-nav-item {
    padding: 12px 16px;
    min-height: 44px;
    /* 📱 触摸友好的按钮尺寸 */
  }
  
  .sidebar-nav-icon {
    width: 20px;
    height: 20px;
  }
}

/* 📱 渐进式增强：��持高对比度 */
@media (prefers-contrast: high) {
  .global-sidebar {
    border-right: 2px solid var(--color-sidebar-border);
  }
  
  .global-sidebar.mobile-sidebar {
    border-right: 2px solid var(--color-sidebar-border);
  }
  
  .mobile-overlay {
    background: rgba(0, 0, 0, 0.7);
  }
}

/* 📱 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .global-sidebar,
  .global-main-content {
    transition: none !important;
  }
  
  .global-sidebar.mobile-sidebar {
    transition: none !important;
  }
}

/* 📱 移动端滑动提示区域 */
.mobile-swipe-indicator {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 4px;
  height: 60px;
  background: linear-gradient(to right, var(--color-primary-light), transparent);
  border-radius: 0 4px 4px 0;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
  animation: pulse 2s infinite ease-out;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
    transform: translateY(-50%) scaleX(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scaleX(1.2);
  }
  100% {
    opacity: 0.5;
    transform: translateY(-50%) scaleX(1);
  }
}

/* 在非移动设备上隐藏滑动提示 */
@media (min-width: 769px) {
  .mobile-swipe-indicator {
    display: none;
  }
}
</style>
