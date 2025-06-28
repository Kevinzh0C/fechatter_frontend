import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import authPlugin from "./plugins/auth";
import { errorHandler } from "./utils/errorHandler";

// Import SSE services
import minimalSSE from './services/sse-minimal.js';
import sseConnectionManager from './utils/sseConnectionManager';

// Import other utilities
import minimalMessagePersistence from './utils/minimalMessagePersistence';
import './utils/extensionErrorSuppressor.js';

// 🎨 AESTHETIC RESTORATION: Import unified design system FIRST to override conflicts
import './styles/unified-aesthetic-system.css';
import './styles/unified-channel-fonts.css';
import './style.css';
import './styles/z-index.css';

// 🚀 CODE HIGHLIGHTING: Import enhanced code highlighting styles
import './styles/enhanced-code-highlight.css';

// 🔵⚡ BLUE BEAM EFFECTS: Import blue beam search effects
import './styles/blue-beam-search-effects.css';

// 🛡️ Security Initializations - MUST load first (restored after aesthetic fix)
import secureLogger from './utils/secureLogger'
import './utils/extensionErrorSuppressor'
import requestConflictResolver from './utils/requestConflictResolver'

// Performance monitoring (development only)
import performanceMonitor from './utils/performanceMonitor'

// 🔧 NEW: System Monitor for comprehensive debugging and performance monitoring
import { systemMonitor } from './utils/systemMonitor.js';

// 🏥 NEW: Quick Health Check for instant system status
import { quickHealthCheck } from './utils/quickHealthCheck.js';

// Service imports
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useUserStore } from './stores/user'
import { useWorkspaceStore } from './stores/workspace'

// 🛡️ NEW: Import Message Display Guarantee system
// 🔧 DISABLED: MessageDisplayGuarantee for performance optimization
// Vue 3 reactive system provides sufficient reliability for message display
// const { messageDisplayGuarantee } = await import('./services/messageSystem/MessageDisplayGuarantee.js');

// 🔧 NEW: Import UnifiedMessageService for global availability
import { unifiedMessageService } from './services/messageSystem/UnifiedMessageService.js';

import { guaranteedScrollToBottom } from '@/services/GuaranteedScrollToBottom.js'
import { scrollToBottomValidator } from '@/utils/scrollToBottomValidator.js'

// Import Analytics client instance
import analytics from './services/analytics-client.js'

// Import YAML Configuration Loader
import { initializeYAMLConfig } from './utils/yamlConfigLoader.js'

// Import API URL Resolver for environment debugging
import { getEnvironmentInfo } from './utils/apiUrlResolver.js'

// Import tokenManager
import tokenManager from './services/tokenManager.js';

// Import styles
import './style.css'
import './styles/blue-beam-search-effects.css'
import './styles/scroll-stability.css'
import './styles/scroll-stability.css'

// 🔢 Import number harmonization system
import './styles/numbers-harmonization.css'

// 🔢 Import emoji detection fix
import './utils/emojiDetectionFix.js'

// Enhanced console state detection function
function detectConsoleAccess() {
  let devtools = {
    open: false,
    orientation: null
  };

  const threshold = 160;

  if (window.outerHeight - window.innerHeight > threshold ||
    window.outerWidth - window.innerWidth > threshold) {
    devtools.open = true;
    devtools.orientation = window.outerHeight - window.innerHeight > threshold ? 'vertical' : 'horizontal';
  }

  return devtools;
}

// Enhanced console state detection
const devtools = detectConsoleAccess();

// --- SIMPLIFIED SAFETY INITIALIZATION ---
// Simplified safety - no external dependency needed
const simplifiedSafety = {
  initialize: (devtools) => {
    console.log('Security layer active (Development Mode)');
  },
  getSecurityStatus: () => ({
    debugSuppressed: false,  // Always false - simplified
    environment: 'development',  // Always development
    devtools: detectConsoleAccess()
  })
};

simplifiedSafety.initialize(devtools);
console.log('Production Safety Wrapper active');

// --- PERFORMANCE MONITORING ---
performanceMonitor.initialize();
console.log('Performance Monitor loaded - use window.perfAnalytics() to view stats');

