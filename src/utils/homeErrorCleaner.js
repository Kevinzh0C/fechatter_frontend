/**
 * 🔧 HOME ERROR CLEANER
 * Specialized utility for cleaning persistent errors on the home page
 */

class HomeErrorCleaner {
  constructor() {
    this.cleanupAttempts = 0;
    this.maxCleanupAttempts = 5;
    this.init();
  }

  init() {
    // Start immediate cleanup
    this.cleanTimeoutErrors();
    
    // Setup periodic cleanup
    this.setupPeriodicCleanup();
    
    // Setup cleanup on navigation
    this.setupNavigationCleanup();
    
    console.log('🧹 [HomeErrorCleaner] Initialized');
  }

  cleanTimeoutErrors() {
    this.cleanupAttempts++;
    console.log(`🧹 [HomeErrorCleaner] Starting cleanup attempt ${this.cleanupAttempts}`);

    let cleaned = false;

    // 1. Remove error monitor toasts
    const errorToasts = document.querySelectorAll('#error-monitor-toast');
    errorToasts.forEach(toast => {
      if (toast.textContent?.includes('Operation timeout')) {
        toast.remove();
        cleaned = true;
        console.log('🧹 [HomeErrorCleaner] Removed timeout error toast');
      }
    });

    // 2. Remove any error elements containing timeout messages
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.textContent?.includes('Unhandled Promise Rejection: Error: Operation timeout') ||
          el.textContent?.includes('Operation timeout')) {
        // Check if this is a user content element or error display
        if (el.classList.contains('error') || 
            el.classList.contains('toast') ||
            el.classList.contains('notification') ||
            el.id?.includes('error') ||
            el.id?.includes('toast')) {
          el.remove();
          cleaned = true;
          console.log('🧹 [HomeErrorCleaner] Removed timeout error element:', el.tagName, el.className);
        }
      }
    });

    // 3. Clear notification system if available
    if (window.clearNotifications) {
      try {
        window.clearNotifications();
        cleaned = true;
        console.log('🧹 [HomeErrorCleaner] Cleared notification system');
      } catch (error) {
        console.warn('⚠️ [HomeErrorCleaner] Failed to clear notifications:', error);
      }
    }

    // 4. Use timeout fix cleanup if available
    if (window.timeoutFix && window.timeoutFix.clearTimeoutErrors) {
      try {
        window.timeoutFix.clearTimeoutErrors();
        cleaned = true;
        console.log('🧹 [HomeErrorCleaner] Used timeout fix cleanup');
      } catch (error) {
        console.warn('⚠️ [HomeErrorCleaner] Failed to use timeout fix cleanup:', error);
      }
    }

    // 5. Force clear any remaining timeout-related DOM elements
    const timeoutSelectors = [
      '[data-error*="timeout"]',
      '[class*="timeout"]',
      '.error-toast',
      '.error-notification',
      '.toast-container .error',
      '.notification-container .error'
    ];

    timeoutSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.textContent?.includes('timeout')) {
            el.remove();
            cleaned = true;
            console.log('🧹 [HomeErrorCleaner] Force removed element:', selector);
          }
        });
      } catch (error) {
        console.warn(`⚠️ [HomeErrorCleaner] Error with selector ${selector}:`, error);
      }
    });

    if (cleaned) {
      console.log('✅ [HomeErrorCleaner] Successfully cleaned timeout errors');
    } else {
      console.log('ℹ️ [HomeErrorCleaner] No timeout errors found to clean');
    }

    return cleaned;
  }

  setupPeriodicCleanup() {
    // Clean every 10 seconds
    this.periodicInterval = setInterval(() => {
      this.cleanTimeoutErrors();
    }, 10000);

    // Clean on page focus
    window.addEventListener('focus', () => {
      this.cleanTimeoutErrors();
    });

    // Clean on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          this.cleanTimeoutErrors();
        }, 1000);
      }
    });
  }

  setupNavigationCleanup() {
    // Clean on route changes if Vue Router is available
    if (window.router) {
      try {
        window.router.afterEach(() => {
          setTimeout(() => {
            this.cleanTimeoutErrors();
          }, 500);
        });
        console.log('🔗 [HomeErrorCleaner] Setup router cleanup');
      } catch (error) {
        console.warn('⚠️ [HomeErrorCleaner] Failed to setup router cleanup:', error);
      }
    }

    // Clean on hash changes
    window.addEventListener('hashchange', () => {
      setTimeout(() => {
        this.cleanTimeoutErrors();
      }, 500);
    });
  }

  forceCleanup() {
    console.log('🧹 [HomeErrorCleaner] Force cleanup requested');
    
    // Clear intervals to prevent conflicts
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }

    // Run cleanup multiple times with delays
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.cleanTimeoutErrors();
      }, i * 1000);
    }

    // Restart periodic cleanup
    setTimeout(() => {
      this.setupPeriodicCleanup();
    }, 5000);

    return true;
  }

  destroy() {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }
    console.log('🧹 [HomeErrorCleaner] Destroyed');
  }
}

// Auto-initialize and expose globally
const homeErrorCleaner = new HomeErrorCleaner();
window.homeErrorCleaner = homeErrorCleaner;
window.clearHomeErrors = () => homeErrorCleaner.forceCleanup();

console.log('🧹 Home Error Cleaner loaded - use window.clearHomeErrors() to force cleanup');

export default homeErrorCleaner;