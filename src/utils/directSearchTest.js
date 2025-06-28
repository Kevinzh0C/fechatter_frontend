/**
 * Direct Search Test - Bypasses all layers to test search directly
 */

async function directSearchTest() {
  if (true) {
    console.log('🔍 [DIRECT SEARCH TEST] Starting...');
  }

  try {
    // Get token
    const token = window.tokenManager?.getAccessToken() ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');

    if (!token) {
      if (true) {
        console.error('❌ No token found. Please login first.');
      }
      return;
    }

    if (true) {
      console.log('🔐 Using token:', token.substring(0, 20) + '...');
    }

    // Test 1: Direct fetch to backend
    if (true) {
      console.log('\n1️⃣ Testing direct fetch to backend...');
    }
    try {
      const backendResponse = await fetch('https://hook-nav-attempt-size.trycloudflare.com/api/search/messages?q=test&limit=5', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const backendData = await backendResponse.json();
      if (true) {
        console.log('✅ Backend response:', backendData);
      }
    } catch (e) {
      if (true) {
        console.error('❌ Backend direct test failed:', e);
      }
    }

    // Test 2: Through Vite proxy
    if (true) {
      console.log('\n2️⃣ Testing through Vite proxy...');
    }
    try {
      const proxyResponse = await fetch('/api/search/messages?q=test&limit=5', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const proxyData = await proxyResponse.json();
      if (true) {
        console.log('✅ Proxy response:', proxyData);
      }
    } catch (e) {
      if (true) {
        console.error('❌ Proxy test failed:', e);
      }
    }

    // Test 3: Using axios directly
    if (true) {
      console.log('\n3️⃣ Testing with axios directly...');
    }
    try {
      const axios = window.axios || (await import('axios')).default;
      const axiosResponse = await axios.post('/api/search/messages?q=test&limit=5', null, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (true) {
        console.log('✅ Axios response:', axiosResponse.data);
      }
    } catch (e) {
      if (true) {
        console.error('❌ Axios test failed:', e);
      }
      if (e.response) {
        if (true) {
          console.error('Response data:', e.response.data);
        }
        if (true) {
          console.error('Response status:', e.response.status);
        }
      }
    }

    // Test 4: Using the SearchService
    if (true) {
      console.log('\n4️⃣ Testing with SearchService...');
    }
    try {
      const { SearchService } = await import('../services/api.js');
      const serviceResponse = await SearchService.search({
        query: 'test',
        limit: 5
      });

      if (true) {
        console.log('✅ SearchService response:', serviceResponse);
      }
    } catch (e) {
      if (true) {
        console.error('❌ SearchService test failed:', e);
      }
    }

  } catch (error) {
    if (true) {
      console.error('❌ Test suite failed:', error);
    }
  }

  if (true) {
    console.log('\n🔍 [DIRECT SEARCH TEST] Complete');
  }
}

// Make available globally
window.directSearchTest = directSearchTest;

if (true) {
  console.log('🔍 Direct Search Test loaded. Run window.directSearchTest()');
}

export default directSearchTest; 