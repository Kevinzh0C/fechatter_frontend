/**
 * API URL Resolver for Different Environments
 * Handles development, production, and Vercel environments
 */

import { getApiConfig } from './yamlConfigLoader.js';

/**
 * Detect current runtime environment
 */
function detectRuntimeEnvironment() {
  // Check if running in Vercel (both dev and production)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Vercel dev typically runs on port 3000
    if ((hostname === 'localhost' && port === '3000') || 
        hostname.includes('vercel.app') || 
        hostname.includes('vercel.dev')) {
      return 'vercel';
    }
    
    // Local Vite dev server on port 5173
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
      return 'development';
    }
  }
  
  // Check environment variables
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      return 'vercel';
    }
  }
  
  // Check Vite environment
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  return 'production';
}

/**
 * Get API base URL for current environment
 */
export async function getApiBaseUrl() {
  try {
    const config = await getApiConfig();
    const environment = detectRuntimeEnvironment();
    
    // Environment-specific URL resolution
    switch (environment) {
      case 'development':
        // Use relative paths in development (Vite proxy handles it)
        return config.base_url || '/api';
        
      case 'vercel':
        // Use Vercel proxy paths in production
        return config.base_url || '/api/proxy';
        
      case 'production':
        // Use direct backend URLs for other production environments
        return config.base_url || 'https://45.77.178.85:8443/api';
        
      default:
        return config.base_url || '/api';
    }
  } catch (error) {
    console.warn('Failed to load API config, using fallback:', error);
    
    // Fallback based on environment
    const environment = detectRuntimeEnvironment();
    switch (environment) {
      case 'development':
        return '/api';
      case 'vercel':
        return '/api/proxy';
      default:
        return 'https://45.77.178.85:8443/api';
    }
  }
}

/**
 * Get file service URL
 */
export async function getFileUrl() {
  try {
    const config = await getApiConfig();
    const environment = detectRuntimeEnvironment();
    
    switch (environment) {
      case 'development':
        return config.file_url || '/files';
      case 'vercel':
        return config.file_url || '/api/proxy/files';
      default:
        return config.file_url || 'https://45.77.178.85:8443/files';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    return environment === 'vercel' ? '/api/proxy/files' : '/files';
  }
}

/**
 * Get SSE service URL
 */
export async function getSseUrl() {
  try {
    const config = await getApiConfig();
    const environment = detectRuntimeEnvironment();
    
    switch (environment) {
      case 'development':
        return config.sse_url || '/events';
      case 'vercel':
        return config.sse_url || '/api/proxy/events';
      default:
        return config.sse_url || 'https://45.77.178.85:8443/events';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    return environment === 'vercel' ? '/api/proxy/events' : '/events';
  }
}

/**
 * Get notification service URL
 */
export async function getNotifyUrl() {
  try {
    const config = await getApiConfig();
    const environment = detectRuntimeEnvironment();
    
    switch (environment) {
      case 'development':
        return config.notify_url || '/notify';
      case 'vercel':
        return config.notify_url || '/api/proxy/notify';
      default:
        return config.notify_url || 'https://45.77.178.85:8443/notify';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    return environment === 'vercel' ? '/api/proxy/notify' : '/notify';
  }
}

/**
 * Build complete API URL
 */
export async function buildApiUrl(endpoint) {
  const baseUrl = await getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * Get current environment info for debugging
 */
export function getEnvironmentInfo() {
  const environment = detectRuntimeEnvironment();
  return {
    environment,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    isDev: import.meta.env.DEV,
    isVercel: environment === 'vercel'
  };
}

export { detectRuntimeEnvironment };

export default {
  getApiBaseUrl,
  getFileUrl,
  getSseUrl,
  getNotifyUrl,
  buildApiUrl,
  getEnvironmentInfo,
  detectRuntimeEnvironment
}; 