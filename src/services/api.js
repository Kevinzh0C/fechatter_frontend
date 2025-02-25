import axios from 'axios';
import { getApiConfig } from '../utils/yamlConfigLoader.js';

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
    'Accept': 'application/json'
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
      const apiConfig = await getApiConfig();
      const baseURL = apiConfig.base_url || '/api';
      const timeout = apiConfig.timeout || 30000;
      
      // Recreate axios instance with YAML config
      api = axios.create({
        baseURL,
        timeout,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('🔧 API client initialized with YAML config:', { baseURL, timeout });
      
      // Setup interceptors after recreation
      setupInterceptors();
      
      configInitialized = true;
      
    } catch (error) {
      console.warn('Failed to load YAML API config, using fallback:', error);
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
 * Request interceptor - Add authentication headers
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // Import dependencies dynamically to avoid circular dependencies
      const { default: tokenManager } = await import('./tokenManager');
      const { default: authStateManager } = await import('../utils/authStateManager');

      // 🔧 CRITICAL FIX: Get token with fallback mechanism
      // Priority 1: tokenManager (in-memory, fast)
      let token = tokenManager.getAccessToken();

      // Priority 2: authStateManager (localStorage, persistent)
      if (!token) {
        const authState = authStateManager.getAuthState();
        token = authState.token;

        // 🔧 RECOVERY: If authStateManager has token but tokenManager doesn't,
        // restore tokenManager with the token for future requests
        if (token) {
          await tokenManager.setTokens({
            accessToken: token,
            refreshToken: token, // Using same token as refresh for stub implementation
            expiresAt: Date.now() + (3600 * 1000), // 1 hour default
            issuedAt: Date.now(),
          });

          if (import.meta.env.DEV) {
            console.log('🔄 [API] Restored tokenManager from authStateManager');
          }
        }
      }

      // Add Authorization header if token is available
      if (token && !config.skipAuthRefresh) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 🔧 CRITICAL FIX: Smart Content-Type handling for FormData
      // If body is FormData, remove any existing Content-Type to let browser set it automatically
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        if (import.meta.env.DEV) {
          console.log('🔧 [API] Removed Content-Type header for FormData - browser will auto-set boundary');
        }
      }

      if (import.meta.env.DEV) {
        const hasToken = !!token;
        console.log(`🔗 API Request: ${config.method?.toUpperCase()} ${config.url}${hasToken ? ' (with auth)' : ' (no auth)'}`);
      }

      return config;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Request interceptor error:', error);
      }
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle 401 errors and token refresh
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (import.meta.env.DEV) {
        console.warn(`🔐 401 Error on ${originalRequest.url}`);
      }

      // Skip token refresh for auth endpoints to avoid infinite loops
      if (originalRequest.skipAuthRefresh ||
        originalRequest.url?.includes('/signin') ||
        originalRequest.url?.includes('/signup') ||
        originalRequest.url?.includes('/refresh')) {
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

        // Attempt to refresh the token
        await tokenManager.refreshToken();

        // Get the new token and retry the original request
        const newTokens = tokenManager.getTokens();
        if (newTokens.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

          if (import.meta.env.DEV) {
            console.log('✅ Token refreshed, retrying request');
          }

          return api(originalRequest);
        }

      } catch (refreshError) {
        if (import.meta.env.DEV) {
          console.error('❌ Token refresh failed:', refreshError);
        }

        // Clear tokens and redirect to login
        try {
          const { default: tokenManager } = await import('./tokenManager');
          await tokenManager.clearTokens();
        } catch (clearError) {
          console.error('Error clearing tokens:', clearError);
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

    // Handle other errors
    if (import.meta.env.DEV) {
      const status = error.response?.status;
      const url = error.config?.url;
      console.error(`🚨 API Error ${status}: ${url}`, error.response?.data);
    }

    return Promise.reject(error);
  }
);

} // End of setupInterceptors function

// Create a wrapper that ensures initialization before any API call
// This maintains axios interface while ensuring config is loaded
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
