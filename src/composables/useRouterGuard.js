/**
 * Router Guard Composable
 * Provides enhanced router error handling and navigation guards
 */

/**
 * Setup global router error handling
 * @param {Router} router - Vue Router instance
 */
export function setupGlobalRouterErrorHandling(router) {
  // Enhanced error handling for navigation failures
  router.onError((error) => {
    console.error('[Router Error]:', error);

    // Handle specific error types
    if (error.name === 'NavigationDuplicated') {
      // Ignore duplicate navigation errors
      return;
    }

    if (error.name === 'NavigationAborted') {
      console.warn('[Router] Navigation was aborted:', error.message);
      return;
    }

    if (error.name === 'NavigationCancelled') {
      console.warn('[Router] Navigation was cancelled:', error.message);
      return;
    }

    // For other errors, only redirect if not on error page and not on Vercel initial load
    if (!router.currentRoute.value.path.startsWith('/error') && 
        !window.location.hostname.includes('vercel.app')) {
      router.push('/error/500').catch(() => {
        console.error('[Router] Failed to navigate to error page');
      });
    }
  });

  // Disabled aggressive navigation timeout for Vercel deployments
  // The 30-second timeout was causing false positives during initial load
  let navigationTimeout;

  router.beforeEach((to, from, next) => {
    // Clear any existing timeout
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }

    // Only set timeout for non-Vercel environments or after initial load
    const isVercel = window.location.hostname.includes('vercel.app');
    const isInitialLoad = from.name === undefined;
    
    if (!isVercel || !isInitialLoad) {
      // Longer timeout for Vercel, shorter for local development
      const timeoutDuration = isVercel ? 60000 : 10000; // 60s for Vercel, 10s for local
      
      navigationTimeout = setTimeout(() => {
        console.warn('[Router] Navigation timeout - this may be normal during initial Vercel load');
        // Don't redirect on timeout for Vercel initial loads
        if (!isVercel && !router.currentRoute.value.path.startsWith('/error')) {
          router.push('/error/500').catch(() => {
            console.error('[Router] Failed to navigate to error page after timeout');
          });
        }
      }, timeoutDuration);
    }

    next();
  });

  router.afterEach(() => {
    // Clear navigation timeout on successful navigation
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }
  });

  console.log('[Router] Global error handling setup complete');
}

/**
 * Additional router guard utilities
 */
export function createAuthGuard(authStore) {
  return async (to, from, next) => {
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next('/login');
    } else {
      next();
    }
  };
}

export function createAdminGuard(authStore) {
  return async (to, from, next) => {
    if (to.meta.requiresAdmin && (!authStore.isAuthenticated || !authStore.user?.isAdmin)) {
      next('/error/403');
    } else {
      next();
    }
  };
}

export default {
  setupGlobalRouterErrorHandling,
  createAuthGuard,
  createAdminGuard
}; 