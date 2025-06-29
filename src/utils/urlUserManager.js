/**
 * URL User Manager
 * 
 * Supports direct user login via URL parameters
 * Examples:
 * - https://app.vercel.app/?user=admin
 * - https://app.vercel.app/?user=user1
 * - https://app.vercel.app/?user=demo
 */

class UrlUserManager {
  constructor() {
    this.predefinedUsers = {
      'admin': {
        id: 1,
        email: 'admin@fechatter.com',
        name: 'Administrator',
        avatar: null,
        role: 'admin',
        password: 'admin123'
      },
      'user1': {
        id: 2,
        email: 'user1@fechatter.com', 
        name: 'User One',
        avatar: null,
        role: 'user',
        password: 'user123'
      },
      'user2': {
        id: 3,
        email: 'user2@fechatter.com',
        name: 'User Two', 
        avatar: null,
        role: 'user',
        password: 'user123'
      },
      'demo': {
        id: 4,
        email: 'demo@fechatter.com',
        name: 'Demo User',
        avatar: null,
        role: 'user',
        password: 'demo123'
      },
      'test': {
        id: 5,
        email: 'super@test.com',
        name: 'Test User',
        avatar: null,
        role: 'user', 
        password: 'password'
      }
    }
    
    console.log('🔗 [UrlUserManager] Initialized with predefined users:', Object.keys(this.predefinedUsers))
  }

  /**
   * Get user from URL parameter
   */
  getUserFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const userParam = urlParams.get('user')
      
      if (userParam && this.predefinedUsers[userParam]) {
        const user = this.predefinedUsers[userParam]
        console.log('🔗 [UrlUserManager] Found user from URL:', {
          param: userParam,
          email: user.email,
          name: user.name
        })
        return { userKey: userParam, ...user }
      }
      
      return null
    } catch (error) {
      console.error('❌ [UrlUserManager] Failed to get user from URL:', error)
      return null
    }
  }

  /**
   * Auto-login user from URL
   */
  async autoLoginFromUrl() {
    const urlUser = this.getUserFromUrl()
    if (!urlUser) return null

    try {
      // Import auth store dynamically to avoid circular dependency
      const { useAuthStore } = await import('@/stores/auth.js')
      const authStore = useAuthStore()

      console.log('🔗 [UrlUserManager] Attempting auto-login for:', urlUser.email)

      // Attempt login with predefined credentials
      const loginResult = await authStore.login(urlUser.email, urlUser.password)
      
      if (loginResult.success) {
        console.log('✅ [UrlUserManager] Auto-login successful:', urlUser.email)
        
        // Clean URL parameter after successful login
        this.cleanUrlParameter()
        
        return {
          success: true,
          user: loginResult.user,
          message: `Auto-logged in as ${urlUser.name}`
        }
      } else {
        console.warn('⚠️ [UrlUserManager] Auto-login failed:', loginResult.message)
        return {
          success: false,
          message: `Auto-login failed: ${loginResult.message}`
        }
      }
    } catch (error) {
      console.error('❌ [UrlUserManager] Auto-login error:', error)
      return {
        success: false,
        message: `Auto-login error: ${error.message}`
      }
    }
  }

  /**
   * Clean URL parameter after login
   */
  cleanUrlParameter() {
    try {
      const url = new URL(window.location)
      url.searchParams.delete('user')
      
      // Update URL without page reload
      window.history.replaceState({}, '', url.toString())
      
      console.log('🧹 [UrlUserManager] Cleaned URL parameter')
    } catch (error) {
      console.warn('⚠️ [UrlUserManager] Failed to clean URL parameter:', error)
    }
  }

  /**
   * Generate login URLs for all predefined users
   */
  generateLoginUrls() {
    const baseUrl = window.location.origin + window.location.pathname
    const urls = {}
    
    Object.keys(this.predefinedUsers).forEach(userKey => {
      const user = this.predefinedUsers[userKey]
      urls[userKey] = {
        url: `${baseUrl}?user=${userKey}`,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
    
    return urls
  }

  /**
   * Get available users for UI display
   */
  getAvailableUsers() {
    return Object.entries(this.predefinedUsers).map(([key, user]) => ({
      key,
      ...user
    }))
  }

  /**
   * Check if current URL has user parameter
   */
  hasUserParameter() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.has('user')
  }

  /**
   * Get current user parameter value
   */
  getCurrentUserParameter() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('user')
  }
}

// Create singleton instance
const urlUserManager = new UrlUserManager()

// Export for use in other modules
export default urlUserManager 