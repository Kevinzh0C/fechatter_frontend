import axios from 'axios';
import { getApiConfig } from '../utils/yamlConfigLoader.js';
import { getApiBaseUrl } from '../utils/apiUrlResolver.js';

/**
 * Production-level API client with authentication and error handling
 */

// Configuration promise to ensure all requests wait for config
let configInitialized = false;
let configPromise = null;

// Initialize with fallback
let api = axios.create({
  baseURL: '/api', // Fallback
  timeout: 30000,
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
      const timeout = apiConfig.timeout || 30000;
      
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
 * Request interceptor - Enhanced authentication and token management
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // Import dependencies dynamically to avoid circular dependencies
      const { default: tokenManager } = await import('./tokenManager');
      const { default: authStateManager } = await import('../utils/authStateManager');

      // 🔧 ENHANCED: Multi-layer token resolution with health checks
      let token = null;
      let tokenSource = null;

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

          // 🔧 RECOVERY: Sync tokenManager with authStateManager
          try {
            await tokenManager.setTokens({
              accessToken: stateToken,
              refreshToken: stateToken, // Using same token as refresh for stub implementation
              expiresAt: Date.now() + (3600 * 1000), // 1 hour default
              issuedAt: Date.now(),
            });
            console.log('🔄 [API] Restored tokenManager from authStateManager');
          } catch (syncError) {
            console.warn('⚠️ [API] Failed to sync tokenManager:', syncError);
          }
        }
      }

      // Priority 3: Direct localStorage fallback (emergency)
      if (!token) {
        const directToken = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
        if (directToken && directToken.length > 10) {
          token = directToken;
          tokenSource = 'localStorage-direct';
          console.log('🚨 [API] Using emergency localStorage token');
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
 * Response interceptor - Enhanced error handling with smart token refresh
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
    const originalRequest = error.config;
    const requestId = originalRequest?.requestId || 'unknown';

    // Handle 401 Unauthorized errors with enhanced logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.warn(`🔐 [API-${requestId}] 401 Unauthorized on ${originalRequest.url}`);

      // Skip token refresh for auth endpoints to avoid infinite loops
      if (originalRequest.skipAuthRefresh ||
        originalRequest.url?.includes('/signin') ||
        originalRequest.url?.includes('/signup') ||
        originalRequest.url?.includes('/refresh')) {
        console.warn(`🔐 [API-${requestId}] Skipping refresh for auth endpoint`);
        return Promise.reject(error);
      }

      try {
        // Import tokenManager dynamically
        const { default: tokenManager } = await import('./tokenManager');

        // Check if we have a refresh token
        const tokens = tokenManager.getTokens();
        if (!tokens.refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log(`🔄 [API-${requestId}] Attempting token refresh...`);

        // Attempt to refresh the token
        await tokenManager.refreshToken();

        // Get the new token and retry the original request
        const newTokens = tokenManager.getTokens();
        if (newTokens.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

          console.log(`✅ [API-${requestId}] Token refreshed, retrying request`);

          return api(originalRequest);
        }

      } catch (refreshError) {
        console.error(`❌ [API-${requestId}] Token refresh failed:`, refreshError);

        // Clear tokens and redirect to login
        try {
          const { default: tokenManager } = await import('./tokenManager');
          const { default: authStateManager } = await import('../utils/authStateManager');
          
          await tokenManager.clearTokens();
          authStateManager.clearAuthState();
          
          // Clear all localStorage auth keys
          ['auth_token', 'access_token', 'refresh_token', 'auth_user'].forEach(key => {
            localStorage.removeItem(key);
          });
          
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

        return Promise.reject(error);
      }
    }

    // Enhanced error logging
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;
    
    // 🔧 NEW: Special handling for timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error(`⏰ [API-${requestId}] TIMEOUT (30s) on ${url} - check backend connectivity`);
      console.error(`⏰ [API-${requestId}] Possible causes: invalid token, backend overload, or network issues`);
    }
    
    console.error(`🚨 [API-${requestId}] Error ${status}: ${url}`, {
      status,
      statusText: error.response?.statusText,
      data: errorData,
      message: error.message,
      code: error.code
    });

    return Promise.reject(error);
  }
);

} // End of setupInterceptors function

// Enhanced wrapper that ensures initialization before any API call
const apiWrapper = {
  async get(url, config) {
    await initializeApiClient();
    return api.get(url, config);
  },
  async post(url, data, config) {
    await initializeApiClient();
    return api.post(url, data, config);
  },
  async put(url, data, config) {
    await initializeApiClient();
    return api.put(url, data, config);
  },
  async patch(url, data, config) {
    await initializeApiClient();
    return api.patch(url, data, config);
  },
  async delete(url, config) {
    await initializeApiClient();
    return api.delete(url, config);
  },
  async head(url, config) {
    await initializeApiClient();
    return api.head(url, config);
  },
  async options(url, config) {
    await initializeApiClient();
    return api.options(url, config);
  },
  async request(config) {
    await initializeApiClient();
    return api.request(config);
  },
  // Expose other axios properties that might be needed
  get defaults() {
    return api.defaults;
  },
  get interceptors() {
    return api.interceptors;
  }
};

export default apiWrapper;
