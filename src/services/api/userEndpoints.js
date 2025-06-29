/**
 * User API Endpoints - Production-level with enhanced error handling
 * 
 * Handles user endpoint calls with sophisticated retry and auth integration
 */

import api from '../api.js';

export class UserEndpointManager {
  constructor() {
    this.endpointStrategy = 'auto'; // auto, workspace, profile, mock
    this.fallbackEndpoints = [
      '/users',          // Primary: Correct backend endpoint (requires auth + workspace)
      '/users/profile',  // Secondary: User profile endpoint
    ];
    this.lastSuccessfulEndpoint = null;
    this.userCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes

    // Enhanced auth monitoring
    this.authRetryCount = 0;
    this.maxAuthRetries = 3; // Increased from 2 to 3
    this.retryDelays = [1000, 2000, 5000]; // Progressive retry delays
  }

  /**
   * Fetch workspace users with enhanced error handling and smart retry
   */
  async fetchWorkspaceUsers() {
    // Try cached result first
    const cached = this.getCachedUsers();
    if (cached) {
      console.log('🔍 [UserEndpoints] Returning cached workspace users:', cached.length);
      return cached;
    }

    // Enhanced endpoint strategy with smarter error recovery
    const endpointsToTry = [...this.fallbackEndpoints];
    
    // If we know a successful endpoint, prioritize it
    if (this.lastSuccessfulEndpoint && !endpointsToTry.includes(this.lastSuccessfulEndpoint)) {
      endpointsToTry.unshift(this.lastSuccessfulEndpoint);
    }

    console.log('🔍 [UserEndpoints] Attempting endpoints:', endpointsToTry);

    // Check cache first (forceRefresh is not defined in this scope, removing the check)
    const cachedUsers = this.getCachedUsers();
    if (cachedUsers && cachedUsers.length > 0) {
      console.log('✅ [UserEndpoints] 返回缓存的用户数据');
      return cachedUsers;
    }

    // 🔧 ENHANCED: 只尝试主要端点，在登录期间减少端点尝试
    const primaryEndpoint = endpointsToTry[0];
    
    try {
      console.log(`🔍 [UserEndpoints] Attempting primary endpoint: ${primaryEndpoint}`);

      const response = await this.tryEndpointWithRetry(primaryEndpoint);
      if (response && response.data) {
        this.lastSuccessfulEndpoint = primaryEndpoint;
        const users = this.normalizeUserData(response.data);
        this.cacheUsers(users);

        console.log(`✅ [UserEndpoints] Successfully fetched ${users.length} users from ${primaryEndpoint}`);
        this.authRetryCount = 0; // Reset on success
        return users;
      }
    } catch (error) {
      const errorType = this.categorizeError(error);
      console.warn(`⚠️ [UserEndpoints] Primary endpoint ${primaryEndpoint} failed (${errorType}):`, error.message);
      
      // 🔧 ENHANCED: 只在非认证错误且非登录期间尝试其他端点
      if (errorType !== 'auth' && endpointsToTry.length > 1) {
        console.log('🔍 [UserEndpoints] 尝试备用端点...');
        
        for (let i = 1; i < endpointsToTry.length; i++) {
          const endpoint = endpointsToTry[i];
          try {
            console.log(`🔍 [UserEndpoints] Attempting fallback endpoint: ${endpoint}`);
            
            const response = await this.tryEndpointWithRetry(endpoint);
            if (response && response.data) {
              this.lastSuccessfulEndpoint = endpoint;
              const users = this.normalizeUserData(response.data);
              this.cacheUsers(users);

              console.log(`✅ [UserEndpoints] Successfully fetched ${users.length} users from fallback ${endpoint}`);
              this.authRetryCount = 0;
              return users;
            }
          } catch (fallbackError) {
            console.warn(`⚠️ [UserEndpoints] Fallback endpoint ${endpoint} failed:`, fallbackError.message);
          }
        }
      }
      
      // 如果是认证错误，直接抛出
      if (errorType === 'auth') {
        console.error('❌ [UserEndpoints] Authentication error, stopping endpoint attempts');
        throw error;
      }
    }

    // All endpoints failed - provide meaningful fallback
    console.warn('⚠️ [UserEndpoints] All endpoints failed, using mock data');
    return this.getMockUsers();
  }