// --- SYSTEM MONITORING ---
console.log('System Monitor initialized - use window.debugSystem() for health check');
console.log('Available debug commands: debugSystem(), debugMessageService(), debugCache(), debugComponents(), debugPerformance(), debugMemory(), debugFullReport()');
console.log('Quick Health Check available - use window.quickHealthCheck() for instant status overview');

// --- 🚀 INITIALIZE CORE APPLICATION ---
const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  errorHandler.handle(err, {
    context: 'Vue Error Handler',
    component: instance?.$options?.name || 'Unknown Component',
    info
  });
};

app.use(pinia);
app.use(router);
app.use(authPlugin);

// Make analytics available globally
app.config.globalProperties.$analytics = analytics
app.provide('analytics', analytics)

// Load debug tools - always load in simplified mode
import('./utils/messageDebugger');
import('./utils/performanceMonitor');
import('./utils/duplicateDebugger');
import('./utils/devConsoleHelpers'); // Import dev console helpers for log management
import('./utils/messageDisplayDiagnostics'); // Import message display diagnostics
import('./utils/authDiagnostics'); // Import authentication diagnostics
import('./utils/systemDiagnostics'); // Import master system diagnostics
import('./utils/messageServiceDiagnostics'); // Import UnifiedMessageService diagnostics
import('./utils/fetchMoreMessagesTest'); // Import fetchMoreMessages fix verification
import('./utils/systemHealthValidator'); // Import system health validator
import('./utils/sseDebugger'); // Import SSE debugger for comprehensive SSE diagnosis

// Import advanced UX systems
import('./services/ProgressiveLoadManager.js'); // Import progressive loading system
import('./services/MessageSessionGrouper.js'); // Import message grouping system

// Import performance validator for development testing
import('./utils/navigationPerformanceValidator.js').then(module => {
  console.log('🔍 Navigation Performance Validator loaded - use window.testNavigationPerformance(fromChatId, toChatId) to test');
});

// Initialize security measures
console.log('Initializing Fechatter Security Layer...')

// Apply simplified safety policies
const securityStatus = simplifiedSafety.getSecurityStatus()
console.log('Security Status:', securityStatus)

// Set up global error handling with security considerations
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, {
    context: 'Global Error Handler',
    filename: event.filename
  })
})

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, {
    context: 'Unhandled Promise Rejection'
  })
})

