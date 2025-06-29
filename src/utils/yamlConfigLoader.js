/**
 * Simplified YAML Config Loader
 * Always loads development configuration - no environment detection
 */

import { parseSimpleYAML } from './simpleYAMLParser.js'

// Single config cache
let configCache = null
let configPromise = null

/**
 * Load YAML configuration - always development
 */
async function loadYAMLConfig() {
  if (configCache) {
    console.log('🔍 [yamlConfigLoader] Returning cached config')
    return configCache
  }

  if (configPromise) {
    console.log('🔍 [yamlConfigLoader] Config loading in progress, waiting...')
    return configPromise
  }

  console.log('🔍 [yamlConfigLoader] Starting new config load')
  
  configPromise = (async () => {
    try {
      console.log('🔍 [yamlConfigLoader] Loading development.yml (simplified mode)')
      
      const response = await (window.originalFetch || fetch)('/config/development.yml')
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`)
      }

      const yamlText = await response.text()
      console.log('🔍 [yamlConfigLoader] YAML text preview:', yamlText.substring(0, 200) + '...')
      
      console.log('🔍 [yamlConfigLoader] Starting YAML parsing...')
      const config = parseSimpleYAML(yamlText)
      console.log('🔍 [yamlConfigLoader] Parsed config:', config)
      console.log('🔍 [yamlConfigLoader] test_accounts in parsed config:', config.test_accounts)
      
      console.log('✅ Configuration loaded successfully:', config)
      
      // Cache the config
      configCache = config
      return config
      
    } catch (error) {
      console.error('❌ Failed to load YAML configuration:', error)
      console.error('❌ [yamlConfigLoader] Error details:', error.message)
      console.error('❌ [yamlConfigLoader] Error stack:', error.stack)
      
      // Fallback to default development configuration
      const fallbackConfig = {
        app: {
          name: "Fechatter",
          environment: "development",
          debug: true
        },
        api: {
          base_url: "/api",
          timeout: 15000
        },
        logging: {
          level: "debug"
        }
      }
      
      console.warn('🔄 Using fallback configuration:', fallbackConfig)
      configCache = fallbackConfig
      return fallbackConfig
    }
  })()
  
  return configPromise
}

/**
 * Get current configuration (async)
 */
export async function getConfig() {
  return await loadYAMLConfig();
}

/**
 * Get API configuration
 */
export async function getApiConfig() {
  const config = await loadYAMLConfig();
  return config.api || {};
}

/**
 * Get app configuration
 */
export async function getAppConfig() {
  const config = await loadYAMLConfig();
  return config.app || {};
}

/**
 * Check if we're using test account configuration
 */
export async function hasTestAccountConfig() {
  console.log('🔍 [yamlConfigLoader] hasTestAccountConfig called')
  try {
    const config = await loadYAMLConfig();
    console.log('🔍 [yamlConfigLoader] Config loaded for test account check:', config)
    const hasTestAccounts = !!(config.test_accounts && config.test_accounts.length > 0);
    console.log('🔍 [yamlConfigLoader] test_accounts field:', config.test_accounts)
    console.log('🔍 [yamlConfigLoader] hasTestAccounts result:', hasTestAccounts)
    return hasTestAccounts;
  } catch (error) {
    console.error('❌ [yamlConfigLoader] Error in hasTestAccountConfig:', error)
    return false;
  }
}

/**
 * Get test accounts if available
 */
export async function getTestAccounts() {
  console.log('🔍 [yamlConfigLoader] getTestAccounts called')
  try {
    const config = await loadYAMLConfig();
    console.log('🔍 [yamlConfigLoader] Config loaded for test accounts:', config)
    const testAccounts = config.test_accounts || [];
    console.log('🔍 [yamlConfigLoader] test_accounts from config:', testAccounts)
    return testAccounts;
  } catch (error) {
    console.error('❌ [yamlConfigLoader] Error in getTestAccounts:', error)
    return [];
  }
}

/**
 * Get configuration value by path
 */
export async function getConfigValue(path, defaultValue = null) {
  const config = await loadYAMLConfig();
  const keys = path.split('.');
  let current = config;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Initialize YAML configuration system
 */
export async function initializeYAMLConfig() {
  try {
    const config = await loadYAMLConfig();
    console.log('🎛️ YAML Configuration System initialized');
    console.log('📋 Environment:', config.app?.environment);
    console.log('🔌 API Base URL:', config.api?.base_url);
    
    if (config.test_accounts && config.test_accounts.length > 0) {
      console.log('👤 Test accounts available:', config.test_accounts.length);
    }
    
    return config;
  } catch (error) {
    console.error('❌ Failed to initialize YAML configuration:', error);
    throw error;
  }
}

export default {
  getConfig,
  getApiConfig,
  getAppConfig,
  hasTestAccountConfig,
  getTestAccounts,
  getConfigValue,
  initializeYAMLConfig
};
