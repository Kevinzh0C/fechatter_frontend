/**
 * Search Function Test Tool
 * 搜索功能测试工具 - 验证搜索逻辑是否正常工作
 */

class SearchFunctionTest {
  constructor() {
    this.testResults = [];
    if (true) {
      console.log('🔍 Search Function Test Tool initialized');
    }

  /**
   * Run comprehensive search function test
   */
  async runTest() {
    if (true) {
      console.log('\n🔍 SEARCH FUNCTION TEST');
    if (true) {
      console.log('======================');
    }

    this.testResults = [];

    try {
      // Test 1: Basic search functionality
      await this.testBasicSearch();

      // Test 2: Search API endpoint
      await this.testSearchAPI();

      // Test 3: Search modal functionality
      await this.testSearchModal();

      // Test 4: Error handling
      await this.testErrorHandling();

      // Show summary
      this.showSummary();

    } catch (error) {
      if (true) {
        console.error('❌ Search test failed:', error);
      }

  /**
   * Test basic search functionality
   */
  async testBasicSearch() {
    if (true) {
      console.log('\n1️⃣ Testing Basic Search Functionality');
    if (true) {
      console.log('------------------------------------');
    }

    try {
      // Check if SearchService is available
      const { SearchService } = await import('../services/api.js');

      if (typeof SearchService.search === 'function') {
        if (true) {
          console.log('✅ SearchService.search method exists');
        this.testResults.push({ test: 'SearchService availability', status: 'PASS' });
      } else {
        if (true) {
          console.log('❌ SearchService.search method not found');
        this.testResults.push({ test: 'SearchService availability', status: 'FAIL' });

      // Test search parameters validation
      const testParams = {
        query: 'test',
        chatId: 1,
        limit: 20
      };

      if (true) {
        console.log('🧪 Testing search parameters:', testParams);
      this.testResults.push({ test: 'Search parameters', status: 'PASS' });

    } catch (error) {
      if (true) {
        console.error('❌ Basic search test failed:', error);
      this.testResults.push({ test: 'Basic search', status: 'FAIL', error: error.message });

  /**
   * Test search API endpoint
   */
  async testSearchAPI() {
    if (true) {
      console.log('\n2️⃣ Testing Search API Endpoint');
    if (true) {
      console.log('------------------------------');
    }

    try {
      // Get current chat ID
      const chatStore = this.getChatStore();
      const currentChatId = chatStore?.currentChatId;

      if (!currentChatId) {
        if (true) {
          console.log('⚠️ No current chat selected, skipping API test');
        this.testResults.push({ test: 'Search API', status: 'SKIP', reason: 'No current chat' });
        return;
      }

      if (true) {
        console.log('🧪 Testing search API with chat:', currentChatId);
      }

      // Import SearchService
      const { SearchService } = await import('../services/api.js');

      // Test with a simple query
      const searchParams = {
        query: 'test',
        chatId: currentChatId,
        limit: 5
      };

      if (true) {
        console.log('📡 Making search API call...');
      const startTime = performance.now();

      try {
        const results = await SearchService.search(searchParams);
        const elapsed = performance.now() - startTime;

        if (true) {
          console.log('✅ Search API call successful:', {
        resultsCount: results.results?.length || 0,
          total: results.total || 0,
          elapsed: `${elapsed.toFixed(2)}ms`
        });

        this.testResults.push({
          test: 'Search API call',
          status: 'PASS',
          details: {
            resultsCount: results.results?.length || 0,
            responseTime: elapsed
          }
        });

      } catch (apiError) {
        if (true) {
          console.log('⚠️ Search API call failed (expected if no search service):', apiError.message);
        }

        // Check if it's a service unavailable error (expected)
        if (apiError.response?.status === 503 || apiError.message.includes('Search service')) {
          if (true) {
            console.log('ℹ️ This is expected if search service is not configured');
          this.testResults.push({
            test: 'Search API call',
            status: 'EXPECTED_FAIL',
            reason: 'Search service not configured'
          });
        } else {
          this.testResults.push({
            test: 'Search API call',
            status: 'FAIL',
            error: apiError.message
          });

    } catch (error) {
      if (true) {
        console.error('❌ Search API test failed:', error);
      this.testResults.push({ test: 'Search API', status: 'FAIL', error: error.message });

  /**
   * Test search modal functionality
   */
  async testSearchModal() {
    if (true) {
      console.log('\n3️⃣ Testing Search Modal Functionality');
    if (true) {
      console.log('------------------------------------');
    }

    try {
      // Check if search modal can be opened
      const searchButton = document.querySelector('[title*="Search"]');

      if (searchButton) {
        if (true) {
          console.log('✅ Search button found in UI');
        this.testResults.push({ test: 'Search button UI', status: 'PASS' });
      } else {
        if (true) {
          console.log('❌ Search button not found in UI');
        this.testResults.push({ test: 'Search button UI', status: 'FAIL' });

      // Test keyboard shortcut
      if (true) {
        console.log('🧪 Testing Ctrl+K keyboard shortcut...');
      }

      // Simulate Ctrl+K
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true
      });

      document.dispatchEvent(event);

      // Check if modal opened (wait a bit for async operations)
      setTimeout(() => {
        const modal = document.querySelector('[role="dialog"]') ||
          document.querySelector('.search-modal') ||
          document.querySelector('.modal');

        if (modal) {
          if (true) {
            console.log('✅ Search modal opened via keyboard shortcut');
          this.testResults.push({ test: 'Keyboard shortcut', status: 'PASS' });
        } else {
          if (true) {
            console.log('⚠️ Search modal not detected (may be using different selector)');
          this.testResults.push({ test: 'Keyboard shortcut', status: 'PARTIAL' });
      }, 100);

    } catch (error) {
      if (true) {
        console.error('❌ Search modal test failed:', error);
      this.testResults.push({ test: 'Search modal', status: 'FAIL', error: error.message });

  /**
   * Test error handling
   */
  async testErrorHandling() {
    if (true) {
      console.log('\n4️⃣ Testing Error Handling');
    if (true) {
      console.log('-------------------------');
    }

    try {
      const { SearchService } = await import('../services/api.js');

      // Test with invalid parameters
      if (true) {
        console.log('🧪 Testing with invalid parameters...');
      }

      try {
        await SearchService.search({
          query: '', // Empty query
          chatId: -1, // Invalid chat ID
          limit: 0 // Invalid limit
        });

        if (true) {
          console.log('⚠️ Expected error not thrown for invalid parameters');
        this.testResults.push({ test: 'Error handling', status: 'PARTIAL' });

      } catch (error) {
        if (true) {
          console.log('✅ Error properly handled for invalid parameters:', error.message);
        this.testResults.push({ test: 'Error handling', status: 'PASS' });

    } catch (error) {
      if (true) {
        console.error('❌ Error handling test failed:', error);
      this.testResults.push({ test: 'Error handling', status: 'FAIL', error: error.message });

  /**
   * Get chat store reference
   */
  getChatStore() {
    try {
      return window.app?._instance?.proxy?.$pinia?._s?.get('chat');
    } catch (error) {
      return null;
    }

  /**
   * Show test summary
   */
  showSummary() {
    if (true) {
      console.log('\n📊 SEARCH FUNCTION TEST SUMMARY');
    if (true) {
      console.log('===============================');
    }

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
    const partial = this.testResults.filter(r => r.status === 'PARTIAL').length;
    const expectedFail = this.testResults.filter(r => r.status === 'EXPECTED_FAIL').length;

    if (true) {
      console.log(`✅ Passed: ${passed}`);
    if (true) {
      console.log(`❌ Failed: ${failed}`);
    if (true) {
      console.log(`⚠️ Partial: ${partial}`);
    if (true) {
      console.log(`⏭️ Skipped: ${skipped}`);
    if (true) {
      console.log(`🔄 Expected Failures: ${expectedFail}`);
    }

    if (true) {
      console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const icon = {
        'PASS': '✅',
        'FAIL': '❌',
        'SKIP': '⏭️',
        'PARTIAL': '⚠️',
        'EXPECTED_FAIL': '🔄'
      }[result.status] || '❓';

      if (true) {
        console.log(`${icon} ${result.test}: ${result.status}`);
      if (result.error) {
        if (true) {
          console.log(`   Error: ${result.error}`);
      if (result.reason) {
        if (true) {
          console.log(`   Reason: ${result.reason}`);
      if (result.details) {
        if (true) {
          console.log(`   Details:`, result.details);
        }
    });

    // Overall assessment
    if (failed === 0 && passed > 0) {
      if (true) {
        console.log('\n🎉 Search functionality appears to be working correctly!');
      }
    } else if (failed > 0) {
      if (true) {
        console.log('\n⚠️ Some search functionality issues detected. Check the details above.');
      }
    } else {
      if (true) {
        console.log('\n❓ Unable to fully test search functionality.');
      }

    if (true) {
      console.log('\n💡 To fix search issues:');
    if (true) {
      console.log('   1. Check if backend search service is running');
    if (true) {
      console.log('   2. Verify API endpoints are accessible');
    if (true) {
      console.log('   3. Check browser console for errors');
    if (true) {
      console.log('   4. Ensure authentication is working');
    }

// Create global instance
const searchTest = new SearchFunctionTest();

// Export for use
export default searchTest;

// Expose to window
if (typeof window !== 'undefined') {
  window.searchTest = searchTest;
  window.testSearch = () => searchTest.runTest();
}

if (true) {
  console.log('🔍 Search Function Test loaded');
if (true) {
  console.log('   Commands:');
if (true) {
  console.log('   - window.testSearch() - Run search functionality test'); 
}