// Initialize stores with error handling
async function initializeStores() {
  try {
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const userStore = useUserStore()
    const workspaceStore = useWorkspaceStore()

    // Initialize auth state from storage
    await authStore.initialize()

    // Enhanced SSE connection validation
    console.log('[SSE] Checking SSE initialization conditions...');
    console.log('[SSE] authStore.isAuthenticated:', authStore.isAuthenticated);
    console.log('[SSE] authStore.token exists:', !!authStore.token);
    console.log('[SSE] Current route:', router.currentRoute.value?.path);
    if (authStore.token) {
      console.log('[SSE] Token preview:', authStore.token.substring(0, 20) + '...');
    }

    // More comprehensive authentication validation
    const isUserLoggedIn = authStore.isAuthenticated &&
      authStore.token &&
      authStore.user &&
      authStore.token.length > 50; // Ensure token is substantial

    // Don't initialize SSE on login/register pages
    const currentPath = router.currentRoute.value?.path || window.location.pathname;
    const isOnAuthPage = (currentPath.includes('/login') ||
      currentPath.includes('/register')) &&
      !authStore.isAuthenticated;

    console.log('[SSE] Enhanced validation:');
    console.log('  - isUserLoggedIn:', isUserLoggedIn);
    console.log('  - isOnAuthPage:', isOnAuthPage);
    console.log('  - currentPath:', currentPath);

    // 🔧 ENHANCED: Comprehensive authentication validation and token synchronization
    const performTokenSynchronization = async () => {
      // Find the best available token from all sources
      const tokenSources = [
        { source: 'authStore', token: authStore.token },
        { source: 'localStorage-auth_token', token: localStorage.getItem('auth_token') },
        { source: 'localStorage-access_token', token: localStorage.getItem('access_token') },
        { source: 'tokenManager', token: tokenManager.getAccessToken() }
      ];

      console.log('[MAIN] Token source analysis:');
      tokenSources.forEach(({ source, token }) => {
        console.log(`  ${source}: ${token ? token.substring(0, 20) + '...' : 'null'}`);
      });

      // Find the best token (prefer the longest, most recent one)
      let bestToken = null;
      let bestSource = null;
      
      for (const { source, token } of tokenSources) {
        if (token && token.length > 20 && token.includes('.')) {
          if (!bestToken || token.length > bestToken.length) {
            bestToken = token;
            bestSource = source;
          }
        }
      }

      if (bestToken) {
        console.log(`[MAIN] Best token found from: ${bestSource}`);
        
        // 🔧 CRITICAL: Synchronize all token storage systems
        try {
          // Sync localStorage
          if (localStorage.getItem('auth_token') !== bestToken) {
            localStorage.setItem('auth_token', bestToken);
            console.log('[MAIN] Synchronized localStorage auth_token');
          }
          
          // Sync tokenManager
          const currentManagerToken = tokenManager.getAccessToken();
          if (currentManagerToken !== bestToken) {
            await tokenManager.setTokens({
              accessToken: bestToken,
              refreshToken: bestToken,
              expiresAt: Date.now() + (3600 * 1000), // 1 hour
              issuedAt: Date.now()
            });
            console.log('[MAIN] Synchronized tokenManager');
          }
          
          console.log('✅ [MAIN] Token synchronization completed');
          return bestToken;
        } catch (error) {
          console.warn('⚠️ [MAIN] Token synchronization failed:', error);
          return bestToken; // Still return the token even if sync failed
        }
      } else {
        console.warn('[MAIN] No valid tokens found in any source');
        return null;
      }
    };

    // Enhanced authentication check with synchronization
    const hasValidAuth = () => {
      // Check multiple sources for any valid token
      const sources = [
        authStore.isAuthenticated && authStore.token,
        localStorage.getItem('auth_token'),
        localStorage.getItem('access_token'),
        tokenManager.getAccessToken()
      ];
      
      return sources.some(token => token && token.length > 20 && token.includes('.'));
    };

    if (!isOnAuthPage && hasValidAuth()) {
      console.log('🚀 [MAIN] Initializing SSE service with enhanced auth check and synchronization');
      
      try {
        // 🔧 STEP 1: Perform token synchronization first
        const synchronizedToken = await performTokenSynchronization();
        
        if (synchronizedToken) {
          // 🔧 STEP 2: Initialize SSE with synchronized token
          const sseService = (await import('@/services/sse-minimal.js')).default;
          
          // 🔧 CRITICAL: Expose SSE service to window for debugging tools
          window.minimalSSE = sseService;
          window.sseService = sseService; // Alternative reference
          
          console.log('[MAIN] Using synchronized token for SSE:', synchronizedToken.substring(0, 20) + '...');
          await sseService.connect(synchronizedToken);
          console.log('✅ [MAIN] SSE service initialized successfully with synchronized token');
        } else {
          console.warn('⚠️ [MAIN] Token synchronization failed, no valid token available');
        }
      } catch (error) {
        console.error('❌ [MAIN] SSE initialization failed:', error);
        
        // 🔧 FALLBACK: Try one more time with direct token access
        try {
          const fallbackToken = authStore.token || localStorage.getItem('auth_token');
          if (fallbackToken) {
            console.log('[MAIN] Attempting SSE with fallback token');
            const sseService = (await import('@/services/sse-minimal.js')).default;
            
            // 🔧 CRITICAL: Expose SSE service to window for debugging tools
            window.minimalSSE = sseService;
            window.sseService = sseService; // Alternative reference
            
            await sseService.connect(fallbackToken);
            console.log('✅ [MAIN] SSE fallback initialization successful');
          }
        } catch (fallbackError) {
          console.error('❌ [MAIN] SSE fallback also failed:', fallbackError);
        }
      }
    } else {
      console.log('⏸️ [MAIN] Skipping SSE - auth check failed or on auth page');
      console.log('Debug info:', {
        isOnAuthPage,
        currentPath,
        isAuthenticated: authStore.isAuthenticated,
        hasToken: !!authStore.token,
        hasDirectToken: !!localStorage.getItem('auth_token'),
        hasValidAuth: hasValidAuth()
      });
      
      // 🔧 CRITICAL: Still expose SSE service for debugging tools even when not connected
      try {
        const sseService = (await import('@/services/sse-minimal.js')).default;
        window.minimalSSE = sseService;
        window.sseService = sseService;
        console.log('✅ [MAIN] SSE service exposed for debugging (not connected)');
      } catch (error) {
        console.warn('⚠️ [MAIN] Failed to expose SSE service for debugging:', error);
      }
    }

    console.log('✅ Application stores initialized')

    performanceMonitor.endOperation('app-initialization', {
      status: 'success',
      storesInitialized: true
    })

  } catch (error) {
    console.error('❌ Failed to initialize stores:', error)
    errorHandler.handle(error, {
      context: 'Store Initialization',
      critical: true
    })
  }
}

