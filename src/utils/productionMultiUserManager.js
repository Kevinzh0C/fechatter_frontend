/**
 * Production Multi-User Manager
 * 
 * Handles true multi-user access in production environment
 * Supports multiple users accessing the same Vercel deployment
 */

class ProductionMultiUserManager {
  constructor() {
    this.currentUser = null
    this.isInitialized = false
    this.userStorageKey = 'fechatter_current_user'
    this.sessionStorageKey = 'fechatter_user_session'
    
    // 🚨 CRITICAL: Clear any legacy auth state for production isolation
    this.clearLegacyAuthState()
    
    console.log('🌐 [ProductionMultiUser] Initializing production multi-user manager')
  }

  /**
   * Clear legacy authentication state for production isolation
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
          console.log(`🧹 [ProductionMultiUser] Cleared legacy key: ${key}`)
        }
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key)
          console.log(`🧹 [ProductionMultiUser] Cleared legacy session key: ${key}`)
        }
      })
      
      console.log('🚨 [ProductionMultiUser] Legacy auth state cleared for production isolation')
    } catch (error) {
      console.warn('🌐 [ProductionMultiUser] Failed to clear legacy auth state:', error)
    }
  }

  /**
   * Initialize the production multi-user system
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // Check for existing user session
      await this.restoreUserSession()
      
      this.isInitialized = true
      console.log('✅ [ProductionMultiUser] Production multi-user system initialized')
      
      return true
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to initialize:', error)
      return false
    }
  }

  /**
   * Set current user for this session
   */
  setCurrentUser(user, token) {
    try {
      const userData = {
        ...user,
        token,
        sessionId: this.generateSessionId(),
        loginTime: Date.now(),
        lastActivity: Date.now()
      }

      // Store in sessionStorage (tab-specific)
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(userData))
      
      // Store in localStorage (persistent, but will be overwritten by other users)
      localStorage.setItem(this.userStorageKey, JSON.stringify(userData))
      
      this.currentUser = userData
      
      console.log('👤 [ProductionMultiUser] Set current user:', {
        email: user.email,
        name: user.name,
        sessionId: userData.sessionId
      })
      
      // Update activity tracker
      this.startActivityTracking()
      
      return true
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to set current user:', error)
      return false
    }
  }

  /**
   * Get current user for this session
   */
  getCurrentUser() {
    try {
      // Priority 1: Check sessionStorage (tab-specific)
      const sessionData = sessionStorage.getItem(this.sessionStorageKey)
      if (sessionData) {
        const userData = JSON.parse(sessionData)
        this.updateLastActivity(userData)
        return userData
      }

      // Priority 2: Check localStorage (may be from another user)
      const localData = localStorage.getItem(this.userStorageKey)
      if (localData) {
        const userData = JSON.parse(localData)
        
        // Verify this session owns this data
        if (this.currentUser && this.currentUser.sessionId === userData.sessionId) {
          this.updateLastActivity(userData)
          return userData
        }
      }

      return null
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to get current user:', error)
      return null
    }
  }

  /**
   * Clear current user session
   */
  clearCurrentUser() {
    try {
      // Clear sessionStorage
      sessionStorage.removeItem(this.sessionStorageKey)
      
      // Only clear localStorage if it belongs to this session
      const localData = localStorage.getItem(this.userStorageKey)
      if (localData) {
        try {
          const userData = JSON.parse(localData)
          if (this.currentUser && userData.sessionId === this.currentUser.sessionId) {
            localStorage.removeItem(this.userStorageKey)
          }
        } catch (parseError) {
          // If parse fails, clear it anyway
          localStorage.removeItem(this.userStorageKey)
        }
      }
      
      this.currentUser = null
      this.stopActivityTracking()
      
      console.log('🧹 [ProductionMultiUser] Cleared current user session')
      return true
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to clear current user:', error)
      return false
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const user = this.getCurrentUser()
    return !!(user && user.token && user.email)
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    const user = this.getCurrentUser()
    return user ? user.token : null
  }

  /**
   * Get user information
   */
  getUserInfo() {
    const user = this.getCurrentUser()
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      sessionId: user.sessionId,
      loginTime: user.loginTime,
      lastActivity: user.lastActivity
    }
  }

  /**
   * Restore user session from storage
   */
  async restoreUserSession() {
    try {
      const user = this.getCurrentUser()
      if (user) {
        this.currentUser = user
        this.startActivityTracking()
        
        console.log('🔄 [ProductionMultiUser] Restored user session:', {
          email: user.email,
          sessionId: user.sessionId
        })
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to restore session:', error)
      return false
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const userAgent = navigator.userAgent.substr(0, 20).replace(/[^a-zA-Z0-9]/g, '')
    return `prod_${timestamp}_${random}_${userAgent}`
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(userData = null) {
    try {
      const user = userData || this.currentUser
      if (!user) return

      user.lastActivity = Date.now()

      // Update in sessionStorage
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(user))
      
      // Update in localStorage if it belongs to this session
      const localData = localStorage.getItem(this.userStorageKey)
      if (localData) {
        try {
          const localUser = JSON.parse(localData)
          if (localUser.sessionId === user.sessionId) {
            localStorage.setItem(this.userStorageKey, JSON.stringify(user))
          }
        } catch (parseError) {
          // Ignore parse errors
        }
      }

      this.currentUser = user
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to update activity:', error)
    }
  }

  /**
   * Start activity tracking
   */
  startActivityTracking() {
    this.stopActivityTracking() // Clear any existing tracker

    // Update activity every 30 seconds
    this.activityInterval = setInterval(() => {
      this.updateLastActivity()
    }, 30000)

    // Track user interactions
    this.setupActivityListeners()
  }

  /**
   * Stop activity tracking
   */
  stopActivityTracking() {
    if (this.activityInterval) {
      clearInterval(this.activityInterval)
      this.activityInterval = null
    }

    this.removeActivityListeners()
  }

  /**
   * Setup activity listeners
   */
  setupActivityListeners() {
    this.removeActivityListeners() // Remove existing listeners

    this.activityHandler = () => {
      this.updateLastActivity()
    }

    // Listen for user interactions
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, this.activityHandler, { passive: true })
    })

    // Listen for page visibility changes
    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.updateLastActivity()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)

    // Update activity before page unload
    this.beforeUnloadHandler = () => {
      this.updateLastActivity()
    }
    window.addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  /**
   * Remove activity listeners
   */
  removeActivityListeners() {
    if (this.activityHandler) {
      const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']
      events.forEach(event => {
        document.removeEventListener(event, this.activityHandler)
      })
      this.activityHandler = null
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = null
    }
  }

  /**
   * Get session information for debugging
   */
  getSessionInfo() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.getUserInfo(),
      sessionStorage: !!sessionStorage.getItem(this.sessionStorageKey),
      localStorage: !!localStorage.getItem(this.userStorageKey),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    }
  }

  /**
   * Force refresh user data from storage
   */
  refresh() {
    try {
      const user = this.getCurrentUser()
      if (user) {
        this.currentUser = user
        console.log('🔄 [ProductionMultiUser] Refreshed user data')
        return true
      }
      return false
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Failed to refresh:', error)
      return false
    }
  }

  /**
   * Check session validity
   */
  isSessionValid() {
    const user = this.getCurrentUser()
    if (!user) return false

    // Check if session is too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const sessionAge = Date.now() - user.loginTime
    
    if (sessionAge > maxAge) {
      console.warn('⚠️ [ProductionMultiUser] Session expired, clearing')
      this.clearCurrentUser()
      return false
    }

    return true
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    try {
      if (!this.isSessionValid()) {
        this.clearCurrentUser()
      }
      this.stopActivityTracking()
      console.log('🧹 [ProductionMultiUser] Cleanup completed')
    } catch (error) {
      console.error('❌ [ProductionMultiUser] Cleanup failed:', error)
    }
  }
}

// Create singleton instance
const productionMultiUserManager = new ProductionMultiUserManager()

// Auto-initialize
productionMultiUserManager.initialize()

// Export for use in other modules
export default productionMultiUserManager 