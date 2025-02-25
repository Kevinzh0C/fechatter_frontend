/**
 * Vercel Environment Detector
 * Ensures Vercel deployment preserves all local development features
 */

export class VercelEnvironmentDetector {
  constructor() {
    this.isVercel = this.detectVercelEnvironment();
    this.hostname = window.location.hostname;
    this.forceDevelopmentMode = true; // Force development mode
    
    if (this.isVercel) {
      console.log('🌐 [Vercel] Detected Vercel deployment environment');
      this.setupVercelEnvironment();
    }
  }

  detectVercelEnvironment() {
    return (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com') ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV !== undefined
    );
  }

  setupVercelEnvironment() {
    // Force set development environment variables
    window.VERCEL_ENV = 'development';
    window.NODE_ENV = 'development';
    
    // Enable all debugging features
    window.ENABLE_DEBUG = true;
    window.ENABLE_TEST_ACCOUNTS = true;
    window.ENABLE_DEV_TOOLS = true;
    
    // Set console styles
    console.log('%c🎯 Vercel development mode enabled', 'color: #00ff00; font-weight: bold;');
    console.log('%c📱 Test account functionality enabled', 'color: #00ff00; font-weight: bold;');
    console.log('%c🔧 Debug tools enabled', 'color: #00ff00; font-weight: bold;');
    
    // Simulate local development environment
    this.simulateLocalEnvironment();
  }

  simulateLocalEnvironment() {
    // Create a safe way to override import.meta.env without read-only issues
    try {
      // Set global development flags without modifying read-only properties
      window.__FECHATTER_DEV__ = true;
      window.__VERCEL_DEPLOYMENT__ = true;
      window.__IMPORT_META_ENV_DEV__ = true;
      window.__IMPORT_META_ENV_MODE__ = 'development';
      window.__IMPORT_META_ENV_PROD__ = false;
      
      // Override console to provide development-like experience
      if (typeof console !== 'undefined') {
        const originalLog = console.log;
        console.log = function(...args) {
          originalLog.apply(console, args);
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not fully simulate local environment:', error.message);
    }
  }

  getConfigFileName() {
    return this.isVercel ? 'vercel.yml' : 'development.yml';
  }

  shouldEnableTestAccounts() {
    return true; // Always enable test accounts on Vercel
  }

  shouldEnableDebugTools() {
    return true; // Always enable debug tools on Vercel
  }

  getEnvironmentInfo() {
    return {
      isVercel: this.isVercel,
      hostname: this.hostname,
      configFile: this.getConfigFileName(),
      testAccountsEnabled: this.shouldEnableTestAccounts(),
      debugToolsEnabled: this.shouldEnableDebugTools(),
      forceDevelopmentMode: this.forceDevelopmentMode
    };
  }
}

// Immediately initialize environment detector
export const vercelEnvDetector = new VercelEnvironmentDetector();

// Make globally available
window.vercelEnvDetector = vercelEnvDetector;

// Export environment info for other modules to use
export const VERCEL_ENV_INFO = vercelEnvDetector.getEnvironmentInfo();

export default vercelEnvDetector; 