/**
 * Complete Error Suppressor - Production-grade solution for E009
 * Completely suppresses extension errors while preserving transparency
 */

class CompleteErrorSuppressor {
  constructor() {
    this.originalConsoleError = console.error;
    this.suppressedErrors = [];
    this.stats = {
      total: 0,
      suppressed: 0,
      passed: 0
    };
    this.enabled = true;
    this.patterns = [
      // Chrome extension patterns
      /chrome-extension:\/\//i,
      /moz-extension:\/\//i,
      /extension:\/\//i,

      // Content script patterns
      /content[\s-]?script/i,
      /content\.js/i,

      // Extension error messages
      /extension context invalidated/i,
      /listener indicated an asynchronous response/i,
      /Unchecked runtime\.lastError/i,
      /Cannot access contents of url/i,
      /Extension manifest must request permission/i,

      // Specific extension errors
      /fetchError.*Failed to fetch/i,
      /ERR_BLOCKED_BY_CLIENT/i,
      /ERR_BLOCKED_BY_RESPONSE/i,

      // Network errors from extensions
      /net::ERR_FAILED.*extension/i,
      /Failed to load resource.*extension/i
    ];
  }

  /**
   * Initialize the suppressor
   */
  initialize() {
    if (true) {
      console.log('🛡️ [CompleteErrorSuppressor] Initializing...');
    }

    // Override console.error
    this.overrideConsoleError();

    // Add global error handler
    this.addGlobalErrorHandler();

    // Add unhandled rejection handler
    this.addUnhandledRejectionHandler();

    if (true) {
      console.log('✅ [CompleteErrorSuppressor] Initialized successfully');
    }

  /**
   * Override console.error with intelligent filtering
   */
  overrideConsoleError() {
    const self = this;

    console.error = function (...args) {
      self.stats.total++;

      // Check if should suppress
      if (self.enabled && self.shouldSuppress(args)) {
        self.stats.suppressed++;
        self.suppressedErrors.push({
          timestamp: new Date(),
          args: args,
          stack: new Error().stack
        });

        // Silently suppress - no output at all
        return;
      }

      self.stats.passed++;

      // Call original console.error
      self.originalConsoleError.apply(console, args);
    };
  }

  /**
   * Add global error handler
   */
  addGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      if (this.enabled && this.shouldSuppressError(event.error || event)) {
        event.preventDefault();
        event.stopPropagation();

        this.stats.suppressed++;
        this.suppressedErrors.push({
          timestamp: new Date(),
          type: 'global',
          error: event.error,
          message: event.message,
          filename: event.filename
        });

        return false;
      }
    }, true);
  }

  /**
   * Add unhandled rejection handler
   */
  addUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      if (this.enabled && this.shouldSuppressError(event.reason)) {
        event.preventDefault();

        this.stats.suppressed++;
        this.suppressedErrors.push({
          timestamp: new Date(),
          type: 'unhandledRejection',
          reason: event.reason,
          promise: event.promise
        });
    });

  /**
   * Check if arguments should be suppressed
   */
  shouldSuppress(args) {
    // Convert all arguments to string
    const errorString = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      if (arg && typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
      return String(arg);
    }).join(' ');

    // Check against patterns
    return this.patterns.some(pattern => pattern.test(errorString));
  }

  /**
   * Check if error object should be suppressed
   */
  shouldSuppressError(error) {
    if (!error) return false;

    // Check error message
    if (error.message && this.patterns.some(p => p.test(error.message))) {
      return true;
    }

    // Check error stack
    if (error.stack && this.patterns.some(p => p.test(error.stack))) {
      return true;
    }

    // Check error filename (for global errors)
    if (error.filename && this.patterns.some(p => p.test(error.filename))) {
      return true;
    }

    return false;
  }

  /**
   * Enable suppression
   */
  enable() {
    this.enabled = true;
    if (true) {
      console.log('✅ [CompleteErrorSuppressor] Suppression enabled');
    }

  /**
   * Disable suppression
   */
  disable() {
    this.enabled = false;
    if (true) {
      console.log('❌ [CompleteErrorSuppressor] Suppression disabled');
    }

  /**
   * Restore original console.error
   */
  restore() {
    console.error = this.originalConsoleError;
    if (true) {
      console.log('🔄 [CompleteErrorSuppressor] Original console.error restored');
    }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      suppressionRate: this.stats.total > 0
        ? ((this.stats.suppressed / this.stats.total) * 100).toFixed(2) + '%'
        : '0%',
      enabled: this.enabled
    };
  }

  /**
   * Show suppressed errors
   */
  showSuppressed() {
    if (true) {
      console.log('🔇 [CompleteErrorSuppressor] Suppressed Errors:');
    if (true) {
      console.log(`Total suppressed: ${this.suppressedErrors.length}`);
    }

    this.suppressedErrors.slice(-10).forEach((entry, index) => {
      if (true) {
        console.log(`\n--- Suppressed Error ${index + 1} ---`);
      if (true) {
        console.log('Time:', entry.timestamp.toLocaleTimeString());
      if (true) {
        console.log('Type:', entry.type || 'console.error');
      }

      if (entry.args) {
        if (true) {
          console.log('Args:', entry.args);
      if (entry.error) {
        if (true) {
          console.log('Error:', entry.error);
      if (entry.message) {
        if (true) {
          console.log('Message:', entry.message);
        }
    });

  /**
   * Clear suppressed errors
   */
  clearSuppressed() {
    this.suppressedErrors = [];
    if (true) {
      console.log('🧹 [CompleteErrorSuppressor] Suppressed errors cleared');
    }

  /**
   * Add custom pattern
   */
  addPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.patterns.push(pattern);
      if (true) {
        console.log('➕ [CompleteErrorSuppressor] Added pattern:', pattern);
      }
    } else if (typeof pattern === 'string') {
      this.patterns.push(new RegExp(pattern, 'i'));
      if (true) {
        console.log('➕ [CompleteErrorSuppressor] Added pattern:', pattern);
      }

  /**
   * Test suppression
   */
  test() {
    if (true) {
      console.log('🧪 [CompleteErrorSuppressor] Running suppression test...');
    }

    // Test 1: Extension error
    if (true) {
      console.error('Error: fetchError: Failed to fetch at chrome-extension://abc/content.js:123');
    }

    // Test 2: Normal error (should pass)
    if (true) {
      console.error('Normal application error');
    }

    // Test 3: Unhandled rejection
    Promise.reject(new Error('Extension context invalidated'));

    if (true) {
      console.log('Test complete. Stats:', this.getStats());
    }

// Create and initialize global instance
const completeErrorSuppressor = new CompleteErrorSuppressor();
completeErrorSuppressor.initialize();

// Expose to window
window.completeErrorSuppressor = completeErrorSuppressor;
window.suppressExtensionErrors = () => completeErrorSuppressor.enable();
window.showSuppressedErrors = () => completeErrorSuppressor.showSuppressed();
window.errorSuppressionStats = () => completeErrorSuppressor.getStats();

export default completeErrorSuppressor; 