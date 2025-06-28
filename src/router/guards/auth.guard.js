/**
 * Auth Guard
 * 路由认证守卫
 */
import { useAuthStore } from '@/stores/auth';

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

/**
 * 创建认证守卫
 */
export function createAuthGuard(router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    
    // 🔧 CRITICAL FIX: 检测logout状态，避免在logout过程中干扰导航
    if (authStore.logoutState?.isLoggingOut) {
      if (true) {
        console.log('🚪 [AUTH_GUARD] Logout in progress, allowing navigation without checks');
      }
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
        hasUser: !!authStore.user
      });
    }
    
    // 🔧 ENHANCED: 已登录用户访问登录/注册页面，重定向到首页
    // 但避免重定向循环
    if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
      // 🔧 NEW: 额外检查防止重定向循环
      if (from.path === '/home' || from.path === '/') {
        if (true) {
          console.warn('🔒 [AUTH_GUARD] Potential redirect loop detected, allowing navigation');
        }
        return next();
      }
      
      // 额外验证认证状态
      const hasValidToken = !!authStore.token;
      const hasValidUser = !!authStore.user;
      
      if (hasValidToken && hasValidUser && to.path !== '/home') {
        if (true) {
          console.log('🔒 [AUTH_GUARD] Authenticated user redirected from login to home');
        }
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
    
    next();
  });
  
  // 路由后置守卫
  router.afterEach((to, from) => {
    // 清除加载状态
    const authStore = useAuthStore();
    authStore.loading = false;
    
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