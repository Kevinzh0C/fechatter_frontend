<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 login-layout-override" data-page="login">
    <div class="max-w-md w-full space-y-8 login-form-override">
      <div>
        <div class="flex justify-center mb-4">
          <AppIcon :size="64" :preserve-gradient="true" start-color="#6366f1" end-color="#8b5cf6"
            title="Fechatter Logo" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to Fechatter</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Welcome back! Please sign in to continue.
        </p>
      </div>

      <!-- Error Display -->
      <component :is="ErrorComponent" v-if="showError && ErrorComponent" :error="authStore.error" title="Login Error"
        suggestion="Please check your credentials and try again." @dismiss="dismissError" dismissible />

      <div v-else-if="showError" class="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
        {{ authStore.error }}
        <button @click="dismissError" class="float-right font-bold text-red-500">&times;</button>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit" data-testid="login-form">
        <div class="rounded-md shadow-xl border-2 border-blue-200 bg-white -space-y-px">
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input v-model="email" id="email" name="email" type="email" required autocomplete="email"
              :disabled="isLoading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
              placeholder="Email address" data-testid="email-input" />
          </div>
          <div class="border-t border-blue-200">
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" required
              autocomplete="current-password" :disabled="isLoading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
              placeholder="Password" data-testid="password-input" />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <router-link to="/register" class="font-medium text-indigo-600 hover:text-indigo-500"
              data-testid="register-link">
              Don't have an account? Sign up
            </router-link>
          </div>
          <AutoFillCredentials @fill-credentials="handleAutoFill" />
        </div>

        <div>
          <button type="submit" :disabled="isLoading || !email || !password"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="login-button">
            <span v-if="isLoading && !preloadProgress.isVisible"
              class="absolute left-0 inset-y-0 flex items-center pl-3">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </span>
            {{ getButtonText() }}
          </button>
        </div>
      </form>

      <!-- YAML Test Account Quick Login -->
      <TestAccountQuickLogin />

      <!-- Developer Mode Toggle (Hidden by Default) -->
      <div class="mt-8 text-center">
        <button v-if="showDevHints" @click="toggleDevAccounts"
          class="group relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          :title="showDevAccounts ? 'Click to hide development accounts' : 'Click to show development accounts'">
          <svg class="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd" />
          </svg>
          <span class="mr-2">Developer Accounts</span>
          <svg class="w-4 h-4 text-gray-400 transform transition-transform duration-200"
            :class="{ 'rotate-180': showDevAccounts }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- 🎯 Developer Accounts - 浮动弹窗，不影响布局 -->
      <div v-if="showDevHints" class="dev-accounts-floating-container">
        <Transition enter-active-class="transition-all ease-out duration-300" enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all ease-in duration-200"
          leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
          <div v-if="showDevAccounts"
            class="dev-accounts-dropdown mt-4 bg-white border border-gray-200 rounded-lg shadow-xl">
            <!-- 人体工学设计的头部：醒目的关闭按钮 -->
            <div class="px-3 py-2 flex items-center justify-between">
              <span class="text-xs font-medium text-gray-500 select-none">Developer Accounts</span>
              <button @click="toggleDevAccounts"
                class="close-button text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 p-2 rounded-lg flex items-center justify-center"
                title="Close Developer Accounts" aria-label="Close">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- 账户滚动容器 -->
            <div class="accounts-scroll-container">
              <!-- Super User Account -->
              <div class="account-card">
                <div class="account-header">
                  <div class="account-info">
                    <div class="account-avatar super-avatar">S</div>
                    <div>
                      <h4 class="account-title">Super User</h4>
                      <p class="account-subtitle">Full system access</p>
                    </div>
                  </div>
                  <span class="account-badge super">SUPER</span>
                </div>
                <div class="account-content">
                  <div class="credential-row">
                    <span class="label">Email:</span>
                    <span class="value" @click="fillSuperCredentials">super@test.com</span>
                  </div>
                  <div class="credential-row">
                    <span class="label">Password:</span>
                    <span class="value" @click="fillSuperCredentials">password</span>
                  </div>
                </div>
                <button @click="fillSuperCredentials" class="fill-button">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Fill
                </button>
              </div>

              <!-- Admin Account -->
              <div class="account-card">
                <div class="account-header">
                  <div class="account-info">
                    <div class="account-avatar admin-avatar">A</div>
                    <div>
                      <h4 class="account-title">Admin User</h4>
                      <p class="account-subtitle">Administrative access</p>
                    </div>
                  </div>
                  <span class="account-badge admin">ADMIN</span>
                </div>
                <div class="account-content">
                  <div class="credential-row">
                    <span class="label">Email:</span>
                    <span class="value" @click="fillAdminCredentials">admin@test.com</span>
                  </div>
                  <div class="credential-row">
                    <span class="label">Password:</span>
                    <span class="value" @click="fillAdminCredentials">password</span>
                  </div>
                </div>
                <button @click="fillAdminCredentials" class="fill-button">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Fill
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, shallowRef, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { optimizeLoginPerformance, analyzeLoginPerformance } from '@/utils/login-performance';
import { AppIcon } from '@/components/icons';
import { useAnalytics } from '@/composables/useAnalytics';
import TestAccountQuickLogin from '@/components/auth/TestAccountQuickLogin.vue';
import AutoFillCredentials from '@/components/auth/AutoFillCredentials.vue';

