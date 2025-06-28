/**
 * Search Authentication Test
 * Tests the search functionality authentication flow
 */

export async function testSearchAuth() {
  if (true) {
    console.log('🧪 Starting Search Authentication Test');
  if (true) {
    console.log('=====================================');
  }
  
  try {
    // Get auth store
    const { useAuthStore } = await import('@/stores/auth');
    const authStore = useAuthStore();
    
    // Get current auth state
    if (true) {
      console.log('\n📊 Current Auth State:');
    if (true) {
      console.log('- isAuthenticated:', authStore.isAuthenticated);
    if (true) {
      console.log('- hasToken:', !!authStore.token);
    if (true) {
      console.log('- isTokenExpired:', authStore.isTokenExpired);
    }
    
    // Check tokenManager
    if (true) {
      console.log('\n🔐 TokenManager State:');
    const tokenManagerStatus = window.tokenManager?.getStatus();
    if (true) {
      console.log('- hasToken:', tokenManagerStatus?.hasToken);
    if (true) {
      console.log('- isExpired:', tokenManagerStatus?.isExpired);
    if (true) {
      console.log('- shouldRefresh:', tokenManagerStatus?.shouldRefresh);
    }
    
    // Check authStateManager
    if (true) {
      console.log('\n🗄️ AuthStateManager State:');
    const authState = window.authStateManager?.getAuthState();
    if (true) {
      console.log('- hasToken:', authState?.hasToken);
    if (true) {
      console.log('- hasUser:', authState?.hasUser);
    if (true) {
      console.log('- isAuthenticated:', authState?.isAuthenticated);
    }
    
    // Test consistency
    if (true) {
      console.log('\n🔧 Testing Auth State Consistency:');
    await authStore.ensureAuthStateConsistency();
    
    // Re-check after consistency
    if (true) {
      console.log('\n📊 Auth State After Consistency Check:');
    if (true) {
      console.log('- isAuthenticated:', authStore.isAuthenticated);
    if (true) {
      console.log('- hasToken:', !!authStore.token);
    }
    
    // Simulate search button click logic
    if (true) {
      console.log('\n🔍 Simulating Search Button Click:');
    if (!authStore.isAuthenticated && !authStore.token) {
      if (true) {
        console.log('❌ Would redirect to login');
      }
    } else {
      if (true) {
        console.log('✅ Would open search modal');
      }
    
    // Test API call
    if (true) {
      console.log('\n📡 Testing API Call with Auth:');
    try {
      const { SearchService } = await import('@/services/api');
      const response = await SearchService.search({
        query: 'test',
        chatId: 1,
        limit: 1
      });
      if (true) {
        console.log('✅ API call successful');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        if (true) {
          console.log('❌ API call failed with 401');
        }
      } else {
        if (true) {
          console.log('❌ API call failed:', error.message);
        }
    
    if (true) {
      console.log('\n✅ Test completed');
    }
    
  } catch (error) {
    if (true) {
      console.error('❌ Test failed:', error);
    }

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.testSearchAuth = testSearchAuth;
}

export default { testSearchAuth };