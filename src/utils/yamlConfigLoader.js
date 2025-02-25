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

let configCache = null;
let configPromise = null;

/**
 * Load configuration from YAML file
 */
async function loadYAMLConfig() {
  if (configCache) {
    return configCache;
  }
  
  if (configPromise) {
    return configPromise;
  }
  
  configPromise = (async () => {
    try {
      // Determine which config to load - prioritize Vercel config for deployments
      const env = import.meta.env.MODE || 'development';
      const isVercel = window.location.hostname.includes('vercel.app');
      
      let configFile;
      if (isVercel) {
        configFile = 'vercel.yml';  // Use Vercel-specific config for deployments
        console.log('🌐 Detected Vercel deployment - using vercel.yml config');
      } else {
        configFile = 'development.yml';  // Use development config for local
        console.log('🔧 Local development - using development.yml config');
      }
      
      console.log(`🔧 Loading ${configFile} configuration...`);
      
      // Fetch configuration file
      const response = await fetch(`/config/${configFile}`);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
      }
      
      const yamlText = await response.text();
      const config = parseSimpleYAML(yamlText);
      
      console.log('✅ Configuration loaded successfully:', config);
      
      // Cache the config
      configCache = config;
      return config;
      
    } catch (error) {
      console.error('❌ Failed to load YAML configuration:', error);
      
      // Fallback to default configuration
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
  const config = await loadYAMLConfig();
  return !!(config.test_accounts && config.test_accounts.length > 0);
}

/**
 * Get test accounts if available
 */
export async function getTestAccounts() {
  const config = await loadYAMLConfig();
  return config.test_accounts || [];
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
