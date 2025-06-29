<template>
  <div id="app">
    <NotificationContainer />
    <div v-if="isAuthLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner-large"></div>
        <h2 class="loading-text">Loading...</h2>
      </div>
    </div>
    <router-view v-else />
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ToastContainer from './components/ui/ToastContainer.vue';
import NotificationContainer from './components/ui/NotificationContainer.vue';
import { useAuthStore } from './stores/auth';
import themeManager from './services/ThemeManager.js';

const authStore = useAuthStore();
const isAuthLoading = ref(true);

onMounted(async () => {
  // ThemeManager已经在main.js中初始化，这里不需要重复初始化
  
  try {
    await authStore.initialize();
  } catch (error) {
    console.error('Auth initialization failed:', error);
  } finally {
    isAuthLoading.value = false;
  }
});
</script>

<style>
/* 不再导入旧的主题文件，使用新的主题系统 */
@import './style.css';

#app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  background-color: var(--color-background);
  color: var(--color-text);
  /* 🎨 使用CSS变量支持主题切换 */
}

/* 🎨 主题感知的加载界面 */
.loading-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-background);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  text-align: center;
}

.loading-spinner-large {
  width: 2rem;
  height: 2rem;
  border: 2px solid transparent;
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.loading-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
