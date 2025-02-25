/**
 * Environment Testing Utility
 * Test API URL resolution in different environments
 */

import { 
  getApiBaseUrl, 
  getFileUrl, 
  getSseUrl, 
  getNotifyUrl, 
  getEnvironmentInfo,
  detectRuntimeEnvironment 
} from './apiUrlResolver.js';

/**
 * Test API URL resolution
 */
export async function testApiUrlResolution() {
  console.group('🌐 Environment & API URL Resolution Test');
  
  try {
    // Get environment info
    const envInfo = getEnvironmentInfo();
    console.log('Environment Detection:', envInfo);
    
    // Test all URL resolvers
    const urls = {
      apiBase: await getApiBaseUrl(),
      fileUrl: await getFileUrl(),
      sseUrl: await getSseUrl(),
      notifyUrl: await getNotifyUrl()
    };
    
    console.log('Resolved URLs:', urls);
    
    // Verify URLs are appropriate for environment
    const environment = detectRuntimeEnvironment();
    const expectedPatterns = {
      development: /^\/api|^\/files|^\/events|^\/notify/,
      vercel: /^\/api\/proxy/,
      production: /^https:\/\/45\.77\.178\.85:8443/
    };
    
    const pattern = expectedPatterns[environment];
    const results = {
      environment,
      urls,
      validation: {
        apiBase: pattern ? pattern.test(urls.apiBase) : true,
        fileUrl: pattern ? pattern.test(urls.fileUrl) : true,
        sseUrl: pattern ? pattern.test(urls.sseUrl) : true,
        notifyUrl: pattern ? pattern.test(urls.notifyUrl) : true
      }
    };
    
    const allValid = Object.values(results.validation).every(v => v);
    console.log(`✅ URL Resolution Test: ${allValid ? 'PASSED' : 'FAILED'}`);
    console.log('Validation Results:', results.validation);
    
    return results;
    
  } catch (error) {
    console.error('❌ Environment test failed:', error);
    return { error: error.message };
  } finally {
    console.groupEnd();
  }
}

/**
 * Test API connectivity
 */
export async function testApiConnectivity() {
  console.group('🔗 API Connectivity Test');
  
  try {
    const baseUrl = await getApiBaseUrl();
    console.log(`Testing connectivity to: ${baseUrl}`);
    
    // Test basic connectivity (without authentication)
    const testEndpoint = `${baseUrl}/health`;
    
    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const result = {
      url: testEndpoint,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };
    
    if (response.ok) {
      console.log('✅ API Connectivity: SUCCESS');
    } else {
      console.log(`⚠️ API Connectivity: ${response.status} ${response.statusText}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ API Connectivity test failed:', error);
    return { error: error.message };
  } finally {
    console.groupEnd();
  }
}

/**
 * Test CORS configuration
 */
export async function testCorsConfiguration() {
  console.group('🛡️ CORS Configuration Test');
  
  try {
    const baseUrl = await getApiBaseUrl();
    const origin = window.location.origin;
    
    console.log(`Testing CORS from origin: ${origin}`);
    console.log(`Target API: ${baseUrl}`);
    
    // Test preflight request
    const response = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
    };
    
    console.log('CORS Headers:', corsHeaders);
    
    const result = {
      origin,
      targetUrl: baseUrl,
      preflightStatus: response.status,
      corsHeaders,
      corsEnabled: !!corsHeaders['access-control-allow-origin']
    };
    
    if (result.corsEnabled) {
      console.log('✅ CORS Configuration: ENABLED');
    } else {
      console.log('⚠️ CORS Configuration: NOT DETECTED');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ CORS test failed:', error);
    return { error: error.message };
  } finally {
    console.groupEnd();
  }
}

/**
 * Run comprehensive environment tests
 */
export async function runEnvironmentTests() {
  console.log('🚀 Starting Comprehensive Environment Tests...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Run all tests
  results.tests.urlResolution = await testApiUrlResolution();
  results.tests.apiConnectivity = await testApiConnectivity();
  results.tests.corsConfiguration = await testCorsConfiguration();
  
  // Summary
  const hasErrors = Object.values(results.tests).some(test => test.error);
  console.log(`\n📊 Environment Tests ${hasErrors ? 'COMPLETED WITH ISSUES' : 'PASSED'}`);
  
  return results;
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.testEnvironment = {
    testApiUrlResolution,
    testApiConnectivity,
    testCorsConfiguration,
    runEnvironmentTests
  };
  
  if (import.meta.env.DEV) {
    console.log('🧪 Environment testing tools loaded:');
    console.log('  - window.testEnvironment.runEnvironmentTests()');
    console.log('  - window.testEnvironment.testApiUrlResolution()');
    console.log('  - window.testEnvironment.testApiConnectivity()');
    console.log('  - window.testEnvironment.testCorsConfiguration()');
  }
}

export default {
  testApiUrlResolution,
  testApiConnectivity,
  testCorsConfiguration,
  runEnvironmentTests
}; 