// 🛡️ NEW: Make UnifiedMessageService globally available for system monitoring
window.unifiedMessageService = unifiedMessageService;

console.log('🔧 [PERFORMANCE] MessageDisplayGuarantee system disabled - using Vue 3 reactive system for reliability');

// 🎯 NEW: Global debug function for monitoring request deduplication
window.debugChatSwitching = async () => {
  console.log('🔍 [Debug] Chat Switching & Request Deduplication Status:');
  
  try {
    // UnifiedMessageService stats
    const { unifiedMessageService } = await import('./services/messageSystem/UnifiedMessageService');
    const stats = unifiedMessageService.getDebugStats();
    console.log('📊 UnifiedMessageService Stats:', stats);
    
    // Chat Store state
    const { useChatStore } = await import('./stores/chat');
    const chatStore = useChatStore();
    console.log('💬 ChatStore State:', {
      currentChatId: chatStore.currentChatId,
      totalChats: chatStore.chats?.length || 0,
      messagesLoaded: chatStore.messages?.length || 0,
      loading: chatStore.loading,
      error: chatStore.error
    });
    
    // Navigation Manager state
    try {
      const { navigationManager } = await import('./services/navigation/NavigationManager');
      console.log('🧭 NavigationManager State:', {
        activeChatId: navigationManager.activeChatId,
        activeRequests: navigationManager.activeRequests?.size || 0,
        lastNavigationTime: navigationManager.lastNavigationTime,
        isNavigating: navigationManager.isNavigating?.value || false
      });
    } catch (e) {
      console.log('🧭 NavigationManager: Not available');
    }
    
    // Image Cache stats
    try {
      const { default: imageCacheService } = await import('./services/ImageCacheService');
      const cacheStats = imageCacheService.getStats();
      console.log('🖼️ ImageCache Stats:', cacheStats);
    } catch (e) {
      console.log('🖼️ ImageCache: Not available');
    }
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
  }
};

// 🎯 NEW: Test logout cleanup function
window.testLogoutCleanup = async () => {
  console.log('🧪 [Test] Testing logout cleanup...');
  
  try {
    // Test UnifiedMessageService cleanup
    const { unifiedMessageService } = await import('./services/messageSystem/UnifiedMessageService');
    const beforeStats = unifiedMessageService.getDebugStats();
    console.log('📊 Before cleanup:', beforeStats);
    
    unifiedMessageService.clearAllRequestTracking();
    
    const afterStats = unifiedMessageService.getDebugStats();
    console.log('📊 After cleanup:', afterStats);
    
    // Test NavigationManager cleanup
    const { navigationManager } = await import('./services/navigation/NavigationManager');
    console.log('🧭 Before NavigationManager cleanup:', {
      activeRequests: navigationManager.activeRequests?.size || 0,
      activeChatId: navigationManager.activeChatId
    });
    
    navigationManager.clearAllRequests();
    
    console.log('🧭 After NavigationManager cleanup:', {
      activeRequests: navigationManager.activeRequests?.size || 0,
      activeChatId: navigationManager.activeChatId
    });
    
    console.log('✅ [Test] Logout cleanup test completed');
    
  } catch (error) {
    console.error('❌ [Test] Logout cleanup test failed:', error);
  }
};

