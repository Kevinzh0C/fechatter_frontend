/**
 * Application Configuration Management
 * Simplified - Development mode defaults only
 */

// =============================================================================
// Simplified Configuration - Development Defaults Only
// =============================================================================

export const config = {
  // API configuration - simplified to development defaults
  baseURL: '/api',  // Always use Vite proxy for localhost, direct ngrok for remote
  sseURL: '/events',
  fileBaseURL: '/files',
  timeout: 15000,
  maxRetries: 3,
  retryDelay: 1000,

  // Application Configuration
  app: {
    name: 'Fechatter',
    version: '1.0.0',
    description: 'Modern team chat application',
    environment: 'development',  // Always development
  },

  // Development Configuration - always enabled
  dev: {
    debug: true,  // Always debug mode
    enableDevtools: true,
    isDevelopment: true,  // Always development
    isProduction: false,  // Never production
  },

  // Feature Flags - all enabled for development
  features: {
    fileUpload: true,
    voiceMessages: true,
    videoCalls: true,
    notifications: true,
    darkMode: true,
    animations: true,
  },

  // UI Configuration
  ui: {
    defaultTheme: 'light',
    lazyLoading: true,
    imageOptimization: true,
  },

  // Performance Configuration
  performance: {
    cacheDuration: 3600,
  },

  // Security Configuration
  security: {
    enableCSP: true,
    allowedOrigins: ['http://localhost:*', 'http://127.0.0.1:*', 'https://*.vercel.app', 'https://*.trycloudflare.com'],
  },
};

// =============================================================================
// Configuration Utilities
// =============================================================================

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature
 * @returns {boolean} Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return config.features[featureName] || false;
};

/**
 * Get API configuration
 * @returns {object} API configuration object
 */
export const getApiConfig = () => ({ ...config.api });

/**
 * Get app configuration
 * @returns {object} App configuration object
 */
export const getAppConfig = () => ({ ...config.app });

/**
 * Check if running in development mode
 * @returns {boolean} Always true (simplified)
 */
export const isDevelopment = () => true;

/**
 * Check if running in production mode
 * @returns {boolean} Always false (simplified)
 */
export const isProduction = () => false;

/**
 * Check if debug mode is enabled
 * @returns {boolean} Always true (simplified)
 */
export const isDebugEnabled = () => true;

/**
 * Get environment-specific configuration
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
export const getEnvConfig = (key, defaultValue = null) => {
  const keys = key.split('.');
  let current = config;

  for (const k of keys) {
    if (current[k] === undefined) {
      return defaultValue;
    }
    current = current[k];
  }

  return current;
};

/**
 * Validate required environment variables - simplified
 * @returns {object} Always valid (simplified)
 */
export const validateEnvironment = () => {
  return {
    isValid: true,
    missing: [],
    warnings: [],
  };
};

/**
 * Get configuration summary for debugging
 * @returns {object} Configuration summary
 */
export const getConfigSummary = () => {
  return {
    api: {
      baseURL: config.baseURL,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    },
    app: config.app,
    features: config.features,
    environment: config.app.environment,
    validation: validateEnvironment(),
  };
};

/**
 * Initialize configuration and perform validations - simplified
 */
export const initializeConfig = () => {
  console.group('🔧 Fechatter Configuration (Simplified)');
  console.log('Environment: development (always)');
  console.log('API Base URL:', config.baseURL);
  console.log('Features:', config.features);
  console.groupEnd();

  return validateEnvironment();
};

// =============================================================================
// Exports
// =============================================================================

export default config; 