const router = useRouter();
const authStore = useAuthStore();
const analytics = useAnalytics();

// Components
const components = {
  TestAccountQuickLogin,
  AutoFillCredentials
};

// 使用 shallowRef 优化性能
const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const mounted = ref(false);
const showDevHints = ref(false);
const showDevAccounts = ref(true); // 🔧 CRITICAL FIX: 默认展开快速登录，在所有环境下都可用
const ErrorComponent = shallowRef(null);

// 不再需要轮播状态，改为滚动容器

// 预加载进度状态 - 简化版
const preloadProgress = ref({
  isVisible: false,
  message: ''
});

// 计算属性优化
const isLoading = computed(() => authStore.loading || isSubmitting.value);
const showError = computed(() => !!authStore.error);

// 动态按钮文本
const getButtonText = () => {
  if (!isLoading.value) return 'Sign in';
  if (preloadProgress.value.isVisible) {
    return 'Signing in...';
  }
  return 'Signing in...';
};

// CSRF token handling
const getCsrfToken = () => {
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  return metaToken?.content || null;
};

// CSRF token handling
const dismissError = () => {
  authStore.error = null;
};

// 优化的凭据填充函数
const fillCredentials = (emailVal, passwordVal) => {
  email.value = emailVal;
  password.value = passwordVal;

  // 使用 requestAnimationFrame 优化 DOM 操作
  requestAnimationFrame(() => {
    const loginButton = document.querySelector('[data-testid="login-button"]');
    loginButton?.focus();
  });
};

const fillAdminCredentials = () => fillCredentials('admin@test.com', 'password');
const fillSuperCredentials = () => fillCredentials('super@test.com', 'password');

// Handle auto-fill from AutoFillCredentials component
const handleAutoFill = (credentials) => {
  fillCredentials(credentials.email, credentials.password);
};

// Toggle development accounts visibility with state cleanup
const toggleDevAccounts = async () => {
  console.log('🔄 [Login] Toggling dev accounts, current state:', showDevAccounts.value);
  
  const container = document.querySelector('.dev-accounts-floating-container');
  const dropdown = document.querySelector('.dev-accounts-dropdown');
  
  if (showDevAccounts.value) {
    // Closing modal - clean up state
    console.log('🚪 [Login] Closing dev accounts modal');
    
    // Add closing state
    if (container) {
      container.setAttribute('data-state', 'closing');
      container.classList.add('state-transitioning');
    }
    
    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Actually close
    showDevAccounts.value = false;
    
    // Clean up DOM state
    setTimeout(() => {
      if (container) {
        container.removeAttribute('data-state');
        container.classList.remove('state-transitioning');
      }
      if (dropdown) {
        dropdown.removeAttribute('data-modal-state');
      }
    }, 50);
    
  } else {
    // Opening modal - reset state first
    console.log('🚀 [Login] Opening dev accounts modal');
    
    // Force reset any residual state
    if (container) {
      container.setAttribute('data-state', 'opening');
      container.classList.add('state-transitioning');
    }
    
    if (dropdown) {
      dropdown.setAttribute('data-modal-state', 'resetting');
    }
    
    // Wait one frame to ensure DOM update
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Actually open
    showDevAccounts.value = true;
    
    // Set to open state
    setTimeout(() => {
      if (container) {
        container.setAttribute('data-state', 'open');
        container.classList.remove('state-transitioning');
      }
      if (dropdown) {
        dropdown.removeAttribute('data-modal-state');
      }
    }, 50);
  }
  
  console.log('✅ [Login] Dev accounts toggle completed, new state:', showDevAccounts.value);
};

