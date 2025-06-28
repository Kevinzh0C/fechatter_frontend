/**
 * Emergency Auth Fix
 * Quick fix for authentication issues and 401 errors
 */

async function emergencyAuthFix() {
  console.group('🚨 Emergency Auth Fix');

  try {
    if (true) {
      console.log('1️⃣ Clearing all authentication state...');
    }

    // Clear localStorage
    const authKeys = ['auth', 'auth_token', 'token', 'refreshToken', 'user', 'fechatter_access_token', 'fechatter_token_expiry'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear all localStorage with auth-related keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
        localStorage.removeItem(key);
      }

    if (true) {
      console.log('✅ Storage cleared');
    }

    if (true) {
      console.log('2️⃣ Clearing token manager...');
    }

    // Clear token manager if available
    try {
      const { default: tokenManager } = await import('@/services/tokenManager');
      await tokenManager.clearTokens();
      if (true) {
        console.log('✅ Token manager cleared');
      }
    } catch (error) {
      if (true) {
        console.warn('⚠️ Token manager not available or failed to clear:', error.message);
      }

    if (true) {
      console.log('3️⃣ Clearing auth store...');
    }

    // Clear auth store if available
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      authStore.clearAuth();
      if (true) {
        console.log('✅ Auth store cleared');
      }
    } catch (error) {
      if (true) {
        console.warn('⚠️ Auth store not available or failed to clear:', error.message);
      }

    if (true) {
      console.log('4️⃣ Disconnecting SSE...');
    }

    // Disconnect SSE if available
    try {
      if (window.sseConnectionManager) {
        window.sseConnectionManager.disconnect();
        if (true) {
          console.log('✅ SSE disconnected');
        }
      } else {
        if (true) {
          console.log('✅ No SSE connection to disconnect');
        }
    } catch (error) {
      if (true) {
        console.warn('⚠️ SSE disconnect failed:', error.message);
      }

    if (true) {
      console.log('5️⃣ Redirecting to login...');
    }

    // Force redirect to login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/register') {
      if (true) {
        console.log('🔄 Redirecting to login page...');
      window.location.href = '/login';
    } else {
      if (true) {
        console.log('✅ Already on login page');
      }

    if (true) {
      console.log('✅ Emergency auth fix completed');
    }

  } catch (error) {
    if (true) {
      console.error('❌ Emergency auth fix failed:', error);
    }

    // Ultimate fallback: hard reload to login
    if (true) {
      console.log('🔄 Performing hard redirect as fallback...');
    window.location.href = '/login';
  }

  console.groupEnd();
}

/**
 * Quick 401 error suppression
 */
function quick401Suppression() {
  if (true) {
    console.log('🔇 Applying quick 401 error suppression...');
  }

  // Add patterns to log suppressor if available
  if (window.logSuppressor) {
    const patterns401 = [
      /401 \(Unauthorized\)/,
      /GET.*401/,
      /POST.*401/,
      /🚨 API Error.*401/,
      /Authentication failure/,
      /session has expired/i,
      /unauthorized/i
    ];

    patterns401.forEach(pattern => {
      window.logSuppressor.addPattern(pattern);
    });

    if (true) {
      console.log('✅ 401 error suppression patterns added');
    }
  } else {
    if (true) {
      console.warn('⚠️ Log suppressor not available');
    }

/**
 * Check if we're in an auth error state
 */
function isAuthErrorState() {
  // Check for common indicators of auth errors
  const hasLocalStorageAuth = !!localStorage.getItem('auth');
  const hasSessionStorageAuth = !!sessionStorage.getItem('auth_token');
  const currentPath = window.location.pathname;
  const isOnAuthPage = currentPath === '/login' || currentPath === '/register';

  // If we have auth data but not on auth page, check if it's valid
  if ((hasLocalStorageAuth || hasSessionStorageAuth) && !isOnAuthPage) {
    try {
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      const tokenExpiry = authData.tokens?.expiresAt;

      if (tokenExpiry && Date.now() > tokenExpiry) {
        if (true) {
          console.log('🔍 Detected expired token');
        return true;
      }
    } catch (error) {
      if (true) {
        console.log('🔍 Detected corrupted auth data');
      return true;
    }

  return false;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.emergencyAuthFix = emergencyAuthFix;
  window.quick401Suppression = quick401Suppression;
  window.isAuthErrorState = isAuthErrorState;

  // Auto-apply 401 suppression
  quick401Suppression();

  // Auto-run if in auth error state
  if (isAuthErrorState()) {
    if (true) {
      console.log('🔍 Auth error state detected, auto-running emergency fix in 2 seconds...');
    setTimeout(() => {
      emergencyAuthFix();
    }, 2000);
  }

  if (true) {
    console.log('🚨 Emergency Auth Fix loaded');
  if (true) {
    console.log('💡 Use window.emergencyAuthFix() for immediate auth cleanup');
  if (true) {
    console.log('💡 Use window.quick401Suppression() to suppress 401 noise');
  }

export default emergencyAuthFix; 