/**
 * Multi-User Session Manager
 * 
 * Enables different browser tabs to use different user identities
 * Uses sessionStorage for tab-specific isolation and localStorage for persistence
 */

class MultiUserSessionManager {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.storagePrefix = 'fechatter_session_'
    this.globalPrefix = 'fechatter_users_'
    
    // Initialize session
    this.initializeSession()
    
    console.log(`🔗 [MultiUserSession] Initialized session: ${this.sessionId}`)
  }

  /**
   * Generate unique session ID for this tab
   */
  generateSessionId() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `session_${timestamp}_${random}`
  }

  /**
   * Initialize session storage for this tab
   */
  initializeSession() {
    // Store session ID in sessionStorage (tab-specific)
    sessionStorage.setItem('fechatter_session_id', this.sessionId)
    
    // 🚨 CRITICAL: Clear any legacy auth state to ensure complete isolation
    this.clearLegacyAuthState()
    
    // Register this session in localStorage (cross-tab tracking)
    this.registerSession()
  }

  /**
   * Clear legacy authentication state for complete session isolation
   */
  clearLegacyAuthState() {
    try {
      const legacyKeys = [
        'auth_token',
        'auth_user', 
        'token',
        'user',
        'fechatter_access_token',
        'token_expires_at',
        'fechatter_token_expiry',
        'redirectPath'
      ]
      
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          console.log(`🧹 [MultiUserSession] Cleared legacy key: ${key}`)
        }
      })
      
      console.log('🚨 [MultiUserSession] Legacy auth state cleared for session isolation')
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to clear legacy auth state:', error)
    }
  }

  /**
   * Register this session in global session tracking
   */
  registerSession() {
    try {
      const activeSessions = this.getActiveSessions()
      activeSessions[this.sessionId] = {
        created: Date.now(),
        lastActivity: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      localStorage.setItem(this.globalPrefix + 'sessions', JSON.stringify(activeSessions))
      
      // Cleanup old sessions (older than 24 hours)
      this.cleanupOldSessions()
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to register session:', error)
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    try {
      const sessions = localStorage.getItem(this.globalPrefix + 'sessions')
      return sessions ? JSON.parse(sessions) : {}
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to get active sessions:', error)
      return {}
    }
  }

  /**
   * Cleanup sessions older than 24 hours
   */
  cleanupOldSessions() {
    try {
      const sessions = this.getActiveSessions()
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      
      let cleaned = false
      Object.keys(sessions).forEach(sessionId => {
        if (sessions[sessionId].created < oneDayAgo) {
          delete sessions[sessionId]
          cleaned = true
          
          // Also cleanup session-specific data
          this.clearSessionData(sessionId)
        }
      })
      
      if (cleaned) {
        localStorage.setItem(this.globalPrefix + 'sessions', JSON.stringify(sessions))
        console.log('🧹 [MultiUserSession] Cleaned up old sessions')
      }
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to cleanup old sessions:', error)
    }
  }

  /**
   * Clear session-specific data
   */
  clearSessionData(sessionId) {
    try {
      // Remove session auth data from localStorage
      const authKey = this.globalPrefix + 'auth_' + sessionId
      localStorage.removeItem(authKey)
      
      console.log(`🧹 [MultiUserSession] Cleared data for session: ${sessionId}`)
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to clear session data:', error)
    }
  }

  /**
   * Set authentication data for current session
   */
  setSessionAuth(token, user) {
    try {
      const authData = {
        token,
        user,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        lastActivity: Date.now()
      }
      
      // Store in sessionStorage for immediate access (tab-specific)
      sessionStorage.setItem(this.storagePrefix + 'auth', JSON.stringify(authData))
      
      // Store in localStorage for persistence (session-specific key)
      const persistentKey = this.globalPrefix + 'auth_' + this.sessionId
      localStorage.setItem(persistentKey, JSON.stringify(authData))
      
      // Update session activity
      this.updateSessionActivity()
      
      console.log(`🔐 [MultiUserSession] Set auth for session ${this.sessionId}:`, {
        userEmail: user?.email,
        tokenLength: token?.length || 0
      })
      
      return true
    } catch (error) {
      console.error('🔗 [MultiUserSession] Failed to set session auth:', error)
      return false
    }
  }

  /**
   * Get authentication data for current session
   */
  getSessionAuth() {
    try {
      // First try sessionStorage (fastest)
      let authData = sessionStorage.getItem(this.storagePrefix + 'auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        this.updateSessionActivity()
        return parsed
      }
      
      // Fallback to localStorage (persistent)
      const persistentKey = this.globalPrefix + 'auth_' + this.sessionId
      authData = localStorage.getItem(persistentKey)
      if (authData) {
        const parsed = JSON.parse(authData)
        
        // Restore to sessionStorage for faster access
        sessionStorage.setItem(this.storagePrefix + 'auth', authData)
        
        this.updateSessionActivity()
        return parsed
      }
      
      return null
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to get session auth:', error)
      return null
    }
  }

  /**
   * Clear authentication data for current session
   */
  clearSessionAuth() {
    try {
      // Clear from sessionStorage
      sessionStorage.removeItem(this.storagePrefix + 'auth')
      
      // Clear from localStorage
      const persistentKey = this.globalPrefix + 'auth_' + this.sessionId
      localStorage.removeItem(persistentKey)
      
      // Update session activity
      this.updateSessionActivity()
      
      console.log(`🧹 [MultiUserSession] Cleared auth for session: ${this.sessionId}`)
      return true
    } catch (error) {
      console.error('🔗 [MultiUserSession] Failed to clear session auth:', error)
      return false
    }
  }

  /**
   * Update last activity timestamp for current session
   */
  updateSessionActivity() {
    try {
      const activeSessions = this.getActiveSessions()
      if (activeSessions[this.sessionId]) {
        activeSessions[this.sessionId].lastActivity = Date.now()
        localStorage.setItem(this.globalPrefix + 'sessions', JSON.stringify(activeSessions))
      }
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to update session activity:', error)
    }
  }

  /**
   * Get list of all logged-in users across sessions
   */
  getLoggedInUsers() {
    try {
      const activeSessions = this.getActiveSessions()
      const users = []
      
      Object.keys(activeSessions).forEach(sessionId => {
        try {
          const authKey = this.globalPrefix + 'auth_' + sessionId
          const authData = localStorage.getItem(authKey)
          if (authData) {
            const parsed = JSON.parse(authData)
            if (parsed.user && parsed.token) {
              users.push({
                sessionId,
                user: parsed.user,
                lastActivity: activeSessions[sessionId].lastActivity,
                isCurrent: sessionId === this.sessionId
              })
            }
          }
        } catch (error) {
          // Skip invalid session data
        }
      })
      
      return users
    } catch (error) {
      console.warn('🔗 [MultiUserSession] Failed to get logged in users:', error)
      return []
    }
  }

  /**
   * Switch to a different user session (for quick user switching)
   */
  switchToUser(targetSessionId) {
    try {
      const targetAuthKey = this.globalPrefix + 'auth_' + targetSessionId
      const targetAuthData = localStorage.getItem(targetAuthKey)
      
      if (!targetAuthData) {
        console.warn('🔗 [MultiUserSession] Target session not found:', targetSessionId)
        return false
      }
      
      const parsed = JSON.parse(targetAuthData)
      
      // Set the target user's auth data to current session
      this.setSessionAuth(parsed.token, parsed.user)
      
      console.log(`🔄 [MultiUserSession] Switched to user:`, {
        from: this.sessionId,
        to: targetSessionId,
        userEmail: parsed.user?.email
      })
      
      return true
    } catch (error) {
      console.error('🔗 [MultiUserSession] Failed to switch user:', error)
      return false
    }
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      activeSessions: Object.keys(this.getActiveSessions()).length,
      loggedInUsers: this.getLoggedInUsers().length,
      currentAuth: !!this.getSessionAuth(),
      currentUser: this.getSessionAuth()?.user?.email || null
    }
  }

  /**
   * Setup cleanup on page unload
   */
  setupCleanup() {
    window.addEventListener('beforeunload', () => {
      // Update last activity before leaving
      this.updateSessionActivity()
    })
  }
}

// Create singleton instance
const multiUserSessionManager = new MultiUserSessionManager()

// Setup cleanup
multiUserSessionManager.setupCleanup()

// Export for use in other modules
export default multiUserSessionManager 