// Handle keyboard events for developer accounts  
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && showDevAccounts.value) {
    toggleDevAccounts();
  }
};

// 简化版登录处理
const handleSubmit = async () => {
  // 🔧 CRITICAL FIX: 简化防重复提交逻辑
  if (isLoading.value || isSubmitting.value) {
    console.log('🛡️ [LOGIN] Login already in progress, ignoring duplicate submission');
    return;
  }

  // 🔧 CRITICAL FIX: 基本输入验证，不阻塞提交
  if (!email.value?.trim() || !password.value) {
    console.warn('⚠️ [LOGIN] Missing credentials');
    authStore.error = 'Email and password are required';
    return;
  }

  try {
    isSubmitting.value = true;
    authStore.error = null;

    console.log('🔐 [LOGIN] Starting simplified login process...');

    // 显示登录状态
    preloadProgress.value = {
      isVisible: true,
      message: '正在登录...'
    };

    // Track login attempt
    const loginStartTime = Date.now();

    // 🔧 SIMPLIFIED: 直接调用login，信任authStore实现
    const success = await authStore.login(email.value.trim(), password.value);

    if (success) {
      console.log('✅ [LOGIN] Login successful, proceeding with navigation');

      // Track successful login
      analytics.trackUserLogin(email.value.trim(), 'password');
      analytics.track('navigation', {
        from: 'login_form',
        to: 'authenticated',
        duration_ms: Date.now() - loginStartTime
      });

      // 显示成功状态
      preloadProgress.value = {
        isVisible: true,
        message: '登录成功，正在跳转...'
      };

      // 🔧 CRITICAL FIX: 最小等待时间确保状态同步
      await new Promise(resolve => setTimeout(resolve, 200));

      // 🔧 SIMPLIFIED: 信任导航成功，立即触发ChatBar数据加载
      console.log('🚀 [LOGIN] Navigating to: /home');
      await router.push('/home');
      console.log('✅ [LOGIN] Navigation completed successfully');
      
      // 🔧 CRITICAL FIX: 使用事件驱动的ChatBar数据加载，而不是延迟触发
      try {
        const { useChatStore } = await import('@/stores/chat');
        const chatStore = useChatStore();
        
        console.log('🎯 [LOGIN] Triggering immediate ChatBar data loading...');
        
        // 立即检查并初始化ChatStore
        if (!chatStore.isInitialized) {
          await chatStore.initialize();
        }
        
        // 立即加载chats数据
        await chatStore.fetchChats();
        
        console.log(`✅ [LOGIN] ChatBar data loaded: ${chatStore.chats.length} chats`);
        
        // 🔧 CRITICAL FIX: 强制触发Vue响应式更新
        // 触发chatStore的响应式更新，确保App.vue的计算属性立即重新计算
        chatStore.$patch({
          // 强制触发响应式更新的技巧
          _forceUpdate: (chatStore._forceUpdate || 0) + 1,
          // 确保isInitialized状态是最新的
          isInitialized: true,
          // 确保loading状态被重置
          loading: false
        });
        
        // 🔧 NEW: 额外的Vue nextTick确保UI更新
        await nextTick();
        
        // 🔧 NEW: 发送事件通知App.vue ChatBar已经准备好
        window.dispatchEvent(new CustomEvent('chatbar-ready', { 
          detail: { 
            source: 'login', 
            chatsCount: chatStore.chats.length,
            timestamp: Date.now()
          } 
        }));
        
        // 🔧 NEW: 额外确保App.vue收到数据更新
        // 直接触发App.vue的响应式更新
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('force-sidebar-update', {
            detail: { chatsCount: chatStore.chats.length }
          }));
        }, 100);
        
      } catch (chatError) {
        console.error('❌ [LOGIN] Failed to load ChatBar data:', chatError);
        // 即使失败也发送事件，让App.vue知道需要备用加载
        window.dispatchEvent(new CustomEvent('chatbar-load-failed', { 
          detail: { source: 'login', error: chatError.message } 
        }));
      }
    } else {
      throw new Error('Login failed - no success returned from authStore');
    }
  } catch (error) {
    console.error('❌ [LOGIN] Login failed:', error);

    // Track login error
    analytics.trackError(
      'login_failed',
      error.code || 'unknown',
      error.message || 'Login failed',
      error.stack || '',
      'login_form'
    );

    // 清除进度显示
    preloadProgress.value = {
      isVisible: false,
      message: ''
    };

    // 显示错误信息
    if (!authStore.error) {
      authStore.error = error.message || 'Login failed. Please try again.';
    }
  } finally {
    isSubmitting.value = false;
    // 延迟清除进度显示
    setTimeout(() => {
      preloadProgress.value = {
        isVisible: false,
        message: ''
      };
    }, 2000);
  }
};

