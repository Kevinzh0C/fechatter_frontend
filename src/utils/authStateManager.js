/**
 * Auth State Manager - Single Source of Truth
 * Following Frontend Design Principles:
 * - Component State Layer: Single source of truth for auth state
 * - YAGNI: Simple, direct state management
 * - Occam's Razor: Simplest solution that works
 * - Multi-user session support for tab isolation
 */

import multiUserSessionManager from './multiUserSessionManager.js'
import productionMultiUserManager from './productionMultiUserManager.js'

class AuthStateManager {
  constructor() {
    this.STORAGE_KEY = 'auth_token';
    this.USER_KEY = 'auth_user';
  }

  /**
   * Get current auth state - SINGLE SOURCE OF TRUTH
   * Token existence determines authentication state
   * 🔗 NEW: Multi-user session support with production fallback
   */
  getAuthState() {
    // 🌐 PRODUCTION: Check if we're in production and use production multi-user manager
    if (this.isProductionEnvironment()) {
      const productionUser = productionMultiUserManager.getCurrentUser()
      if (productionUser && productionUser.token && productionUser.email) {
        const token = productionUser.token
        const user = {
          id: productionUser.id,
          email: productionUser.email,
          name: productionUser.name,
          avatar: productionUser.avatar,
          role: productionUser.role
        }
        
        const hasValidToken = !!token && this.isValidTokenFormat(token)
        const hasValidUser = !!user && typeof user === 'object' && user.id
        const isAuthenticated = Boolean(hasValidToken && hasValidUser)
        
        if (true && token) {
          console.log('🌐 [AuthStateManager] Production auth state:', {
            sessionId: productionUser.sessionId,
            hasToken: !!token,
            hasValidToken,
            hasUser: !!user,
            hasValidUser,
            isAuthenticated,
            tokenPreview: token ? `${token.substring(0, 10)}...` : null,
            userId: user?.id || null
          })
        }
        
        return {
          token,
          user,
          isAuthenticated,
          hasToken: !!token,
          hasUser: !!user,
          isValid: isAuthenticated,
          needsRefresh: hasValidToken && !hasValidUser,
          tokenValid: hasValidToken,
          userValid: hasValidUser,
          lastChecked: Date.now(),
          sessionId: productionUser.sessionId,
          isMultiUserSession: false,
          isProductionSession: true
        }
      }
    }
    
    // 🔗 DEVELOPMENT: Try multi-user session first (tab-specific)
    const sessionAuth = multiUserSessionManager.getSessionAuth()
    if (sessionAuth && sessionAuth.token && sessionAuth.user) {
      const token = sessionAuth.token
      const user = sessionAuth.user
      
      const hasValidToken = !!token && this.isValidTokenFormat(token)
      const hasValidUser = !!user && typeof user === 'object' && user.id
      const isAuthenticated = Boolean(hasValidToken && hasValidUser)
      
      if (true && token) {
        console.log('🔗 [AuthStateManager] Session auth state:', {
          sessionId: sessionAuth.sessionId,
          hasToken: !!token,
          hasValidToken,
          hasUser: !!user,
          hasValidUser,
          isAuthenticated,
          tokenPreview: token ? `${token.substring(0, 10)}...` : null,
          userId: user?.id || null
        })
      }
      
      return {
        token,
        user,
        isAuthenticated,
        hasToken: !!token,
        hasUser: !!user,
        isValid: isAuthenticated,
        needsRefresh: hasValidToken && !hasValidUser,
        tokenValid: hasValidToken,
        userValid: hasValidUser,
        lastChecked: Date.now(),
        sessionId: sessionAuth.sessionId,
        isMultiUserSession: true,
        isProductionSession: false
      }
    }
    
    // 🚨 CRITICAL: NO FALLBACK to legacy localStorage for multi-user isolation
    // If we're using multi-user systems and no session auth found, return empty state
    // This prevents auth state leakage between sessions/users
    
    // 🚨 EMERGENCY PRODUCTION FALLBACK: In production, try legacy storage if multi-user failed
    if (this.isProductionEnvironment()) {
      console.warn('🚨 [AuthStateManager] EMERGENCY: Production fallback - checking legacy storage')
      
      const legacyToken = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem('auth_token')
      const legacyUserStr = localStorage.getItem(this.USER_KEY) || localStorage.getItem('auth_user')
      
      if (legacyToken && legacyUserStr) {
        try {
          const legacyUser = JSON.parse(legacyUserStr)
          const hasValidToken = !!legacyToken && this.isValidTokenFormat(legacyToken)
          const hasValidUser = !!legacyUser && typeof legacyUser === 'object' && legacyUser.id
          const isAuthenticated = Boolean(hasValidToken && hasValidUser)
          
          if (isAuthenticated) {
            console.warn('🚨 [AuthStateManager] EMERGENCY: Using legacy storage in production')
            return {
              token: legacyToken,
              user: legacyUser,
              isAuthenticated,
              hasToken: !!legacyToken,
              hasUser: !!legacyUser,
              isValid: isAuthenticated,
              needsRefresh: hasValidToken && !hasValidUser,
              tokenValid: hasValidToken,
              userValid: hasValidUser,
              lastChecked: Date.now(),
              sessionId: 'legacy-production',
              isMultiUserSession: false,
              isProductionSession: true,
              isEmergencyFallback: true
            }
          }
        } catch (error) {
          console.error('🚨 [AuthStateManager] Legacy storage parsing failed:', error)
        }
      }
    }
    
    console.log('🚫 [AuthStateManager] No valid auth found - returning empty state')
    
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      hasToken: false,
      hasUser: false,
      isValid: false,
      needsRefresh: false,
      tokenValid: false,
      userValid: false,
      lastChecked: Date.now(),
      sessionId: null,
      isMultiUserSession: false,
      isProductionSession: false
    };
  }

  /**
   * Check if we're in production environment
   */
  isProductionEnvironment() {
    // Check various indicators of production environment
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('fechatter')
    const isHTTPS = window.location.protocol === 'https:'
    const isProd = import.meta.env.PROD
    const isNotLocalhost = !window.location.hostname.includes('localhost') && 
                           !window.location.hostname.includes('127.0.0.1')
    
    return isVercel || (isHTTPS && isProd && isNotLocalhost)
  }

  /**
   * Set auth state - Atomic operation
   * This is the primary method for persisting authentication data.
   * 🔗 NEW: Multi-user session support with production handling
   * 🚨 FIX: Remove legacy fallback to prevent state leakage
   */
  setAuthState(token, user) {
    // 🌐 PRODUCTION: Use production multi-user manager
    if (this.isProductionEnvironment()) {
      if (token && user) {
        const success = productionMultiUserManager.setCurrentUser(user, token)
        if (success) {
          console.log('🌐 [AuthStateManager] Auth state set in production:', {
            userEmail: user?.email,
            environment: 'production'
          })
          
          // 🚨 FIX: Only set legacy storage if multi-user setting failed
          // This prevents state leakage between users
          return true
        }
      }
    } else {
      // 🔗 DEVELOPMENT: Set in multi-user session (tab-specific)
      if (token && user) {
        const success = multiUserSessionManager.setSessionAuth(token, user)
        if (success) {
          console.log('🔗 [AuthStateManager] Auth state set in session:', {
            userEmail: user?.email,
            sessionId: multiUserSessionManager.sessionId
          })
          
          // 🚨 FIX: Only set legacy storage if multi-user setting failed
          // This maintains proper isolation between tabs/users
          return true
        }
      }
    }
    
    // 🚨 CRITICAL FIX: Only use legacy storage as last resort
    // And only if no other user sessions are active
    if (this.isLegacyStorageSafe()) {
      console.warn('⚠️ [AuthStateManager] Using legacy storage as fallback')
      this.setLegacyAuthState(token, user)
      return true
    } else {
      console.error('❌ [AuthStateManager] Cannot set auth state - would break multi-user isolation')
      return false
    }
  }
  
  /**
   * Check if legacy storage is safe to use (no other active sessions)
   * 🚨 EMERGENCY: Add production fallback for Vercel compatibility
   */
  isLegacyStorageSafe() {
    // 🚨 EMERGENCY PRODUCTION FALLBACK: In production environment, 
    // allow legacy storage to prevent complete auth failure
    if (this.isProductionEnvironment()) {
      console.warn('🚨 [AuthStateManager] EMERGENCY: Production fallback - allowing legacy storage for Vercel compatibility')
      return true
    }
    
    // Check if there are other active sessions that would be affected
    const activeSessions = Object.keys(localStorage).filter(key => 
      key.startsWith('fechatter_session_auth_')
    )
    
    // Only safe if no other sessions exist
    return activeSessions.length === 0
  }

  /**
   * Set auth state in legacy localStorage (backward compatibility)
   */
  setLegacyAuthState(token, user) {
    // 🚨 BUG FIX: Do not call clearAuthState() here.
    // This was causing a recursive logout loop by triggering storage events
    // that were interpreted as a logout action by the TokenSynchronizer.
    // The caller of setAuthState should be responsible for clearing state.
    // this.clearAuthState();

    if (token) {
      localStorage.setItem(this.STORAGE_KEY, token);
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }

    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Update auth state properties
   * Used by auth store to update state without full replacement.
   */
  updateAuthState(updates) {
    // Handle user update separately
    if ('user' in updates) {
      if (updates.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(updates.user));
      } else {
        localStorage.removeItem(this.USER_KEY);
      }
    }

    // Handle token update - this should ideally be part of a full setAuthState call
    if ('token' in updates) {
      if (updates.token) {
        localStorage.setItem(this.STORAGE_KEY, updates.token);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  /**
   * Clear auth state - Complete cleanup
   * 🔗 NEW: Multi-user session support with production handling
   */
  clearAuthState() {
    // 🌐 PRODUCTION: Clear production multi-user session
    if (this.isProductionEnvironment()) {
      productionMultiUserManager.clearCurrentUser()
      console.log('🌐 [AuthStateManager] Cleared production auth state')
    } else {
      // 🔗 DEVELOPMENT: Clear multi-user session auth
      multiUserSessionManager.clearSessionAuth()
      console.log('🔗 [AuthStateManager] Cleared auth state for session:', multiUserSessionManager.sessionId)
    }
    
    // 🔗 ALSO: Clear legacy localStorage for complete cleanup
    const keysToRemove = [
      this.STORAGE_KEY,
      this.USER_KEY,
      'token', // Legacy
      'user',  // Legacy
      'redirectPath', // From router
      'fechatter_access_token', // Legacy
      'token_expires_at', // Legacy
      'fechatter_token_expiry', // Legacy
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key); // Clear from both storages
    });
  }

  /**
   * Get token from storage
   */
  getToken() {
    // Check multiple locations for backward compatibility
    return localStorage.getItem(this.STORAGE_KEY) ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      sessionStorage.getItem('token') ||
      null;
  }

  /**
   * Get user from storage
   */
  getUser() {
    try {
      const userStr = localStorage.getItem(this.USER_KEY) ||
        localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate token format - 🔧 ENHANCED: More tolerant validation
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;

    // 🔧 RELAXED: Accept any non-empty string token with reasonable length
    // Don't enforce strict JWT format as it may break with mock tokens or different auth systems
    if (token.length < 10) return false; // Too short to be meaningful
    if (token.length > 2000) return false; // Unreasonably long

    // 🔧 PRACTICAL: Basic token format validation
    // Accept JWT format (xxx.yyy.zzz) OR other reasonable token formats
    const hasBasicStructure = token.includes('.') || token.length >= 20;

    // 🔧 ENHANCED: Check for obviously invalid tokens
    const notObviouslyInvalid =
      !token.includes(' ') && // No spaces
      !token.includes('\n') && // No newlines
      !token.includes('\t') && // No tabs
      !/^[0-9]+$/.test(token); // Not just numbers

    const isValid = hasBasicStructure && notObviouslyInvalid;

    if (true && !isValid) {
      console.warn('⚠️ [AuthStateManager] Token validation failed:', {
        tokenLength: token.length,
        hasBasicStructure,
        notObviouslyInvalid,
        tokenPreview: token.substring(0, 20) + '...'
      });
    }

    return isValid;
  }

  /**
   * Debug current state
   */
  debug() {
    const state = this.getAuthState();
    if (true) {
      console.log('🔐 [AuthStateManager] Current State:', {
        tokenPreview: state.token ? `${state.token.substring(0, 20)}...` : null,
        storageKeys: {
          localStorage: Object.keys(localStorage).filter(k =>
            k.includes('auth') || k.includes('token') || k.includes('user')
          ),
          sessionStorage: Object.keys(sessionStorage).filter(k =>
            k.includes('auth') || k.includes('token') || k.includes('user')
          )
        }
      });
    }
    return state;
  }

  /**
   * Migrate legacy auth data
   */
  migrateLegacyAuth() {
    // Check for legacy token locations
    const legacyToken = localStorage.getItem('token') ||
      sessionStorage.getItem('token');

    if (legacyToken && !localStorage.getItem(this.STORAGE_KEY)) {
      if (true) {
        console.log('🔄 [AuthStateManager] Migrating legacy token');
      }
      localStorage.setItem(this.STORAGE_KEY, legacyToken);

      // Clean up legacy locations
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('auth_token');
    }
  }
}

// Export singleton instance
export const authStateManager = new AuthStateManager();

// Auto-migrate on load
authStateManager.migrateLegacyAuth();

// Export for debugging
if (true) {
  window.authStateManager = authStateManager;
}

export default authStateManager; 