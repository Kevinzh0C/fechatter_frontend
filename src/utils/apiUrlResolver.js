/**
 * API URL Resolver for Different Environments
 * Handles development, production, and Vercel environments
 */

import { getApiConfig } from './yamlConfigLoader.js';

// ngrok URL for production backend
const NGROK_URL = 'https://ca90-45-77-178-85.ngrok-free.app';

/**
 * Detect current runtime environment
 */
function detectRuntimeEnvironment() {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Vercel production domains
    if (hostname.includes('vercel.app') || hostname.includes('vercel.dev')) {
      return 'vercel';
    }
    
    // Local Vite dev server
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
      return 'development';
    }
  }
  
  // Check environment variables
  if (typeof process !== 'undefined' && process.env?.VERCEL) {
    return 'vercel';
  }
  
  // Default to development
  return 'development';
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
        // Direct ngrok connection for Vercel environments
        return `${NGROK_URL}/api`;
        
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
        return `${NGROK_URL}/api`;
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
        return `${NGROK_URL}/files`;
      default:
        return config.file_url || 'https://45.77.178.85:8443/files';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    switch (environment) {
      case 'development':
        return '/files';
      case 'vercel':
        return `${NGROK_URL}/files`;
      default:
        return '/files';
    }
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
        return `${NGROK_URL}/events`;
      default:
        return config.sse_url || 'https://45.77.178.85:8443/events';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    switch (environment) {
      case 'development':
        return '/events';
      case 'vercel':
        return `${NGROK_URL}/events`;
      default:
        return '/events';
    }
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
        return `${NGROK_URL}/notify`;
      default:
        return config.notify_url || 'https://45.77.178.85:8443/notify';
    }
  } catch (error) {
    const environment = detectRuntimeEnvironment();
    switch (environment) {
      case 'development':
        return '/notify';
      case 'vercel':
        return `${NGROK_URL}/notify`;
      default:
        return '/notify';
    }
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