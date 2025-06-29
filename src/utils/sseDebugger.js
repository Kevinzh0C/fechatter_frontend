/**
 * 🚀 SSE Debugger Utility
 * Force SSE connection and diagnose issues
 */

export class SSEDebugger {
  constructor() {
    this.logs = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [SSE-Debug] ${message}`;

    this.logs.push({ timestamp, message, level });

    const style = {
      info: 'color: #3498db',
      success: 'color: #27ae60; font-weight: bold',
      error: 'color: #e74c3c; font-weight: bold',
      warning: 'color: #f39c12; font-weight: bold'
    };

    console.log(`%c${logEntry}`, style[level] || style.info);
  }

  async diagnoseSSE() {
    this.log('🔍 Starting comprehensive SSE diagnosis...', 'info');

    // Step 1: Check SSE service availability
    const minimalSSE = window.minimalSSE || window.realtimeCommunicationService;
    if (!minimalSSE) {
      this.log('❌ CRITICAL: minimalSSE service not found on window object', 'error');
      this.log('💡 Check if sse-minimal.js is properly loaded and exported', 'warning');
      return false;
    }
    this.log('✅ SSE service found', 'success');

    // Step 2: Check auth store
    const authStore = this.getAuthStore();
    if (!authStore) {
      this.log('❌ CRITICAL: Auth store not accessible', 'error');
      
      // Try directly from localStorage as fallback
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.log('✅ Found token in localStorage fallback', 'success');
        return { minimalSSE, authStore: null, isAuthenticated: true, token };
      }
      
      return false;
    }
    this.log('✅ Auth store found', 'success');

    // Step 3: Check authentication
    const isAuthenticated = authStore.isAuthenticated;
    const token = authStore.token;

    this.log(`🔐 Authentication status: ${isAuthenticated}`, isAuthenticated ? 'success' : 'error');
    this.log(`🎫 Token present: ${!!token}`, token ? 'success' : 'error');

    if (!isAuthenticated || !token) {
      this.log('❌ CRITICAL: User not authenticated or no token', 'error');
      this.log('💡 This explains why no /events requests appear in proxy logs', 'warning');
      
      // Try direct localStorage access as fallback
      const directToken = localStorage.getItem('auth_token');
      if (directToken) {
        this.log('✅ Found token in localStorage fallback', 'success');
        return { minimalSSE, authStore, isAuthenticated: true, token: directToken };
      }
      
      return false;
    }

    // Step 4: Check current SSE state
    this.log(`📡 SSE connected: ${minimalSSE.connected}`, minimalSSE.connected ? 'success' : 'warning');
    this.log(`🔗 EventSource exists: ${!!minimalSSE.eventSource}`, minimalSSE.eventSource ? 'success' : 'error');

    if (minimalSSE.eventSource) {
      this.log(`🌐 EventSource URL: ${minimalSSE.eventSource.url}`, 'info');
      this.log(`📊 EventSource readyState: ${minimalSSE.eventSource.readyState}`, 'info');
    } else {
      this.log('❌ CRITICAL: EventSource object not created!', 'error');
      this.log('🔧 This is the root cause of missing /events requests', 'warning');
    }

    return { minimalSSE, authStore, isAuthenticated, token };
  }

  async forceSSEConnection() {
    this.log('🚀 Attempting to force SSE connection...', 'info');

    const diagnosis = await this.diagnoseSSE();
    if (!diagnosis) {
      this.log('❌ Cannot force connection: Prerequisites not met', 'error');
      return false;
    }

    const { minimalSSE, token } = diagnosis;

    try {
      // Disconnect first
      this.log('🔄 Disconnecting existing connection...', 'info');
      minimalSSE.disconnect();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force reconnection
      this.log(`🔗 Calling connect() with token: ${token.substring(0, 15)}...`, 'info');
      minimalSSE.connect(token);

      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (minimalSSE.eventSource) {
        this.log('✅ SUCCESS: EventSource created!', 'success');
        this.log(`🌐 URL: ${minimalSSE.eventSource.url}`, 'success');
        this.log(`📊 ReadyState: ${minimalSSE.eventSource.readyState}`, 'success');

        // Check for network requests in proxy logs
        this.log('🔍 Check browser network tab for GET /events requests', 'info');
        return true;
      } else {
        this.log('❌ FAILED: EventSource still not created after force connect', 'error');
        return false;
      }

    } catch (error) {
      this.log(`❌ Force connection error: ${error.message}`, 'error');
      return false;
    }
  }

  testDirectEventSource() {
    this.log('🧪 Testing direct EventSource creation...', 'info');

    // Try to get token from multiple sources
    let token = null;
    
    // First try auth store
    const authStore = this.getAuthStore();
    if (authStore && authStore.token) {
      token = authStore.token;
    } 
    // Fallback to localStorage
    else {
      token = localStorage.getItem('auth_token');
      if (!token) {
        // Try other possible storage locations
        token = localStorage.getItem('access_token') || 
                sessionStorage.getItem('auth_token') ||
                sessionStorage.getItem('access_token');
      }
    }
    
    if (!token) {
      this.log('❌ Cannot test: No auth token found in any source', 'error');
      return;
    }

    const url = `/events?access_token=${token}`;

    this.log(`🔗 Creating direct EventSource: ${url}`, 'info');

    try {
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        this.log('✅ DIRECT TEST SUCCESS: EventSource opened!', 'success');
        this.log('🌐 This proves /events endpoint and token are working', 'success');
        this.log('🔧 Problem is in automatic SSE initialization', 'warning');
      };

      eventSource.onmessage = (event) => {
        this.log(`📨 Direct EventSource received: ${event.data.substring(0, 50)}...`, 'success');
      };

      eventSource.onerror = (error) => {
        this.log(`❌ Direct EventSource error: ${error}`, 'error');
        this.log(`📊 ReadyState: ${eventSource.readyState}`, 'error');
      };

      // Store for cleanup
      window.debugEventSource = eventSource;

      // Auto-close after 15 seconds
      setTimeout(() => {
        eventSource.close();
        this.log('🔚 Direct test EventSource closed', 'info');
      }, 15000);

    } catch (error) {
      this.log(`❌ Direct test failed: ${error.message}`, 'error');
    }
  }

  getAuthStore() {
    try {
      // Multiple ways to access the auth store
      return (
        // 1. Pinia store (most common)
        window.__pinia_stores__?.auth?.() ||
        window.pinia?.stores?.auth ||
        
        // 2. Directly exposed stores
        window.authStore ||
        window.$store?.auth ||
        
        // 3. Vue app instance stores
        window.app?._instance?.appContext?.app?.config?.globalProperties?.$pinia?.state?.value?.auth ||
        
        // 4. Vuex store (legacy)
        window.$vuex?.state?.auth ||
        window.$store?.state?.auth ||
        
        // 5. Try to dynamically import (only works if module bundling allows)
        (() => {
          // Just attempt access, don't actually import here
          return null;
        })()
      );
    } catch (error) {
      this.log(`Failed to access auth store: ${error.message}`, 'error');
      return null;
    }
  }

  exportLogs() {
    return this.logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
  }

  clearLogs() {
    this.logs = [];
    this.log('🗑️ Logs cleared', 'info');
  }
}

// Create singleton instance
const sseDebugger = new SSEDebugger();

// Make globally available
if (typeof window !== 'undefined') {
  window.sseDebugger = sseDebugger;

  // Add convenient global methods
  window.debugSSE = () => sseDebugger.diagnoseSSE();
  window.forceSSE = () => sseDebugger.forceSSEConnection();
  window.testSSEDirect = () => sseDebugger.testDirectEventSource();

  // Auto-run diagnosis in development
  if (true) {
    console.log('🚀 SSE Debugger loaded - use debugSSE(), forceSSE(), or testSSEDirect()');

    // Auto-diagnose after app loads
    setTimeout(() => {
      sseDebugger.log('🔍 Auto-running SSE diagnosis...', 'info');
      sseDebugger.diagnoseSSE();
    }, 3000);
  }
}

export default sseDebugger; 