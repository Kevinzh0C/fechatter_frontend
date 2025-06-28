/**
 * Test Search API - Simple direct test
 */

async function testSearchApi() {
  if (true) {
    console.log('🔍 Testing Search API...');
  }

  try {
    // Direct fetch to see raw response
    const response = await fetch('/api/search/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({
        q: 'test',
        limit: 5
      })
    });

    if (true) {
      console.log('📡 Response Status:', response.status);
    if (true) {
      console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    }

    const text = await response.text();
    if (true) {
      console.log('📡 Raw Response Text:', text);
    }

    try {
      const json = JSON.parse(text);
      if (true) {
        console.log('📡 Parsed JSON:', json);
      if (true) {
        console.log('📡 JSON Structure:', {
        type: typeof json,
        isArray: Array.isArray(json),
        keys: Object.keys(json || {}),
        hasSuccess: 'success' in json,
        hasData: 'data' in json,
        hasHits: 'hits' in json,
        hasResults: 'results' in json
      });

      // Show what frontend expects vs what we got
      if (true) {
        console.log('🔍 Frontend expects one of:');
      if (true) {
        console.log('   1. { success: true, data: { hits: [...] } }');
      if (true) {
        console.log('   2. { hits: [...] }');
      if (true) {
        console.log('   3. { results: [...] }');
      if (true) {
        console.log('   4. [...]');
      if (true) {
        console.log('🔍 But we got:', Object.keys(json || {}));
      }

    } catch (e) {
      if (true) {
        console.error('❌ Failed to parse as JSON:', e);
      }

  } catch (error) {
    if (true) {
      console.error('❌ Request failed:', error);
    }

// Add to window
window.testSearchApi = testSearchApi;

if (true) {
  console.log('🔍 Search API Test loaded. Run: window.testSearchApi()');
}

export { testSearchApi }; 