/**
 * 🔧 SIMPLIFIED: Practical auth state verification - focus on essentials only
 */
const verifyAuthStateReady = async () => {
  try {
    // 🔧 ENHANCED: Longer wait for state synchronization stability
    // Give auth.js setImmediateAuthState more time to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 🔧 ESSENTIAL CHECKS: Only verify what's absolutely necessary
    const hasToken = !!authStore.token && authStore.token.length > 10;
    const hasUser = !!authStore.user && !!authStore.user.id;
    const isAuthReported = authStore.isAuthenticated;

    // 🔧 SIMPLIFIED: Basic functional requirements
    const hasFunctionalAuth = hasToken && hasUser;

    // 🔧 TOLERANT: Accept if we have functional auth OR store reports auth
    const isReady = hasFunctionalAuth || isAuthReported;

    if (true) {
      console.log('🔍 [LOGIN] Simplified auth verification:', {
        hasToken,
        hasUser,
        isAuthReported,
        hasFunctionalAuth,
        isReady,
        tokenLength: authStore.token?.length,
        userId: authStore.user?.id
      });
    }

    return isReady;
  } catch (error) {
    console.error('🚨 [LOGIN] Auth verification error:', error);
    return false;
  }
};

onMounted(async () => {
  console.log('🔍 [Login.vue] Component mounted, starting initialization...');
  
  // 🔧 PERFORMANCE: Start timing login performance
  const loginStartTime = performance.now();
  
  try {
    // 🔧 PERFORMANCE: Batch all synchronous operations first
    console.log('🔍 [Login.vue] On login page, checking component state...');
    
    // Quick auth state check (synchronous)
    const authStore = useAuthStore();
    if (authStore.isAuthenticated) {
      console.log('✅ [Login.vue] User already authenticated, redirecting...');
      await router.push('/');
      return;
    }
    
    console.log('✅ [Login.vue] Login component state checked');
    
    // 🔧 PERFORMANCE: Initialize UI state immediately
    showDevHints.value = true;
    showDevAccounts.value = true;
    console.log('🔍 [Login.vue] Quick login will be available and visible in all environments');
    
    // 🔧 PERFORMANCE: Defer non-critical operations
    nextTick(() => {
      console.log('🔍 [Login.vue] Looking for native quick login system...');
      
      // Quick DOM checks (non-blocking)
      const devHintsTrigger = document.querySelector('[data-dev-hints-trigger]');
      const nativeDevAccounts = document.querySelectorAll('[data-native-dev-account]');
      
      console.log('🔍 [Login.vue] Dev hints trigger element found:', !!devHintsTrigger);
      console.log('🔍 [Login.vue] Native dev account elements found:', nativeDevAccounts.length);
      
      // 🔧 PERFORMANCE: Log completion time
      const loginEndTime = performance.now();
      const loginDuration = Math.round(loginEndTime - loginStartTime);
      console.log(`Login performance: ${loginDuration}ms`);
      
      // 🔧 PERFORMANCE: Only warn if significantly slow
      if (loginDuration > 500) {
        console.warn(`⚠️ [Login.vue] Slow login initialization: ${loginDuration}ms`);
      }
    });
    
  } catch (error) {
    console.error('❌ [Login.vue] Initialization error:', error);
  }
});

