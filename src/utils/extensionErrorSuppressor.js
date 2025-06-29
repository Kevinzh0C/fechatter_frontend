/**
 * Environment-Aware Extension Error Suppressor
 * Suppresses browser extension errors only in production to prevent console noise
 * Preserves security-related errors for development debugging
 */

class ExtensionErrorSuppressor {
  constructor() {
    this.environment = 'development' || 'development';
    this.isProduction = this.environment === 'production';
    this.isDevelopment = this.environment === 'development';

    // Only suppress in production
    this.suppressionEnabled = this.isProduction;

    this.suppressedPatterns = [
      // Chrome extension communication errors - Enhanced patterns
      /A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received/,
      /Extension context invalidated/,
      /Cannot access contents of url/,
      /message channel closed before a response/,
      /The message port closed before a response was received/,
      /Could not establish connection\. Receiving end does not exist/,
      /Attempting to use a disconnected port object/,
      /Invocation of form runtime\.connect\(\w+\) doesn't match definition/,

      // Auth-related extension errors
      /chrome-extension:.*auth/i,
      /password.*manager.*extension/i,
      /credential.*manager.*error/i,

      // QuillBot extension specific errors
      /quillbot-content\.js/,
      /quillbot.*undefined/,

      // Other common extension errors
      /content.*script.*error/i,
      /chrome-extension:/,
      /moz-extension:/,
      /safari-extension:/,
      /extension.*invalidated/i,
      /background.*script.*error/i,
      /web-accessible.*resources/i,
    ];

    // Security-related patterns that should NEVER be suppressed
    this.securityPatterns = [
      /CORS/i,
      /Content Security Policy/i,
      /CSP/i,
      /Refused to execute/i,
      /Refused to load/i,
      /Mixed Content/i,
      /certificate/i,
      /authentication/i,
      /authorization/i,
      /XSS/i,
      /injection/i,
      /malicious/i
    ];

    // 🔧 CRITICAL FIX: Add patterns for file download errors that should never be suppressed
    this.fileDownloadPatterns = [
      /\[downloadFile\]/i,
      /download.*failed/i,
      /file.*download/i,
      /blob.*error/i,
      /FileService/i,
      /ImageCacheService/i,
      /getFileUrl/i,
      /buildStaticFileUrl/i,
      /getRobustFileUrls/i
    ];

    // Initialize counters
    this.suppressedCount = 0;
    this.passedCount = 0;
    this.securityCount = 0;
    this.fileDownloadCount = 0;
    this.suppressedErrors = [];
    this.securityErrors = [];
    this.fileDownloadErrors = [];
    this.maxStoredErrors = 50;

    this.initialize();
  }

  initialize() {
    if (this.suppressionEnabled) {
      // Intercept global errors with highest priority
      window.addEventListener('error', this.handleError.bind(this), true);
      window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this), true);

      // Intercept console errors
      this.interceptConsoleError();

