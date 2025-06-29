import axios from 'axios';
import { getApiConfig } from '../utils/yamlConfigLoader.js';
import { getApiBaseUrl } from '../utils/apiUrlResolver.js';
import { useAuthStore } from '@/stores/auth';
import tokenSynchronizer from './tokenSynchronizer';

/**
 * Production-level API client with authentication and error handling
 */

// Configuration promise to ensure all requests wait for config
let configInitialized = false;
let configPromise = null;

// 🔧 ENHANCED: Request deduplication tracking
const activeRequests = new Map();

// Initialize with fallback
let api = axios.create({
  baseURL: '/api', // Fallback
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true'  // Skip ngrok browser warning
    // 🔧 CRITICAL FIX: Removed default 'Content-Type': 'application/json'
    // This allows axios to automatically set the correct Content-Type based on request body:
    // - FormData → multipart/form-data; boundary=...
    // - Object → application/json
    // - String → text/plain
  }
});

// 🔧 ENHANCED: Generate request key for deduplication
function generateRequestKey(config) {
  const { method, url, params, data } = config;
  const queryParams = params ? JSON.stringify(params) : '';
  const bodyData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';
  return `${method}:${url}:${queryParams}:${bodyData}`;
}

// 🔧 ENHANCED: Check if request is duplicate
function isDuplicateRequest(config) {
  // 🔧 CRITICAL FIX: 如果请求明确设置了skipDeduplication标志，跳过去重检查
  if (config.skipDeduplication === true) {
    console.log(`🔄 [API] 跳过去重检查: ${config.method?.toUpperCase()} ${config.url} (skipDeduplication=true)`);
    return false;
  }
  
  // Don't deduplicate POST requests
  if (config.method === 'post') {
    return false;
  }
  
  const key = generateRequestKey(config);
  const existingRequest = activeRequests.get(key);
  
  if (existingRequest && Date.now() - existingRequest.timestamp < 30000) { // 30 second window for login flow
    console.log(`🔄 [API] Deduplicated request: ${config.method?.toUpperCase()} ${config.url}`);
    return existingRequest.promise;
  }
  
  return false;
}

// 🔧 ENHANCED: Register active request
function registerRequest(config, promise) {
  const key = generateRequestKey(config);
  activeRequests.set(key, {
    promise,
    timestamp: Date.now()
  });
  
  // Clean up after request completes
  promise.finally(() => {
    setTimeout(() => {
      activeRequests.delete(key);
    }, 1000);
  });
}

// Initialize API client with YAML configuration
async function initializeApiClient() {
  if (configInitialized) {
    return api;
  }
  
  if (configPromise) {
    await configPromise;
    return api;
  }
  
  configPromise = (async () => {
    try {
      // Use the new URL resolver for environment-aware API URLs
      const baseURL = await getApiBaseUrl();
      const apiConfig = await getApiConfig();
      const timeout = apiConfig.timeout || 60000;
      
      // Recreate axios instance with resolved URL
      api = axios.create({
        baseURL,
        timeout,
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'  // Skip ngrok browser warning
        }
      });
      
      console.log('✅ [API] Client initialized with resolved URL:', { baseURL, timeout });
      
      // Setup interceptors after recreation
      setupInterceptors();
      
      configInitialized = true;
      
    } catch (error) {
      console.warn('⚠️ [API] Failed to load config, using fallback:', error);
      setupInterceptors();
      configInitialized = true;
    }
  })();
  
  await configPromise;
  return api;
}

