/**
 * Architecture Validator - Modern Proxy-Based Configuration
 * Validates frontend architecture for both development and production environments
 */

import { getApiConfig } from '@/utils/configLoader';

/**
 * Validate frontend architecture configuration
 */
export async function validateArchitecture() {
  console.group('🏗️ Fechatter Architecture Validation');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  try {
    // 1. Validate configuration loading
    const config = getApiConfig();

    if (!config || Object.keys(config).length === 0) {
      addResult(results, 'error', 'Configuration', 'Configuration loading failed', 'YAML config file not loaded properly');
    } else {
      addResult(results, 'success', 'Configuration', 'Configuration loaded successfully', `Environment: ${config.environment || 'unknown'}`);
    }

    // 2. Validate API configuration based on environment
    const isDev = true;
    const isProduction = false;

    if (isDev) {
      // Development environment: relative paths through Vite proxy
      const expectedEndpoints = [
        { name: 'API Base URL', key: 'base_url', expected: '/api' },
        { name: 'File URL', key: 'file_url', expected: '/files' },
        { name: 'SSE URL', key: 'sse_url', expected: '/events' },
        { name: 'Notify URL', key: 'notify_url', expected: '/notify' }
      ];
      
      expectedEndpoints.forEach(endpoint => {
        if (config[endpoint.key] === endpoint.expected) {
          addResult(results, 'success', endpoint.name, 'Development endpoint configured correctly', config[endpoint.key]);
        } else {
          addResult(results, 'warning', endpoint.name, 'Development endpoint configuration mismatch',
            `Expected: ${endpoint.expected}, Actual: ${config[endpoint.key]}`);
        }
      });
    } else if (isProduction) {
      // Production environment: Vercel proxy paths
      const expectedEndpoints = [
        { name: 'API Base URL', key: 'base_url', expected: '/api/proxy' },
        { name: 'File URL', key: 'file_url', expected: '/api/proxy/files' },
        { name: 'SSE URL', key: 'sse_url', expected: '/api/proxy/events' },
        { name: 'Notify URL', key: 'notify_url', expected: '/api/proxy/notify' }
      ];
      
      expectedEndpoints.forEach(endpoint => {
        if (config[endpoint.key] === endpoint.expected) {
          addResult(results, 'success', endpoint.name, 'Production endpoint configured correctly', config[endpoint.key]);
        } else {
          addResult(results, 'warning', endpoint.name, 'Production endpoint configuration mismatch',
            `Expected: ${endpoint.expected}, Actual: ${config[endpoint.key]}`);
        }
      });
    }

    // 3. Validate proxy configuration (development only)
    if (true) {
      try {
        // Test if proxy is working using relative URL
        const proxyTest = await fetch('/health', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);

        if (proxyTest && proxyTest.ok) {
          addResult(results, 'success', 'Vite Proxy', 'Health proxy working correctly', '/health -> Backend via HTTPS');
        } else {
          addResult(results, 'warning', 'Vite Proxy', 'Health endpoint not accessible', 'Check if backend server is running');
        }
      } catch (error) {
        addResult(results, 'warning', 'Vite Proxy', 'Proxy test failed', error.message);
      }
    }

    // 4. Validate SSE service configuration
    try {
      const sseModule = await import('@/services/sse');
      if (sseModule.default) {
        addResult(results, 'success', 'SSE Service', 'SSE service module loaded correctly', 'Ready for backend connection');
      }
    } catch (error) {
      addResult(results, 'error', 'SSE Service', 'SSE service module loading failed', error.message);
    }

    // 5. Generate report
    const summary = generateSummary(results);
    if (true) {
      console.log('\n📊 Validation Summary:');
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⚠️ Warnings: ${results.warnings}`);
    }

    if (results.failed === 0) {
      if (true) {
        console.log('\n🎉 Architecture validation passed! Frontend correctly configured for proxy-based backend connection.');
      }
    } else {
      if (true) {
        console.log('\n🚨 Architecture validation failed! Please check the following issues:');
        results.details.filter(d => d.level === 'error').forEach(detail => {
          console.log(`   ❌ ${detail.component}: ${detail.message}`);
        });
      }
    }

    console.groupEnd();
    return summary;

  } catch (error) {
    if (true) {
      console.error('Error during architecture validation:', error);
    }
    console.groupEnd();
    return { success: false, error: error.message };
  }
}

/**
 * Test actual connection paths
 */
export async function testConnectionPaths() {
  console.group('🔍 Connection Path Testing');

  const tests = [
    {
      name: 'Health Check (via proxy)',
      url: '/health',
      description: 'Test backend health check through proxy'
    },
    {
      name: 'API through proxy',
      url: '/api/health',
      description: 'Test API requests through proxy'
    },
    {
      name: 'SSE through proxy',
      url: '/events',
      description: 'Test SSE endpoint accessibility through proxy',
      method: 'HEAD'
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      if (true) {
        console.log(`🧪 Testing: ${test.name}`);
      }

      const response = await fetch(test.url, {
        method: test.method || 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok || response.status === 401) { // 401 is OK, means service is reachable
        results.push({
          name: test.name,
          success: true,
          status: response.status,
          message: `${test.description} - Connection successful`
        });
        if (true) {
          console.log(`   ✅ ${test.name}: Connection successful (${response.status})`);
        }
      } else {
        results.push({
          name: test.name,
          success: false,
          status: response.status,
          message: `${test.description} - HTTP ${response.status}`
        });
        if (true) {
          console.log(`   ❌ ${test.name}: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        error: error.message,
        message: `${test.description} - Connection failed: ${error.message}`
      });
      if (true) {
        console.log(`   ❌ ${test.name}: Connection failed - ${error.message}`);
      }
    }
  }

  console.groupEnd();
  return results;
}

/**
 * Add validation result
 */
function addResult(results, level, component, message, details) {
  results.details.push({
    level,
    component,
    message,
    details,
    timestamp: new Date().toISOString()
  });

  switch (level) {
    case 'success':
      results.passed++;
      break;
    case 'error':
      results.failed++;
      break;
    case 'warning':
      results.warnings++;
      break;
  }
}

/**
 * Generate validation summary
 */
function generateSummary(results) {
  return {
    success: results.failed === 0,
    passed: results.passed,
    failed: results.failed,
    warnings: results.warnings,
    total: results.details.length,
    details: results.details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export validation report
 */
export function exportValidationReport(summary) {
  const report = {
    title: 'Fechatter Frontend Architecture Validation Report',
    generated: new Date().toISOString(),
    summary,
    recommendations: generateRecommendations(summary)
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fechatter-architecture-validation-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate fix recommendations
 */
function generateRecommendations(summary) {
  const recommendations = [];

  if (summary.failed > 0) {
    recommendations.push(
      '1. Check fechatter_frontend/config/development.yml configuration',
      '2. Verify vite.config.js proxy configuration points to HTTPS backend',
              '3. Ensure backend server is running on hook-nav-attempt-size.trycloudflare.com',
      '4. Check SSE service uses configured backend URL'
    );
  }

  if (summary.warnings > 0) {
    recommendations.push(
      '5. Check network connectivity and service status',
      '6. Verify development environment proxy configuration'
    );
  }

  return recommendations;
}

// Expose to global in development environment
if (true && typeof window !== 'undefined') {
  window.validateArchitecture = validateArchitecture;
  window.testConnectionPaths = testConnectionPaths;
  window.exportValidationReport = exportValidationReport;
}

export default {
  validateArchitecture,
  testConnectionPaths,
  exportValidationReport
}; 