console.log('🎯 Debug functions available: window.debugChatSwitching(), window.testLogoutCleanup()');

// Mount application with security checks
async function mountApp() {
  try {
    // Initialize YAML configuration first
    try {
      await initializeYAMLConfig();
      console.log('YAML Configuration loaded successfully');
      
      // Log environment info for debugging
      const envInfo = getEnvironmentInfo();
      console.log('Environment Info:', envInfo);
    } catch (configError) {
      console.warn('YAML Configuration failed, using fallback:', configError);
    }
    
    await initializeStores()

    // 🔧 REFACTORED: Use dependency injection instead of global access
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const userStore = useUserStore()
    const workspaceStore = useWorkspaceStore()

    // 🎯 NEW: Configure dependency injection container
    import('./services/DIContainer.js').then(({ container, configureServices }) => {
      configureServices(container)
      container.install(app)
      console.log('✅ Dependency injection container configured')
    }).catch(error => {
      console.warn('⚠️ DIContainer failed to load:', error)
    })

    // 🔧 DEPRECATED: Keep minimal global access for backward compatibility
    // Will be removed in future refactoring phases
    window.__pinia_stores__ = {
      auth: () => authStore,
      chat: () => chatStore,
      user: () => userStore,
      workspace: () => workspaceStore,
    };
    console.warn('⚠️ Global store access is deprecated. Use dependency injection instead.')

    // Security validation - simplified (no production checks)
    console.log('✅ Security validation passed (simplified mode)')

    app.mount('#app')
    console.log('🚀 Fechatter application mounted successfully')

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      performanceMonitor.clearReports()
      requestConflictResolver.abortAllRequests()
    })

  } catch (error) {
    console.error('❌ Failed to mount application:', error)
    errorHandler.handle(error, {
      context: 'Application Mount',
      critical: true
    })

    // Show user-friendly error
    document.body.innerHTML = `
      <div style="
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        font-family: Arial, sans-serif;
        background: #f5f5f5;
      ">
        <div style="
          text-align: center; 
          padding: 2rem; 
          background: white; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
        ">
          <h2 style="color: #e74c3c; margin-bottom: 1rem;">Application Error</h2>
          <p style="color: #666; margin-bottom: 1.5rem;">
            Unable to start the application. Please refresh the page or contact support.
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: #3498db; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 4px; 
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Refresh Page
          </button>
        </div>
      </div>
    `
  }
}

// Start application
mountApp()

window.app = app;
window.pinia = pinia;
window.$router = router;
window.errorHandler = errorHandler;
window.sseConnectionManager = sseConnectionManager;

// 🚀 CRITICAL FIX: Expose tokenManager to window for SSE service access
window.tokenManager = tokenManager;

// Expose security utilities for API parameter limiting
window.securityUtils = {
  enforceApiLimits: (params) => {
    // Limit API request parameters to prevent DoS
    const MAX_LIMIT = 100;
    const sanitized = { ...params };

    if (sanitized.limit && sanitized.limit > MAX_LIMIT) {
      sanitized.limit = MAX_LIMIT;
      console.warn(`🚨 API limit parameter capped from ${params.limit} to ${MAX_LIMIT}`);
    }

    return sanitized;
  },

  sanitizeDisplayId: (id) => {
    // Obfuscate IDs for display in logs
    if (!id) return 'unknown';
    return `${String(id).slice(0, 2)}***`;
  }
};

window.addEventListener('beforeunload', () => {
  analytics.track('app_exit', { exit_code: 1 });
  analytics.destroy();
});

// 🎯 Initialize guaranteed scroll system
window.guaranteedScrollToBottom = guaranteedScrollToBottom;
console.log('🎯 GuaranteedScrollToBottom system loaded');