// Function to setup interceptors (to avoid duplication)
function setupInterceptors() {

/**
 * Request interceptor - Enhanced with tokenSynchronizer
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // 🔧 ENHANCED: Check for duplicate requests
      const duplicateRequest = isDuplicateRequest(config);
      if (duplicateRequest) {
        console.log(`🔄 [API] Deduplicated request: ${config.method?.toUpperCase()} ${config.url}`);
        return Promise.reject({
          __DEDUPLICATED__: true,
          originalPromise: duplicateRequest
        });
      }
      
      // 🔧 ENHANCED: 使用tokenSynchronizer获取token
      let token = null;
      let tokenSource = null;

      // 优先使用tokenSynchronizer（集中式token管理）
      try {
        token = await tokenSynchronizer.getToken();
        if (token && token.length > 10) {
          tokenSource = 'tokenSynchronizer';
        }
      } catch (syncError) {
        console.warn('⚠️ [API] Failed to get token from tokenSynchronizer:', syncError);
      }

      // 如果tokenSynchronizer失败，回退到传统方式
      if (!token) {
        // Import dependencies dynamically to avoid circular dependencies
        const { default: tokenManager } = await import('./tokenManager');
        const { default: authStateManager } = await import('../utils/authStateManager');

        // Priority 1: tokenManager (in-memory, fastest)
        const managerToken = tokenManager.getAccessToken();
        if (managerToken && managerToken.length > 10) {
          token = managerToken;
          tokenSource = 'tokenManager';
        }

        // Priority 2: authStateManager (localStorage, persistent)
        if (!token) {
          const authState = authStateManager.getAuthState();
          const stateToken = authState.token;
          if (stateToken && stateToken.length > 10) {
            token = stateToken;
            tokenSource = 'authStateManager';
          }
        }

        // Priority 3: Direct localStorage fallback (emergency)
        if (!token) {
          const directToken = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
          if (directToken && directToken.length > 10) {
            token = directToken;
            tokenSource = 'localStorage-direct';
          }
        }

        // 🔧 ENHANCED: 如果通过传统方式找到token，异步更新tokenSynchronizer
        if (token) {
          setTimeout(() => {
            tokenSynchronizer.setTokenAndUser(token, null).catch(error => {
              console.warn('⚠️ [API] Failed to update tokenSynchronizer:', error);
            });
          }, 0);
        }
      }

      // Add Authorization header if token is available
      if (token && !config.skipAuthRefresh) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 🔧 CRITICAL FIX: Smart Content-Type handling for FormData
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        console.log('🔧 [API] Removed Content-Type header for FormData - browser will auto-set boundary');
      }

      // Enhanced request logging
      const hasToken = !!token;
      const requestId = Math.random().toString(36).substr(2, 9);
      config.requestId = requestId;
      
      console.log(`🔗 [API-${requestId}] ${config.method?.toUpperCase()} ${config.url}${hasToken ? ` (auth: ${tokenSource})` : ' (no auth)'}`);

      return config;
    } catch (error) {
      console.warn('⚠️ [API] Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Enhanced with tokenSynchronizer
 */
api.interceptors.response.use(
  (response) => {
    // Log successful requests
    const requestId = response.config?.requestId;
    if (requestId) {
      console.log(`✅ [API-${requestId}] Success: ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // 🔧 ENHANCED: Handle deduplicated requests
    if (error.__DEDUPLICATED__ && error.originalPromise) {
      return error.originalPromise;
    }
    
    const originalRequest = error.config;
    const requestId = originalRequest?.requestId || 'unknown';

    // Handle 401 Unauthorized errors with enhanced logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.warn(`🔐 [API-${requestId}] 401 Unauthorized on ${originalRequest.url}`);
      
      // 🔧 ENHANCED: 使用tokenSynchronizer处理401错误
      try {
        // 检查token状态
        const tokenStatus = await tokenSynchronizer.getTokenStatus();
        
        if (tokenStatus.expired) {
          console.log('🔄 [API] Token已过期，尝试刷新');
          
          // 这里可以添加token刷新逻辑
          // const refreshedToken = await refreshToken();
          
          // 如果刷新成功，重试请求
          // if (refreshedToken) {
          //   await tokenSynchronizer.setTokenAndUser(refreshedToken, null);
          //   originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          //   return axios(originalRequest);
          // }
        }
        
        // 清除所有token
        console.log('🧹 [API] 清除所有token存储');
        await tokenSynchronizer.clearAll();
        
        // 如果不在登录页，重定向到登录页
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 [API] 重定向到登录页');
          window.location.href = '/login';
        }
      } catch (tokenError) {
        console.error('❌ [API] 处理token错误失败:', tokenError);
      }

      // Skip token refresh for auth endpoints to avoid infinite loops
      if (originalRequest.skipAuthRefresh ||
        originalRequest.url?.includes('/signin') ||
        originalRequest.url?.includes('/signup') ||
        originalRequest.url?.includes('/refresh')) {
        console.warn(`🔐 [API-${requestId}] Skipping refresh for auth endpoint`);
        return Promise.reject(error);
      }

      try {
        // 🔧 ENHANCED: 检查token状态
        const tokenStatus = await tokenSynchronizer.getTokenStatus();
        
        // 如果token过期，尝试刷新
        if (tokenStatus.expired || tokenStatus.expiresIn < 300) { // 5分钟内过期
          console.log(`🔄 [API-${requestId}] Token expired or expiring soon, attempting refresh...`);
          
          // Import tokenManager dynamically
          const { default: tokenManager } = await import('./tokenManager');

          // 尝试刷新token
          await tokenManager.refreshToken();
          
          // 获取新token
          const newToken = tokenManager.getAccessToken();
          
          if (newToken) {
            // 更新请求头
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // 🔧 ENHANCED: 同步到tokenSynchronizer
            await tokenSynchronizer.setTokenAndUser(newToken, null);
            
            console.log(`✅ [API-${requestId}] Token refreshed, retrying request`);
            return api(originalRequest);
          }
        } else {
          console.warn(`❌ [API-${requestId}] Valid token but still got 401, possible server issue`);
        }
      } catch (refreshError) {
        console.error(`❌ [API-${requestId}] Token refresh failed:`, refreshError);

        // 🔧 ENHANCED: 使用tokenSynchronizer清除所有token
        try {
          await tokenSynchronizer.clearAll();
          console.log('🧹 [API] Cleared all auth state after refresh failure');
        } catch (clearError) {
          console.error('❌ [API] Error clearing tokens:', clearError);
        }

        // Redirect to login if not already there
        if (typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {

          // Try to use router if available
          try {
            const { useRouter } = await import('vue-router');
            const router = useRouter();
            router.push('/login');
          } catch (routerError) {
            // Fallback to window.location
            window.location.href = '/login';
          }
        }
      }
    }

    // Enhanced error logging
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;
    
    // 🔧 NEW: Special handling for timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn(`⏱️ [API-${requestId}] Request timeout: ${url}`);
    } else if (status) {
      console.warn(`❌ [API-${requestId}] Error ${status}: ${url}`, errorData);
    } else {
      console.warn(`❌ [API-${requestId}] Network error: ${url}`, error.message);
    }
    
    return Promise.reject(error);
  }
);

} // End of setupInterceptors function

// Enhanced wrapper that ensures initialization before any API call
const apiWrapper = {
  async get(url, config = {}) {
    await initializeApiClient();
    const promise = api.get(url, config);
    
    // 🔧 ENHANCED: Register non-deduplicated requests
    if (!config.skipDeduplication) {
      registerRequest({ method: 'get', url, ...config }, promise);
    }
    
    return promise;
  },
  
  async post(url, data, config = {}) {
    await initializeApiClient();
    return api.post(url, data, config);
  },
  
  async put(url, data, config = {}) {
    await initializeApiClient();
    return api.put(url, data, config);
  },
  
  async patch(url, data, config = {}) {
    await initializeApiClient();
    return api.patch(url, data, config);
  },
  
  async delete(url, config = {}) {
    await initializeApiClient();
    return api.delete(url, config);
  },
  
  async head(url, config = {}) {
    await initializeApiClient();
    return api.head(url, config);
  },
  
  async options(url, config = {}) {
    await initializeApiClient();
    return api.options(url, config);
  },
  
  async request(config = {}) {
    await initializeApiClient();
    return api.request(config);
  },
  
  // Expose other axios properties that might be needed
  get defaults() {
    return api.defaults;
  },
  
  get interceptors() {
    return api.interceptors;
  },
  
  // 🔧 ENHANCED: Utility to clear all active requests
  clearActiveRequests() {
    activeRequests.clear();
    console.log('🧹 [API] Cleared all active request tracking');
  }
};

export default apiWrapper;