  /**
   * Try endpoint with smart retry logic
   */
  async tryEndpointWithRetry(endpoint, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)];
          console.log(`🔄 [UserEndpoints] Retry attempt ${attempt} for ${endpoint} (delay: ${delay}ms)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const response = await this.tryEndpoint(endpoint);
        
        // Reset auth retry count on success
        this.authRetryCount = 0;
        return response;
        
      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);
        
        // Handle auth errors specially
        if (errorType === 'auth') {
          if (this.authRetryCount < this.maxAuthRetries) {
            try {
              await this.attemptAuthRecovery();
              // Don't increment attempt for auth recovery, give it another chance
              continue;
            } catch (authError) {
              console.error(`❌ [UserEndpoints] Auth recovery failed:`, authError.message);
              this.authRetryCount++;
            }
          } else {
            console.error(`❌ [UserEndpoints] Max auth retries (${this.maxAuthRetries}) exceeded`);
            break;
          }
        }
        
        // For non-auth errors, check if we should retry
        if (attempt < maxRetries && this.shouldRetryError(error)) {
          console.warn(`⚠️ [UserEndpoints] Attempt ${attempt + 1} failed, retrying:`, error.message);
          continue;
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Enhanced endpoint attempt with better error context
   */
  async tryEndpoint(endpoint) {
    try {
      const startTime = Date.now();
      const response = await api.get(endpoint, {
        timeout: 30000, // 增加到30秒，与其他服务保持一致
      });
      const responseTime = Date.now() - startTime;

      console.log(`✅ [UserEndpoints] ${endpoint} succeeded (${responseTime}ms)`);
      return response;
      
    } catch (error) {
      const errorContext = {
        endpoint,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      };

      // Add error context for better debugging
      error.endpointContext = errorContext;
      
      throw error;
    }
  }

  /**
   * Categorize errors for better handling strategy
   */
  categorizeError(error) {
    const status = error.response?.status;
    
    if (status === 401) return 'auth';
    if (status === 403) return 'permission';
    if (status === 404) return 'not-found';
    if (status >= 500) return 'server';
    if (status >= 400) return 'client';
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) return 'network';
    if (error.code === 'TIMEOUT' || error.message.includes('timeout')) return 'timeout';
    
    return 'unknown';
  }

  /**
   * Determine if an error should trigger a retry
   */
  shouldRetryError(error) {
    const errorType = this.categorizeError(error);
    const status = error.response?.status;
    
    // Retry on network, timeout, and certain server errors
    if (['network', 'timeout', 'server'].includes(errorType)) {
      return true;
    }
    
    // Retry on specific 5xx errors
    if (status >= 500 && status <= 599) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 401 which is handled separately)
    return false;
  }

  /**
   * Enhanced authentication recovery with multiple strategies
   */
  async attemptAuthRecovery() {
    console.log(`🔧 [UserEndpoints] Attempting auth recovery (attempt ${this.authRetryCount + 1}/${this.maxAuthRetries})`);
    
    try {
      // Strategy 1: Force token refresh through tokenManager
      try {
        const { default: tokenManager } = await import('../tokenManager');
        await tokenManager.refreshToken();
        console.log('✅ [UserEndpoints] Token refreshed via tokenManager');
        return;
      } catch (tokenError) {
        console.warn('⚠️ [UserEndpoints] TokenManager refresh failed:', tokenError.message);
      }

      // Strategy 2: Re-sync auth state
      try {
        const { default: authStateManager } = await import('../../utils/authStateManager');
        const authState = authStateManager.getAuthState();
        
        if (authState.token && authState.user) {
          // Re-sync tokenManager with authStateManager
          const { default: tokenManager } = await import('../tokenManager');
          await tokenManager.setTokens({
            accessToken: authState.token,
            refreshToken: authState.token,
            expiresAt: Date.now() + (3600 * 1000),
            issuedAt: Date.now(),
          });
          console.log('✅ [UserEndpoints] Auth state re-synced');
          return;
        }
      } catch (syncError) {
        console.warn('⚠️ [UserEndpoints] Auth state sync failed:', syncError.message);
      }

      // Strategy 3: Check for valid localStorage tokens
      const directToken = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
      if (directToken && directToken.length > 10) {
        try {
          const { default: tokenManager } = await import('../tokenManager');
          await tokenManager.setTokens({
            accessToken: directToken,
            refreshToken: directToken,
            expiresAt: Date.now() + (3600 * 1000),
            issuedAt: Date.now(),
          });
          console.log('✅ [UserEndpoints] Recovered from localStorage token');
          return;
        } catch (recoveryError) {
          console.warn('⚠️ [UserEndpoints] localStorage recovery failed:', recoveryError.message);
        }
      }

      throw new Error('All auth recovery strategies failed');
      
    } catch (error) {
      console.error('❌ [UserEndpoints] Auth recovery failed:', error.message);
      this.authRetryCount++;
      throw error;
    }
  }

  /**
   * Enhanced user data normalization with better validation
   */
  normalizeUserData(data) {
    let users = [];

    // Handle different response formats
    if (Array.isArray(data)) {
      users = data;
    } else if (data.data && Array.isArray(data.data)) {
      users = data.data;
    } else if (data.users && Array.isArray(data.users)) {
      users = data.users;
    } else if (data.id) {
      // Single user from profile endpoint
      users = [data];
    } else {
      console.warn('⚠️ [UserEndpoints] Unexpected data format:', data);
      return [];
    }

    // Enhanced normalization with validation
    return users.map(user => {
      if (!user || typeof user !== 'object') {
        console.warn('⚠️ [UserEndpoints] Invalid user object:', user);
        return null;
      }

      return {
        id: user.id,
        fullname: user.fullname || user.full_name || user.name || user.username || 'Unknown User',
        email: user.email || '',
        avatar_url: user.avatar_url || null,
        status: user.status || 'Active',
        title: user.title || '',
        department: user.department || '',
        last_seen_at: user.last_seen_at || user.last_active_at,
        created_at: user.created_at || new Date().toISOString(),
        workspace_id: user.workspace_id || 1
      };
    }).filter(user => user !== null); // Remove any null entries
  }

  /**
   * Enhanced cache management with TTL
   */
  cacheUsers(users) {
    this.userCache.set('workspace_users', {
      data: users,
      timestamp: Date.now(),
      ttl: this.cacheExpiry
    });
    console.log(`📦 [UserEndpoints] Cached ${users.length} users`);
  }

  getCachedUsers() {
    const cached = this.userCache.get('workspace_users');
    if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.userCache.clear();
    console.log('🧹 [UserEndpoints] Cache cleared');
  }

  /**
   * Enhanced mock users for reliable fallback
   */
  getMockUsers() {
    return [
      {
        id: 1,
        fullname: 'Development User',
        email: 'dev@fechatter.local',
        status: 'Active',
        avatar_url: null,
        title: 'Developer',
        department: 'Engineering',
        created_at: new Date().toISOString(),
        workspace_id: 1
      },
      {
        id: 2,
        fullname: 'Test User',
        email: 'test@fechatter.local',
        status: 'Active',
        avatar_url: null,
        title: 'Tester',
        department: 'QA',
        created_at: new Date().toISOString(),
        workspace_id: 1
      }
    ];
  }

  /**
   * Enhanced batch user fetching with smart fallback
   */
  async fetchUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    try {
      console.log(`🔍 [UserEndpoints] Fetching users by IDs:`, userIds);
      
      // Try batch endpoint first
      const response = await api.post('/users/batch', { user_ids: userIds }, {
        timeout: 30000
      });
      const users = this.normalizeUserData(response.data);
      
      console.log(`✅ [UserEndpoints] Batch fetch successful: ${users.length} users`);
      return users;
      
    } catch (error) {
      console.warn('⚠️ [UserEndpoints] Batch fetch failed, using workspace users fallback:', error.message);

      // Fallback: get from workspace users
      try {
        const allUsers = await this.fetchWorkspaceUsers();
        const filteredUsers = allUsers.filter(user => userIds.includes(user.id));
        
        console.log(`✅ [UserEndpoints] Fallback successful: ${filteredUsers.length}/${userIds.length} users found`);
        return filteredUsers;
      } catch (fallbackError) {
        console.error('❌ [UserEndpoints] Both batch and fallback failed:', fallbackError.message);
        return [];
      }
    }
  }

  /**
   * Enhanced current user profile fetching
   */
  async getCurrentUserProfile() {
    try {
      console.log('🔍 [UserEndpoints] Fetching current user profile...');
      
      const response = await api.get('/users/profile', {
        timeout: 30000
      });
      const user = this.normalizeUserData(response.data)[0];
      
      if (user) {
        console.log('✅ [UserEndpoints] Current user profile fetched:', user.email);
        return user;
      } else {
        throw new Error('No user data in profile response');
      }
      
    } catch (error) {
      console.error('❌ [UserEndpoints] Failed to fetch current user profile:', error.message);
      throw error;
    }
  }

  /**
   * Update current user profile
   */
  async updateCurrentUserProfile(profileData) {
    try {
      console.log('🔄 [UserEndpoints] Updating current user profile...');
      
      const response = await api.put('/users/profile', profileData, {
        timeout: 30000
      });
      const user = this.normalizeUserData(response.data)[0];
      
      if (user) {
        console.log('✅ [UserEndpoints] Current user profile updated:', user.email);
        // Clear cache to force refresh on next fetch
        this.clearCache();
        return user;
      } else {
        throw new Error('No user data in update response');
      }
      
    } catch (error) {
      console.error('❌ [UserEndpoints] Failed to update current user profile:', error.message);
      throw error;
    }
  }

  /**
   * Get specific user profile by ID
   */
  async getUserProfile(userId) {
    try {
      console.log(`🔍 [UserEndpoints] Fetching user profile for ID: ${userId}...`);
      
      const response = await api.get(`/users/${userId}/profile`, {
        timeout: 30000
      });
      const user = this.normalizeUserData(response.data)[0];
      
      if (user) {
        console.log('✅ [UserEndpoints] User profile fetched:', user.fullname);
        return user;
      } else {
        throw new Error('No user data in profile response');
      }
      
    } catch (error) {
      console.error(`❌ [UserEndpoints] Failed to fetch user profile for ID ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update specific user profile by ID (admin function)
   */
  async updateUserProfile(userId, profileData) {
    try {
      console.log(`🔄 [UserEndpoints] Updating user profile for ID: ${userId}...`);
      
      const response = await api.put(`/users/${userId}/profile`, profileData, {
        timeout: 30000
      });
      const user = this.normalizeUserData(response.data)[0];
      
      if (user) {
        console.log('✅ [UserEndpoints] User profile updated:', user.fullname);
        // Clear cache to force refresh on next fetch
        this.clearCache();
        return user;
      } else {
        throw new Error('No user data in update response');
      }
      
    } catch (error) {
      console.error(`❌ [UserEndpoints] Failed to update user profile for ID ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData) {
    try {
      console.log('🔄 [UserEndpoints] Changing user password...');
      
      const response = await api.post('/users/change-password', passwordData, {
        timeout: 30000
      });
      
      console.log('✅ [UserEndpoints] Password changed successfully');
      return response.data;
      
    } catch (error) {
      console.error('❌ [UserEndpoints] Failed to change password:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced diagnostics with comprehensive health check
   */
  getDiagnostics() {
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    return {
      endpoints: {
        lastSuccessful: this.lastSuccessfulEndpoint,
        strategy: this.endpointStrategy,
        fallbackList: this.fallbackEndpoints
      },
      cache: {
        size: this.userCache.size,
        cachedUsers: this.getCachedUsers()?.length || 0,
        cacheExpiry: this.cacheExpiry
      },
      auth: {
        hasAccessToken: !!authToken,
        tokenLength: authToken?.length || 0,
        hasRefreshToken: !!refreshToken,
        authRetryCount: this.authRetryCount,
        maxAuthRetries: this.maxAuthRetries,
        tokenExpiry: this.getTokenExpiry(authToken)
      },
      health: {
        timestamp: Date.now(),
        isHealthy: this.getCachedUsers()?.length > 0 || this.authRetryCount < this.maxAuthRetries
      }
    };
  }

  /**
   * Enhanced token expiry analysis
   */
  getTokenExpiry(token) {
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      return {
        exp: payload.exp,
        iat: payload.iat,
        isExpired: now > payload.exp,
        expiresIn: Math.max(0, payload.exp - now),
        expiresInMinutes: Math.max(0, (payload.exp - now) / 60),
        isExpiringSoon: (payload.exp - now) < 300 // 5 minutes
      };
    } catch (error) {
      return { error: 'Invalid token format' };
    }
  }

  /**
   * Force reset for debugging and error recovery
   */
  async forceReset() {
    console.log('🔄 [UserEndpoints] Force reset initiated');
    
    this.clearCache();
    this.authRetryCount = 0;
    this.lastSuccessfulEndpoint = null;
    
    try {
      await this.attemptAuthRecovery();
      console.log('✅ [UserEndpoints] Force reset completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [UserEndpoints] Force reset failed:', error.message);
      return false;
    }
  }

  /**
   * Enhanced endpoint testing with detailed results
   */
  async testEndpoints() {
    const results = {};
    console.log('🧪 [UserEndpoints] Testing all endpoints...');

    for (const endpoint of this.fallbackEndpoints) {
      try {
        const startTime = Date.now();
        const response = await this.tryEndpoint(endpoint);
        const responseTime = Date.now() - startTime;
        
        results[endpoint] = {
          status: 'success',
          responseTime,
          dataCount: Array.isArray(response.data) ? response.data.length : 1,
          httpStatus: response.status
        };
        
      } catch (error) {
        results[endpoint] = {
          status: 'failed',
          error: error.message,
          errorType: this.categorizeError(error),
          httpStatus: error.response?.status,
          responseTime: null
        };
      }
    }

    console.log('🧪 [UserEndpoints] Endpoint test results:', results);
    return results;
  }
}

// Export singleton instance
export const userEndpointManager = new UserEndpointManager();

// Enhanced global access for debugging
if (typeof window !== 'undefined') {
  window.userEndpoints = userEndpointManager;

  // Enhanced debugging commands
  window.diagnoseDUserAPI = () => {
    console.group('🔬 User API Diagnostics');
    const diagnostics = userEndpointManager.getDiagnostics();
    console.table(diagnostics.endpoints);
    console.table(diagnostics.cache);
    console.table(diagnostics.auth);
    console.log('Full diagnostics:', diagnostics);
    console.groupEnd();
    return diagnostics;
  };

  window.testDUserEndpoints = async () => {
    console.log('🧪 Testing user endpoints...');
    const results = await userEndpointManager.testEndpoints();
    console.table(results);
    return results;
  };

  window.fixDUserAuth = async () => {
    console.log('🔧 Attempting to fix user authentication...');
    try {
      const resetSuccess = await userEndpointManager.forceReset();
      
      if (resetSuccess) {
        // Test endpoints after reset
        const results = await userEndpointManager.testEndpoints();
        console.log('🧪 Post-reset test results:');
        console.table(results);
        return { success: true, results };
      } else {
        return { success: false, error: 'Force reset failed' };
      }
    } catch (error) {
      console.error('❌ Authentication fix failed:', error);
      return { success: false, error: error.message };
    }
  };

  window.clearDUserCache = () => {
    userEndpointManager.clearCache();
    console.log('✅ User cache cleared');
  };
} 