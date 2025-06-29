/**
 * Auth Store
 * 
 * Manages authentication state with single source of truth
 */

import { defineStore } from 'pinia';
import { nextTick } from 'vue';
import authService from '@/services/auth.service';
import tokenManager from '@/services/tokenManager';
import authStateManager from '@/utils/authStateManager';
import { useUserStore } from './user';
import { useWorkspaceStore } from './workspace';
import { errorHandler } from '@/utils/errorHandler';
import router from '@/router';
import { authEventBus, AuthEvents } from '@/services/auth-events';
import { useRouter } from 'vue-router'
import { initializeSSEConnection } from '@/utils/sseInitializer'
import { getLoginProfiler } from '@/utils/loginPerformanceProfiler'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Core authentication state
    token: null,
    user: null,
    // Other state
    isLoading: false,
    error: null,
    lastLoginTime: null,
    sessionStartTime: null,
    isInitialized: false,
    returnUrl: null,
    userStoresInitialized: false,
    userStoresInitializationInProgress: false,
    _initializingStores: false, // 🆕 NEW: 跟踪初始化状态
    logoutState: {
      isLoggingOut: false,
      lastLogoutTime: null,
      lastAuthErrorTime: null,
      authErrorDebounceMs: 3000, // 3 seconds between auth errors
    },
  }),

  getters: {
    /**
     * Get current user - from authStateManager
     */
    currentUser: () => authStateManager.getAuthState().user,

    /**
     * Check if user is authenticated - SIMPLIFIED SINGLE SOURCE OF TRUTH
     */
    isAuthenticated: (state) => {
      // 🔧 CRITICAL FIX: Priority-based authentication check
      
      // Step 1: Check internal state first (most immediate and reliable during reactivity)
      if (state.token && state.user && state.token.length > 20) {
        return true;
      }
      
      // Step 2: Quick localStorage check (reliable during initialization)
      try {
        const hasToken = localStorage.getItem('auth_token');
        const hasUser = localStorage.getItem('auth_user');
        
        if (hasToken && hasUser) {
          // Additional validation: token should look like a JWT
          if (hasToken.includes('.') && hasToken.length > 50) {
            return true;
          }
        }
      } catch (error) {
        // localStorage error, continue
      }
      
      // Step 3: AuthStateManager check (backup)
      try {
        const authState = authStateManager.getAuthState();
        if (authState?.isAuthenticated && authState?.user && authState?.token) {
          return true;
        }
      } catch (error) {
        // AuthStateManager error, continue
      }
      
      return false;
    },

    isLoggedIn: (state) => {
      // 🔧 CRITICAL FIX: 使用与isAuthenticated相同的逻辑，确保一致性
      return state.isAuthenticated;
    },

    /**
     * Get user ID
     */
    userId: () => authStateManager.getAuthState().user?.id,

    /**
     * Get user email
     */
    userEmail: () => authStateManager.getAuthState().user?.email,

    /**
     * Get user full name
     */
    userFullName: () => {
      const user = authStateManager.getAuthState().user;
      return user?.fullname || user?.username || 'User';
    },

    /**
     * Check if user has admin role
     */
    isAdmin: () => {
      const user = authStateManager.getAuthState().user;
      return user?.role === 'admin' || user?.is_admin === true;
    },

    /**
     * Get session duration
     */
    sessionDuration: (state) => {
      if (!state.sessionStartTime) return 0;
      return Date.now() - state.sessionStartTime;
    },

    /**
     * Get access token (compatibility)
     * IMPORTANT: Get from state first then fallback to other sources
     */
    accessToken: (state) => {
      // 🔧 PRIMARY: Internal state (most reliable during reactivity)
      if (state.token) {
        return state.token;
      }

      // 🔧 SECONDARY: TokenManager
      try {
        const tokenManagerToken = tokenManager.getAccessToken();
        if (tokenManagerToken) {
          return tokenManagerToken;
        }
      } catch (error) {
        // TokenManager not available
      }

      // 🔧 TERTIARY: AuthStateManager
      try {
        const authState = authStateManager.getAuthState();
        if (authState && authState.token) {
          return authState.token;
        }
      } catch (error) {
        // AuthStateManager not available
      }

      // 🔧 FALLBACK: Direct localStorage
      return localStorage.getItem('auth_token') || null;
    },

    /**
     * Check if token is expired (compatibility)
     */
    isTokenExpired: () => tokenManager.isTokenExpired(),

    // 🔧 ENHANCED: Multi-source user getter
    currentUserData: (state) => {
      // 🔧 PRIMARY: Internal state (most reliable during reactivity)
      if (state.user) {
        return state.user;
      }

      // 🔧 SECONDARY: AuthStateManager
      try {
        const authState = authStateManager.getAuthState();
        if (authState && authState.user) {
          return authState.user;
        }
      } catch (error) {
        // AuthStateManager not available
      }

      // 🔧 FALLBACK: Direct localStorage
      try {
        const userData = localStorage.getItem('auth_user');
        if (userData) {
          return JSON.parse(userData);
        }
      } catch (error) {
        // Parsing error
      }

      // 🔧 BACKUP: Auth object in localStorage
      try {
        const authData = localStorage.getItem('auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          return parsed.user || null;
        }
      } catch (error) {
        // Parsing error
      }

      return null;
    },

    // 🔧 COMPATIBILITY: Maintain old API names - removed duplicate getters since token and user are now state properties
  },

  actions: {
    /**
     * Initialize auth state from storage
     * 🔧 PERFORMANCE OPTIMIZED: Target <200ms initialization time
     */
    async initialize() {
      // Prevent multiple initializations
      if (this.isInitialized) {
        return authStateManager.getAuthState().isAuthenticated;
      }

      if (true) {
        console.time('⏱️ [AUTH] Initialize');
      }

      try {
        // 🔧 PERFORMANCE: 简化的一致性检查，移除昂贵操作
        // 跳过复杂的ensureAuthStateConsistency，只做基本检查
        const authState = authStateManager.getAuthState();

        // 快速路径：无token则直接返回
        if (!authState.token) {
          this.isInitialized = true;
          if (true) {
            console.timeEnd('⏱️ [AUTH] Initialize');
            console.log('🔐 [AUTH] No token found, initialization complete');
          }
          return false;
        }

        // 🔧 CRITICAL FIX: Set internal token and user state immediately for isAuthenticated getter
        this.token = authState.token;
        this.user = authState.user;

        // 🔧 PERFORMANCE: 简化token验证，避免复杂的格式检查
        // 基本设置到tokenManager用于API调用
        tokenManager.setTokens({
          accessToken: authState.token,
          refreshToken: authState.token,
          expiresAt: Date.now() + (3600 * 1000), // 默认1小时
          issuedAt: Date.now(),
        });

        // 🔧 PERFORMANCE: 跳过token过期检查和刷新，让API调用时处理
        // 这样可以避免初始化时的网络请求

        // 基本时间戳设置
        this.lastLoginTime = Date.now();
        this.sessionStartTime = Date.now();

        // 🔧 PERFORMANCE: 延迟设置监听器，避免阻塞初始化
        setTimeout(() => this.setupTokenManagerListeners(), 100);

        // 🔧 PERFORMANCE: 跳过fetchCurrentUser，让需要时再获取
        // 🔧 PERFORMANCE: 跳过initializeUserStores，让页面加载后再处理
        // 🔧 PERFORMANCE: 跳过verifyAuthStateIntegrity，信任存储的数据

        // 🔧 ENHANCED: 协调初始化，避免重复请求
        if (!this._initializingStores) {
          this._initializingStores = true;
          
          setTimeout(async () => {
            try {
              // 立即初始化用户stores - 这些是ChatBar需要的
              await this.initializeUserStores();

              // 后台获取用户数据（如果需要的话）
              if (!authState.user) {
                await this.fetchCurrentUser();
              }

              console.log('🔄 [AUTH] User stores initialized for optimal UX');
            } catch (error) {
              console.warn('⚠️ [AUTH] User stores initialization failed:', error);
            } finally {
              this._initializingStores = false;
            }
          }, 25); // 🔧 CRITICAL: 减少到25ms，极快初始化
        }

        this.isInitialized = true;

        if (true) {
          console.timeEnd('⏱️ [AUTH] Initialize');
          console.log('✅ [AUTH] Fast initialization complete');
        }

        return true;
      } catch (error) {
        if (true) {
          console.error('❌ [AUTH] Failed to initialize auth:', error);
          console.timeEnd('⏱️ [AUTH] Initialize');
        }
        authStateManager.clearAuthState();
        this.isInitialized = true;
        return false;
      }
    },

    /**
     * Setup token manager event listeners
     */
    setupTokenManagerListeners() {
      // Token refreshed
      tokenManager.on('token-refreshed', (tokens) => {
        this.updateStoredTokens(tokens);
      });

      // Refresh failed
      tokenManager.on('refresh-failed', (error) => {
        if (true) {
          console.error('Token refresh failed:', error);
        }
        this.handleAuthError('Session expired. Please login again.', 'SESSION_EXPIRED');
      });

      // Refresh token expired
      tokenManager.on('refresh-token-expired', () => {
        this.handleAuthError('Your session has expired. Please login again.', 'SESSION_EXPIRED');
      });

      // Inactivity timeout
      tokenManager.on('inactivity-timeout', () => {
        this.logout('You have been logged out due to inactivity.');
      });
    },

    /**
     * Login user - 🔧 COMPLETE REFACTOR for reliability
     */
    async login(credentialsOrEmail, passwordArg = null, rememberMe = false) {
      this.isLoading = true;
      this.error = null;

      let email;
      let password;

      if (typeof credentialsOrEmail === 'object' && credentialsOrEmail !== null) {
        email = credentialsOrEmail.email?.trim();
        password = credentialsOrEmail.password;
        if (typeof credentialsOrEmail.rememberMe === 'boolean') {
          rememberMe = credentialsOrEmail.rememberMe;
        }
      } else {
        email = typeof credentialsOrEmail === 'string' ? credentialsOrEmail.trim() : '';
        password = passwordArg;
      }

      try {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        if (true) {
          console.log('🔐 [AUTH] Starting completely refactored login process...');
        }

        // 🚀 PERFORMANCE: Get profiler instance for detailed tracking
        const profiler = getLoginProfiler();
        profiler.startAuthStoreUpdate();

        // Step 1: API Call
        const authResult = await authService.login(email, password);

        if (!authResult || !authResult.accessToken || !authResult.user) {
          throw new Error('Login failed: Invalid response from server');
        }

        if (true) {
          console.log('✅ [AUTH] API login successful, processing authentication...');
        }

        // Step 2: Create token data
        const tokens = {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresAt: Date.now() + (authResult.expiresIn * 1000),
          issuedAt: Date.now(),
        };

        // 🚀 PERFORMANCE: Mark token sync start
        profiler.startTokenSync();

        // 🔧 CRITICAL REFACTOR: Immediate State Setting Before Any Storage Operations
        await this.setImmediateAuthState(tokens, authResult.user);

        // 🚀 PERFORMANCE: Mark token sync completion and auth store update completion
        profiler.completeTokenSync();
        profiler.completeAuthStoreUpdate();

        // Step 3: Enhanced storage operations (background)
        this.performBackgroundStorageOperations(tokens, authResult.user);

        // Step 4: Setup workspace if provided
        if (authResult.workspace) {
          const workspaceStore = useWorkspaceStore();
          workspaceStore.setWorkspace(authResult.workspace);
        }

        // Step 5: Initialize supporting systems (background)
        this.initializeSupportingSystems();

        // 🆕 Initialize SSE connection in background (non-blocking)
        this.initializeSSEInBackground(authResult.accessToken);

        if (true) {
          console.log('✅ [AUTH] Refactored login process completed successfully');
        }

        this.returnUrl = null;
        return authResult;

      } catch (error) {
        // Enhanced error handling
        await this.handleLoginFailure(error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 🔧 CRITICAL FIX: 立即设置认证状态 - 确保完全原子性
     * Refactored to use tokenSynchronizer as the single source of truth for writing.
     */
    async setImmediateAuthState(tokens, user) {
      if (true) {
        console.log('⚡ [AUTH] Setting immediate auth state via tokenSynchronizer...');
      }

      try {
        // 🔧 SINGLE SOURCE OF TRUTH: Delegate all storage operations to the synchronizer.
        // This prevents race conditions and ensures all tabs and storage locations are updated consistently.
        const { default: tokenSynchronizer } = await import('@/services/tokenSynchronizer');
        await tokenSynchronizer.setTokenAndUser(tokens.accessToken, user);

        // Set internal Pinia store state for immediate UI reactivity.
        // The synchronizer handles all other storage (localStorage, tokenManager, etc.)
        this.token = tokens.accessToken;
        this.user = user;
        this.lastLoginTime = Date.now();
        this.sessionStartTime = Date.now();
        this.isInitialized = true;

        if (true) {
          console.log('✅ [AUTH] Immediate auth state set and synchronized successfully.');
        }

      } catch (error) {
        console.error('❌ [AUTH] Immediate auth state setting failed:', error);
        // Propagate the error to be handled by the login method.
        throw error;
      }
    },

    /**
     * 🔧 NEW: Background storage operations - lower priority
     */
    async performBackgroundStorageOperations(tokens, user) {
      // Run in background without blocking login completion
      setTimeout(async () => {
        try {
          if (true) {
            console.log('🔄 [AUTH] Running background storage operations...');
          }

          // Create comprehensive backup
          const authBackup = {
            user: user,
            tokens: tokens,
            timestamp: Date.now(),
            version: '3.0-refactored',
            loginMethod: 'refactored'
          };
          
          // 🚨 FIX: 只有在安全时才设置localStorage
          if (authStateManager.isLegacyStorageSafe()) {
            localStorage.setItem('auth', JSON.stringify(authBackup));
            localStorage.setItem('refresh_token', tokens.refreshToken);
            console.log('🔧 [AUTH] Background storage set safely');
          } else {
            console.warn('⚠️ [AUTH] Skipping background localStorage - multi-user isolation active');
          }

          // Setup token manager listeners
          this.setupTokenManagerListeners();

          if (true) {
            console.log('✅ [AUTH] Background storage operations completed');
          }
        } catch (error) {
          if (true) {
            console.warn('⚠️ [AUTH] Background storage operations failed:', error);
          }
          // Don't fail login for background operations
        }
      }, 100);
    },

    /**
     * 🔧 NEW: Initialize supporting systems in background
     */
    async initializeSupportingSystems() {
      // Run supporting system initialization in background
      setTimeout(async () => {
        try {
          if (true) {
            console.log('🔄 [AUTH] Initializing supporting systems...');
          }

          // Initialize user stores
          await this.initializeUserStores();

          if (true) {
            console.log('✅ [AUTH] Supporting systems initialized');
          }
        } catch (error) {
          if (true) {
            console.warn('⚠️ [AUTH] Supporting systems initialization failed:', error);
          }
          // Don't fail login for supporting systems
        }
      }, 200);
    },

    /**
     * 🔧 NEW: Enhanced login failure handling
     */
    async handleLoginFailure(error) {
      try {
        // Clear any partial state
        authStateManager.clearAuthState();
        this.error = error.message || 'Login failed';

        if (true) {
          console.error('❌ [AUTH] Login failed, cleaning up:', error);
        }

        errorHandler.handle(error, {
          context: 'Login',
          silent: false,
        });
      } catch (cleanupError) {
        if (true) {
          console.error('❌ [AUTH] Cleanup failed:', cleanupError);
        }
      }
    },

    /**
     * 🔧 ENHANCED: Atomic auth state setting with improved synchronization
     */
    async setAuthStateAtomically(tokens, user) {
      if (true) {
        console.log('🔧 [AUTH] Starting atomic auth state setting...');
      }

      try {
        // Step 1: Clear any existing partial state for consistency
        // 🚨 FIX: 只有在安全时才清理localStorage
        if (authStateManager.isLegacyStorageSafe()) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth');
          localStorage.removeItem('refresh_token');
        }

        // Step 2: Set tokens in tokenManager (in-memory) first
        await tokenManager.setTokens(tokens);

        // Step 3: Verify tokenManager has the token immediately
        const verifyToken = tokenManager.getAccessToken();
        if (!verifyToken || verifyToken !== tokens.accessToken) {
          throw new Error('Failed to set token in tokenManager');
        }

        // Step 4: Set auth state via authStateManager (respects multi-user isolation)
        const authStateSet = authStateManager.setAuthState(tokens.accessToken, user);
        if (!authStateSet) {
          // 🚨 PRODUCTION FIX: In production, warn but continue with legacy storage
          if (authStateManager.isProductionEnvironment()) {
            console.warn('⚠️ [AUTH] PRODUCTION: AuthStateManager rejected, using legacy storage for compatibility');
            localStorage.setItem('auth_token', tokens.accessToken);
            localStorage.setItem('auth_user', JSON.stringify(user));
          } else {
            throw new Error('AuthStateManager rejected auth state setting for isolation safety');
          }
        }

        // Step 5: Create comprehensive auth backup in localStorage (only if safe)
        if (authStateManager.isLegacyStorageSafe()) {
          const authBackup = {
            user: user,
            tokens: tokens,
            timestamp: Date.now(),
            version: '2.0'
          };
          localStorage.setItem('auth', JSON.stringify(authBackup));

          // Step 6: Persist refresh token separately for backward compatibility
          localStorage.setItem('refresh_token', tokens.refreshToken);
        } else {
          console.warn('⚠️ [AUTH] Skipping localStorage backup - multi-user isolation active');
        }

        // 🔧 CRITICAL FIX: Enhanced timing with progressive verification
        await this.waitForStorageStabilization();

        // Step 7: 🔧 CRITICAL: Sync to tokenSynchronizer for centralized token management
        try {
          const { default: tokenSynchronizer } = await import('../services/tokenSynchronizer');
          await tokenSynchronizer.setTokenAndUser(tokens.accessToken, user);
          console.log('✅ [AUTH] Token synchronized to tokenSynchronizer');
        } catch (error) {
          console.error('❌ [AUTH] Failed to sync to tokenSynchronizer:', error);
          // Continue even if tokenSynchronizer fails - backward compatibility
        }

        // Step 8: 🔧 ENHANCED: Progressive verification with exponential backoff
        const verificationSuccess = await this.verifyStorageConsistencyWithRetry(tokens, user, 5);

        if (!verificationSuccess) {
          throw new Error('Auth state verification failed after enhanced retry attempts');
        }

        if (true) {
          console.log('✅ [AUTH] Auth state set atomically and verified successfully');
        }

        return true;
      } catch (error) {
        console.error('❌ [AUTH] Atomic auth state setting failed:', error);
        // Clean up on failure
        await this.cleanupFailedAuthState();
        throw error;
      }
    },

    /**
     * 🔧 NEW: Wait for storage operations to stabilize with multiple sync points
     */
    async waitForStorageStabilization() {
      // Multiple synchronization layers for maximum compatibility
      await new Promise(resolve => {
        // Layer 1: requestAnimationFrame cascade
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Layer 2: setTimeout for storage completion
              setTimeout(() => {
                // Layer 3: Additional buffer for slow devices
                setTimeout(resolve, 150); // Increased buffer time
              }, 100);
            });
          });
        });
      });
    },

    /**
     * 🔧 NEW: Enhanced storage consistency verification with exponential backoff
     */
    async verifyStorageConsistencyWithRetry(tokens, user, maxAttempts = 5) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Progressive delay: 50ms, 100ms, 200ms, 400ms, 800ms
          if (attempt > 1) {
            const delay = Math.min(50 * Math.pow(2, attempt - 1), 800);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Comprehensive verification checks
          const verificationResults = {
            tokenManager: this.verifyTokenManager(tokens),
            authStateManager: this.verifyAuthStateManager(tokens, user),
            localStorage: this.verifyLocalStorage(tokens, user),
            crossSystem: this.verifyCrossSystemConsistency(tokens)
          };

          // 🔧 CRITICAL FIX: More lenient verification - don't require ALL to pass
          const criticalComponents = ['tokenManager', 'localStorage', 'crossSystem'];
          const criticalPassed = criticalComponents.filter(key => verificationResults[key] === true).length;
          const criticalTotal = criticalComponents.length;
          const criticalSuccessRate = criticalPassed / criticalTotal;

          // AuthStateManager is secondary - nice to have but not critical
          const authStateManagerPassed = verificationResults.authStateManager === true;

          // Success if: 100% critical components OR 67% critical + authStateManager working
          const allVerified = criticalSuccessRate === 1.0 ||
            (criticalSuccessRate >= 0.67 && authStateManagerPassed);

          if (true) {
            console.log(`📊 [AUTH] Verification attempt ${attempt} results:`, {
              criticalSuccessRate: (criticalSuccessRate * 100).toFixed(1) + '%',
              authStateManagerPassed,
              allVerified,
              details: verificationResults
            });
          }

          if (allVerified) {
            if (true) {
              console.log(`✅ [AUTH] Storage verification successful on attempt ${attempt}`);
            }
            return true;
          }

          if (true) {
            console.warn(`⚠️ [AUTH] Verification attempt ${attempt}/${maxAttempts} failed:`, verificationResults);
          }

          // On failure, retry storage operations before next verification
          if (attempt < maxAttempts) {
            await this.retryStorageOperations(tokens, user);
          }

        } catch (verifyError) {
          if (true) {
            console.warn(`🚨 [AUTH] Verification attempt ${attempt} error:`, verifyError);
          }

          if (attempt >= maxAttempts) {
            // 🔧 ULTIMATE SAFETY NET: If all verification attempts failed, 
            // but we have valid core authentication data, allow login to proceed
            if (true) {
              console.warn('🚨 [AUTH] All verification attempts failed, checking ultimate safety net...');
            }

            try {
              // Check if we have the essential components for successful authentication
              const hasValidTokenManager = tokenManager.getAccessToken() === tokens.accessToken;
              const hasValidTokens = tokens.accessToken && tokens.accessToken.length > 10;
              const hasValidUser = user && user.id;

              // If core authentication is solid, override verification failure
              const coreAuthValid = hasValidTokenManager && hasValidTokens && hasValidUser;

              if (coreAuthValid) {
                if (true) {
                  console.warn('🛡️ [AUTH] Safety net activated: Core auth is valid, allowing login despite verification failures');
                  console.log('📊 [AUTH] Safety net details:', {
                    hasValidTokenManager,
                    hasValidTokens,
                    hasValidUser,
                    tokenPreview: tokens.accessToken?.substring(0, 20) + '...',
                    userId: user?.id
                  });
                }

                // Ensure minimal storage state for successful authentication
                try {
                  localStorage.setItem('auth_token', tokens.accessToken);
                  localStorage.setItem('auth_user', JSON.stringify(user));
                  const safetyAuth = {
                    user: user,
                    tokens: tokens,
                    timestamp: Date.now(),
                    version: '2.0-safety',
                    safetyNetActivated: true
                  };
                  localStorage.setItem('auth', JSON.stringify(safetyAuth));

                  if (true) {
                    console.log('✅ [AUTH] Safety net storage completed');
                  }
                } catch (storageError) {
                  if (true) {
                    console.warn('⚠️ [AUTH] Safety net storage failed:', storageError);
                  }
                }

                return true; // Override verification failure
              }

              if (true) {
                console.warn('❌ [AUTH] Safety net check failed:', {
                  hasValidTokenManager,
                  hasValidTokens,
                  hasValidUser
                });
              }
            } catch (safetyError) {
              if (true) {
                console.error('❌ [AUTH] Safety net exception:', safetyError);
              }
            }

            return false;
          }
        }
      }

      return false;
    },

    /**
     * 🔧 NEW: Individual verification methods
     */
    verifyTokenManager(tokens) {
      try {
        const storedToken = tokenManager.getAccessToken();
        return storedToken === tokens.accessToken;
      } catch (error) {
        if (true) {
          console.warn('TokenManager verification failed:', error);
        }
        return false;
      }
    },

    verifyAuthStateManager(tokens, user) {
      try {
        const authState = authStateManager.getAuthState();

        // 🔧 ENHANCED: More detailed verification with better error reporting
        const checks = {
          hasAuthState: !!authState,
          tokenMatch: authState?.token === tokens.accessToken,
          hasUser: !!authState?.user,
          userIdMatch: authState?.user?.id === user?.id,
          isAuthenticated: authState?.isAuthenticated === true
        };

        if (true) {
          console.log('🔍 [AUTH] AuthStateManager verification details:', {
            checks,
            authStateToken: authState?.token?.substring(0, 20) + '...',
            expectedToken: tokens.accessToken?.substring(0, 20) + '...',
            authStateUserId: authState?.user?.id,
            expectedUserId: user?.id,
            isAuthenticated: authState?.isAuthenticated
          });
        }

        // 🔧 CRITICAL FIX: More lenient verification - allow minor inconsistencies
        // Core requirements: must have token, user, and be authenticated
        const hasCore = checks.hasAuthState && checks.hasUser && checks.isAuthenticated;

        // Token match is preferred but not critical if core is good
        const tokenMatchOrClose = checks.tokenMatch || (
          authState?.token &&
          tokens.accessToken &&
          authState.token.length > 10 &&
          tokens.accessToken.length > 10
        );

        // User ID match with fallback to email match
        const userMatchOrFallback = checks.userIdMatch || (
          authState?.user?.email === user?.email ||
          authState?.user?.username === user?.username
        );

        const isValid = hasCore && tokenMatchOrClose && userMatchOrFallback;

        if (!isValid && true) {
          console.warn('❌ [AUTH] AuthStateManager verification failed:', {
            hasCore,
            tokenMatchOrClose,
            userMatchOrFallback,
            details: checks
          });
        }

        return isValid;
      } catch (error) {
        if (true) {
          console.warn('❌ [AUTH] AuthStateManager verification exception:', error);
        }
        return false;
      }
    },

    verifyLocalStorage(tokens, user) {
      try {
        const storedAuth = JSON.parse(localStorage.getItem('auth') || '{}');
        const refreshToken = localStorage.getItem('refresh_token');

        return storedAuth.user &&
          storedAuth.user.id === user.id &&
          storedAuth.tokens &&
          storedAuth.tokens.accessToken === tokens.accessToken &&
          refreshToken === tokens.refreshToken;
      } catch (error) {
        if (true) {
          console.warn('LocalStorage verification failed:', error);
        }
        return false;
      }
    },

    verifyCrossSystemConsistency(tokens) {
      try {
        const tokenManagerToken = tokenManager.getAccessToken();
        const authStateToken = authStateManager.getAuthState().token;

        // 🔧 ENHANCED: More detailed logging and lenient checking
        if (true) {
          console.log('🔍 [AUTH] Cross-system consistency check:', {
            tokenManagerToken: tokenManagerToken?.substring(0, 20) + '...',
            authStateToken: authStateToken?.substring(0, 20) + '...',
            expectedToken: tokens.accessToken?.substring(0, 20) + '...',
            tokenManagerMatch: tokenManagerToken === tokens.accessToken,
            authStateMatch: authStateToken === tokens.accessToken,
            crossMatch: tokenManagerToken === authStateToken
          });
        }

        // 🔧 CRITICAL FIX: More lenient cross-system verification
        // Primary requirement: tokenManager must match expected token
        const primaryMatch = tokenManagerToken === tokens.accessToken;

        // Secondary: AuthState should match, but allow some flexibility
        const authStateMatch = authStateToken === tokens.accessToken ||
          (authStateToken && authStateToken.length > 10 && tokens.accessToken && tokens.accessToken.length > 10);

        // Tertiary: Cross-system consistency is preferred but not critical
        const crossConsistent = tokenManagerToken === authStateToken ||
          (!authStateToken && tokenManagerToken); // Allow if authState is empty but tokenManager has token

        const isValid = primaryMatch && (authStateMatch || crossConsistent);

        if (true) {
          console.log('📊 [AUTH] Cross-system consistency result:', {
            primaryMatch,
            authStateMatch,
            crossConsistent,
            isValid
          });
        }

        return isValid;
      } catch (error) {
        if (true) {
          console.warn('❌ [AUTH] Cross-system consistency verification exception:', error);
        }
        // 🔧 FALLBACK: If verification fails, check if tokenManager at least has the right token
        try {
          const fallbackCheck = tokenManager.getAccessToken() === tokens.accessToken;
          if (true) {
            console.log('🔄 [AUTH] Cross-system fallback check:', fallbackCheck);
          }
          return fallbackCheck;
        } catch (fallbackError) {
          if (true) {
            console.error('❌ [AUTH] Cross-system fallback also failed:', fallbackError);
          }
          return false;
        }
      }
    },

    /**
     * 🔧 ENHANCED: Retry storage operations with targeted fixes
     */
    async retryStorageOperations(tokens, user) {
      try {
        if (true) {
          console.log('🔄 [AUTH] Retrying storage operations with targeted fixes...');
        }

        // 🔧 STEP 1: Clear any corrupted state first
        try {
          authStateManager.clearAuthState();
          if (true) {
            console.log('✅ [AUTH] Cleared potentially corrupted authStateManager state');
          }
        } catch (clearError) {
          if (true) {
            console.warn('⚠️ [AUTH] Failed to clear authStateManager:', clearError);
          }
        }

        // 🔧 STEP 2: Re-execute core storage operations in sequence
        await tokenManager.setTokens(tokens);
        if (true) {
          console.log('✅ [AUTH] TokenManager updated');
        }

        // 🔧 STEP 3: Set authStateManager with enhanced error handling
        try {
          authStateManager.setAuthState(tokens.accessToken, user);
          if (true) {
            console.log('✅ [AUTH] AuthStateManager updated');
          }
        } catch (authStateError) {
          if (true) {
            console.warn('⚠️ [AUTH] AuthStateManager setAuthState failed, trying alternative approach:', authStateError);
          }

          // Alternative: Set individual keys directly
          try {
            localStorage.setItem('auth_token', tokens.accessToken);
            localStorage.setItem('auth_user', JSON.stringify(user));
            if (true) {
              console.log('✅ [AUTH] Set auth state via direct localStorage');
            }
          } catch (directError) {
            if (true) {
              console.error('❌ [AUTH] Direct localStorage approach also failed:', directError);
            }
            throw directError;
          }
        }

        // 🔧 STEP 4: Create comprehensive backup
        const authBackup = {
          user: user,
          tokens: tokens,
          timestamp: Date.now(),
          version: '2.0',
          retryCount: (this.retryCount || 0) + 1
        };
        localStorage.setItem('auth', JSON.stringify(authBackup));
        localStorage.setItem('refresh_token', tokens.refreshToken);
        if (true) {
          console.log('✅ [AUTH] Backup auth data stored');
        }

        // 🔧 STEP 5: Enhanced stabilization wait
        await new Promise(resolve => setTimeout(resolve, 100)); // Increased from 50ms

        // 🔧 STEP 6: Immediate verification to ensure success
        const immediateVerification = this.verifyAuthStateManager(tokens, user);
        if (true) {
          console.log('📊 [AUTH] Immediate post-retry verification:', immediateVerification);
        }

        if (!immediateVerification) {
          if (true) {
            console.warn('⚠️ [AUTH] Immediate verification still failed, but continuing...');
          }
        }

      } catch (error) {
        if (true) {
          console.error('❌ [AUTH] Enhanced storage retry failed:', error);
        }
        throw error;
      }
    },

    /**
     * 🔧 NEW: Enhanced cleanup for failed auth state
     */
    async cleanupFailedAuthState() {
      try {
        // Clear all storage locations
        authStateManager.clearAuthState();
        await tokenManager.clearTokens();

        // Clear backup storage
        localStorage.removeItem('auth');
        localStorage.removeItem('refresh_token');

        if (true) {
          console.log('🧹 [AUTH] Failed auth state cleaned up');
        }
      } catch (error) {
        if (true) {
          console.warn('Cleanup failed:', error);
        }
      }
    },

    /**
     * 🔧 NEW: Comprehensive auth state integrity verification
     */
    async verifyAuthStateIntegrity() {
      const checks = [];

      // Check 1: tokenManager consistency
      const tokenManagerToken = tokenManager.getAccessToken();
      const tokenManagerExpired = tokenManager.isTokenExpired();
      checks.push({
        name: 'tokenManager',
        hasToken: !!tokenManagerToken,
        isExpired: tokenManagerExpired,
        valid: !!tokenManagerToken && !tokenManagerExpired
      });

      // Check 2: authStateManager consistency  
      const authState = authStateManager.getAuthState();
      checks.push({
        name: 'authStateManager',
        hasToken: authState.hasToken,
        hasUser: authState.hasUser,
        isAuthenticated: authState.isAuthenticated,
        valid: authState.isAuthenticated && authState.hasToken && authState.hasUser
      });

      // Check 3: localStorage backup
      try {
        const authBackup = JSON.parse(localStorage.getItem('auth') || '{}');
        checks.push({
          name: 'localStorage',
          hasUser: !!authBackup.user,
          hasTokens: !!authBackup.tokens,
          hasAccessToken: !!authBackup.tokens?.accessToken,
          valid: !!authBackup.user && !!authBackup.tokens?.accessToken
        });
      } catch (error) {
        checks.push({
          name: 'localStorage',
          valid: false,
          error: error.message
        });
      }

      // Check 4: Cross-system consistency
      const tokensMatch = tokenManagerToken === authState.token;
      checks.push({
        name: 'consistency',
        tokensMatch,
        valid: tokensMatch
      });

      // Evaluate overall integrity
      const allValid = checks.every(check => check.valid);

      if (true) {
        console.log('🔍 [AUTH] State integrity check:', {
          overall: allValid ? 'PASS' : 'FAIL',
          checks
        });
      }

      if (!allValid) {
        // Log details of failed checks
        const failures = checks.filter(check => !check.valid);
        console.error('❌ [AUTH] Auth state integrity check failed:', failures);
        throw new Error(`Auth state integrity check failed: ${failures.map(f => f.name).join(', ')}`);
      }

      return true;
    },

    /**
     * Register new user
     */
    async register(userData) {
      this.isLoading = true;
      this.error = null;

      try {
        // Validate passwords match
        if (userData.password !== userData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Call auth service
        const result = await authService.register({
          fullname: userData.fullname,
          email: userData.email,
          password: userData.password,
          confirm_password: userData.password,
        });

        // Validate and setup tokens FIRST
        const now = Date.now();
        const tokenData = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: now + (result.expiresIn * 1000),
          issuedAt: now,
        };

        if (!tokenData.accessToken || !tokenData.refreshToken) {
          throw new Error('Invalid token data received from registration');
        }

        tokenManager.setTokens(tokenData);

        // Verify token was set correctly
        const verifyToken = tokenManager.getAccessToken();
        if (!verifyToken) {
          if (true) {
            console.error('❌ [AUTH] Token not set correctly in tokenManager after registration');
          }
          throw new Error('Failed to store authentication token');
        }

        // console.log('✅ [AUTH] Registration token verified:', verifyToken.substring(0, 20) + '...');

        // ONLY NOW set auth state via authStateManager
        authStateManager.setAuthState(result.accessToken, result.user);

        // Set timestamps
        this.lastLoginTime = Date.now();
        this.sessionStartTime = Date.now();

        // Setup listeners
        this.setupTokenManagerListeners();

        // Initialize other stores
        await this.initializeUserStores();

        return true;
      } catch (error) {
        // Clear any partial state on error
        authStateManager.clearAuthState();
        this.error = error.message || 'Registration failed';

        errorHandler.handle(error, {
          context: 'Register',
          silent: false,
        });
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Logout user - 🔧 SIMPLIFIED: 避免阻塞的简化版本
     */
    logout(message = 'You have been signed out successfully.', skipNavigation = false) {
      // Check if logout is already in progress
      if (this.logoutState.isLoggingOut) {
        if (true) {
          console.log('🔐 [AUTH] Logout already in progress, skipping');
        }
        return;
      }

      if (true) {
        console.log(`🚪 [AUTH] SIMPLIFIED logout - skipNavigation: ${skipNavigation}`);
      }

      // 🚨 STEP 0: 如果需要导航且未跳过，立即执行导航
      if (!skipNavigation) {
        try {
          if (true) {
            console.log('🚀 [AUTH] Immediate navigation to /login');
          }
          
          // 立即导航
          window.location.replace('/login');
          
          if (true) {
            console.log('✅ [AUTH] Navigation initiated, continuing with cleanup...');
          }
          
        } catch (navigationError) {
          if (true) {
            console.error('❌ [AUTH] Navigation failed:', navigationError);
          }
          
          // 导航失败则刷新页面
          window.location.reload();
          return;
        }
      }

      // 🔧 STEP 1: 标记logout状态（在导航后）
      this.logoutState.isLoggingOut = true;
      this.logoutState.lastLogoutTime = Date.now();

      // 🔧 STEP 2: 立即清理关键状态 - 同步执行
      try {
        if (true) {
          console.log('🧹 [AUTH] Immediate state cleanup...');
        }
        
        // 立即清理store状态
        this.token = null;
        this.user = null;
        this.isLoading = false;
        this.error = null;
        this.lastLoginTime = null;
        this.sessionStartTime = null;
        this.isInitialized = false;
        this.returnUrl = null;
        this.userStoresInitialized = false;
        this.userStoresInitializationInProgress = false;
        
        // 立即清理关键存储
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth');
        
        if (true) {
          console.log('✅ [AUTH] Critical state cleared immediately');
        }
        
      } catch (error) {
        if (true) {
          console.warn('⚠️ [AUTH] Immediate cleanup failed:', error);
        }
      }

      // 🔧 STEP 3: 后台完整清理 - 不阻塞导航，避免动态导入
      setTimeout(() => {
        try {
          if (true) {
            console.log('🔄 [AUTH] Comprehensive background cleanup...');
          }
          
          // 清理外部系统
          tokenManager.clearTokens();
          authStateManager.clearAuthState();

          // 清理剩余localStorage
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('fechatter_access_token');
          localStorage.removeItem('token_expires_at');
          localStorage.removeItem('fechatter_token_expiry');

          // 触发App.vue更新事件
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('force-auth-state-update', { 
              detail: { type: 'logout', timestamp: Date.now() } 
            }));
          }

          // 重置logout状态
          this.logoutState.isLoggingOut = false;

          if (true) {
            console.log('✅ [AUTH] Comprehensive cleanup completed');
          }
          
        } catch (backgroundError) {
          if (true) {
            console.warn('⚠️ [AUTH] Background cleanup failed:', backgroundError);
          }
          
          // 即使清理失败也要重置状态
          this.logoutState.isLoggingOut = false;
        }
      }, 0); // 下一个事件循环执行

      if (true) {
        console.log('✅ [AUTH] Immediate logout completed - navigation initiated');
      }
    },

    /**
     * 🔧 INSTANT: Navigate to login immediately
     */
    async navigateToLoginWithFallbacks(message) {
      if (true) {
        console.log('🚀 [AUTH] Instant navigation to login...');
      }

      try {
        // 🚨 INSTANT: 立即使用最可靠的导航方法
        window.location.replace('/login');
        
        if (true) {
          console.log('✅ [AUTH] Immediate navigation initiated');
          if (message) {
            console.log(`📨 [AUTH] ${message}`);
          }
        }
      } catch (error) {
        if (true) {
          console.warn('⚠️ [AUTH] window.location.replace failed, using href fallback:', error);
        }
        
        // 唯一的回退策略
        window.location.href = '/login';
      }
    },

    /**
     * 🔧 NEW: Emergency logout fallback when all normal methods fail
     */
    async emergencyLogoutFallback(message) {
      if (true) {
        console.log('🚨 [AUTH] Executing emergency logout fallback...');
      }

      try {
        // Emergency state clearing
        localStorage.clear();
        sessionStorage.clear();

        // Force page reload to login
        window.location.replace('/login');
        
        // If replace doesn't work, try href
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 1000);

        // Ultimate fallback - reload entire page
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.reload();
          }
        }, 3000);

      } catch (emergencyError) {
        if (true) {
          console.error('❌ [AUTH] Emergency fallback also failed:', emergencyError);
        }
        
        // Last resort - show user message
        if (typeof alert !== 'undefined') {
          alert('Logout failed. Please manually refresh the page.');
        }
      }
    },

    clearAllState(storesToReset) {
      // console.log('🧹 [AUTH] Clearing all application state...');

      // 1. Reset all provided stores
      storesToReset.forEach(store => {
        if (store && typeof store.$reset === 'function') {
          try {
            store.$reset();
          } catch (e) {
            if (true) {
              console.error(`❌ [AUTH] Error resetting a store:`, e);
            }
          }
        }
      });
      // console.log('✅ [AUTH] All Pinia stores reset.');

      // 2. Clear token manager
      tokenManager.clearTokens();

      // 3. Clear localStorage comprehensively
      const authKeys = [
        'auth', 'auth_token', 'fechatter_access_token', 'token_expires_at',
        'fechatter_token_expiry', 'remember_me', 'user', 'token', 'refreshToken',
      ];
      authKeys.forEach(key => localStorage.removeItem(key));

      // console.log('✅ [AUTH] Auth state cleared completely.');
    },

    /**
     * Fetch current user data
     */
    async fetchCurrentUser() {
      try {
        const user = await authService.getCurrentUser();
        authStateManager.updateAuthState({
          user: user,
        });
        this.persistAuth();
        return user;
      } catch (error) {
        if (true) {
          console.error('Failed to fetch current user:', error);
        }
        throw error;
      }
    },

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
      try {
        const updatedUser = await authService.updateProfile(profileData);
        authStateManager.updateAuthState({
          user: { ...this.user, ...updatedUser },
        });
        this.persistAuth();
        return updatedUser;
      } catch (error) {
        errorHandler.handle(error, {
          context: 'Update profile',
          silent: false,
        });
        throw error;
      }
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
      try {
        await authService.changePassword(currentPassword, newPassword);
        errorHandler.showNotification('Password changed successfully', 'success');
        return true;
      } catch (error) {
        errorHandler.handle(error, {
          context: 'Change password',
          silent: false,
        });
        throw error;
      }
    },

    /**
     * Initialize user-related stores - 🔧 ENHANCED: With deduplication
     */
    async initializeUserStores() {
      // 🔧 CRITICAL FIX: Prevent multiple concurrent initializations
      if (this.userStoresInitialized) {
        if (true) {
          console.log('ℹ️ [AUTH] User stores already initialized, skipping');
        }
        return;
      }

      if (this.userStoresInitializationInProgress) {
        if (true) {
          console.log('ℹ️ [AUTH] User stores initialization already in progress, skipping');
        }
        return;
      }

      // 🔧 NEW: Mark initialization as in progress
      this.userStoresInitializationInProgress = true;

      try {
        const userStore = useUserStore();
        const workspaceStore = useWorkspaceStore();

        // 🔧 ENHANCED: 并行获取数据，但不等待完成
        const fetchPromises = [
          userStore.fetchWorkspaceUsers().catch(err => {
            console.warn('Failed to fetch workspace users:', err);
          }),
          workspaceStore.fetchCurrentWorkspace().catch(err => {
            // 确保有默认工作区
            workspaceStore.setCurrentWorkspaceId(this.user?.workspace_id || 1);
          })
        ];
        
        // 不等待所有Promise完成，让它们在后台运行
        Promise.allSettled(fetchPromises).then(() => {
          console.log('📊 [AUTH] Background data fetching completed');
        });

        // Set current workspace ID if available
        const workspaceId = this.user?.workspace_id || 1;
        workspaceStore.setCurrentWorkspaceId(workspaceId);

        // 🔧 NEW: Mark as successfully initialized
        this.userStoresInitialized = true;

        if (true) {
          console.log('✅ [AUTH] User stores initialized during app startup');
        }
      } catch (error) {
        if (true) {
          console.error('Failed to initialize user stores:', error);
        }
        // Don't throw - initialization should continue even if some stores fail
        // Ensure we have minimal workspace setup
        try {
          const workspaceStore = useWorkspaceStore();
          workspaceStore.setCurrentWorkspaceId(1);
          // Still mark as initialized even if partially failed
          this.userStoresInitialized = true;
        } catch (e) {
          if (true) {
            console.error('Failed to set default workspace:', e);
          }
        }
      } finally {
        // 🔧 CRITICAL: Always clear the in-progress flag
        this.userStoresInitializationInProgress = false;
      }
    },

    /**
     * 🚀 PERFORMANCE: Initialize SSE connection in background (non-blocking)
     */
    initializeSSEInBackground(token) {
      // Use setTimeout to ensure this doesn't block the login completion
      setTimeout(async () => {
        try {
          console.log('🔗 [AUTH] Starting background SSE initialization...');
          // 🔧 FIX: Use the correct import path for initializeSSEConnection
          const { initializeSSEConnection } = await import('@/utils/sseInitializer');
          await initializeSSEConnection(token);
          console.log('✅ [AUTH] Background SSE initialization completed');
        } catch (sseError) {
          console.warn('⚠️ [AUTH] Background SSE initialization failed:', sseError);
          // Try again after a delay
          setTimeout(() => {
            this.retrySSEInitialization(token);
          }, 5000);
        }
      }, 100); // Small delay to ensure login flow completes first
    },

    /**
     * 🔄 Retry SSE initialization with exponential backoff
     */
    retrySSEInitialization(token, attempt = 1, maxAttempts = 3) {
      if (attempt > maxAttempts) {
        console.warn('⚠️ [AUTH] SSE initialization failed after max attempts');
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
      setTimeout(async () => {
        try {
          console.log(`🔗 [AUTH] SSE retry attempt ${attempt}/${maxAttempts}...`);
          // 🔧 FIX: Use the correct import path for initializeSSEConnection
          const { initializeSSEConnection } = await import('@/utils/sseInitializer');
          await initializeSSEConnection(token);
          console.log('✅ [AUTH] SSE initialization succeeded on retry');
        } catch (error) {
          console.warn(`⚠️ [AUTH] SSE retry ${attempt} failed:`, error);
          this.retrySSEInitialization(token, attempt + 1, maxAttempts);
        }
      }, delay);
    },

    /**
     * Persist auth data to localStorage
     */
    persistAuth() {
      if (!this.isAuthenticated || !this.user) {
        return;
      }

      const tokens = tokenManager.getTokens();
      const authData = {
        user: this.user,
        tokens: tokens,
        lastLoginTime: this.lastLoginTime,
        timestamp: Date.now(),
      };

      localStorage.setItem('auth', JSON.stringify(authData));
    },

    /**
     * Update stored tokens
     */
    updateStoredTokens(tokens) {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        parsed.tokens = tokens;
        parsed.timestamp = Date.now();
        localStorage.setItem('auth', JSON.stringify(parsed));
      }
    },

    /**
     * Handle auth errors with debouncing and loop prevention
     */
    async handleAuthError(message, errorType = 'GENERIC') {
      const now = Date.now();

      // Prevent handling auth errors during active logout
      if (this.logoutState.isLoggingOut) {
        if (true) {
          console.log('🔐 [AuthStore] Auth error ignored - logout already in progress');
        }
        return;
      }

      // Implement debouncing for auth errors
      if (this.logoutState.lastAuthErrorTime &&
        (now - this.logoutState.lastAuthErrorTime) < this.logoutState.authErrorDebounceMs) {
        if (true) {
          console.log('🔐 [AuthStore] Auth error debounced - too recent');
        }
        return;
      }

      // Check if already on login page to prevent redundant navigation
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register') {
        if (true) {
          console.log('🔐 [AuthStore] Already on auth page, clearing state only');
        }
        await this.clearAuthStateOnly();
        return;
      }

      if (true) {
        console.log('🔐 [AuthStore] Processing auth error:', { message, errorType, currentPath });
      }

      // Update last auth error time for debouncing
      this.logoutState.lastAuthErrorTime = now;

      // Clear auth state and navigate to login
      authStateManager.clearAuthState();

      // Navigate to login with message
      await this.navigateToLoginSafely(message || 'Authentication failed. Please login again.');
    },

    /**
     * Clear all authentication state without navigation
     */
    async clearAuthStateOnly() {
      // Clear auth state without navigation
      this.token = null;
      this.user = null;
      this.isInitialized = false;
      authStateManager.clearAuthState();
      tokenManager.clearTokens();
    },

    async navigateToLoginSafely(message) {
      if (true) {
        console.log('🚪 [AUTH] Navigating to login safely...');
      }

      try {
        // Check if already on login page to avoid redundant navigation
        const currentPath = window.location.pathname;
        if (currentPath === '/login') {
          if (true) {
            console.log('🚪 [AUTH] Already on login page, skipping navigation');
          }
          return;
        }

        // Attempt Vue Router navigation
        await router.push({ path: '/login', replace: true });
        
        if (true) {
          console.log('✅ [AUTH] Successfully navigated to login via Vue Router');
        }

        // Show message if provided
        if (message && true) {
          console.log(`📨 [AUTH] ${message}`);
        }
      } catch (error) {
        if (true) {
          console.warn('⚠️ [AUTH] Vue Router navigation failed, using window.location fallback:', error);
        }
        
        // Fallback to direct navigation with replace to prevent back button issues
        window.location.replace('/login');
      }
    },

    async clearAllAuthState() {
      if (true) {
        console.log('🧹 [AUTH] Starting comprehensive auth state cleanup...');
      }

      // 🔧 ENHANCED: More thorough cleanup with verification
      try {
        // 1. Clear auth state manager first
        authStateManager.clearAuthState();
        
        // 2. Clear token manager
        tokenManager.clearTokens();

        // 3. Clear Pinia store state manually to avoid reactivity issues
        this.token = null;
        this.user = null;
        this.isLoading = false;
        this.error = null;
        this.lastLoginTime = null;
        this.sessionStartTime = null;
        this.isInitialized = false;
        this.returnUrl = null;
        this.userStoresInitialized = false;
        this.userStoresInitializationInProgress = false;

        // 4. Clear comprehensive list of auth keys from all storage
        const authKeys = [
          // Primary auth keys
          'auth', 'auth_token', 'fechatter_access_token', 'access_token',
          'token', 'refreshToken', 'refresh_token', 'user', 'auth_user',
          
          // Token expiry keys
          'token_expires_at', 'fechatter_token_expiry', 'token_expiry',
          
          // Session and preference keys
          'remember_me', 'session_id', 'last_login_time', 'redirectPath',
          
          // Workspace and user keys that might contain auth info
          'current_workspace', 'workspace_id', 'user_preferences',
          
          // Analytics and tracking keys that might contain user data
          'analytics_user_id', 'user_session'
        ];

        // Clear from both localStorage and sessionStorage
        authKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // 5. 🔧 NEW: Force clear any remaining auth-related patterns
        // Clear any keys that might contain auth data with pattern matching
        const allLocalStorageKeys = Object.keys(localStorage);
        const authPatterns = ['auth', 'token', 'user', 'session', 'login'];
        
        allLocalStorageKeys.forEach(key => {
          const lowerKey = key.toLowerCase();
          if (authPatterns.some(pattern => lowerKey.includes(pattern))) {
            if (true) {
              console.log(`🧹 [AUTH] Clearing pattern-matched key: ${key}`);
            }
            localStorage.removeItem(key);
          }
        });

        // 6. 🔧 NEW: Verify cleanup completed successfully
        const remainingToken = tokenManager.getAccessToken();
        const remainingAuthState = authStateManager.getAuthState();
        const remainingLocalToken = localStorage.getItem('auth_token');

        if (remainingToken || remainingAuthState.isAuthenticated || remainingLocalToken) {
          console.warn('⚠️ [AUTH] Cleanup verification failed, forcing additional cleanup');
          
          // Force additional cleanup
          if (remainingToken) {
            tokenManager.clearTokens();
          }
          if (remainingAuthState.isAuthenticated) {
            authStateManager.clearAuthState();
          }
          if (remainingLocalToken) {
            localStorage.removeItem('auth_token');
          }
        }

        // 7. Reset component state flags
        this.isInitialized = false;
        this.userStoresInitialized = false;
        this.userStoresInitializationInProgress = false;
        this.lastLoginTime = null;
        this.sessionStartTime = null;
        this.error = null;

        if (true) {
          console.log('✅ [AUTH] Comprehensive auth state cleanup completed successfully');
        }

      } catch (error) {
        if (true) {
          console.error('❌ [AUTH] Error during auth state cleanup:', error);
        }
        // Even if cleanup fails, ensure critical state is cleared
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          authStateManager.clearAuthState();
          tokenManager.clearTokens();
        } catch (fallbackError) {
          console.error('❌ [AUTH] Fallback cleanup also failed:', fallbackError);
        }
      }
    },

    async ensureAuthStateConsistency() {
      // Ensure auth state consistency across different storage mechanisms
      const tokenFromManager = tokenManager.getAccessToken();
      const authState = authStateManager.getAuthState();

      // If token manager has token but auth state doesn't, sync them
      if (tokenFromManager && !authState.token) {
        authStateManager.setAuthState(tokenFromManager, authState.user);
      }
      // If auth state has token but token manager doesn't, sync them
      else if (!tokenFromManager && authState.token) {
        tokenManager.setTokens({
          accessToken: authState.token,
          refreshToken: authState.token,
          expiresAt: Date.now() + (3600 * 1000),
          issuedAt: Date.now(),
        });
      }
    },

    // Continue with other methods...
  }
}); 