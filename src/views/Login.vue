<template>
  <div class="min-h-screen flex items-center justify-center login-background py-12 px-4 sm:px-6 lg:px-8 login-layout-override" data-page="login">
    <!-- Theme Toggle Button -->
    <div class="fixed top-4 right-4 z-50">
      <button @click="toggleTheme" class="theme-toggle-button" title="Switch Theme">
        <svg v-if="currentTheme === 'light'" class="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <svg v-else class="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
    </div>
    
    <div class="max-w-md w-full space-y-8 login-form-override">
      <div>
        <div class="flex justify-center mb-4">
          <AppIcon :size="64" :preserve-gradient="true" start-color="#3b82f6" end-color="#6366f1"
            title="Fechatter Logo" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold login-title">Sign in to Fechatter</h2>
        <p class="mt-2 text-center text-sm login-subtitle">
          Welcome back! Please sign in to continue.
        </p>
      </div>

      <!-- Error Display -->
      <component :is="ErrorComponent" v-if="showError && ErrorComponent" :error="authStore.error" title="Login Error"
        suggestion="Please check your credentials and try again." @dismiss="dismissError" dismissible />

      <div v-else-if="showError" class="login-error-box">
        {{ authStore.error }}
        <button @click="dismissError" class="login-error-close">&times;</button>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit" data-testid="login-form">
        <div class="login-form-container">
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input v-model="email" id="email" name="email" type="email" required autocomplete="email"
              :disabled="isLoading"
              class="login-input login-input-top"
              placeholder="Email address" data-testid="email-input" />
          </div>
          <div class="login-input-divider">
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" required
              autocomplete="current-password" :disabled="isLoading"
              class="login-input login-input-bottom"
              placeholder="Password" data-testid="password-input" />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <router-link to="/register" class="login-link"
              data-testid="register-link">
              Don't have an account? Sign up
            </router-link>
          </div>
          <AutoFillCredentials @fill-credentials="handleAutoFill" />
        </div>

        <div>
          <button type="submit" :disabled="isLoading || !email || !password"
            class="login-submit-button"
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
          class="login-dev-toggle"
          :title="showDevAccounts ? 'Click to hide development accounts' : 'Click to show development accounts'">
          <svg class="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd" />
          </svg>
          <span class="mr-2">Developer Accounts</span>
          <svg class="w-4 h-4 text-gray-500 transform transition-transform duration-200"
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
            class="dev-accounts-dropdown mt-4 rounded-lg shadow-xl">
            <!-- 人体工学设计的头部：醒目的关闭按钮 -->
            <div class="px-3 py-2 flex items-center justify-between">
              <span class="text-xs font-medium text-gray-500 select-none">Developer Accounts</span>
              <button @click="toggleDevAccounts"
                class="close-button text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 p-2 rounded-lg flex items-center justify-center"
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
import { getLoginProfiler } from '@/utils/loginPerformanceProfiler';
import themeManager from '@/services/ThemeManager.js';

const router = useRouter();
const authStore = useAuthStore();
const analytics = useAnalytics();

// Theme management
const currentTheme = ref(themeManager.getCurrentTheme());

const toggleTheme = () => {
  themeManager.toggleTheme();
};

const handleThemeChange = (event) => {
  currentTheme.value = event.detail.theme;
};

