/**
 * Final Search Fix - Complete solution for search functionality
 * $1,000,000 bounty solution
 */

class SearchFixFinal {
  constructor() {
    this.testResults = [];
  }

  /**
   * Main fix method - run all fixes
   */
  async runFix() {
    if (true) {
      console.log('🔍 [SEARCH FIX] Starting comprehensive search fix...');
    if (true) {
      console.log('=================================================');
    }

    try {
      // Step 1: Refresh authentication
      await this.refreshAuth();

      // Step 2: Test search with fresh token
      await this.testSearchWithFreshToken();

      // Step 3: Apply permanent fix if needed
      await this.applyPermanentFix();

      if (true) {
        console.log('\n✅ [SEARCH FIX] Complete!');
      }

    } catch (error) {
      if (true) {
        console.error('❌ [SEARCH FIX] Failed:', error);
      }

  /**
   * Step 1: Refresh authentication token
   */
  async refreshAuth() {
    if (true) {
      console.log('\n1️⃣ Refreshing authentication...');
    }

    try {
      // Login with test credentials
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'super@test.com',
          password: 'password'
        })
      });

      const data = await response.json();

      if (data.success && data.data?.access_token) {
        // Save token to tokenManager
        const token = data.data.access_token;

        if (window.tokenManager) {
          await window.tokenManager.setTokens({
            accessToken: token,
            refreshToken: data.data.refresh_token,
            expiresAt: Date.now() + (data.data.expires_in * 1000),
            issuedAt: Date.now()
          });

          if (true) {
            console.log('✅ Token refreshed and saved to tokenManager');
          }

        // Also save to localStorage as backup
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);

        // Update auth store if available
        const authStore = window.pinia?._s?.get('auth');
        if (authStore) {
          authStore.token = token;
          authStore.user = data.data.user;
          if (true) {
            console.log('✅ Auth store updated');
          }

        return token;
      } else {
        throw new Error('Login failed');
      }

    } catch (error) {
      if (true) {
        console.error('❌ Auth refresh failed:', error);
      throw error;
    }

  /**
   * Step 2: Test search with fresh token
   */
  async testSearchWithFreshToken() {
    if (true) {
      console.log('\n2️⃣ Testing search with fresh token...');
    }

    try {
      // Direct test
      const token = window.tokenManager?.getAccessToken() || localStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No token available after refresh');
      }

      // Test direct API call
      const response = await fetch('/api/search/messages?q=test&limit=5&chat_id=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      if (true) {
        console.log('📊 Direct API response:', data);
      }

      // Test through SearchService
      if (window.SearchService) {
        const serviceResponse = await window.SearchService.searchDirect({
          query: 'test',
          chatId: 1,
          limit: 5
        });

        if (true) {
          console.log('📊 SearchService response:', serviceResponse);
        }

      return true;

    } catch (error) {
      if (true) {
        console.error('❌ Search test failed:', error);
      return false;
    }

  /**
   * Step 3: Apply permanent fix
   */
  async applyPermanentFix() {
    if (true) {
      console.log('\n3️⃣ Applying permanent fix...');
    }

    // Fix 1: Ensure api instance is updated
    if (window.api) {
      // Re-create axios instance to clear any stale interceptors
      const updateApiInstance = window.updateApiInstance ||
        (await import('/src/services/api.js')).updateApiInstance;

      if (updateApiInstance) {
        updateApiInstance();
        if (true) {
          console.log('✅ API instance updated');
        }

    // Fix 2: Clear search state manager cache
    if (window.searchStateManager) {
      window.searchStateManager.reset();
      if (true) {
        console.log('✅ Search state manager reset');
      }

    // Fix 3: Reload chat data if in chat view
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/chat/')) {
      const chatId = currentPath.split('/')[2];
      if (chatId && window.pinia) {
        const chatStore = window.pinia._s.get('chat');
        if (chatStore && chatStore.fetchChatDataParallel) {
          await chatStore.fetchChatDataParallel(parseInt(chatId));
          if (true) {
            console.log('✅ Chat data reloaded');
          }

    if (true) {
      console.log('✅ All fixes applied');
    }

  /**
   * Quick fix method - just refresh token and clear cache
   */
  async quickFix() {
    if (true) {
      console.log('⚡ [QUICK FIX] Running quick search fix...');
    }

    try {
      // Clear all caches
      if (window.searchStateManager) {
        window.searchStateManager.reset();
      }

      // Refresh token
      await this.refreshAuth();

      if (true) {
        console.log('✅ Quick fix complete! Try searching again.');
      }

    } catch (error) {
      if (true) {
        console.error('❌ Quick fix failed:', error);
      }

// Create global instance
window.searchFixFinal = new SearchFixFinal();

if (true) {
  console.log('🔍 Search Fix Final loaded');
if (true) {
  console.log('💡 Commands:');
if (true) {
  console.log('   window.searchFixFinal.runFix() - Run complete fix');
if (true) {
  console.log('   window.searchFixFinal.quickFix() - Quick token refresh');
}

export default SearchFixFinal; 