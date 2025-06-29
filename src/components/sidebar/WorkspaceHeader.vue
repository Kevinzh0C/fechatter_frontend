<template>
  <div class="workspace-header" @click="toggleDropdown">
    <div class="workspace-info">
      <div class="workspace-icon">
        <!-- 使用登录界面的AppIcon作为默认图标 -->
        <img v-if="workspace.icon_url" :src="workspace.icon_url" alt="Workspace Icon" />
        <AppIcon v-else :size="32" :preserve-gradient="true" start-color="#6366f1" end-color="#8b5cf6" title="Fechatter Logo" />
      </div>
      <span class="workspace-name">{{ workspace.name }}</span>
    </div>
    <Icon name="chevron-down" class="dropdown-arrow" :class="{ 'is-open': isDropdownOpen }" />

    <transition name="dropdown">
      <div v-if="isDropdownOpen" class="dropdown-menu" @click.stop>
        <div class="dropdown-section">
          <div class="dropdown-item" @click="showMemberList">
            <Icon name="users" />
            <span>Member List</span>
          </div>
          <div class="dropdown-item" @click="openWorkspaceSettings">
            <Icon name="settings" />
            <span>Workspace Settings</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import Icon from '@/components/ui/Icon.vue';
import { AppIcon } from '@/components/icons';

const chatStore = useChatStore();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();

const isDropdownOpen = ref(false);

// Emits
const emit = defineEmits(['show-member-list', 'show-workspace-settings']);

// Props
const props = defineProps({
  workspaceName: {
    type: String,
    default: 'Fechatter Workspace'
  }
});

const workspace = computed(() => {
  // 优先使用workspaceStore的数据，然后是chatStore，最后是props
  return workspaceStore.currentWorkspace || 
         chatStore.currentWorkspace || 
         { 
           name: props.workspaceName || 'Fechatter Workspace',
           icon_url: null 
         };
});
const user = computed(() => authStore.user || { username: 'Guest' });

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

// 添加点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest('.workspace-header')) {
    isDropdownOpen.value = false;
  }
};

// 🔄 初始化工作区数据和事件监听
onMounted(async () => {
  try {
    // 确保工作区数据已加载
    if (!workspaceStore.currentWorkspace) {
      await workspaceStore.fetchCurrentWorkspace();
    }
  } catch (error) {
    console.warn('⚠️ [WorkspaceHeader] Failed to fetch workspace data:', error);
  }
  
  // 添加点击外部关闭下拉菜单的事件监听
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const showMemberList = () => {
  console.log('Member List clicked');
  emit('show-member-list');
  isDropdownOpen.value = false;
};

const openWorkspaceSettings = () => {
  console.log('Workspace Settings clicked');
  emit('show-workspace-settings');
  isDropdownOpen.value = false;
};
</script>

<style scoped>
/* 🏢 Workspace Header - 生产级设计 */
.workspace-header {
  padding: var(--space-md) var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: var(--color-workspace-bg);
  border-bottom: 1px solid var(--color-sidebar-border);
  position: relative;
  min-height: calc(var(--space-2xl) * 2);
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.workspace-header:hover {
  background: var(--color-workspace-hover);
}

.workspace-header:active {
  background: var(--color-workspace-active);
}

/* 🏢 Workspace Info */
.workspace-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  min-width: 0;
}

.workspace-icon {
  width: calc(var(--space-xl) * 2);
  height: calc(var(--space-xl) * 2);
  border-radius: var(--radius-lg);
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--color-sidebar-text);
  flex-shrink: 0;
  transition: all 0.2s ease;
  overflow: hidden;
}

.workspace-header:hover .workspace-icon {
  transform: scale(1.05);
}

.workspace-icon img {
  width: 100%;
  height: 100%;
  border-radius: calc(var(--radius-lg) - 2px);
  object-fit: cover;
}

.workspace-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-sidebar-text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

/* 🔽 Dropdown Arrow */
.dropdown-arrow {
  color: var(--color-sidebar-text-muted);
  width: var(--space-lg);
  height: var(--space-lg);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.workspace-header:hover .dropdown-arrow {
  color: var(--color-sidebar-text);
}

.dropdown-arrow.is-open {
  transform: rotate(180deg);
  color: var(--color-sidebar-text);
}

/* 📋 Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-sidebar-bg);
  border: 1px solid var(--color-sidebar-border);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  z-index: 1000;
  padding: var(--space-sm);
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.dropdown-section {
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-sidebar-border);
}

.dropdown-section:last-child {
  border-bottom: none;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text-muted);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.15s ease;
  min-height: 44px;
}

.dropdown-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text);
  transform: translateX(2px);
}

.dropdown-item:active {
  background: var(--color-sidebar-active);
}

/* 🎬 Animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 🎯 Accessibility */
@media (prefers-reduced-motion: reduce) {
  .workspace-header,
  .workspace-icon,
  .dropdown-arrow,
  .dropdown-item {
    transition: none !important;
  }
}

/* 📱 Touch Devices */
@media (pointer: coarse) {
  .dropdown-item {
    min-height: 48px;
    padding: var(--space-md);
  }
}
</style>
