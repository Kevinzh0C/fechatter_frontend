/**
 * API URL Resolver with CORS Fix
 * Development: Use Vite proxy to avoid CORS issues
 * Production: Direct Cloudflare Tunnel connection
 * Vercel: Use Vercel proxy for proper authentication
 */

import { getApiConfig } from './yamlConfigLoader.js';

// Cloudflare Tunnel URL for production access
const CLOUDFLARE_URL = 'https://hook-nav-attempt-size.trycloudflare.com';

/**
 * Detect if we're in development mode with Vite proxy available
 */
function isDevelopmentWithProxy() {
  return typeof window !== 'undefined' && 
         window.location.hostname === 'localhost' &&
         (window.location.port === '5173' || window.location.port === '5174');
}

/**
 * Detect if we're in Vercel environment that needs proxy
 */
function isVercelEnvironment() {
  return typeof window !== 'undefined' && 
         (window.location.hostname.includes('vercel.app') || 
          window.location.hostname.includes('vercel.com') ||
          // Also check for custom domains on Vercel
          (window.location.protocol === 'https:' && 
           !window.location.hostname.includes('trycloudflare.com')));
}

/**
 * Check if we should use proxy (development or Vercel)
 */
function shouldUseProxy() {
  return isDevelopmentWithProxy() || isVercelEnvironment();
}

/**
 * Get API base URL - use proxy in development and Vercel to avoid CORS and auth issues
 */
export async function getApiBaseUrl() {
  if (shouldUseProxy()) {
    const env = isDevelopmentWithProxy() ? 'development' : 'Vercel';
    console.log(`🔍 [apiUrlResolver] Using proxy for CORS-free ${env} environment`);
    return '/api'; // Use proxy (Vite or Vercel)
  }
  
  console.log('🔍 [apiUrlResolver] Using direct Cloudflare Tunnel connection');
  return `${CLOUDFLARE_URL}/api`;
}

/**
 * Get file service URL - use proxy in development and Vercel
 */
export async function getFileUrl() {
  if (shouldUseProxy()) {
    const env = isDevelopmentWithProxy() ? 'development' : 'Vercel';
    console.log(`🔍 [apiUrlResolver] Using proxy for files in ${env} environment`);
    return '/files';
  }
  
  console.log('🔍 [apiUrlResolver] Using direct Cloudflare Tunnel for files');
  return `${CLOUDFLARE_URL}/files`;
}

/**
 * Get SSE service URL - use proxy in development and Vercel
 */
export async function getSseUrl() {
  if (shouldUseProxy()) {
    const env = isDevelopmentWithProxy() ? 'development' : 'Vercel';
    console.log(`🔍 [apiUrlResolver] Using proxy for SSE in ${env} environment`);
    return '/events';
  }
  
  console.log('🔍 [apiUrlResolver] Using direct Cloudflare Tunnel for SSE');
  return `${CLOUDFLARE_URL}/events`;
}

/**
 * Get notification service URL - use proxy in development and Vercel
 */
export async function getNotifyUrl() {
  if (shouldUseProxy()) {
    const env = isDevelopmentWithProxy() ? 'development' : 'Vercel';
    console.log(`🔍 [apiUrlResolver] Using proxy for notifications in ${env} environment`);
    return '/notify';
  }
  
  console.log('🔍 [apiUrlResolver] Using direct Cloudflare Tunnel for notifications');
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
  const useProxy = shouldUseProxy();
  const env = useProxy ? (isDevelopmentWithProxy() ? 'development' : 'Vercel') : 'production';
  return {
    strategy: useProxy ? env : 'Cloudflare Tunnel-production',
    cloudflareTunnelUrl: CLOUDFLARE_URL,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port : 'unknown',
    useProxy
  };
}

// Export a simple detection function for backward compatibility
export function detectRuntimeEnvironment() {
  return shouldUseProxy() ? 'development' : 'production';
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