// Components
const components = {
  TestAccountQuickLogin,
  AutoFillCredentials,
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

// 🔧 NEW: Navigation state management to prevent conflicts
const isNavigating = ref(false);
const navigationPromise = ref(null);
const isLoginFlowActive = ref(false); // 🔧 NEW: Track active login flow

// 🔧 CRITICAL FIX: Global navigation lock to prevent conflicts
const getGlobalNavigationLock = () => {
  if (!window.loginNavigationLock) {
    window.loginNavigationLock = {
      isActive: false,
      timestamp: 0,
      source: null
    };
  }
  return window.loginNavigationLock;
};

const setGlobalNavigationLock = (active, source = 'unknown') => {
  const lock = getGlobalNavigationLock();
  lock.isActive = active;
  lock.timestamp = Date.now();
  lock.source = source;
  console.log(`🔒 [LOGIN] Global navigation lock ${active ? 'ACQUIRED' : 'RELEASED'} by: ${source}`);
};

const isGlobalNavigationLocked = () => {
  const lock = getGlobalNavigationLock();
  // Auto-expire lock after 10 seconds to prevent permanent locks
  if (lock.isActive && (Date.now() - lock.timestamp > 10000)) {
    console.warn('⚠️ [LOGIN] Global navigation lock expired, releasing...');
    lock.isActive = false;
  }
  return lock.isActive;
};

// 🔧 ENHANCED: Safe navigation with conflict prevention and guard coordination
const safeNavigateToHome = async (source = 'unknown') => {
  // 🔧 CRITICAL FIX: Check global navigation lock first
  if (isGlobalNavigationLocked()) {
    const lock = getGlobalNavigationLock();
    console.log(`🔒 [LOGIN] Global navigation locked by ${lock.source}, skipping navigation from ${source}`);
    return true; // Return success since navigation is already handled
  }

  // Prevent multiple concurrent navigations
  if (isNavigating.value) {
    console.log(`🔒 [LOGIN] Navigation already in progress from ${source}, waiting...`);
    return navigationPromise.value;
  }

  // 🔧 CRITICAL FIX: Acquire global navigation lock
  setGlobalNavigationLock(true, source);
  isNavigating.value = true;
  
  // 🔧 CRITICAL FIX: 通知路由守卫登录导航开始
  if (window.authGuardNavigationState) {
    window.authGuardNavigationState.setLoginNavigationActive(true);
  }
  
  navigationPromise.value = (async () => {
    try {
      console.log(`🚀 [LOGIN] Starting navigation to /home from: ${source}`);
      
      // Check current route to avoid unnecessary navigation
      if (router.currentRoute.value.path === '/home') {
        console.log('✅ [LOGIN] Already at /home, no navigation needed');
        return true;
      }

      // 🚨 VERCEL STATIC DEPLOYMENT FIX: Environment-aware navigation strategy
      const isVercelEnv = window.location.hostname.includes('vercel') || window.location.hostname.includes('.app');
      const isStaticDeployment = import.meta.env.PROD && isVercelEnv;
      
      if (isStaticDeployment) {
        console.log('🌐 [LOGIN] Vercel static deployment detected for post-login navigation');
        window.location.href = '/home';
        return true;
      }
      
      // 🚨 VERCEL FIX: Check router readiness before navigation
      if (!router.currentRoute.value) {
        console.warn('⚠️ [LOGIN] Router not ready after login, using window.location fallback');
        window.location.href = '/home';
        return true;
      }
      
      // 🔧 CRITICAL FIX: 小延迟确保认证状态完全稳定
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Attempt router navigation with error handling
      try {
        console.log('🔍 [LOGIN] Navigating from:', router.currentRoute.value.path, 'to: /home');
        await router.push('/home');
        console.log('✅ [LOGIN] Navigation completed successfully');
        return true;
      } catch (navError) {
        // Handle specific navigation errors
        if (navError.message && (
          navError.message.includes('redundant navigation') || 
          navError.message.includes('Avoided redundant navigation')
        )) {
          console.log('✅ [LOGIN] Already at target route, no navigation needed');
          return true;
        } else if (navError.message && navError.message.includes('Navigation cancelled')) {
          console.log('ℹ️ [LOGIN] Navigation cancelled by another navigation, this is normal during login');
          return true;
        } else {
          console.warn('⚠️ [LOGIN] Router navigation failed, using window.location fallback:', navError);
          window.location.href = '/home';
          return true;
        }
      }
    } catch (error) {
      console.error('❌ [LOGIN] Navigation error:', error);
      return false;
    } finally {
      isNavigating.value = false;
      navigationPromise.value = null;
      
      // 🔧 CRITICAL FIX: Release global navigation lock
      setGlobalNavigationLock(false, source);
      
      // 🔧 CRITICAL FIX: 通知路由守卫登录导航结束
      if (window.authGuardNavigationState) {
        setTimeout(() => {
          window.authGuardNavigationState.setLoginNavigationActive(false);
        }, 100); // 小延迟确保导航完成
      }
    }
  })();

  return navigationPromise.value;
};

const handleSubmit = async () => {
  if (isSubmitting.value || !email.value || !password.value) {
    return;
  }

  try {
    isSubmitting.value = true;
    isLoginFlowActive.value = true; // 🔧 CRITICAL FIX: Mark login flow as active
    authStore.error = null;

    console.log('🔐 [LOGIN] Starting simplified login process...');

    // 🚀 PERFORMANCE: Start comprehensive performance profiling
    const profiler = getLoginProfiler();
    profiler.startLogin();

    // 显示登录状态
    preloadProgress.value = {
      isVisible: true,
      message: '正在登录...'
    };

    // Track login attempt
    const loginStartTime = Date.now();

    // 🚀 PERFORMANCE: Mark API call start
    profiler.startApiCall();

    // 🔧 SIMPLIFIED: 直接调用login，信任authStore实现
    const success = await authStore.login(email.value.trim(), password.value);

    // 🚀 PERFORMANCE: Mark API call completion
    profiler.completeApiCall();

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

      // 🚀 PERFORMANCE: Simplified auth state check - trust authStore
      console.log('🔧 [LOGIN] Quick auth state verification...');
      
      // 🔧 FAST PATH: Only check essential state for immediate navigation
      const isReadyForNavigation = authStore.isAuthenticated && authStore.token && authStore.user;
      
      if (!isReadyForNavigation) {
        // Brief wait for critical state to settle (much shorter than before)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 🚀 PERFORMANCE: Proceed with navigation immediately
      console.log('✅ [LOGIN] Proceeding with immediate navigation');

      // 🚀 PERFORMANCE: Mark navigation start
      profiler.startNavigation();

      // 🔧 ENHANCED: Use safe navigation to prevent conflicts
      console.log('🚀 [LOGIN] Starting safe navigation to /home');
      const navigationSuccess = await safeNavigateToHome('handleSubmit');

      // 🚀 PERFORMANCE: Mark navigation completion
      profiler.completeNavigation();
      
      if (navigationSuccess) {
        console.log('✅ [LOGIN] Safe navigation completed successfully');
      } else {
        console.warn('⚠️ [LOGIN] Safe navigation failed, but login was successful');
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
    isLoginFlowActive.value = false; // 🔧 CRITICAL FIX: Clear login flow state
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
  
  // 🔧 CRITICAL FIX: Prevent unnecessary re-mounting during login flow
  if (isGlobalNavigationLocked()) {
    const lock = getGlobalNavigationLock();
    console.log(`🔒 [Login.vue] Component mounted during active navigation (${lock.source}), skipping full initialization`);
    return;
  }
  
  // 🔧 PERFORMANCE: Start timing login performance
  const loginStartTime = performance.now();
  
  try {
    // 🔧 PERFORMANCE: Batch all synchronous operations first
    console.log('🔍 [Login.vue] On login page, checking component state...');
    
    // 🚨 VERCEL FIX: Wait for router to be fully ready
    await nextTick();
    
    // 🚨 VERCEL STATIC DEPLOYMENT FIX: Detect environment and adjust strategy
    const isVercelEnv = window.location.hostname.includes('vercel') || window.location.hostname.includes('.app');
    const isStaticDeployment = import.meta.env.PROD && isVercelEnv;
    
    if (isStaticDeployment) {
      console.log('🌐 [Login.vue] Vercel static deployment detected, using conservative navigation strategy');
      
      // 🚨 VERCEL STRATEGY: Wait longer for hydration and route stabilization
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 🚨 VERCEL STRATEGY: Check if we're already being redirected
      const isCurrentlyNavigating = router.currentRoute.value.path !== '/login';
      if (isCurrentlyNavigating) {
        console.log('🔄 [Login.vue] Router already navigating away from login, skipping manual navigation');
        return;
      }
    } else {
      // 🚨 LOCAL/DEVELOPMENT: Standard delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 🔧 CRITICAL FIX: Check if login flow is active
    if (isLoginFlowActive.value) {
      console.log('🔒 [Login.vue] Login flow is active, skipping onMounted navigation');
      return;
    }
    
    // 🔧 CRITICAL FIX: Check global navigation lock
    if (isGlobalNavigationLocked()) {
      const lock = getGlobalNavigationLock();
      console.log(`🔒 [Login.vue] Global navigation locked by ${lock.source}, skipping onMounted navigation`);
      return;
    }
    
    // Quick auth state check (synchronous)
    const authStore = useAuthStore();
    if (authStore.isAuthenticated) {
      console.log('✅ [Login.vue] User already authenticated, redirecting...');
      
      // 🔧 CRITICAL FIX: Double-check login flow is not active
      if (isLoginFlowActive.value) {
        console.log('🔒 [Login.vue] Login flow became active during check, skipping navigation');
        return;
      }
      
      // 🔧 CRITICAL FIX: Double-check global navigation lock
      if (isGlobalNavigationLocked()) {
        const lock = getGlobalNavigationLock();
        console.log(`🔒 [Login.vue] Global navigation locked by ${lock.source} during auth check, skipping navigation`);
        return;
      }
      
      // 🚨 VERCEL FIX: Additional environment-specific delay
      if (isStaticDeployment) {
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 🔧 ENHANCED: Use safe navigation to prevent conflicts
      console.log('🚀 [Login.vue] Starting safe navigation from onMounted');
      const navigationSuccess = await safeNavigateToHome('onMounted');
      
      if (navigationSuccess) {
        console.log('✅ [Login.vue] onMounted safe navigation completed successfully');
      } else {
        console.warn('⚠️ [Login.vue] onMounted safe navigation failed');
      }
    }
    
    console.log('✅ [Login.vue] Login component state checked');
    
    // 🔧 PERFORMANCE: Initialize UI state immediately
    showDevHints.value = true;
    showDevAccounts.value = true;
    console.log('🔍 [Login.vue] Quick login will be available and visible in all environments');
    
    // Initialize theme
    currentTheme.value = themeManager.getCurrentTheme();
    window.addEventListener('theme-changed', handleThemeChange);
    
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
  
  // 🔧 CRITICAL FIX: Release global navigation lock on unmount
  if (isGlobalNavigationLocked()) {
    const lock = getGlobalNavigationLock();
    if (lock.source === 'handleSubmit' || lock.source === 'onMounted') {
      console.log('🧹 [Login.vue] Releasing global navigation lock on unmount');
      setGlobalNavigationLock(false, 'unmount');
    }
  }

  // 🧹 清理主题事件监听器
  window.removeEventListener('theme-changed', handleThemeChange);
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
/* 🎨 登录页面专用颜色系统 - 双主题完整版 */
:root {
  /* 登录页面专用鲜艳蓝色 - 亮色主题 */
  --login-primary: #3b82f6;
  --login-primary-hover: #2563eb;
  --login-primary-light: #93c5fd;
  --login-primary-dark: #1d4ed8;
  --login-primary-darker: #1e40af;
  
  /* Admin专用蓝色 */
  --login-admin-primary: #0ea5e9;
  --login-admin-dark: #0284c7;
  --login-admin-light: #7dd3fc;
  
  /* 亮色主题背景和文字 */
  --login-bg: #ffffff;
  --login-bg-secondary: #f8fafc;
  --login-bg-soft: #f1f5f9;
  --login-bg-muted: #e2e8f0;
  --login-text: #1e293b;
  --login-text-secondary: #64748b;
  --login-text-muted: #94a3b8;
  --login-border: #e2e8f0;
  --login-border-hover: #cbd5e1;
  --login-border-soft: #f1f5f9;
}

[data-theme="dark"] {
  /* 登录页面专用颜色 - 暗色主题 */
  --login-primary: #60a5fa;
  --login-primary-hover: #3b82f6;
  --login-primary-light: #93c5fd;
  --login-primary-dark: #2563eb;
  --login-primary-darker: #1d4ed8;
  
  /* Admin专用蓝色 - 暗色版本 */
  --login-admin-primary: #38bdf8;
  --login-admin-dark: #0ea5e9;
  --login-admin-light: #7dd3fc;
  
  /* 暗色主题背景和文字 - 高对比度设计 */
  --login-bg: #0f172a;
  --login-bg-secondary: #1e293b;
  --login-bg-soft: #334155;
  --login-bg-muted: #475569;
  --login-text: #f1f5f9;
  --login-text-secondary: #cbd5e1;
  --login-text-muted: #94a3b8;
  --login-border: #334155;
  --login-border-hover: #475569;
  --login-border-soft: #475569;
}

/* 🎨 主题切换按钮 */
.theme-toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid var(--login-primary);
  background: var(--login-bg);
  color: var(--login-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
}

.theme-toggle-button:hover {
  background: var(--login-primary);
  color: var(--login-bg);
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.theme-toggle-button:active {
  transform: scale(0.95);
}

.theme-icon {
  width: 24px;
  height: 24px;
  transition: all 0.3s ease;
}

/* 🎨 主题感知的登录页面样式 */
.login-background {
  background: linear-gradient(135deg, var(--login-bg) 0%, var(--login-bg-secondary) 100%);
  transition: background 0.3s ease;
}

.login-title {
  color: var(--login-text);
  transition: color 0.3s ease;
}

.login-subtitle {
  color: var(--login-text-secondary);
  transition: color 0.3s ease;
}

.login-error-box {
  background-color: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-md);
  position: relative;
  transition: all 0.3s ease;
}

.login-error-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--color-danger);
  font-weight: bold;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s ease;
}

.login-error-close:hover {
  color: var(--color-danger-dark);
}

.login-form-container {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  border: 2px solid var(--login-primary);
  background: var(--login-bg-secondary);
  overflow: hidden;
  transition: all 0.3s ease;
}

.login-input {
  appearance: none;
  position: relative;
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background-color: transparent;
  color: var(--login-text);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.login-input::placeholder {
  color: var(--login-text-muted);
}

.login-input:focus {
  outline: none;
  background-color: var(--login-bg-soft);
  z-index: 10;
}

.login-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-input-top {
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
}

.login-input-bottom {
  border-bottom-left-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
}

.login-input-divider {
  border-top: 1px solid var(--login-primary);
}

.login-link {
  font-weight: 500;
  color: var(--login-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.login-link:hover {
  color: var(--login-primary-hover);
}

.login-submit-button {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  color: white;
  background: linear-gradient(135deg, var(--login-primary), var(--login-primary-dark));
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  box-shadow: var(--shadow-md);
}

.login-submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--login-primary-hover), var(--login-primary-darker));
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.login-submit-button:focus {
  box-shadow: 0 0 0 2px var(--login-primary-light);
}

.login-submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-dev-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--login-text-secondary);
  background: linear-gradient(to bottom, var(--login-bg-secondary), var(--login-bg-muted));
  border: 1px solid var(--login-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.login-dev-toggle:hover {
  background: linear-gradient(to bottom, var(--login-bg-muted), var(--login-bg-soft));
  box-shadow: var(--shadow-md);
}

/* 🎯 Developer Accounts 浮动容器 - 深色主题优化 */
.dev-accounts-floating-container {
  position: absolute;
  top: calc(100% - 5rem);
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
}

.dev-accounts-floating-container .dev-accounts-dropdown {
  pointer-events: auto;
}

/* 人体工学关闭按钮 - 主题适配 */
.close-button {
  min-width: 36px;
  min-height: 36px;
  border: 1px solid transparent;
  transform: scale(1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--login-bg-soft);
  color: var(--login-text-secondary);
  border-radius: 8px;
}

.close-button:hover {
  transform: scale(1.05);
  border-color: var(--login-border-hover);
  box-shadow: var(--shadow-sm);
  background: var(--login-bg-muted);
  color: var(--login-text);
}

.close-button:active {
  transform: scale(0.95);
}

.close-button:focus {
  outline: 2px solid var(--login-primary);
  outline-offset: 2px;
}

/* Developer accounts 下拉内容 - 深色主题完整设计 */
.dev-accounts-dropdown {
  transform: translateZ(0);
  will-change: transform, opacity;
  height: 320px;
  overflow: hidden;
  padding-top: 0;
  margin-top: 0;
  box-shadow: var(--shadow-lg);
  background: var(--login-bg);
  border: 1px solid var(--login-border);
  border-radius: 10px;
  backdrop-filter: blur(20px);
}

/* 深色主题特殊处理 */
[data-theme="dark"] .dev-accounts-dropdown {
  background: var(--login-bg-secondary);
  border-color: var(--login-border-hover);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* 🎯 账户滚动容器样式 - 主题适配 */
.accounts-scroll-container {
  height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--login-text-muted) var(--login-bg-soft);
  padding: 6px 12px;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

/* Webkit滚动条样式 - 主题适配 */
.accounts-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.accounts-scroll-container::-webkit-scrollbar-track {
  background: var(--login-bg-soft);
  border-radius: 4px;
}

.accounts-scroll-container::-webkit-scrollbar-thumb {
  background: var(--login-primary-light);
  border-radius: 4px;
}

.accounts-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--login-primary);
}

/* 账户卡片 - 深色主题优化设计 */
.account-card {
  min-height: 200px;
  max-height: 200px;
  padding: 18px;
  background: linear-gradient(135deg, var(--login-bg) 0%, var(--login-bg-soft) 100%);
  border-radius: 10px;
  border: 1px solid var(--login-border);
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  scroll-snap-align: start;
  overflow: hidden;
  transition: all 200ms ease;
  box-shadow: var(--shadow-sm);
}

.account-card:hover {
  transform: translateY(-1px);
  border-color: var(--login-border-hover);
  box-shadow: var(--shadow-md);
}

/* 深色主题卡片特殊效果 */
[data-theme="dark"] .account-card {
  background: linear-gradient(135deg, var(--login-bg-secondary) 0%, var(--login-bg-soft) 100%);
  border-color: var(--login-border-hover);
}

[data-theme="dark"] .account-card:hover {
  background: linear-gradient(135deg, var(--login-bg-soft) 0%, var(--login-bg-muted) 100%);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

/* 账户头部 - 主题适配 */
.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--login-border-soft);
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
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.account-avatar:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.super-avatar {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

/* 🎨 Admin头像 - 专用蓝色设计 */
.admin-avatar {
  background: linear-gradient(135deg, var(--login-admin-primary), var(--login-admin-dark));
}

/* 深色主题Admin头像优化 */
[data-theme="dark"] .admin-avatar {
  background: linear-gradient(135deg, var(--login-admin-primary), var(--login-admin-light));
  box-shadow: 0 8px 25px -5px rgba(56, 189, 248, 0.3);
}

.account-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--login-text);
  margin: 0;
  letter-spacing: 0.025em;
  line-height: 1.3;
}

.account-subtitle {
  font-size: 0.875rem;
  color: var(--login-text-muted);
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

/* 账户标签 - 主题适配 */
.account-badge {
  font-size: 0.5rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.9;
}

.account-badge.super {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.account-badge.admin {
  background: rgba(14, 165, 233, 0.1);
  color: var(--login-admin-primary);
  border: 1px solid rgba(14, 165, 233, 0.3);
}

/* 深色主题标签优化 */
[data-theme="dark"] .account-badge.admin {
  background: rgba(56, 189, 248, 0.15);
  color: var(--login-admin-light);
  border-color: rgba(56, 189, 248, 0.4);
}

/* 账户内容 - 主题适配 */
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
  color: var(--login-text-muted);
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1.3;
}

.value {
  color: var(--login-text);
  font-weight: 600;
  cursor: pointer;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--login-bg-soft);
  border: 1px solid var(--login-border);
  transition: all 150ms ease;
}

.value:hover {
  background: var(--login-bg-muted);
  border-color: var(--login-border-hover);
  color: var(--login-text);
}

/* 深色主题value特殊处理 */
[data-theme="dark"] .value {
  background: var(--login-bg-soft);
  border-color: var(--login-border-hover);
}

[data-theme="dark"] .value:hover {
  background: var(--login-bg-muted);
  border-color: var(--login-primary-light);
}

/* 人体工学填充按钮 - 主题适配 */
.fill-button {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, var(--login-primary), var(--login-primary-light));
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
  min-height: 44px;
  box-shadow: var(--shadow-md);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.fill-button:hover {
  background: linear-gradient(135deg, var(--login-primary-hover), var(--login-primary-dark));
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.fill-button:active {
  transform: translateY(-1px);
  background: linear-gradient(135deg, var(--login-primary-dark), var(--login-primary-darker));
  box-shadow: var(--shadow-md);
}

.fill-button:focus {
  outline: 2px solid var(--login-primary-light);
  outline-offset: 2px;
}

/* 深色主题按钮优化 */
[data-theme="dark"] .fill-button {
  background: linear-gradient(135deg, var(--login-primary), var(--login-primary-dark));
  box-shadow: 0 8px 25px -5px rgba(96, 165, 250, 0.3);
}

[data-theme="dark"] .fill-button:hover {
  background: linear-gradient(135deg, var(--login-primary-light), var(--login-primary));
  box-shadow: 0 12px 30px -5px rgba(96, 165, 250, 0.4);
}

/* 最后一个账户卡片样式 */
.account-card:last-child {
  margin-bottom: 0;
}

/* 🎯 确保整体页面布局的稳定性 */
.min-h-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  contain: layout;
}

.max-w-md {
  contain: layout style;
  position: relative;
  width: 100%;
}

/* 🎯 响应式优化 - 小屏幕适配 */
@media (max-width: 640px) {
  .dev-accounts-dropdown {
    height: 392px;
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
  }
}

/* 🎯 高度受限时的优化 */
@media (max-height: 700px) {
  .dev-accounts-dropdown {
    height: 342px;
  }

  .min-h-screen {
    padding: 1rem;
  }
}

/* 🎯 极小屏幕优化 */
@media (max-height: 600px) {
  .dev-accounts-dropdown {
    height: 292px;
  }

  .min-h-screen {
    padding: 0.5rem;
  }
}

/* 🎯 高对比度支持 */
@media (prefers-contrast: high) {
  .dev-accounts-dropdown {
    border: 2px solid var(--login-primary);
    box-shadow: var(--shadow-lg);
  }
}

/* 🎯 减少动画效果 */
@media (prefers-reduced-motion: reduce) {
  .dev-accounts-dropdown,
  .dev-accounts-dropdown-container {
    transition: none !important;
  }
}
</style>