onUnmounted(() => {
  mounted.value = false;

  // 🧹 清理键盘事件监听器
  document.removeEventListener('keydown', handleKeyDown);
});

// 延迟加载 AuthError 组件
const loadErrorComponent = async () => {
  if (!ErrorComponent.value) {
    try {
      const module = await import('@/components/common/AuthError.vue');
      ErrorComponent.value = module.default;
    } catch (error) {
      console.warn('Failed to load AuthError component:', error);
    }
  }
};
</script>

<style scoped>
/* 🎯 Developer Accounts 浮动容器 - 绝对定位，不影响布局 */
.dev-accounts-floating-container {
  /* 绝对定位，脱离文档流 */
  position: absolute;
  top: calc(100% - 5rem);
  /* 向上移动更多，覆盖更多按钮区域 */
  left: 0;
  right: 0;
  z-index: 50;
  /* 确保在其他元素之上 */

  /* 不占用任何空间，不影响登录框位置 */
  pointer-events: none;
  /* 容器本身不响应点击 */
}

/* 浮动弹窗内容可以响应点击 */
.dev-accounts-floating-container .dev-accounts-dropdown {
  pointer-events: auto;
}

/* 人体工学关闭按钮 */
.close-button {
  /* 确保足够的点击区域 (44px是移动端推荐的最小触摸目标) */
  min-width: 36px;
  min-height: 36px;

  /* 清晰的视觉反馈 */
  border: 1px solid transparent;

  /* 平滑的交互动画 */
  transform: scale(1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.close-button:hover {
  /* 放大效果，增强可发现性 */
  transform: scale(1.05);
  border-color: #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.close-button:active {
  /* 按下反馈 */
  transform: scale(0.95);
  background-color: #f3f4f6;
}

.close-button:focus {
  /* 可访问性焦点指示器 */
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Developer accounts 下拉内容 */
.dev-accounts-dropdown {
  /* 硬件加速和优化 */
  transform: translateZ(0);
  will-change: transform, opacity;

  /* 调整总高度，考虑人体工学头部 */
  height: 320px;
  /* 增加高度以容纳更好的头部设计 */
  overflow: hidden;

  /* 去掉顶部留白，头部自带合理间距 */
  padding-top: 0;
  margin-top: 0;

  /* 增强的阴影效果，更明显的浮动感 */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* 统一的背景色 */
  background-color: #ffffff;

  /* 添加边框增强视觉分离 */
  border: 1px solid #e5e7eb;

  /* 稍微增加圆角 */
  border-radius: 10px;
}

/* 🎯 账户滚动容器样式 */
.accounts-scroll-container {
  /* 调整高度以适应新的头部设计 */
  height: 260px;
  overflow-y: auto;
  overflow-x: hidden;

  /* 更subtle的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(107, 114, 128, 0.4) rgba(107, 114, 128, 0.1);

  /* 减少内边距 */
  padding: 6px 12px;

  /* 滚动行为 */
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

/* Webkit滚动条样式 */
.accounts-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.accounts-scroll-container::-webkit-scrollbar-track {
  background: rgba(59, 130, 246, 0.15);
  border-radius: 4px;
}

.accounts-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.6);
  border-radius: 4px;
}

.accounts-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.8);
}

