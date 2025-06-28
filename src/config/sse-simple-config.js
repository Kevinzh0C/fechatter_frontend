/**
 * Standard SSE Configuration
 * Following industry best practices for Server-Sent Events
 */

export const SSE_CONFIG = {
  // Let browser handle reconnection automatically
  // Industry standard: don't override browser defaults
  RECONNECT_DELAY: null, // Browser default: 3000ms
  
  // Minimal connection timeout
  // Give browser enough time for initial connection
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  
  // Simple error categories
  ERROR_TYPES: {
    NETWORK: 'network',
    AUTH: 'auth',
    UNKNOWN: 'unknown'
  }
};

/**
 * Get simple error type
 * Don't over-classify errors - keep it simple
 */
export function getSimpleErrorType(error) {
  // Let browser handle most error scenarios
  return SSE_CONFIG.ERROR_TYPES.UNKNOWN;
}

export default SSE_CONFIG; 