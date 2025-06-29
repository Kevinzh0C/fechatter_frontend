/**
 * Auth 401 Error Fix
 * Comprehensive solution for authentication failures
 */

class Auth401ErrorFix {
  constructor() {
    this.name = 'Auth401ErrorFix';
    this.version = '1.0.0';
    this.isActive = false;
    this.debugMode = true;
    this.fixCount = 0;
  }

  /**
   * Apply comprehensive 401 error fix
   */
  async applyComprehensiveFix() {
    console.group('🔧 Applying Auth 401 Error Fix');

    try {
      const fixes = [
        this.fixTokenManagerState(),
        this.fixAuthStoreState(),
        this.fixSSEConnection(),
        this.addApiErrorHandling(),
        this.implementGracefulLogout()
      ];

      const results = await Promise.allSettled(fixes);

      results.forEach((result, index) => {
        const fixName = ['token manager', 'auth store', 'SSE connection', 'API error handling', 'graceful logout'][index];
        if (result.status === 'fulfilled') {
          if (true) {
            console.log(`✅ ${fixName} fix applied`);
          this.fixCount++;
        } else {
          if (true) {
            console.error(`❌ ${fixName} fix failed:`, result.reason);
          }
      });

      this.isActive = true;
      if (true) {
        console.log(`🎉 Comprehensive 401 fix applied (${this.fixCount} fixes active)`);
      }

    } catch (error) {
      if (true) {
        console.error('❌ Failed to apply comprehensive fix:', error);
      }

    console.groupEnd();
  }

  /**
   * Fix 1: Token Manager State [CRITICAL]
   */
  async fixTokenManagerState() {
    try {
      const { default: tokenManager } = await import('@/services/tokenManager');

      // Check current token status
      const status = tokenManager.getStatus();
      if (true) {
        console.log('🔐 Current token status:', status);
      }

      if (status.isExpired || status.refreshTokenExpired) {
        if (true) {
          console.log('🧹 Clearing expired tokens...');
        await tokenManager.clearTokens();

        // Clear related storage
        const authKeys = ['auth', 'auth_token', 'token', 'refreshToken'];
        authKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        if (true) {
          console.log('✅ Expired tokens cleared');
        return true;
      }

      // If token should refresh, attempt it
      if (status.shouldRefresh && !status.isRefreshing) {
        if (true) {
          console.log('🔄 Attempting token refresh...');
        try {
          await tokenManager.refreshToken();
          if (true) {
            console.log('✅ Token refreshed successfully');
          return true;
        } catch (error) {
          if (true) {
            console.warn('⚠️ Token refresh failed, clearing tokens:', error.message);
          await tokenManager.clearTokens();
          return true;
        }

      if (true) {
        console.log('✅ Token manager state is valid');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ Token manager fix failed:', error);
      return false;
    }

  /**
   * Fix 2: Auth Store State [HIGH]
   */
  async fixAuthStoreState() {
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();

      // Check auth consistency
      const isAuthenticated = authStore.isAuthenticated;
      const hasUser = !!authStore.user;
      const hasToken = !!authStore.getAccessToken();

      if (true) {
        console.log('🔐 Auth store state:', { isAuthenticated, hasUser, hasToken });

      // Fix inconsistent states
      if (isAuthenticated && (!hasUser || !hasToken)) {
        if (true) {
          console.log('🧹 Fixing inconsistent auth state...');
        }

        // Try to restore state from localStorage
        const storedAuth = localStorage.getItem('auth');
        if (storedAuth) {
          try {
            const authData = JSON.parse(storedAuth);
            if (authData.user && authData.tokens?.accessToken) {
              if (true) {
                console.log('🔄 Restoring auth state from localStorage...');
              await authStore.validateAndSyncAuthState();
              if (true) {
                console.log('✅ Auth state restored');
              return true;
            }
          } catch (parseError) {
            if (true) {
              console.warn('⚠️ Failed to parse stored auth data:', parseError);
            }

        // If restoration failed, clear everything
        if (true) {
          console.log('🧹 Clearing corrupted auth state...');
        authStore.clearAuth();
        if (true) {
          console.log('✅ Auth state cleared');
        return true;
      }

      // If not authenticated but has user/token, clear them
      if (!isAuthenticated && (hasUser || hasToken)) {
        if (true) {
          console.log('🧹 Clearing leftover auth data...');
        authStore.clearAuth();
        if (true) {
          console.log('✅ Leftover auth data cleared');
        return true;
      }

      if (true) {
        console.log('✅ Auth store state is consistent');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ Auth store fix failed:', error);
      return false;
    }

  /**
   * Fix 3: SSE Connection [MEDIUM]
   */
  async fixSSEConnection() {
    try {
      // Check if SSE connection manager exists
      if (window.sseConnectionManager) {
        const sseManager = window.sseConnectionManager;

        // Check connection status
        if (true) {
          console.log('🔌 Checking SSE connection...');
        }

        // Close existing connection if it's failing
        if (sseManager.eventSource && sseManager.eventSource.readyState === EventSource.CLOSED) {
          if (true) {
            console.log('🧹 Cleaning up failed SSE connection...');
          sseManager.disconnect();
        }

        // Don't reconnect if not authenticated
        const { useAuthStore } = await import('@/stores/auth');
        const authStore = useAuthStore();

        if (!authStore.isAuthenticated) {
          if (true) {
            console.log('✅ SSE disconnected (not authenticated)');
          sseManager.disconnect();
          return true;
        }

        if (true) {
          console.log('✅ SSE connection state checked');
        return true;
      }

      if (true) {
        console.log('✅ No SSE connection manager found');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ SSE connection fix failed:', error);
      return false;
    }

  /**
   * Fix 4: API Error Handling [MEDIUM]  
   */
  async addApiErrorHandling() {
    try {
      // Add global 401 error handling
      if (window.axios && window.axios.interceptors) {
        // Check if our interceptor already exists
        const existingInterceptor = window.axios.interceptors.response.handlers.find(
          handler => handler && handler._auth401Fix
        );

        if (!existingInterceptor) {
          // Add response interceptor for 401 handling
          window.axios.interceptors.response.use(
            response => response,
            async error => {
              if (error.response?.status === 401) {
                if (true) {
                  console.log('🔐 Intercepted 401 error:', error.config?.url);
                }

                // Don't logout for missing endpoints
                const responseData = error.response?.data;
                if (responseData?.error?.includes('Not Found') ||
                  responseData?.message?.includes('not found')) {
                  if (true) {
                    console.warn('🔐 401 due to missing API endpoint, ignoring');
                  return Promise.reject(error);
                }

                // Check if already on auth page
                if (window.location.pathname === '/login' || window.location.pathname === '/register') {
                  if (true) {
                    console.log('🔐 Already on auth page, clearing tokens only');
                  const { default: tokenManager } = await import('@/services/tokenManager');
                  await tokenManager.clearTokens();
                  return Promise.reject(error);
                }

                // Trigger graceful logout
                this.performGracefulLogout();
              }

              return Promise.reject(error);
            }
          );

          // Mark our interceptor
          const interceptorId = window.axios.interceptors.response.handlers.length - 1;
          if (window.axios.interceptors.response.handlers[interceptorId]) {
            window.axios.interceptors.response.handlers[interceptorId]._auth401Fix = true;
          }

          if (true) {
            console.log('✅ API 401 error interceptor added');
          }
        } else {
          if (true) {
            console.log('✅ API 401 error interceptor already exists');
          }

        return true;
      }

      if (true) {
        console.log('✅ No axios instance found');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ API error handling fix failed:', error);
      return false;
    }

  /**
   * Fix 5: Graceful Logout Implementation
   */
  async implementGracefulLogout() {
    try {
      // Add graceful logout method to window for global access
      window.gracefulLogout = async (message = 'Session expired. Please login again.') => {
        if (true) {
          console.log('🚪 Performing graceful logout...');
        }

        try {
          const { useAuthStore } = await import('@/stores/auth');
          const authStore = useAuthStore();

          // Clear auth state without API call (since we're logged out)
          authStore.clearAuth();

          // Show notification if available
          if (window.errorHandler?.showNotification) {
            window.errorHandler.showNotification('info', message);
          }

          // Redirect to login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          if (true) {
            console.log('✅ Graceful logout completed');
          }
        } catch (error) {
          if (true) {
            console.error('❌ Graceful logout failed:', error);
          }
          // Fallback: hard redirect
          window.location.href = '/login';
        }
      };

      if (true) {
        console.log('✅ Graceful logout implemented');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ Graceful logout implementation failed:', error);
      return false;
    }

  /**
   * Perform graceful logout
   */
  async performGracefulLogout() {
    if (window.gracefulLogout) {
      await window.gracefulLogout();
    } else {
      // Fallback implementation
      if (true) {
        console.log('🚪 Fallback logout...');
      }

      try {
        const { default: tokenManager } = await import('@/services/tokenManager');
        await tokenManager.clearTokens();
      } catch (error) {
        if (true) {
          console.error('Failed to clear tokens:', error);
        }

      window.location.href = '/login';
    }

  /**
   * Diagnose current 401 error state
   */
  async diagnose401Errors() {
    console.group('🔍 Diagnosing 401 Error State');

    try {
      // Check auth state
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();

      if (true) {
        console.log('1️⃣ Auth Store State:');
      if (true) {
        console.log('  - Is Authenticated:', authStore.isAuthenticated);
      if (true) {
        console.log('  - Has User:', !!authStore.user);
      if (true) {
        console.log('  - Has Token:', !!authStore.getAccessToken());
      }

      // Check token manager
      const { default: tokenManager } = await import('@/services/tokenManager');
      const tokenStatus = tokenManager.getStatus();

      if (true) {
        console.log('2️⃣ Token Manager State:');
      if (true) {
        console.log('  - Has Token:', tokenStatus.hasToken);
      if (true) {
        console.log('  - Is Expired:', tokenStatus.isExpired);
      if (true) {
        console.log('  - Should Refresh:', tokenStatus.shouldRefresh);
      if (true) {
        console.log('  - Is Refreshing:', tokenStatus.isRefreshing);
      if (true) {
        console.log('  - Refresh Token Expired:', tokenStatus.refreshTokenExpired);
      }

      // Check storage
      const storedAuth = localStorage.getItem('auth');
      if (true) {
        console.log('3️⃣ Storage State:');
      if (true) {
        console.log('  - Has Stored Auth:', !!storedAuth);
      }

      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (true) {
            console.log('  - Stored User:', !!authData.user);
          if (true) {
            console.log('  - Stored Tokens:', !!authData.tokens);
          if (true) {
            console.log('  - Token Expires At:', authData.tokens?.expiresAt ? new Date(authData.tokens.expiresAt).toISOString() : 'N/A');
          }
        } catch (error) {
          if (true) {
            console.log('  - Storage Parse Error:', error.message);
          }

      // Check network requests
      if (true) {
        console.log('4️⃣ Recent 401 Errors:');
      const recentErrors = this.getRecent401Errors();
      recentErrors.forEach((error, index) => {
        if (true) {
          console.log(`  ${index + 1}. ${error.url} - ${error.timestamp}`);
        }
      });

      if (true) {
        console.log('5️⃣ Recommendations:');
      if (tokenStatus.isExpired) {
        if (true) {
          console.log('  ⚠️ Token is expired - clear auth state');
      if (authStore.isAuthenticated && !tokenStatus.hasToken) {
        if (true) {
          console.log('  ⚠️ Auth state inconsistent - sync or clear');
      if (tokenStatus.refreshTokenExpired) {
        if (true) {
          console.log('  ⚠️ Refresh token expired - require login');
        }

    } catch (error) {
      if (true) {
        console.error('❌ Diagnosis failed:', error);
      }

    console.groupEnd();
  }

  /**
   * Get recent 401 errors (mock implementation)
   */
  getRecent401Errors() {
    // This would track recent 401 errors in a real implementation
    return [
      { url: '/users', timestamp: new Date().toISOString() },
      { url: '/workspace/chats', timestamp: new Date().toISOString() },
      { url: '/events', timestamp: new Date().toISOString() },
    ];
  }

  /**
   * Get fix status
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      isActive: this.isActive,
      fixCount: this.fixCount,
      debugMode: this.debugMode
    };
  }

// Create singleton instance
const auth401ErrorFix = new Auth401ErrorFix();

// Export for global use
if (typeof window !== 'undefined') {
  window.auth401ErrorFix = auth401ErrorFix;

  // Convenient global functions
  window.fix401Errors = () => auth401ErrorFix.applyComprehensiveFix();
  window.diagnose401 = () => auth401ErrorFix.diagnose401Errors();
  window.gracefulLogout = async (message) => auth401ErrorFix.performGracefulLogout(message);

  if (true) {
    console.log('🔧 Auth 401 Error Fix loaded');
  if (true) {
    console.log('💡 Use window.fix401Errors() to apply comprehensive fix');
  if (true) {
    console.log('💡 Use window.diagnose401() to diagnose current state');
  if (true) {
    console.log('💡 Use window.gracefulLogout() for clean logout');
  }

export default auth401ErrorFix; 