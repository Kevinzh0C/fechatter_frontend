<template>
  <div id="app" class="discord-chat-container">
    <router-view />
    <!-- Notification Toast Container -->
    <ToastContainer />
    <!-- Debug Panel - 只在开发环境显示 -->
    <DebugPanel v-if="isDev" />
    <!-- Keyboard Shortcuts Modal -->
    <KeyboardShortcutsModal v-model="showShortcutsModal" :shortcuts="keyboardShortcuts.shortcuts" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import DebugPanel from './views/DebugPanel.vue';
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal.vue';
import ToastContainer from './components/ui/ToastContainer.vue';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import healthCheck from './utils/healthCheck';

// 检查是否为开发环境
const isDev = computed(() => import.meta.env.DEV);

// Keyboard shortcuts state
const showShortcutsModal = ref(false);

// Initialize keyboard shortcuts
const keyboardShortcuts = useKeyboardShortcuts({
  enableGlobalShortcuts: true,
  enableNavigationShortcuts: true,
  enableChatShortcuts: true,
  enableSearchShortcuts: true
});

// Global event listeners for keyboard shortcuts
const handleGlobalEvents = (event) => {
  switch (event.type.replace('fechatter:', '')) {
    case 'show-shortcuts-help':
      showShortcutsModal.value = true;
      break;
    case 'open-settings':
      // This will be handled by specific components
      break;
    case 'toggle-debug-panel':
      // This could toggle a debug panel state
      break;
    default:
      // Let other components handle their specific events
      break;
  }
};

// 初始化主题系统
const initializeTheme = () => {
  // 从localStorage获取保存的主题
  const savedTheme = localStorage.getItem('fechatter-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // 确定使用的主题
  const useDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;

  // 应用主题
  const html = document.documentElement;
  if (useDark) {
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark');
  } else {
    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark');
  }

};

// 确保在应用完全挂载后再运行第一次健康检查
onMounted(() => {
  // 首先初始化主题
  initializeTheme();

  // Setup global keyboard shortcut event listeners
  window.addEventListener('fechatter:show-shortcuts-help', handleGlobalEvents);
  window.addEventListener('fechatter:open-settings', handleGlobalEvents);
  window.addEventListener('fechatter:toggle-debug-panel', handleGlobalEvents);

  if (isDev.value) {
    // 等待应用完全加载
    setTimeout(() => {
      healthCheck.runAllChecksSafely().then(result => {
        if (result && result.summary && !result.summary.isHealthy) {
          console.error('⚠️ Initial health check failed! Run `healthCheck.getDetailedReport()` for details.');
        } else if (result && result.summary && result.summary.isHealthy) {
        } else {
        }
      }).catch(error => {
        console.error('❌ Health check system error:', error);
      });
    }, 2000); // 等待2秒确保应用完全初始化
  }
});

onUnmounted(() => {
  // Cleanup global event listeners
  window.removeEventListener('fechatter:show-shortcuts-help', handleGlobalEvents);
  window.removeEventListener('fechatter:open-settings', handleGlobalEvents);
  window.removeEventListener('fechatter:toggle-debug-panel', handleGlobalEvents);
});
</script>

<style>
/* 引入Discord主题系统 */
@import './styles/theme.css';

/* 引入Channel List设计系统变量 */
@import './styles/channel-list-variables.css';

/* 引入自定义CSS */
@import './style.css';

/* 🎨 应用级别样式重置 */
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  /* 确保应用使用主题系统 */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  /* 使用Discord字体 */
  font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.375;
  /* 启用硬件加速 */
  transform: translateZ(0);
  backface-visibility: hidden;
  /* 防止用户选择 */
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  /* 阻止页面级滚动 */
  overscroll-behavior: none;
}

/* 🎯 全局滚动条样式 */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

*::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

*::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  background-clip: content-box;
}

*::-webkit-scrollbar-corner {
  background: var(--scrollbar-track);
}

/* 🎯 全局选择样式 */
::selection {
  background: rgba(88, 101, 242, 0.2);
  color: var(--text-primary);
}

::-moz-selection {
  background: rgba(88, 101, 242, 0.2);
  color: var(--text-primary);
}

/* 🎯 全局焦点样式 */
*:focus {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

/* 🎯 图片优化 */
img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

/* 🎯 按钮重置 */
button {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  letter-spacing: inherit;
}

/* 🎯 链接样式 */
a {
  color: var(--text-link);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* 🎯 表单元素优化 */
input,
textarea,
select {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--border-focus);
  outline: none;
  box-shadow: 0 0 0 2px rgba(88, 101, 242, 0.2);
}

/* 🎯 代码元素 */
code,
pre {
  font-family: "Consolas", "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", "Monaco", "Courier New", Courier, monospace;
}

/* 🎯 移动端优化 */
@media (max-width: 768px) {
  #app {
    font-size: 14px;
  }
}

/* 🎯 打印优化 */
@media print {
  #app {
    background: white !important;
    color: black !important;
    font-size: 12pt;
  }

  * {
    background: transparent !important;
    color: black !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
}

/* 🎯 高对比度模式 */
@media (prefers-contrast: high) {
  #app {
    border: 1px solid var(--border-primary);
  }
}

/* 🎯 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