/* 账户卡片 - 优化用户体验，清晰布局 */
.account-card {
  min-height: 200px;
  max-height: 200px;
  padding: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  /* 滚动捕捉 */
  scroll-snap-align: start;

  /* 防止内容溢出 */
  overflow: hidden;

  /* 统一的阴影风格，与登录表单一致 */
  transition: all 200ms ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.account-card:hover {
  transform: translateY(-1px);
  border-color: #d1d5db;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* 账户头部 - 平衡的间距 */
.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.375rem;
  letter-spacing: 0.025em;
  /* 添加微妙阴影增强立体感 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  /* 平滑动画 */
  transition: all 0.2s ease;
}

.account-avatar:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.super-avatar {
  background: linear-gradient(135deg, #dc2626, #991b1b);
}

.admin-avatar {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.account-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  letter-spacing: 0.025em;
  line-height: 1.3;
}

.account-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

/* 账户标签 - 更小更轻 */
.account-badge {
  font-size: 0.5rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.8;
}

.account-badge.super {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.account-badge.admin {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}

/* 账户内容 - 清晰可读布局 */
.account-content {
  flex: 1;
  font-size: 0.875rem;
  margin: 8px 0;
}

.credential-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 3px 0;
}

.label {
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.8rem;
  /* 稍微增大标签字体以提高可读性 */
  line-height: 1.3;
}

.value {
  color: #1f2937;
  font-weight: 600;
  cursor: pointer;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9rem;
  /* 增大值字体以提高可读性 */
  line-height: 1.4;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition: all 150ms ease;
}

.value:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}

/* 人体工学填充按钮 */
.fill-button {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* 确保足够的触摸目标 */
  min-height: 44px;
  /* 添加微妙阴影 */
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
  /* 文字平滑渲染 */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.fill-button:hover {
  background: linear-gradient(135deg, #4338ca, #5b21b6);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(79, 70, 229, 0.3);
}

.fill-button:active {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #3730a3, #4c1d95);
  box-shadow: 0 3px 8px rgba(79, 70, 229, 0.25);
}

.fill-button:focus {
  outline: 2px solid #a5b4fc;
  outline-offset: 2px;
}

/* 最后一个账户卡片样式 */
.account-card:last-child {
  margin-bottom: 0;
}

/* 🎯 确保整体页面布局的稳定性 */
.min-h-screen {
  /* 恢复完全居中布局 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  /* 均匀的上下padding */

  /* 防止布局污染 */
  contain: layout;
}

.max-w-md {
  /* 确保登录表单容器稳定 */
  contain: layout style;

  /* 添加相对定位，为绝对定位的弹窗提供定位上下文 */
  position: relative;
  width: 100%;
}

/* 🎯 响应式优化 - 小屏幕适配 */
@media (max-width: 640px) {
  .dev-accounts-dropdown {
    height: 392px;
    /* 280px内容 + 112px padding */
  }

  .accounts-scroll-container {
    height: 200px;
    padding: 8px 12px;
  }

  .account-card {
    min-height: 160px;
    max-height: 160px;
    padding: 14px;
  }

  .account-avatar {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }

  .min-h-screen {
    padding: 1rem;
    /* 小屏幕上使用固定padding */
  }

  /* 🎯 高度受限时的优化 */
  @media (max-height: 700px) {
    .dev-accounts-dropdown {
      height: 342px;
      /* 230px内容 + 112px padding */
    }

    .min-h-screen {
      padding: 1rem;
      /* 高度受限时保持简单的padding */
    }

    /* 🎯 确保非常小的屏幕也能正常使用 */
    @media (max-height: 600px) {
      .dev-accounts-dropdown {
        height: 292px;
        /* 180px内容 + 112px padding */
      }

      .min-h-screen {
        padding: 0.5rem;
        /* 极小屏幕使用最小padding */
      }

      /* 🎯 高对比度支持 */
      @media (prefers-contrast: high) {
        .dev-accounts-dropdown {
          border: 2px solid #1e40af;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        /* 🎯 减少动画效果 */
        @media (prefers-reduced-motion: reduce) {
          .dev-accounts-dropdown {
            transition: none !important;
          }

          .dev-accounts-dropdown-container {
            transition: none !important;
          }

          /* 🎯 滚动条样式优化 */
          .dev-accounts-dropdown::-webkit-scrollbar {
            width: 4px;
          }

          .dev-accounts-dropdown::-webkit-scrollbar-track {
            background: rgba(59, 130, 246, 0.1);
            border-radius: 2px;
          }

          .dev-accounts-dropdown::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.3);
            border-radius: 2px;
          }

          .dev-accounts-dropdown::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.5);
          }
        }
      }
    }
  }
}
</style>