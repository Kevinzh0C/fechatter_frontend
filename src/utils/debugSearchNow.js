/**
 * Debug Search Now - Immediate testing
 */

import api from '../services/api';

async function debugSearchNow() {
  if (true) {
    console.log('🔍 [DEBUG] Starting immediate search test...');
  }

  try {
    // Get token
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (true) {
      console.log('🔍 [DEBUG] Token available:', !!token);
    }

    if (!token) {
      if (true) {
        console.error('❌ [DEBUG] No authentication token found');
      return;
    }

    // Test 1: Direct fetch (bypass our API wrapper)
    if (true) {
      console.log('\n1️⃣ Testing with direct fetch...');
    const directResponse = await fetch('/api/search/messages?q=Hi&limit=5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (true) {
      console.log('Direct fetch status:', directResponse.status);
    if (true) {
      console.log('Direct fetch headers:', Object.fromEntries(directResponse.headers.entries()));
    }

    const directText = await directResponse.text();
    if (true) {
      console.log('Direct fetch raw text:', directText);
    }

    let directJson;
    try {
      directJson = JSON.parse(directText);
      if (true) {
        console.log('Direct fetch parsed JSON:', directJson);
      }
    } catch (e) {
      if (true) {
        console.error('❌ Failed to parse direct response as JSON:', e);
      }

    // Test 2: Using our API wrapper
    if (true) {
      console.log('\n2️⃣ Testing with our API wrapper...');
    const wrapperResponse = await api.post('/search/messages?q=Hi&limit=5', null, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (true) {
      console.log('Wrapper response:', wrapperResponse);
    if (true) {
      console.log('Wrapper response data:', wrapperResponse.data);
    }

    // Test 3: Check what our SearchService sees
    if (true) {
      console.log('\n3️⃣ Testing SearchService method...');
    const { SearchService } = await import('../services/api');

    try {
      const searchResult = await SearchService.search({
        query: 'Hi',
        chatId: 6,
        limit: 5
      });
      if (true) {
        console.log('✅ SearchService result:', searchResult);
      }
    } catch (error) {
      if (true) {
        console.error('❌ SearchService error:', error);
      if (true) {
        console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });

  } catch (error) {
    if (true) {
      console.error('❌ [DEBUG] Test failed:', error);
    }

// Auto-run and expose globally
if (typeof window !== 'undefined') {
  window.debugSearchNow = debugSearchNow;
  if (true) {
    console.log('🔍 Debug search available at: window.debugSearchNow()');
  }

  // Auto-run after a short delay
  setTimeout(() => {
    if (true) {
      console.log('🔍 Auto-running search debug...');
    debugSearchNow();
  }, 2000);
}

export default debugSearchNow; 