/**
 * Quick Auth Login Fix
 * 快速认证登录修复 - 解决认证循环和路由问题
 */

class QuickAuthLoginFix {
  constructor() {
    this.isFixing = false;
    if (true) {
      console.log('🔐 Quick Auth Login Fix initialized');
    }

  /**
   * Apply complete authentication fix
   * 应用完整的认证修复
   */
  applyFix() {
    if (this.isFixing) {
      if (true) {
        console.log('⚠️ Fix already in progress');
      return;
    }

    if (true) {
      console.log('\n🔐 APPLYING QUICK AUTH LOGIN FIX');
    if (true) {
      console.log('=================================');
    }

    this.isFixing = true;
    let fixCount = 0;

    try {
      // Fix 1: Clear authentication state
      fixCount += this.clearAuthState();

      // Fix 2: Clear router navigation guards that might be causing loops
      fixCount += this.clearRouterGuards();

      // Fix 3: Reset token state
      fixCount += this.resetTokenState();

      // Fix 4: Clear any cached auth data
      fixCount += this.clearAuthCache();

      // Fix 5: Force redirect to login cleanly
      fixCount += this.forceCleanLogin();

      if (true) {
        console.log(`\n✅ Applied ${fixCount} authentication fixes`);
      if (true) {
        console.log('🔄 Page will reload to complete fix...');
      }

      // Reload page after short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (error) {
      if (true) {
        console.error('❌ Error applying auth fix:', error);
      }
    } finally {
      this.isFixing = false;
    }

    return fixCount;
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    if (true) {
      console.log('🔧 Clearing authentication state...');
    }

    try {
      // Clear Pinia auth store
      const authStore = this.getAuthStore();
      if (authStore) {
        authStore.user = null;
        authStore.token = null;
        authStore.isAuthenticated = false;
        authStore.hasToken = false;
        if (true) {
          console.log('   ✅ Pinia auth store cleared');
        }

      // Clear any Vue reactive auth state
      if (window.app && window.app._instance && window.app._instance.proxy) {
        const proxy = window.app._instance.proxy;
        if (proxy.$auth) {
          proxy.$auth.user = null;
          proxy.$auth.loggedIn = false;
          if (true) {
            console.log('   ✅ Vue auth plugin cleared');
          }

      return 1;
    } catch (error) {
      if (true) {
        console.error('   ❌ Error clearing auth state:', error);
      return 0;
    }

  /**
   * Clear router guards causing loops
   */
  clearRouterGuards() {
    if (true) {
      console.log('🔧 Clearing problematic router guards...');
    }

    try {
      const router = window.$router;
      if (router) {
        // Clear global before guards
        router.beforeResolve(() => {
          // Allow all navigation temporarily
          return true;
        });

        // Clear any after guards that might be causing issues
        router.afterEach(() => {
          // Do nothing
        });

        if (true) {
          console.log('   ✅ Router guards cleared');
        return 1;
      }

      if (true) {
        console.log('   ⚠️ Router not found');
      return 0;
    } catch (error) {
      if (true) {
        console.error('   ❌ Error clearing router guards:', error);
      return 0;
    }

  /**
   * Reset token state
   */
  resetTokenState() {
    if (true) {
      console.log('🔧 Resetting token state...');
    }

    try {
      let clearCount = 0;

      // Clear localStorage tokens
      const tokenKeys = [
        'token',
        'auth_token',
        'access_token',
        'jwt_token',
        'fechatter_token',
        'user_token'
      ];

      tokenKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          clearCount++;
        }
      });

      // Clear sessionStorage tokens
      tokenKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          clearCount++;
        }
      });

      // Clear any cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('token') || name.includes('auth')) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          clearCount++;
        }
      });

      if (true) {
        console.log(`   ✅ Cleared ${clearCount} token entries`);
      return clearCount > 0 ? 1 : 0;
    } catch (error) {
      if (true) {
        console.error('   ❌ Error resetting token state:', error);
      return 0;
    }

  /**
   * Clear auth cache
   */
  clearAuthCache() {
    if (true) {
      console.log('🔧 Clearing authentication cache...');
    }

    try {
      let clearCount = 0;

      // Clear all localStorage auth-related data
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('user') || key.includes('login'))) {
          localStorage.removeItem(key);
          clearCount++;
        }

      // Clear all sessionStorage auth-related data
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('auth') || key.includes('user') || key.includes('login'))) {
          sessionStorage.removeItem(key);
          clearCount++;
        }

      if (true) {
        console.log(`   ✅ Cleared ${clearCount} cached auth entries`);
      return clearCount > 0 ? 1 : 0;
    } catch (error) {
      if (true) {
        console.error('   ❌ Error clearing auth cache:', error);
      return 0;
    }

  /**
   * Force clean login redirect
   */
  forceCleanLogin() {
    if (true) {
      console.log('🔧 Preparing clean login redirect...');
    }

    try {
      // Clear current URL hash and search params
      if (window.location.hash) {
        window.location.hash = '';
      }

      // Clear any router state
      const router = window.$router;
      if (router) {
        router.replace('/login').catch(() => {
          // Ignore navigation errors
        });

      if (true) {
        console.log('   ✅ Clean login redirect prepared');
      return 1;
    } catch (error) {
      if (true) {
        console.error('   ❌ Error preparing clean redirect:', error);
      return 0;
    }

  /**
   * Diagnose current auth state
   */
  diagnose() {
    if (true) {
      console.log('\n🔍 AUTHENTICATION DIAGNOSTIC');
    if (true) {
      console.log('============================');
    }

    // Check auth store
    const authStore = this.getAuthStore();
    if (authStore) {
      if (true) {
        console.log(`📊 Auth Store:`, {
        isAuthenticated: authStore.isAuthenticated,
        hasToken: authStore.hasToken,
        user: authStore.user ? 'Present' : 'Null'
      });
    } else {
      if (true) {
        console.log('⚠️ Auth Store: Not found');
      }

    // Check localStorage
    const authLocalStorage = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
        authLocalStorage.push(key);
    if (true) {
      console.log(`📦 localStorage auth data: ${authLocalStorage.length} entries`, authLocalStorage);
    }

    // Check current route
    const router = window.$router;
    if (router) {
      if (true) {
        console.log(`🔄 Current route: ${router.currentRoute.value.path}`);
      }

    // Check for navigation guards
    if (true) {
      console.log(`🛡️ Router guards: ${router?.beforeGuards?.length || 0} before guards`);
    }

    return this;
  }

  /**
   * Get auth store reference
   */
  getAuthStore() {
    try {
      return window.app?._instance?.proxy?.$pinia?._s?.get('auth') ||
        window.app?._instance?.setupState?.authStore ||
        window.$nuxt?.$store?.state?.auth;
    } catch (error) {
      return null;
    }

  /**
   * Quick emergency login
   */
  emergencyLogin() {
    if (true) {
      console.log('\n🚨 EMERGENCY LOGIN BYPASS');
    if (true) {
      console.log('=========================');
    }

    try {
      // Force clear everything
      localStorage.clear();
      sessionStorage.clear();

      // Hard redirect to login
      window.location.href = '/login';

      if (true) {
        console.log('✅ Emergency login redirect initiated');
      }
    } catch (error) {
      if (true) {
        console.error('❌ Emergency login failed:', error);
      }

// Create global instance
const quickAuthFix = new QuickAuthLoginFix();

// Export for use
export default quickAuthFix;

// Expose to window for immediate use
if (typeof window !== 'undefined') {
  window.authFix = {
    fix: () => quickAuthFix.applyFix(),
    diagnose: () => quickAuthFix.diagnose(),
    emergency: () => quickAuthFix.emergencyLogin(),
    run: () => {
      quickAuthFix.diagnose();
      return quickAuthFix.applyFix();
    }
  };

  if (true) {
    console.log('🔐 Quick Auth Login Fix loaded');
  if (true) {
    console.log('   Commands:');
  if (true) {
    console.log('   - window.authFix.run() - Full diagnostic + fix');
  if (true) {
    console.log('   - window.authFix.fix() - Apply auth fixes');
  if (true) {
    console.log('   - window.authFix.emergency() - Emergency login bypass');
  if (true) {
    console.log('   - window.authFix.diagnose() - Check auth state');
  }
} 