import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { analytics } from '../lib/analytics-protobuf';
import { setupGlobalRouterErrorHandling } from '@/composables/useRouterGuard';
import authStateManager from '../utils/authStateManager';

// Lazy loaded components - Only import components that actually exist
const Home = () => import('@/views/Home.vue');
const Login = () => import('@/views/Login.vue');
const Register = () => import('@/views/Register.vue');
const Chat = () => import('@/views/Chat.vue');
const Demo = () => import('@/views/Demo.vue');
const Test = () => import('@/views/Test.vue');
const Error = () => import('@/views/Error.vue');
const Debug = () => import('@/views/Debug.vue');
const SimpleLogin = () => import('@/views/SimpleLogin.vue');

const routes = [
  // 根路径重定向
  {
    path: '/',
    redirect: (to) => {
      console.log('🔍 [ROUTER] Root redirect triggered, checking auth state...');

      // 🔧 CRITICAL FIX: 简化认证检查，不依赖复杂的过期时间逻辑
      // 检查核心认证数据存在性，而不是复杂的过期时间验证
      const token = localStorage.getItem('auth_token') || localStorage.getItem('fechatter_access_token');
      const user = localStorage.getItem('auth_user');
      
      // 🔧 SIMPLIFIED: 基本token格式检查
      const hasValidToken = token && token.length > 20;
      const hasValidUser = user && user.length > 10;

      // 🔧 ROBUST: 检查authStateManager状态作为主要依据
      let authStateValid = false;
      try {
        if (window.authStateManager) {
          const authState = window.authStateManager.getAuthState();
          authStateValid = authState.isAuthenticated;
        }
      } catch (error) {
        console.warn('🔍 [ROUTER] AuthStateManager check failed:', error);
      }

      // 🔧 TOLERANT: 多重检查，任一条件满足即认为已认证
      const isAuthenticated = authStateValid || (hasValidToken && hasValidUser);

      const redirectTarget = isAuthenticated ? '/home' : '/login';

      console.log('🔍 [ROUTER] Simplified root redirect decision:', {
        hasValidToken,
        hasValidUser,
        authStateValid,
        isAuthenticated,
        redirectTo: redirectTarget
      });

      return redirectTarget;
    }
  },

  // 认证页面
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },

  // 主应用页面 (带全局侧边栏)
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },

  // 聊天页面 (独立路由，带全局侧边栏)
  {
    path: '/chat/:id',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },

  // 管理员页面 (独立路由，带全局侧边栏)
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../components/admin/AdminDashboard.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // 独立功能页面 (不需要侧边栏)
  {
    path: '/demo',
    name: 'Demo',
    component: Demo
  },
  {
    path: '/demo/search',
    name: 'SearchDemo',
    component: () => import('@/views/PerfectSearchDemo.vue'),
    meta: { title: 'Perfect Search Demo' }
  },
  {
    path: '/test',
    name: 'Test',
    component: Test
  },
  {
    path: '/debug',
    name: 'Debug',
    component: Debug
  },
  {
    path: '/debug/protobuf-analytics',
    name: 'ProtobufAnalyticsTest',
    component: () => import('../components/debug/ProtobufAnalyticsTest.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/simple-login',
    name: 'SimpleLogin',
    component: SimpleLogin
  },

  // 错误页面
  {
    path: '/error/:code',
    name: 'Error',
    component: Error,
    props: true
  },

  // 404 处理
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由初始化日志 - always enabled
console.log('🔍 [ROUTER] Router initialized with routes:', routes.length);

// Global navigation guard
// 存储导航开始时间
let navigationStartTime = 0;

// 🔧 PERFORMANCE: 认证初始化缓存
let authInitPromise = null;
let isAuthInitialized = false;

router.beforeEach(async (to, from, next) => {
  // 记录导航开始时间
  navigationStartTime = Date.now();

  console.log('🔍 [ROUTER] Navigation:', { from: from.path, to: to.path });

  // 🔧 PERFORMANCE: 公开路由快速通道
  const publicRoutes = ['/login', '/register', '/demo', '/test', '/error', '/debug', '/simple-login'];
  const isPublicRoute = publicRoutes.some(route => to.path.startsWith(route));

  if (isPublicRoute) {
    console.log('🔍 [ROUTER] Public route, allowing access');
    return next();
  }

  // 🔧 PERFORMANCE: 避免重复初始化认证
  const authStore = useAuthStore();

  if (!isAuthInitialized && !authInitPromise) {
    console.log('🔍 [ROUTER] Initializing auth store...');

    authInitPromise = authStore.initialize()
      .then(() => {
        isAuthInitialized = true;
        console.log('🔍 [ROUTER] ✅ Auth store initialized');
      })
      .catch(error => {
        console.error('🔍 [ROUTER] ❌ Auth store initialization failed:', error);
        isAuthInitialized = false; // 允许重试
        throw error;
      })
      .finally(() => {
        authInitPromise = null; // 清理promise
      });
  }

  // 等待认证初始化（如果正在进行）
  if (authInitPromise) {
    try {
      await authInitPromise;
    } catch (error) {
      console.error('🔍 [ROUTER] Auth initialization failed, redirecting to login');
      return next('/login');
    }
  }

  // 🔧 SIMPLIFIED: 基本认证检查
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth) {
    // 🔧 CRITICAL FIX: Simplified auth check - remove complex consensus logic
    let authState = authStore.isAuthenticated;
    let hasToken = !!authStore.token;
    let hasUser = !!authStore.user;
    let isTokenExpired = authStore.isTokenExpired;

    // 🔧 SIMPLIFIED: Direct functional check - if we have token + user, accept it
    const hasFunctionalAuth = hasToken && hasUser && !isTokenExpired;

    // 🔧 FALLBACK: Check storage consistency for edge cases
    let hasStorageBackup = false;
    if (!hasFunctionalAuth) {
      try {
        const storageToken = localStorage.getItem('auth_token');
        const storageUser = localStorage.getItem('auth_user');
        hasStorageBackup = !!(storageToken && storageUser);
      } catch (error) {
        console.warn('🔍 [ROUTER] Storage check failed:', error);
      }
    }

    // 🔧 TOLERANT: Accept authentication if we have functional auth OR authStore says we're auth OR storage backup
    const isAuthenticated = hasFunctionalAuth || authState || hasStorageBackup;

    if (!isAuthenticated) {
      console.warn('🔍 [ROUTER] Access denied - redirecting to login');
      console.warn('🔍 [ROUTER] Auth state:', {
        authState,
        hasToken,
        hasUser,
        isTokenExpired,
        hasFunctionalAuth,
        hasStorageBackup,
        finalDecision: isAuthenticated,
        route: to.path
      });

      // 🔧 ENHANCED: Prevent redirect loops and save target path
      if (to.path !== '/login') {
        sessionStorage.setItem('redirectPath', to.fullPath);
        return next('/login');
      } else {
        // Already on login page, allow access
        return next();
      }
    } else {
      console.log('✅ [ROUTER] Authentication verified successfully');
    }
  }

  // 🔧 SIMPLIFIED: 管理员权限检查
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
  if (requiresAdmin && !authStore.isAuthenticated) {
    console.warn('🔍 [ROUTER] Admin access denied - not authenticated');
    return next('/login');
  }

  // 🔧 SIMPLIFIED: 访客路由检查
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);
  if (requiresGuest && authStore.isAuthenticated) {
    console.log('🔍 [ROUTER] Guest route but user is authenticated, redirecting to home');
    return next('/home');
  }

  console.log('🔍 [ROUTER] ✅ Navigation allowed');

  next();
});

// 导航完成后的处理
router.afterEach((to, from, failure) => {
  if (failure) {
    console.error('Navigation failed:', failure);
  } else {
    // Debug logging always enabled (removed VITE_DEBUG check)
    console.log('🔍 [ROUTER] Navigation completed:', { from: from.path, to: to.path });

    // 🎯 更新body的data-route属性，用于CSS选择器
    document.body.setAttribute('data-route', to.path);
    
    // 添加页面类名用于样式隔离
    document.body.className = document.body.className.replace(/page-\w+/g, '');
    if (to.name) {
      document.body.classList.add(`page-${to.name.toLowerCase()}`);
    }

    // 跟踪导航事件
    if (navigationStartTime && from.path !== to.path) {
      analytics.trackNavigation(from.path, to.path, navigationStartTime).catch(err => {
        console.warn('Failed to track navigation:', err);
      });
    }
  }
});

// 全局错误处理
router.onError((error) => {
  console.error('Router error:', error);
  // 避免无限重定向
  if (window.location.pathname !== '/error/500') {
    router.push('/error/500');
  }
});

// Setup enhanced global router error handling
setupGlobalRouterErrorHandling(router);

export default router;