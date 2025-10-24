/**
 * API URL Resolver with CORS Fix
 * Development: Use Vite proxy to avoid CORS issues
 * Production: Direct Cloudflare Tunnel connection
 */

import { getApiConfig } from './yamlConfigLoader.js';

// Cloudflare Tunnel URL for production access
const CLOUDFLARE_URL = 'https://api.fechatter.com';

/**
 * Detect if we're in development mode with Vite proxy available
 */
function isDevelopmentWithProxy() {
  return typeof window !== 'undefined' && 
         window.location.hostname === 'localhost' &&
         (window.location.port === '5173' || window.location.port === '5174');
}

/**
 * Get API base URL - use proxy in development to avoid CORS
 */
export async function getApiBaseUrl() {
  if (isDevelopmentWithProxy()) {
    console.log('🔍 [apiUrlResolver] Using Vite proxy for CORS-free development');
    return '/api'; // Use Vite proxy
  }
  
  console.log('🔍 [apiUrlResolver] Using Cloudflare Tunnel connection');
  return `${CLOUDFLARE_URL}/api`;
}

/**
 * Get file service URL - use proxy in development
 */
export async function getFileUrl() {
  if (isDevelopmentWithProxy()) {
    console.log('🔍 [apiUrlResolver] Using Vite proxy for files');
    return '/files';
  }
  
  console.log('🔍 [apiUrlResolver] Using Cloudflare Tunnel for files');
  return `${CLOUDFLARE_URL}/files`;
}

/**
 * Get SSE service URL - use proxy in development
 */
export async function getSseUrl() {
  if (isDevelopmentWithProxy()) {
    console.log('🔍 [apiUrlResolver] Using Vite proxy for SSE');
    return '/events';
  }
  
  console.log('🔍 [apiUrlResolver] Using Cloudflare Tunnel for SSE');
  return `${CLOUDFLARE_URL}/events`;
}

/**
 * Get notification service URL - use proxy in development
 */
export async function getNotifyUrl() {
  if (isDevelopmentWithProxy()) {
    console.log('🔍 [apiUrlResolver] Using Vite proxy for notifications');
    return '/notify';
  }
  
  console.log('🔍 [apiUrlResolver] Using Cloudflare Tunnel for notifications');
  return `${CLOUDFLARE_URL}/notify`;
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
  const useProxy = isDevelopmentWithProxy();
  return {
    strategy: useProxy ? 'vite-proxy-development' : 'Cloudflare Tunnel-production',
    cloudflareTunnelUrl: CLOUDFLARE_URL,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port : 'unknown',
    useProxy
  };
}

// Export a simple detection function for backward compatibility
export function detectRuntimeEnvironment() {
  return isDevelopmentWithProxy() ? 'development' : 'production';
}

export default {
  getApiBaseUrl,
  getFileUrl,
  getSseUrl,
  getNotifyUrl,
  buildApiUrl,
  getEnvironmentInfo,
  detectRuntimeEnvironment
}; 