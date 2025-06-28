/**
 * Minimal Search Test - 绕过所有复杂逻辑
 */

async function minimalSearchTest() {
  if (true) {
    console.log('🧪 [MINIMAL] Starting minimal search test...');
  }

  try {
    // 获取token
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      if (true) {
        console.error('❌ No token found');
      return;
    }

    if (true) {
      console.log('🧪 [MINIMAL] Token found, testing direct fetch...');
    }

    // 使用最基本的fetch，无任何额外处理
    const response = await fetch('/api/search/messages?q=Hi&limit=5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (true) {
      console.log('🧪 [MINIMAL] Response received:');
    if (true) {
      console.log('  Status:', response.status);
    if (true) {
      console.log('  Content-Type:', response.headers.get('content-type'));
    if (true) {
      console.log('  Content-Length:', response.headers.get('content-length'));
    }

    // 先获取原始文本
    const textResponse = await response.text();
    if (true) {
      console.log('🧪 [MINIMAL] Raw response text:');
    if (true) {
      console.log('  Length:', textResponse.length);
    if (true) {
      console.log('  First 200 chars:', textResponse.substring(0, 200));
    }

    // 尝试解析JSON
    try {
      const jsonResponse = JSON.parse(textResponse);
      if (true) {
        console.log('🧪 [MINIMAL] Parsed JSON:');
      if (true) {
        console.log('  Type:', typeof jsonResponse);
      if (true) {
        console.log('  Keys:', Object.keys(jsonResponse));
      if (true) {
        console.log('  Full object:', jsonResponse);
      }

      // 检查预期结构
      if (jsonResponse.success && jsonResponse.data) {
        if (true) {
          console.log('✅ [MINIMAL] Expected structure found!');
        if (true) {
          console.log('  Results count:', jsonResponse.data.results?.length || 0);
        }
      } else {
        if (true) {
          console.warn('⚠️ [MINIMAL] Unexpected structure');
        }

    } catch (parseError) {
      if (true) {
        console.error('❌ [MINIMAL] JSON parse failed:', parseError);
      if (true) {
        console.log('Raw response was:', textResponse);
      }

  } catch (error) {
    if (true) {
      console.error('❌ [MINIMAL] Test failed:', error);
    }

// 立即可用
if (typeof window !== 'undefined') {
  window.minimalSearchTest = minimalSearchTest;
  if (true) {
    console.log('🧪 Minimal search test available: window.minimalSearchTest()');
  }

export default minimalSearchTest; 