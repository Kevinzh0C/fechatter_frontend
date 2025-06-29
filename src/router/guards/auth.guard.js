/**
 * Auth Guard
 * 路由认证守卫
 */
import { useAuthStore } from '@/stores/auth';
import { getLoginProfiler } from '@/utils/loginPerformanceProfiler';

/**
 * 需要认证的路由
 */
const requiresAuth = (to) => {
  return to.matched.some(record => record.meta.requiresAuth !== false);
};

/**
 * 公开路由（不需要认证）
 */
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// 🔧 ENHANCED: Navigation state tracking to prevent conflicts
let isNavigating = false;
let lastNavigationTime = 0;
let isLoginNavigationActive = false; // Track login component navigation
const NAVIGATION_DEBOUNCE_MS = 100;

// 🔧 NEW: Global navigation coordination
window.authGuardNavigationState = {
  setLoginNavigationActive: (active) => {
    isLoginNavigationActive = active;
    console.log('🔒 [AUTH_GUARD] Login navigation state:', active);
  },
  isLoginNavigationActive: () => isLoginNavigationActive
};

/**
 * 创建认证守卫
 */
export function createAuthGuard(router) {
  router.beforeEach(async (to, from, next) => {
    // 🚀 PERFORMANCE: Start router guard timing
    const profiler = getLoginProfiler();
    if (profiler.isActive) {
      profiler.startRouterGuard();
    }

    const authStore = useAuthStore();
    
    // 🔧 CRITICAL FIX: 检测logout状态，避免在logout过程中干扰导航
    if (authStore.logoutState?.isLoggingOut) {
      if (true) {
        console.log('🚪 [AUTH_GUARD] Logout in progress, allowing navigation without checks');
      }
      return next();
    }
    
    // 🔧 CRITICAL FIX: 检测Login组件正在进行导航，避免冲突
    if (isLoginNavigationActive && to.path === '/home' && from.path === '/login') {
      console.log('🔒 [AUTH_GUARD] Login component navigation in progress, allowing without interference');
      return next();
    }
    
    // 🔧 NEW: Prevent rapid navigation attempts
    const now = Date.now();
    if (isNavigating && (now - lastNavigationTime) < NAVIGATION_DEBOUNCE_MS) {
      console.log('🔒 [AUTH_GUARD] Debouncing rapid navigation attempt');
      return next();
    }
    
    // 等待认证初始化完成
    if (!authStore.isInitialized) {
      await authStore.initialize();
    }
    
    const isPublicRoute = publicRoutes.includes(to.path) || to.meta.public === true;
    // 🔧 CRITICAL FIX: 使用统一的认证状态检查
    const isAuthenticated = authStore.isAuthenticated;
    
    // 记录导航
    if (true) {
      console.log(`🔒 Auth Guard: ${from.path} → ${to.path}`, {
        isPublicRoute,
        isAuthenticated,
        requiresAuth: requiresAuth(to),
        logoutInProgress: authStore.logoutState?.isLoggingOut,
        hasToken: !!authStore.token,
        hasUser: !!authStore.user,
        isNavigating,
        isLoginNavigationActive,
        timeSinceLastNav: now - lastNavigationTime
      });
    }
    
    // 🔧 ENHANCED: 已登录用户访问登录/注册页面的处理
    if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
      // 🔧 CRITICAL FIX: 如果是从/login到/login的导航（通常是登录过程中的状态更新），直接允许
      if (from.path === '/login' && to.path === '/login') {
        console.log('🔒 [AUTH_GUARD] Same-route navigation during login process, allowing');
        return next();
      }
      
      // 🔧 NEW: 额外检查防止重定向循环
      if (from.path === '/home' || from.path === '/') {
        if (true) {
          console.warn('🔒 [AUTH_GUARD] Potential redirect loop detected, allowing navigation');
        }
        return next();
      }
      
      // 🔧 CRITICAL FIX: 检查是否是登录组件刚刚完成认证（时间窗口检查）
      const recentLoginTime = authStore.lastLoginTime;
      const isRecentLogin = recentLoginTime && (now - recentLoginTime) < 1000; // 1秒内的登录
      
      if (isRecentLogin && from.path === '/login') {
        console.log('🔒 [AUTH_GUARD] Recent login detected, letting Login component handle navigation');
        return next();
      }
      
      // 额外验证认证状态
      const hasValidToken = !!authStore.token;
      const hasValidUser = !!authStore.user;
      
      if (hasValidToken && hasValidUser && to.path !== '/home') {
        // 🔧 NEW: Set navigation state to prevent conflicts
        isNavigating = true;
        lastNavigationTime = now;
        
        if (true) {
          console.log('🔒 [AUTH_GUARD] Authenticated user redirected from login to home');
        }
        
        // 🔧 NEW: Use setTimeout to allow any ongoing navigation to complete
        setTimeout(() => {
          isNavigating = false;
        }, NAVIGATION_DEBOUNCE_MS);
        
        return next('/home');
      } else {
        // 认证状态不一致，可能是logout过程中，允许访问login
        if (true) {
          console.log('🔒 [AUTH_GUARD] Auth state inconsistent, allowing login access');
        }
        return next();
      }
    }
    
    // 未登录用户访问需要认证的页面
    if (!isAuthenticated && !isPublicRoute && requiresAuth(to)) {
      // 保存原始目标路径
      sessionStorage.setItem('redirectPath', to.fullPath);
      
      // 🔧 NEW: Set navigation state
      isNavigating = true;
      lastNavigationTime = now;
      
      setTimeout(() => {
        isNavigating = false;
      }, NAVIGATION_DEBOUNCE_MS);
      
      return next('/login');
    }
    
    // 检查会话超时
    if (isAuthenticated && authStore.checkSessionTimeout && authStore.checkSessionTimeout()) {
      if (true) {
        console.log('⏰ Session timeout detected');
      }
      await authStore.logout();
      return next('/login');
    }
    
    // 更新最后活动时间
    if (isAuthenticated && authStore.updateLastActivity) {
      authStore.updateLastActivity();
    }
    
    // 🚀 PERFORMANCE: Complete router guard timing
    if (profiler.isActive) {
      profiler.completeRouterGuard();
    }
    
    next();
  });
  
  // 路由后置守卫
  router.afterEach((to, from) => {
    // 清除加载状态
    const authStore = useAuthStore();
    authStore.loading = false;
    
    // 🔧 NEW: Reset navigation state after successful navigation
    setTimeout(() => {
      isNavigating = false;
      // 🔧 CRITICAL FIX: 清除登录导航状态
      if (to.path === '/home' && from.path === '/login') {
        isLoginNavigationActive = false;
        console.log('🔒 [AUTH_GUARD] Login navigation completed, clearing state');
      }
    }, 50);
    
    // 页面标题更新
    const defaultTitle = 'Fechatter';
    document.title = to.meta.title ? `${to.meta.title} - ${defaultTitle}` : defaultTitle;
  });
}

/**
 * 路由元数据助手
 */
export const authMeta = {
  // 需要认证
  requiresAuth: () => ({ requiresAuth: true }),
  
  // 公开路由
  public: () => ({ requiresAuth: false, public: true }),
  
  // 需要特定角色
  requiresRole: (role) => ({ requiresAuth: true, requiresRole: role }),
  
  // 需要特定权限
  requiresPermission: (permission) => ({ requiresAuth: true, requiresPermission: permission })
};