      if (true) {
        console.log('🛡️ Extension Error Suppressor initialized (Production Mode)');
      }
    } else {
      if (true) {
        console.log('🔧 Extension Error Suppressor disabled (Development Mode)');
      }

      // In development, just log extension errors but don't suppress them
      this.setupDevelopmentLogging();
    }

    // Periodic cleanup of old error history
    setInterval(() => {
      const cutoff = Date.now() - (5 * 60 * 1000); // Keep 5 minutes
      this.suppressedErrors = this.suppressedErrors.filter(
        error => error.timestamp > cutoff
      );
      this.securityErrors = this.securityErrors.filter(
        error => error.timestamp > cutoff
      );
      this.fileDownloadErrors = this.fileDownloadErrors.filter(
        error => error.timestamp > cutoff
      );
    }, 60000); // Clean up every minute
  }

  /**
   * Setup development logging to identify extension vs security errors
   */
  setupDevelopmentLogging() {
    const originalConsoleError = console.error;
    const self = this;

    console.error = function (...args) {
      const errorMessage = args.join(' ');

      if (self.isExtensionError({ message: errorMessage })) {
        console.debug('🔌 [EXT] Extension Error (Dev Mode):', errorMessage.substring(0, 100));
      } else if (self.isSecurityError(errorMessage)) {
        if (true) {
          console.warn('🚨 [SECURITY] Security-related error detected:', errorMessage);
        }
        self.recordSecurityError(errorMessage);
      }

      // Always call original in development
      originalConsoleError.apply(console, args);
    };
  }

  interceptConsoleError() {
    if (!this.suppressionEnabled) return;

    const originalConsoleError = console.error;
    const self = this;

    console.error = function (...args) {
      const errorMessage = args.join(' ');

      // Never suppress security-related errors
      if (self.isSecurityError(errorMessage)) {
        if (true) {
          console.warn('🚨 [SECURITY] Security error preserved:', errorMessage);
        }
        self.recordSecurityError(errorMessage);
        originalConsoleError.apply(console, args);
        return;
      }

      // 🔧 CRITICAL FIX: Never suppress file download errors
      if (self.isFileDownloadError(errorMessage)) {
        if (true) {
          console.warn('📁 [FILE] File download error preserved:', errorMessage);
        }
        self.recordFileDownloadError(errorMessage);
        originalConsoleError.apply(console, args);
        return;
      }

      // Check if arguments contain suppressible extension errors
      if (self.shouldSuppress({ message: errorMessage })) {
        self.recordSuppression(errorMessage, 'console');

        // Show periodic summary instead of individual errors
        if (self.suppressedCount === 1 || self.suppressedCount % 10 === 0) {
          console.debug(`🛡️ [ExtSuppressor] Suppressed ${self.suppressedCount} extension errors`);
        }
        return;
      }

      // Normal console.error for non-extension errors
      originalConsoleError.apply(console, args);
    };
  }

  handleError(event) {
    const error = event.error || { message: event.message, filename: event.filename };
    const errorMessage = error.message || event.message || '';

    // Never suppress security errors
    if (this.isSecurityError(errorMessage)) {
      if (true) {
        console.warn('🚨 [SECURITY] Security error preserved in global handler:', errorMessage);
      }
      this.recordSecurityError(errorMessage);
      return; // Let the error propagate
    }

    // 🔧 CRITICAL FIX: Never suppress file download errors
    if (this.isFileDownloadError(errorMessage)) {
      if (true) {
        console.warn('📁 [FILE] File download error preserved in global handler:', errorMessage);
      }
      this.recordFileDownloadError(errorMessage);
      return; // Let the error propagate
    }

    if (this.suppressionEnabled && this.shouldSuppress(error)) {
      this.recordSuppression(errorMessage, 'global');
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }

  handlePromiseRejection(event) {
    const errorMessage = event.reason?.message || String(event.reason) || '';

    // Never suppress security errors
    if (this.isSecurityError(errorMessage)) {
      if (true) {
        console.warn('🚨 [SECURITY] Security error preserved in promise rejection:', errorMessage);
      }
      this.recordSecurityError(errorMessage);
      return; // Let the error propagate
    }

    // 🔧 CRITICAL FIX: Never suppress file download errors
    if (this.isFileDownloadError(errorMessage)) {
      if (true) {
        console.warn('📁 [FILE] File download error preserved in promise rejection:', errorMessage);
      }
      this.recordFileDownloadError(errorMessage);
      return; // Let the error propagate
    }

    if (this.suppressionEnabled && this.shouldSuppress(event.reason)) {
      this.recordSuppression(errorMessage, 'promise');
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }

  /**
   * Check if error is security-related (never suppress these)
   */
  isSecurityError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') return false;

    return this.securityPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 🔧 CRITICAL FIX: Check if error is file download related (never suppress these)
   */
  isFileDownloadError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') return false;

    return this.fileDownloadPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Check if error is from extension (safe to suppress in production)
   */
  isExtensionError(error) {
    if (!error) return false;

    const message = error.message || error.toString() || '';
    const stack = error.stack || '';
    const filename = error.filename || '';

    // Check error message patterns
    const messageMatch = this.suppressedPatterns.some(pattern => pattern.test(message));

    // Check stack trace patterns
    const stackMatch = this.suppressedPatterns.some(pattern => pattern.test(stack));

    // Check if error originates from extension files
    const isExtensionFile = this.isFromExtension(stack) ||
      this.isFromExtension(filename) ||
      this.isFromExtension(message);

    return messageMatch || stackMatch || isExtensionFile;
  }

  shouldSuppress(error) {
    if (!this.suppressionEnabled) return false;

    const errorMessage = error?.message || error?.toString() || '';

    // Never suppress security errors
    if (this.isSecurityError(errorMessage)) return false;

    // 🔧 CRITICAL FIX: Never suppress file download errors
    if (this.isFileDownloadError(errorMessage)) return false;

    // Only suppress extension errors
    return this.isExtensionError(error);
  }

  isFromExtension(text) {
    if (!text) return false;

    return text.includes('chrome-extension://') ||
      text.includes('moz-extension://') ||
      text.includes('safari-extension://') ||
      text.includes('edge-extension://');
  }

  recordSuppression(message, source) {
    if (!this.suppressionEnabled) return;

    this.suppressedCount++;
    
    if (this.suppressedErrors.length >= this.maxStoredErrors) {
      this.suppressedErrors.shift(); // Remove oldest
    }
    
    this.suppressedErrors.push({
      message: message.substring(0, 200), // Truncate long messages
      source,
      timestamp: new Date().toISOString()
    });
  }

  recordSecurityError(message) {
    this.securityCount++;
    
    if (this.securityErrors.length >= this.maxStoredErrors) {
      this.securityErrors.shift(); // Remove oldest
    }
    
    this.securityErrors.push({
      message: message.substring(0, 200), // Truncate long messages
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🔧 CRITICAL FIX: Record a file download error that was not suppressed
   */
  recordFileDownloadError(message) {
    this.fileDownloadCount++;
    
    if (this.fileDownloadErrors.length >= this.maxStoredErrors) {
      this.fileDownloadErrors.shift(); // Remove oldest
    }
    
    this.fileDownloadErrors.push({
      message: message.substring(0, 200), // Truncate long messages
      timestamp: new Date().toISOString()
    });
  }

  // Get comprehensive statistics
  getStats() {
    const sessionDuration = Date.now() - this.sessionStats.startTime;

    return {
      environment: this.environment,
      suppressionEnabled: this.suppressionEnabled,
      suppressedCount: this.suppressedCount,
      totalSuppressed: this.sessionStats.totalSuppressed,
      securityErrorsPreserved: this.sessionStats.securityErrorsPreserved,
      sessionDurationMs: sessionDuration,
      suppressionRate: this.sessionStats.totalSuppressed / (sessionDuration / 1000 / 60), // per minute
      patternCount: this.suppressedPatterns.length,
      byPattern: Object.fromEntries(this.sessionStats.byPattern),
      recentErrorCount: this.suppressedErrors.length,
      securityErrorCount: this.securityErrors.length,
      fileDownloadCount: this.fileDownloadCount,
    };
  }

  // Debug method to show recent errors
  showRecentErrors(limit = 10) {
    const recent = this.suppressedErrors.slice(-limit);
    console.group('🛡️ Recent Suppressed Extension Errors');
    recent.forEach((error, index) => {
      if (true) {
        console.log(`${index + 1}. [${error.source}] ${error.message}`);
      }
    });
    console.groupEnd();
    return recent;
  }

  // Show security errors that were preserved
  showSecurityErrors() {
    console.group('🚨 Security Errors (Preserved)');
    this.securityErrors.forEach((error, index) => {
      if (true) {
        console.warn(`${index + 1}. ${error.message}`);
      }
    });
    console.groupEnd();
    return this.securityErrors;
  }

  // Show file download errors that were preserved
  showFileDownloadErrors() {
    console.group('📁 File Download Errors (Preserved)');
    this.fileDownloadErrors.forEach((error, index) => {
      if (true) {
        console.warn(`${index + 1}. ${error.message}`);
      }
    });
    console.groupEnd();
    return this.fileDownloadErrors;
  }
}

// Initialize immediately if in browser environment
if (typeof window !== 'undefined') {
  const suppressor = new ExtensionErrorSuppressor();
  window.extensionErrorSuppressor = suppressor;

  // Add global debug methods for development
  if (suppressor.isDevelopment) {
    window.debugExtensionErrors = () => suppressor.showRecentErrors();
    window.debugSecurityErrors = () => suppressor.showSecurityErrors();
    window.debugFileDownloadErrors = () => suppressor.showFileDownloadErrors();
    window.extensionErrorStats = () => suppressor.getStats();
  }
}

export default ExtensionErrorSuppressor; 