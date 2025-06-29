/**
 * 🏆 Modern Authentication Store - Industry Best Practices
 * 
 * 使用业界最佳实践：
 * - Pinia store for reactive state management
 * - js-cookie for secure cookie handling
 * - jwt-decode for token validation
 * - @vueuse/core for persistent storage
 * - axios-auth-refresh for automatic token refresh
 */

import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useStorage } from '@vueuse/core';

// 🔧 Configuration
const TOKEN_CONFIG = {
  // Cookie settings (most secure)
  cookieName: 'fechatter_token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'Strict', // CSRF protection
    expires: 7, // 7 days
    path: '/'
  },
  
  // Storage fallback
  localStorageKey: 'fechatter_auth_token',
  
  // Token validation
  refreshThreshold: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  maxRetries: 3
};

export const useModernAuth = defineStore('modernAuth', () => {
  // 🏠 State
  const token = ref(null);
  const user = ref(null);
  const isLoading = ref(false);
  const lastRefresh = ref(null);
  const refreshAttempts = ref(0);

  // 🔧 Persistent storage with @vueuse/core
  const persistentToken = useStorage(TOKEN_CONFIG.localStorageKey, null, localStorage, {
    serializer: {
      read: (v) => v ? String(v) : null,
      write: (v) => v || ''
    }
  });

  // 💭 Computed properties
  const isAuthenticated = computed(() => {
    return !!(token.value && isTokenValid.value);
  });

  const isTokenValid = computed(() => {
    if (!token.value) return false;
    
    try {
      const decoded = jwtDecode(token.value);
      const now = Date.now() / 1000;
      return decoded.exp > now;
    } catch (error) {
      console.warn('🔐 [ModernAuth] Invalid token format:', error);
      return false;
    }
  });

  const tokenExpiresAt = computed(() => {
    if (!token.value) return null;
    
    try {
      const decoded = jwtDecode(token.value);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  });

  const tokenExpiresIn = computed(() => {
    if (!tokenExpiresAt.value) return 0;
    return Math.max(0, tokenExpiresAt.value.getTime() - Date.now());
  });

  const needsRefresh = computed(() => {
    return tokenExpiresIn.value > 0 && tokenExpiresIn.value < TOKEN_CONFIG.refreshThreshold;
  });

  const userInfo = computed(() => {
    if (!token.value) return null;
    
    try {
      const decoded = jwtDecode(token.value);
      return {
        id: decoded.sub || decoded.user_id || decoded.id,
        email: decoded.email,
        name: decoded.name || decoded.fullname,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };
    } catch (error) {
      return user.value;
    }
  });

  // 🎯 Actions

  /**
   * 🔐 Set authentication token
   */
  function setToken(newToken, userData = null) {
    console.log('🔐 [ModernAuth] Setting new token');
    
    if (!newToken) {
      clearAuth();
      return;
    }

    // Validate token format
    try {
      const decoded = jwtDecode(newToken);
      const now = Date.now() / 1000;
      
      if (decoded.exp <= now) {
        throw new Error('Token is expired');
      }
      
      // Update state
      token.value = newToken;
      user.value = userData || decoded;
      lastRefresh.value = Date.now();
      refreshAttempts.value = 0;

      // Persist to multiple storages
      persistToken(newToken);
      
      console.log('✅ [ModernAuth] Token set successfully', {
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        userId: decoded.sub || decoded.user_id || decoded.id
      });
      
    } catch (error) {
      console.error('❌ [ModernAuth] Invalid token:', error);
      clearAuth();
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * 💾 Persist token to secure storage
   */
  function persistToken(tokenValue) {
    try {
      // Priority 1: Secure HTTP-only cookie (best security)
      Cookies.set(TOKEN_CONFIG.cookieName, tokenValue, TOKEN_CONFIG.cookieOptions);
      
      // Priority 2: localStorage for SPA compatibility
      persistentToken.value = tokenValue;
      
      console.log('💾 [ModernAuth] Token persisted to secure storage');
    } catch (error) {
      console.warn('⚠️ [ModernAuth] Failed to persist token:', error);
    }
  }

  /**
   * 🔍 Load token from storage
   */
  function loadFromStorage() {
    console.log('🔍 [ModernAuth] Loading token from storage...');
    
    // Priority 1: Cookie (most secure)
    let storedToken = Cookies.get(TOKEN_CONFIG.cookieName);
    
    // Priority 2: localStorage
    if (!storedToken) {
      storedToken = persistentToken.value;
    }
    
    // Priority 3: Legacy localStorage keys (for migration)
    if (!storedToken) {
      storedToken = localStorage.getItem('auth_token') || 
                   localStorage.getItem('access_token');
    }

    if (storedToken) {
      try {
        setToken(storedToken);
        console.log('✅ [ModernAuth] Token loaded from storage');
        return true;
      } catch (error) {
        console.warn('⚠️ [ModernAuth] Stored token is invalid:', error);
        clearAuth();
      }
    }
    
    return false;
  }

  /**
   * 🧹 Clear authentication
   */
  function clearAuth() {
    console.log('🧹 [ModernAuth] Clearing authentication');
    
    // Clear state
    token.value = null;
    user.value = null;
    lastRefresh.value = null;
    refreshAttempts.value = 0;
    
    // Clear all storage
    Cookies.remove(TOKEN_CONFIG.cookieName, { path: '/' });
    persistentToken.value = null;
    
    // Clear legacy storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('auth_token');
    
    console.log('✅ [ModernAuth] Authentication cleared');
  }

  /**
   * 🔄 Refresh token
   */
  async function refreshToken() {
    if (isLoading.value || refreshAttempts.value >= TOKEN_CONFIG.maxRetries) {
      console.warn('⚠️ [ModernAuth] Refresh already in progress or max retries reached');
      return false;
    }

    console.log('🔄 [ModernAuth] Refreshing token...');
    isLoading.value = true;
    refreshAttempts.value++;

    try {
      // Import API dynamically to avoid circular dependency
      const { default: api } = await import('../services/api');
      
      const response = await api.post('/auth/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      });

      const newToken = response.data?.access_token || response.data?.token;
      
      if (newToken) {
        setToken(newToken, response.data?.user);
        console.log('✅ [ModernAuth] Token refreshed successfully');
        return true;
      } else {
        throw new Error('No token in refresh response');
      }

    } catch (error) {
      console.error('❌ [ModernAuth] Token refresh failed:', error);
      
      if (refreshAttempts.value >= TOKEN_CONFIG.maxRetries) {
        console.error('❌ [ModernAuth] Max refresh attempts reached, clearing auth');
        clearAuth();
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 📧 Login with credentials
   */
  async function login(email, password) {
    console.log('📧 [ModernAuth] Logging in...');
    isLoading.value = true;

    try {
      // Import API dynamically
      const { default: api } = await import('../services/api');
      
      const response = await api.post('/signin', {
        email,
        password
      });

      const tokenData = response.data?.data || response.data;
      const newToken = tokenData?.access_token || tokenData?.token;
      
      if (newToken) {
        setToken(newToken, tokenData?.user);
        console.log('✅ [ModernAuth] Login successful');
        return { success: true, user: userInfo.value };
      } else {
        throw new Error('No token in login response');
      }

    } catch (error) {
      console.error('❌ [ModernAuth] Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 🚪 Logout
   */
  async function logout() {
    console.log('🚪 [ModernAuth] Logging out...');
    
    try {
      // Try to call logout endpoint
      const { default: api } = await import('../services/api');
      await api.post('/signout');
    } catch (error) {
      console.warn('⚠️ [ModernAuth] Logout endpoint failed:', error);
    }
    
    clearAuth();
    console.log('✅ [ModernAuth] Logout completed');
  }

  /**
   * 🔧 Initialize authentication
   */
  function initialize() {
    console.log('🔧 [ModernAuth] Initializing...');
    
    const hasToken = loadFromStorage();
    
    if (hasToken) {
      console.log('✅ [ModernAuth] Initialized with existing token');
    } else {
      console.log('ℹ️ [ModernAuth] Initialized without token');
    }
    
    return hasToken;
  }

  // 🔄 Watch for automatic token refresh
  watch(needsRefresh, (needs) => {
    if (needs && !isLoading.value) {
      console.log('⏰ [ModernAuth] Token needs refresh, refreshing automatically...');
      refreshToken();
    }
  });

  // 🔄 Sync token changes to storage
  watch(token, (newToken) => {
    if (newToken) {
      persistToken(newToken);
    }
  });

  return {
    // State
    token: readonly(token),
    user: readonly(user),
    isLoading: readonly(isLoading),
    
    // Computed
    isAuthenticated,
    isTokenValid,
    tokenExpiresAt,
    tokenExpiresIn,
    needsRefresh,
    userInfo,
    
    // Actions
    setToken,
    clearAuth,
    refreshToken,
    login,
    logout,
    initialize,
    loadFromStorage
  };
});

// 🔧 Helper function to get token for other services
export function getAuthToken() {
  const auth = useModernAuth();
  return auth.isAuthenticated ? auth.token : null;
}

// 🔧 Helper function for axios interceptor
export function getAuthHeader() {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}

export default useModernAuth; 