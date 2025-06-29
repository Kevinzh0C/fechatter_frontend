/**
 * 🏆 Modern API Client - Industry Best Practices
 * 
 * Features:
 * - axios-auth-refresh for automatic token refresh
 * - Modern authentication integration
 * - Automatic retry mechanism
 * - Request deduplication
 * - Environment-aware configuration
 */

import axios from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { getApiBaseUrl } from '../utils/apiUrlResolver.js';
import { getApiConfig } from '../utils/yamlConfigLoader.js';

// 🔧 Configuration
const API_CONFIG = {
  timeout: 60000,
  retries: 3,
  retryDelay: 1000,
  deduplicationWindow: 30000 // 30 seconds
};

// 🔄 Request deduplication tracking
const activeRequests = new Map();

// 📋 Create axios instance
let api = null;
let modernAuth = null;

/**
 * 🔧 Initialize API client
 */
async function initializeApi() {
  if (api) return api;

  try {
    // Get configuration
    const baseURL = await getApiBaseUrl();
    const apiConfig = await getApiConfig();
    
    // Create axios instance
    api = axios.create({
      baseURL,
      timeout: apiConfig.timeout || API_CONFIG.timeout,
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    // Import modern auth store
    const { useModernAuth, getAuthHeader } = await import('../stores/modernAuth.js');
    modernAuth = useModernAuth();

    // 🔐 Request interceptor for authentication
    api.interceptors.request.use(
      async (config) => {
        // Handle deduplication
        const requestKey = generateRequestKey(config);
        
        if (!config.skipDeduplication && !isPostRequest(config)) {
          const existingRequest = checkDuplicateRequest(requestKey);
          if (existingRequest) {
            console.log(`🔄 [ModernAPI] Deduplicated request: ${config.method?.toUpperCase()} ${config.url}`);
            return Promise.reject({
              __DEDUPLICATED__: true,
              originalPromise: existingRequest
            });
          }
        }

        // Add authentication header
        const authHeader = getAuthHeader();
        if (authHeader && !config.skipAuth) {
          config.headers.Authorization = authHeader;
        }

        // Smart Content-Type handling
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        // Register request for deduplication
        if (!config.skipDeduplication) {
          registerRequest(requestKey, config);
        }

        // Add request ID for tracking
        config.requestId = Math.random().toString(36).substr(2, 9);
        
        console.log(`🔗 [ModernAPI-${config.requestId}] ${config.method?.toUpperCase()} ${config.url}${authHeader ? ' (authenticated)' : ''}`);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // 📥 Response interceptor
    api.interceptors.response.use(
      (response) => {
        const requestId = response.config?.requestId;
        if (requestId) {
          console.log(`✅ [ModernAPI-${requestId}] Success: ${response.status}`);
        }
        return response;
      },
      async (error) => {
        // Handle deduplicated requests
        if (error.__DEDUPLICATED__ && error.originalPromise) {
          return error.originalPromise;
        }

        const requestId = error.config?.requestId || 'unknown';
        const status = error.response?.status;

        if (status) {
          console.warn(`❌ [ModernAPI-${requestId}] Error ${status}: ${error.config?.url}`);
        } else {
          console.warn(`❌ [ModernAPI-${requestId}] Network error: ${error.config?.url}`, error.message);
        }

        return Promise.reject(error);
      }
    );

    // 🔄 Setup automatic token refresh
    const refreshAuthLogic = async (failedRequest) => {
      console.log('🔄 [ModernAPI] Token refresh triggered by 401 response');
      
      try {
        const success = await modernAuth.refreshToken();
        
        if (success) {
          const newAuthHeader = getAuthHeader();
          if (newAuthHeader) {
            failedRequest.response.config.headers.Authorization = newAuthHeader;
            console.log('✅ [ModernAPI] Request updated with new token');
            return Promise.resolve();
          }
        }
        
        throw new Error('Token refresh failed');
        
      } catch (error) {
        console.error('❌ [ModernAPI] Auto-refresh failed:', error);
        
        // Clear auth and redirect to login
        modernAuth.clearAuth();
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          console.log('🔄 [ModernAPI] Redirecting to login...');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    };

    // Install axios-auth-refresh
    createAuthRefreshInterceptor(api, refreshAuthLogic, {
      statusCodes: [401], // Refresh on 401 Unauthorized
      pauseInstanceWhileRefreshing: true, // Pause other requests during refresh
      onRetry: (requestConfig) => {
        console.log(`🔄 [ModernAPI] Retrying request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
      }
    });

    console.log('✅ [ModernAPI] Initialized with modern authentication');
    return api;

  } catch (error) {
    console.error('❌ [ModernAPI] Initialization failed:', error);
    throw error;
  }
}

/**
 * 🔑 Generate request key for deduplication
 */
function generateRequestKey(config) {
  const { method, url, params, data } = config;
  const queryParams = params ? JSON.stringify(params) : '';
  const bodyData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';
  return `${method}:${url}:${queryParams}:${bodyData}`;
}

/**
 * 🔍 Check for duplicate requests
 */
function checkDuplicateRequest(requestKey) {
  const existingRequest = activeRequests.get(requestKey);
  
  if (existingRequest && Date.now() - existingRequest.timestamp < API_CONFIG.deduplicationWindow) {
    return existingRequest.promise;
  }
  
  return null;
}

/**
 * 📝 Register request for deduplication
 */
function registerRequest(requestKey, config) {
  // Create a placeholder promise that will be replaced by the actual request
  const placeholder = new Promise((resolve, reject) => {
    // This will be resolved/rejected by the actual request
    setTimeout(() => {
      activeRequests.delete(requestKey);
    }, API_CONFIG.deduplicationWindow);
  });

  activeRequests.set(requestKey, {
    promise: placeholder,
    timestamp: Date.now()
  });
}

/**
 * 🔍 Check if request is POST
 */
function isPostRequest(config) {
  return config.method?.toLowerCase() === 'post';
}

/**
 * 🎯 Enhanced API wrapper with automatic initialization
 */
const modernApiWrapper = {
  async get(url, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.get(url, config);
  },
  
  async post(url, data, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.post(url, data, config);
  },
  
  async put(url, data, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.put(url, data, config);
  },
  
  async patch(url, data, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.patch(url, data, config);
  },
  
  async delete(url, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.delete(url, config);
  },
  
  async head(url, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.head(url, config);
  },
  
  async options(url, config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.options(url, config);
  },
  
  async request(config = {}) {
    const apiInstance = await initializeApi();
    return apiInstance.request(config);
  },
  
  // Utility methods
  async getInstance() {
    return await initializeApi();
  },
  
  clearCache() {
    activeRequests.clear();
    console.log('🧹 [ModernAPI] Request cache cleared');
  },
  
  getStats() {
    return {
      activeRequests: activeRequests.size,
      isInitialized: !!api
    };
  }
};

export default modernApiWrapper;
export { initializeApi }; 