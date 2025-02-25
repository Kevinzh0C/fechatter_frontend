/**
 * YAML Configuration Loader for Fechatter Frontend
 * Dynamically loads configuration from YAML files based on environment
 */

// Simple YAML parser for basic configuration
function parseSimpleYAML(text) {
  const lines = text.split('\n');
  const result = {};
  let currentObj = result;
  const stack = [result];
  
  for (let line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) continue;
    
    // Calculate indentation level
    const indent = line.length - line.trimStart().length;
    const indentLevel = Math.floor(indent / 2);
    
    // Adjust stack based on indentation
    while (stack.length > indentLevel + 1) {
      stack.pop();
    }
    currentObj = stack[stack.length - 1];
    
    line = line.trim();
    
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (value) {
        // Parse value
        let parsedValue = value;
        if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        } else if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (!isNaN(value) && value !== '') {
          parsedValue = Number(value);
        }
        
        currentObj[key.trim()] = parsedValue;
      } else {
        // This is a parent key
        currentObj[key.trim()] = {};
        stack.push(currentObj[key.trim()]);
      }
    } else if (line.startsWith('- ')) {
      // Array item
      const lastKey = Object.keys(currentObj).pop();
      if (!Array.isArray(currentObj[lastKey])) {
        currentObj[lastKey] = [];
      }
      const value = line.substring(2).trim();
      let parsedValue = value;
      if (value.startsWith('"') && value.endsWith('"')) {
        parsedValue = value.slice(1, -1);
      }
      currentObj[lastKey].push(parsedValue);
    }
  }
  
  return result;
}

/**
 * Detect current environment
 */
function detectEnvironment() {
  console.log('🔍 [yamlConfigLoader] detectEnvironment called')
  
  // Force development if DEV flag is true
  if (import.meta.env.DEV) {
    console.log('🔍 [yamlConfigLoader] import.meta.env.DEV is true, returning development')
    return 'development';
  }
  
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    console.log('🔍 [yamlConfigLoader] Browser environment detected')
    console.log('🔍 [yamlConfigLoader] hostname:', hostname)
    console.log('🔍 [yamlConfigLoader] port:', port)
    
    // Local development patterns
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '5173' || port === '3000' || port === '3001' || port === '3002') {
        console.log('🔍 [yamlConfigLoader] Detected local development server, returning development')
        return 'development';
      }
    }
    
    // Vercel production domains
    if (hostname.includes('vercel.app') || hostname.includes('vercel.dev')) {
      console.log('🔍 [yamlConfigLoader] Detected Vercel domain, returning production')
      return 'production';
    }
    
    console.log('🔍 [yamlConfigLoader] No specific pattern matched, checking process.env...')
  } else {
    console.log('🔍 [yamlConfigLoader] No window object available (server-side?)')
  }
  
  // Check environment variables
  if (typeof process !== 'undefined' && process.env?.VERCEL) {
    console.log('🔍 [yamlConfigLoader] VERCEL env var detected, returning production')
    return 'production';
  }
  
  console.log('🔍 [yamlConfigLoader] Defaulting to development environment for safety')
  // Default to development for safety (so test accounts always load)
  return 'development';
}

let configCache = null;
let configPromise = null;

/**
 * Load configuration from YAML file
 */
async function loadYAMLConfig() {
  console.log('🔍 [yamlConfigLoader] loadYAMLConfig called')
  
  if (configCache) {
    console.log('🔍 [yamlConfigLoader] Returning cached config:', configCache)
    return configCache;
  }
  
  if (configPromise) {
    console.log('🔍 [yamlConfigLoader] Returning existing promise')
    return configPromise;
  }
  
  configPromise = (async () => {
    try {
      // Detect environment and choose appropriate config file
      console.log('🔍 [yamlConfigLoader] Starting environment detection...')
      console.log('🔍 [yamlConfigLoader] window.location:', typeof window !== 'undefined' ? window.location : 'no window')
      
      const environment = detectEnvironment();
      const configFile = `${environment}.yml`;
      
      console.log(`🔧 Loading ${configFile} configuration for ${environment} environment`);
      console.log('🔍 [yamlConfigLoader] Config file path will be:', `/config/${configFile}`)
      
      // Fetch configuration file
      console.log('🔍 [yamlConfigLoader] Starting fetch request...')
      const response = await fetch(`/config/${configFile}`);
      console.log('🔍 [yamlConfigLoader] Fetch response status:', response.status)
      console.log('🔍 [yamlConfigLoader] Fetch response ok:', response.ok)
      console.log('🔍 [yamlConfigLoader] Fetch response headers:', response.headers)
      
      if (!response.ok) {
        console.error('❌ [yamlConfigLoader] Fetch failed with status:', response.status, response.statusText)
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
      }
      
      console.log('🔍 [yamlConfigLoader] Getting response text...')
      const yamlText = await response.text();
      console.log('🔍 [yamlConfigLoader] YAML text length:', yamlText.length)
      console.log('🔍 [yamlConfigLoader] YAML text preview:', yamlText.substring(0, 200) + '...')
      
      console.log('🔍 [yamlConfigLoader] Starting YAML parsing...')
      const config = parseSimpleYAML(yamlText);
      console.log('🔍 [yamlConfigLoader] Parsed config:', config)
      console.log('🔍 [yamlConfigLoader] test_accounts in parsed config:', config.test_accounts)
      
      console.log('✅ Configuration loaded successfully:', config);
      
      // Cache the config
      configCache = config;
      return config;
      
    } catch (error) {
      console.error('❌ Failed to load YAML configuration:', error);
      console.error('❌ [yamlConfigLoader] Error details:', error.message)
      console.error('❌ [yamlConfigLoader] Error stack:', error.stack)
      
      // Fallback to default configuration based on environment
      const environment = detectEnvironment();
      const fallbackConfig = {
        app: {
          name: "Fechatter",
          environment: environment,
          debug: environment === 'development'
        },
        api: {
          base_url: environment === 'development' ? "/api" : "https://45.77.178.85:8443/api",
          timeout: 15000
        },
        logging: {
          level: environment === 'development' ? "debug" : "warn"
        }
      };
      
      console.warn('🔄 Using fallback configuration:', fallbackConfig);
      configCache = fallbackConfig;
      return fallbackConfig;
    }
  })();
  
  return configPromise;
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
