/**
 * SSE Initializer
 * Utility to ensure SSE connection is established after login
 */

import sseService from '@/services/sse-minimal.js';

/**
 * Initialize SSE connection with the given token
 * @param {string} token - Authentication token
 * @returns {Promise<boolean>} - Success status
 */
export async function initializeSSEConnection(token) {
  if (!token) {
    console.warn('⚠️ [SSE Initializer] No token provided for SSE initialization');
    return false;
  }

  try {
    console.log('🔄 [SSE Initializer] Starting SSE connection initialization');
    
    // Check if already connected
    if (sseService.isConnected && sseService.eventSource) {
      console.log('✅ [SSE Initializer] SSE already connected');
      return true;
    }
    
    // Initialize connection
    await sseService.connect(token);
    
    // Verify connection was established
    if (sseService.isConnected) {
      console.log('✅ [SSE Initializer] SSE connection established successfully');
      return true;
    } else {
      console.warn('⚠️ [SSE Initializer] SSE connection attempt completed but not connected');
      return false;
    }
  } catch (error) {
    console.error('❌ [SSE Initializer] Failed to establish SSE connection:', error);
    return false;
  }
}

/**
 * Diagnose SSE connection issues
 * @returns {Promise<Object>} - Diagnosis results
 */
export async function diagnoseSSEConnection() {
  try {
    console.log('🔍 [SSE Initializer] Running SSE connection diagnosis');
    return await sseService.diagnoseSSEConnection();
  } catch (error) {
    console.error('❌ [SSE Initializer] Diagnosis failed:', error);
    return { success: false, error: error.message };
  }
}

export default {
  initializeSSEConnection,
  diagnoseSSEConnection
}; 