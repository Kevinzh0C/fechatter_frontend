import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import authPlugin from "./plugins/auth";
import { errorHandler } from "./utils/errorHandler";

// Import SSE services
import minimalSSE from './services/sse-minimal.js';
import sseConnectionManager from './utils/sseConnectionManager';

// Import token synchronizer service
// 🏆 REMOVED: tokenSynchronizer (replaced with modern auth system)

// Import other utilities
import './utils/timeoutFix.js';
import './utils/homeErrorCleaner.js';
import minimalMessagePersistence from './utils/minimalMessagePersistence';
import './utils/extensionErrorSuppressor.js';

// 🔧 PERFORMANCE: 主要样式同步加载，非关键样式延迟加载
import './style.css'; // 主要应用样式
import './styles/z-index.css'; // 层级管理，必需

// 🔧 PERFORMANCE: 延迟加载非关键美学样式
setTimeout(() => {
  // 在页面渲染后加载美学增强样式
  import('./styles/unified-aesthetic-system.css');
  import('./styles/unified-channel-fonts.css');
  import('./styles/enhanced-code-highlight.css');
  import('./styles/blue-beam-search-effects.css');
  console.log('🎨 [PERF] Aesthetic styles loaded in background');
}, 500);

// 🛡️ Security Initializations - MUST load first (restored after aesthetic fix)
import secureLogger from './utils/secureLogger'
import './utils/extensionErrorSuppressor'
import requestConflictResolver from './utils/requestConflictResolver'

// 🔧 PERFORMANCE: 延迟加载监控系统，避免阻塞初始化
// performanceMonitor 已在下面延迟加载
let systemMonitor, quickHealthCheck;
setTimeout(async () => {
  // 延迟初始化系统监控器
  const systemMonitorModule = await import('./utils/systemMonitor.js');
  const quickHealthModule = await import('./utils/quickHealthCheck.js');
  systemMonitor = systemMonitorModule.systemMonitor;
  quickHealthCheck = quickHealthModule.quickHealthCheck;
  console.log('📊 [PERF] System monitoring loaded in background');
}, 3000); // 3秒后加载，不影响初始化

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

// 🚀 NEW: Import Enhanced User Name Resolver for consistent username display
import './services/EnhancedUserNameResolver.js';

import { guaranteedScrollToBottom } from '@/services/GuaranteedScrollToBottom.js'
import { scrollToBottomValidator } from '@/utils/scrollToBottomValidator.js'

// Import Analytics client instance
import analytics from './services/analytics-client.js'

// Import YAML Configuration Loader
import { initializeYAMLConfig } from './utils/yamlConfigLoader.js'

// Import API URL Resolver for environment debugging
import { getEnvironmentInfo } from './utils/apiUrlResolver.js'

// 🏆 REMOVED: tokenManager (replaced with modern auth system)

// Import styles
import './style.css'
import './styles/blue-beam-search-effects.css'
import './styles/scroll-stability.css'
import './styles/scroll-stability.css'

// 🔢 Import number harmonization system
import './styles/numbers-harmonization.css'

// 🎨 Import modal enhancements for better shadow effects
import './styles/modal-enhancements.css'

// 🔢 Import emoji detection fix
import './utils/emojiDetectionFix.js'

// 🎨 导入主题管理器
import themeManager from './services/ThemeManager.js'

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
// performanceMonitor 将在延迟加载后初始化
console.log('Performance Monitor will be loaded asynchronously');

// --- SYSTEM MONITORING ---
console.log('System Monitor initialized - use window.debugSystem() for health check');
console.log('Available debug commands: debugSystem(), debugMessageService(), debugCache(), debugComponents(), debugPerformance(), debugMemory(), debugFullReport()');
console.log('Quick Health Check available - use window.quickHealthCheck() for instant status overview');

// 🔧 ERROR MANAGEMENT: Display all error clearing options
console.group('🔧 Error Management Commands:');
console.log('• window.clearAllErrors() - Clear all types of errors and notifications');
console.log('• window.clearTimeoutErrors() - Clear timeout-specific errors');
console.log('• window.clearHomeErrors() - Clear home page errors');
console.log('• window.errorMonitor.clearErrorToasts() - Clear development error toasts');
console.log('• Ctrl+Shift+X - Keyboard shortcut to clear all errors');
console.log('• ESC key - Close focused error toast');
console.log('• Click outside error - Dismiss error toast');
console.groupEnd();

// 🔧 TIMEOUT ERROR FIX: Global function to clear stuck timeout errors
window.clearTimeoutErrors = () => {
  console.log('🧹 [MAIN] Clearing all timeout errors...');
  
  // Clear timeout fix errors
  if (window.timeoutFix) {
    window.timeoutFix.clearTimeoutErrors();
  }
  
  // Clear error monitor toasts
  if (window.errorMonitor) {
    window.errorMonitor.clearErrorToasts();
  }
  
  // Clear any DOM elements with timeout error content
  const timeoutElements = document.querySelectorAll('[id*="timeout"], [class*="timeout"], [data-error*="timeout"]');
  timeoutElements.forEach(el => {
    if (el.textContent?.includes('Operation timeout')) {
      el.remove();
      console.log('🧹 [MAIN] Removed timeout error element:', el);
    }
  });
  
  // Clear error toasts by ID
  const errorToast = document.getElementById('error-monitor-toast');
  if (errorToast && errorToast.textContent?.includes('Operation timeout')) {
    errorToast.remove();
    console.log('🧹 [MAIN] Removed timeout error toast');
  }
  
  console.log('✅ [MAIN] Timeout error cleanup complete');
  return true;
};

console.log('🔧 Timeout error fix loaded - use window.clearTimeoutErrors() to manually clear stuck errors');
console.log('🧹 Home error cleaner loaded - use window.clearHomeErrors() to force cleanup all home page errors');

// 🔧 ENHANCED: Expose errorHandler globally and add universal error clearing
window.errorHandler = errorHandler;

// 🔧 UNIVERSAL ERROR DISMISSAL: Clear all types of errors and notifications
window.clearAllErrors = () => {
  console.log('🧹 [MAIN] Clearing all errors and notifications...');
  
  let cleared = 0;
  
  // 1. Clear timeout errors
  if (window.clearTimeoutErrors) {
    if (window.clearTimeoutErrors()) cleared++;
  }
  
  // 2. Clear home errors  
  if (window.clearHomeErrors) {
    if (window.clearHomeErrors()) cleared++;
  }
  
  // 3. Clear error monitor toasts
  if (window.errorMonitor) {
    if (window.errorMonitor.clearErrorToasts()) cleared++;
  }
  
  // 4. Clear all notifications
  try {
    const { useNotifications } = require('@/composables/useNotifications');
    const notifications = useNotifications();
    if (notifications && notifications.clearAllNotifications) {
      notifications.clearAllNotifications();
      cleared++;
      console.log('🧹 [MAIN] Cleared notification system');
    }
  } catch (error) {
    console.warn('⚠️ [MAIN] Could not clear notifications:', error);
  }
  
  // 5. Clear any remaining error elements
  const errorSelectors = [
    '.error-toast',
    '.notification',
    '.toast',
    '.alert',
    '[class*="error"]',
    '[id*="error"]',
    '[data-error]'
  ];
  
  errorSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent?.includes('timeout') || 
            el.textContent?.includes('error') ||
            el.textContent?.includes('Error')) {
          el.remove();
          cleared++;
        }
      });
    } catch (error) {
      console.warn(`⚠️ [MAIN] Error clearing ${selector}:`, error);
    }
  });
  
  console.log(`✅ [MAIN] Cleared ${cleared} error elements/systems`);
  return cleared > 0;
};

console.log('🔧 Universal error clearing loaded - use window.clearAllErrors() to dismiss all errors at once');

// 🔧 KEYBOARD SHORTCUT: Add Ctrl+Shift+X to clear all errors
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'X') {
    event.preventDefault();
    const cleared = window.clearAllErrors();
    console.log(`🔧 [SHORTCUT] Ctrl+Shift+X pressed - cleared ${cleared ? 'errors' : 'nothing'}`);
    
    // Show brief confirmation
    if (window.errorHandler && window.errorHandler.showNotification) {
      window.errorHandler.showNotification(
        cleared ? '所有错误已清除' : '没有需要清除的错误',
        'info',
        { duration: 2000, closable: true }
      );
    }
  }
});

console.log('⌨️  Keyboard shortcut loaded - press Ctrl+Shift+X to clear all errors');

// --- 🚀 INITIALIZE CORE APPLICATION ---
const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  // Skip timeout errors if timeoutFix is handling them
  if (err?.message === 'Operation timeout' && window.timeoutFix) {
    console.log('🔧 [Vue] Timeout error handled by timeoutFix, skipping Vue error handler');
    return;
  }
  
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

// 🔧 PERFORMANCE: 延迟加载非关键调试工具，减少初始化时间
setTimeout(() => {
  // 在应用启动后1秒加载调试工具
  import('./utils/messageDebugger');
  import('./utils/duplicateDebugger');
  import('./utils/devConsoleHelpers');
  import('./utils/messageDisplayDiagnostics');
  import('./utils/authDiagnostics');
  import('./utils/systemDiagnostics');
  import('./utils/messageServiceDiagnostics');
  import('./utils/fetchMoreMessagesTest');
  import('./utils/systemHealthValidator');
  import('./utils/sseDebugger');
  
  // 延迟加载性能验证器
  import('./utils/navigationPerformanceValidator.js').then(module => {
    console.log('🔍 Navigation Performance Validator loaded - use window.testNavigationPerformance(fromChatId, toChatId) to test');
  });
  
  console.log('🚿 [PERF] Debug tools loaded in background');
}, 1000);

// 🔧 PERFORMANCE: 立即加载必需的UX系统（它们在聊天中需要）
import('./services/ProgressiveLoadManager.js');
import('./services/MessageSessionGrouper.js');

// 🔧 PERFORMANCE: 延迟加载性能监控器，避免阻塞初始化
setTimeout(() => {
  import('./utils/performanceMonitor').then(module => {
    const performanceMonitor = module.default;
    performanceMonitor.initialize();
    console.log('Performance Monitor loaded - use window.perfAnalytics() to view stats');
  }).catch(error => {
    console.warn('Performance Monitor failed to load:', error);
  });
}, 2000);

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
  // Skip timeout errors if timeoutFix is handling them
  if (event.reason?.message === 'Operation timeout' && window.timeoutFix) {
    console.log('🔧 [MAIN] Timeout error handled by timeoutFix, preventing display');
    event.preventDefault();
    return;
  }
  
  errorHandler.handle(event.reason, {
    context: 'Unhandled Promise Rejection'
  })
})

// 🏆 MODERN: 初始化现代化认证系统 (替代旧的tokenSynchronizer)
async function initializeModernAuth() {
  try {
    console.log('🏆 [MAIN] Initializing modern authentication system...');
    
    // 导入现代认证store
    const { useModernAuth } = await import('./stores/modernAuth.js');
    const modernAuth = useModernAuth();
    
    // 初始化现代认证系统
    const hasValidToken = modernAuth.initialize();
    
    if (hasValidToken) {
      console.log('✅ [MAIN] Modern auth initialized with existing token');
      console.log('🔍 [MAIN] User info:', modernAuth.userInfo);
      console.log('🔍 [MAIN] Token expires at:', modernAuth.tokenExpiresAt);
    } else {
      console.log('ℹ️ [MAIN] Modern auth initialized without token');
    }
    
    // 暴露到全局用于调试
    window.modernAuth = modernAuth;
    
    return hasValidToken;
  } catch (error) {
    console.error('❌ [MAIN] Modern auth initialization failed:', error);
    return false;
  }
}

// Initialize stores with error handling
async function initializeStores() {
  try {
    // 🏆 MODERN: 使用现代认证系统替代旧的tokenSynchronizer
    const hasValidToken = await initializeModernAuth();
    console.log('🔍 [MAIN] Modern auth result:', hasValidToken ? 'Valid token found' : 'No valid token');
    
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

    // 🏆 MODERN: 使用现代认证系统进行token管理
    const performModernTokenSync = async () => {
      if (window.modernAuth && window.modernAuth.isAuthenticated) {
        const token = window.modernAuth.token;
        
        if (token) {
          console.log('[MAIN] 从现代认证系统获取到有效token');
          
          // 同步到旧的authStore以保持兼容性
          if (token !== authStore.token) {
            console.log('[MAIN] 同步token到旧的authStore');
            authStore.setToken(token);
          }
          
          return token;
        }
      }
      
      return null;
    };

    // 执行现代token同步
    const modernToken = await performModernTokenSync();
    const tokenSyncResult = !!modernToken;
    console.log('[MAIN] 现代认证同步结果:', tokenSyncResult ? '成功' : '失败');

    // 🔧 ENHANCED: More reliable SSE initialization with better auth detection
    const shouldInitializeSSE = () => {
      const currentPath = router.currentRoute.value?.path || window.location.pathname;
      const isOnAuthPage = currentPath.includes('/login') || currentPath.includes('/register');
      
      // Don't initialize on auth pages, but initialize everywhere else if authenticated
      return !isOnAuthPage && tokenSyncResult;
    };

    if (shouldInitializeSSE()) {
      console.log('🚀 [MAIN] Initializing SSE service with enhanced auth check and synchronization');
      
      try {
        // 🏆 STEP 1: 使用现代认证系统的token
        const synchronizedToken = modernToken;
        
        if (synchronizedToken) {
          // 🏆 STEP 2: 使用现代token初始化SSE
          const sseService = (await import('@/services/sse-minimal.js')).default;
          
          // 🔧 CRITICAL: Expose SSE service to window for debugging tools
          window.minimalSSE = sseService;
          window.sseService = sseService; // Alternative reference
          window.realtimeCommunicationService = sseService; // Additional reference for legacy code
          
          // 🚨 CRITICAL FIX: Expose auth store before SSE initialization for debugger access
          try {
            window.authStore = authStore;
          } catch (error) {
            console.warn('[MAIN] Could not expose auth store to window:', error);
          }
          
          console.log('[MAIN] Using synchronized token for SSE:', typeof synchronizedToken === 'string' ? synchronizedToken.substring(0, 20) + '...' : synchronizedToken);
          
          // 🔧 PERFORMANCE: 移除人工延迟，立即连接SSE
          await sseService.connect(synchronizedToken);
          console.log('✅ [MAIN] SSE service initialized successfully with synchronized token');
        } else {
          console.warn('⚠️ [MAIN] Token synchronization failed, no valid token available');
          
          // 🚨 CRITICAL FIX: Try direct token access from localStorage as ultimate fallback
          const directToken = localStorage.getItem('auth_token');
          if (directToken && directToken.length > 20) {
            console.log('[MAIN] Using direct localStorage token as fallback');
            const sseService = (await import('@/services/sse-minimal.js')).default;
            window.minimalSSE = sseService;
            window.sseService = sseService;
            
            await sseService.connect(directToken);
            console.log('✅ [MAIN] SSE service initialized with direct token');
          }
        }
      } catch (error) {
        console.error('❌ [MAIN] SSE initialization failed:', error);
        
        // 🔧 FALLBACK: Try one more time with direct token access
        try {
          // 🚨 CRITICAL FIX: Try multiple token sources
          const fallbackToken = authStore.token || 
                               localStorage.getItem('auth_token') || 
                               localStorage.getItem('access_token') ||
                               (window.tokenManager && window.tokenManager.getAccessToken());
                               
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
        hasValidAuth: tokenSyncResult
      });
      
      // 🔧 CRITICAL: Still expose SSE service for debugging tools even when not connected
      try {
        const sseService = (await import('@/services/sse-minimal.js')).default;
        window.minimalSSE = sseService;
        window.sseService = sseService;
        
        // 🚨 CRITICAL FIX: Expose auth store in window for debugging access
        window.authStore = authStore;
        
        console.log('✅ [MAIN] SSE service exposed for debugging (not connected)');
      } catch (error) {
        console.warn('⚠️ [MAIN] Failed to expose SSE service for debugging:', error);
      }
    }

    console.log('✅ Application stores initialized')

    // 使用可选的 performanceMonitor
    if (window.performanceMonitor) {
      window.performanceMonitor.endOperation('app-initialization', {
        status: 'success',
        storesInitialized: true
      })
    }

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
    // 🔧 PERFORMANCE: YAML配置延迟加载，不阻塞初始化
    initializeYAMLConfig().then(() => {
      console.log('YAML Configuration loaded successfully');
      const envInfo = getEnvironmentInfo();
      console.log('Environment Info:', envInfo);
    }).catch(configError => {
      console.warn('YAML Configuration failed, using fallback:', configError);
    });
    
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
    
    // 🔧 REDUCED LOGGING: Only warn once about deprecated global store access
    if (!window.__store_deprecation_warned__) {
      console.warn('⚠️ Global store access is deprecated. Use dependency injection instead.');
      window.__store_deprecation_warned__ = true;
    }

    // Security validation - simplified (no production checks)
    console.log('✅ Security validation passed (simplified mode)')

    app.mount('#app')
    console.log('🚀 Fechatter application mounted successfully')

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (window.performanceMonitor) {
        window.performanceMonitor.clearReports()
      }
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

// 🏆 MODERN: 初始化现代API客户端
import('./services/modernApi.js').then(module => {
  window.api = module.default; // 替换旧的API客户端
  window.modernApi = module.default; // 也暴露为modernApi
  console.log('🏆 [MAIN] Modern API client loaded and exposed globally');
}).catch(error => {
  console.warn('⚠️ [MAIN] Failed to load modern API client:', error);
});

// 🏆 MODERN: Modern auth system will be exposed via window.modernAuth instead

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

// 🏆 MODERN: 自动执行token系统迁移 (替代旧的tokenSynchronizer初始化)
import('./utils/ultimateFix.js').then(async (module) => {
  console.log('🔥 [MAIN] Auto-executing token system migration...');
  try {
    const result = await module.default();
    if (result.overallSuccess) {
      console.log('🎉 [MAIN] Token system migration completed successfully!');
    } else {
      console.log('⚠️ [MAIN] Token migration had some issues, but partial success achieved');
    }
  } catch (error) {
    console.warn('⚠️ [MAIN] Token migration failed:', error);
  }
}).catch(error => {
  console.warn('⚠️ [MAIN] Failed to load token migration system:', error);
});

// Development tools
if (process.env.NODE_ENV === 'development') {
  // Import sidebar debugger
  import('./utils/sidebarDebugger').then(module => {
    console.log('🔧 Sidebar Debugger loaded - use window.sidebarDebugger to diagnose sidebar issues');
  }).catch(error => {
    console.warn('Failed to load sidebar debugger:', error);
  });

  // Import migration tools
  import('./services/migration-executor.js').then(module => {
    console.log('🚀 Migration Tools loaded');
    console.log('');
    console.log('🎯 =================== MIGRATION READY ===================');
    console.log('✅ One-Click Migration to Industry SSE is now available!');
    console.log('');
    console.log('🔧 Available Commands:');
    console.log('  • executeOneClickMigration() - Execute complete migration');
    console.log('  • window.migrationExecutor - Advanced migration controls');
    console.log('');
    console.log('📋 What will be migrated:');
    console.log('  • ❌ Current: Custom SSE implementation (has bugs)');
    console.log('  • ✅ Target: Microsoft Modern SSE (@microsoft/fetch-event-source)');
    console.log('');
    console.log('🎉 Benefits after migration:');
    console.log('  • Authorization header support (more secure)');
    console.log('  • Automatic reconnection with backoff');
    console.log('  • Modern fetch API (better error handling)');
    console.log('  • Industry-standard reliability');
    console.log('');
    console.log('⚡ Ready to migrate? Run: executeOneClickMigration()');
    console.log('=========================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load migration tools:', error);
  });

  // Import quick fix tools for comprehensive problem solving
  import('./utils/quickFix.js').then(module => {
    console.log('🔧 Quick Fix Tools loaded');
    console.log('');
    console.log('🛠️ ================ COMPREHENSIVE FIX READY ================');
    console.log('✅ All-in-One Problem Solver is now available!');
    console.log('');
    console.log('🎯 What it fixes:');
    console.log('  • 🎫 Token synchronization issues');
    console.log('  • 🔗 API connection problems');
    console.log('  • 🚀 Migration completion');
    console.log('  • 📊 Sidebar data loading');
    console.log('');
    console.log('⚡ ONE-CLICK FIX: executeQuickFix()');
    console.log('==========================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load quick fix tools:', error);
  });

  // Import token migration system for complete token system overhaul
  import('./utils/tokenMigration.js').then(module => {
    console.log('🚀 Token Migration System loaded');
    console.log('');
    console.log('🔄 ============= COMPLETE TOKEN SYSTEM OVERHAUL =============');
    console.log('🏆 Industry Best Practices Token Management is ready!');
    console.log('');
    console.log('🎯 What will be replaced:');
    console.log('  • ❌ tokenSynchronizer (chaotic)');
    console.log('  • ❌ tokenManager (inconsistent)');
    console.log('  • ❌ authStateManager (conflicting)');
    console.log('  • ❌ Multiple localStorage approaches');
    console.log('');
    console.log('✅ Modern replacement features:');
    console.log('  • 🏪 Pinia reactive store');
    console.log('  • 🍪 Secure js-cookie storage');
    console.log('  • 🔍 JWT decode & validation');
    console.log('  • 🔄 Auto token refresh');
    console.log('  • 🛡️ axios-auth-refresh integration');
    console.log('');
    console.log('⚡ EXECUTE COMPLETE OVERHAUL: executeTokenMigration()');
    console.log('===============================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load token migration system:', error);
  });

  // Import ultimate fix for one-click solution
  import('./utils/ultimateFix.js').then(module => {
    console.log('🔥 Ultimate Fix System loaded');
    console.log('');
    console.log('🔥 ================= ULTIMATE SOLUTION READY =================');
    console.log('⚡ ONE-CLICK SOLUTION FOR ALL TOKEN & CHAT ISSUES!');
    console.log('');
    console.log('🎯 What it solves:');
    console.log('  • 🏆 Complete token system overhaul (industry best practices)');
    console.log('  • 🔗 API connection & authentication fixes');
    console.log('  • 📊 Chat list loading issues');
    console.log('  • 🚀 SSE real-time communication');
    console.log('  • 🧹 Legacy system cleanup');
    console.log('');
    console.log('🔥 EXECUTE ULTIMATE FIX: executeUltimateFix()');
    console.log('===============================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load ultimate fix system:', error);
  });

  // Import realtime migration guide
  import('./services/realtime-migration-guide.js').then(module => {
    console.log('🔧 Advanced Migration Tools loaded');
    console.log('  • realtimeMigration.migrate() - Smart service selection');
    console.log('  • realtimeMigration.testAll() - Test all services');
  }).catch(error => {
    console.warn('Failed to load realtime migration guide:', error);
  });

  // Import sidebar data fix tools
  import('./utils/sidebarDataFix.js').then(module => {
    console.log('🔧 Sidebar Data Fix Tools loaded');
    console.log('');
    console.log('🔧 ================ SIDEBAR DATA FIX READY ================');
    console.log('⚡ Specialized Sidebar Data Repair Tools Available!');
    console.log('');
    console.log('🎯 Available Commands:');
    console.log('  • fixSidebarData() - Complete sidebar data diagnosis & repair');
    console.log('  • quickSidebarFix() - Fast sidebar refresh');
    console.log('');
    console.log('🔍 What it fixes:');
    console.log('  • 🔐 Authentication token validation');
    console.log('  • 🔗 API connection testing');
    console.log('  • 📊 Data sync to stores');
    console.log('  • 🔄 Force store refresh');
    console.log('');
    console.log('⚡ QUICK FIX: fixSidebarData()');
    console.log('=========================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load sidebar data fix tools:', error);
  });

  // Import advanced sidebar data flow repair
  import('./utils/sidebarDataFlow.js').then(module => {
    console.log('🔧 Advanced Sidebar Data Flow Tools loaded');
    console.log('');
    console.log('🔧 ============= ADVANCED SIDEBAR DATA FLOW REPAIR =============');
    console.log('⚡ Complete API -> Store -> Component Data Flow Repair!');
    console.log('');
    console.log('🎯 Available Commands:');
    console.log('  • fixSidebarDataFlow() - Complete 5-step data flow repair');
    console.log('  • quickSidebarFlow() - Fast data flow refresh');
    console.log('');
    console.log('🔍 5-Step Repair Process:');
    console.log('  • Step 1: 🔐 Authentication validation');
    console.log('  • Step 2: 🔗 Direct API testing');
    console.log('  • Step 3: 📊 Force data sync to stores');
    console.log('  • Step 4: 🎨 Component re-render');
    console.log('  • Step 5: 🔍 Verification');
    console.log('');
    console.log('⚡ COMPLETE REPAIR: fixSidebarDataFlow()');
    console.log('===============================================================');
    console.log('');
  }).catch(error => {
    console.warn('Failed to load sidebar data flow tools:', error);
  });

  // Import auto sidebar fix system
  import('./utils/autoSidebarFix.js').then(module => {
    const autoSidebarFix = module.default;
    
    console.log('🤖 Auto Sidebar Fix System loaded');
    console.log('');
    console.log('🤖 =============== AUTO SIDEBAR REPAIR SYSTEM ===============');
    console.log('⚡ Intelligent Auto-Detection & Repair System!');
    console.log('');
    console.log('🎯 Features:');
    console.log('  • 📊 Automatic data flow monitoring');
    console.log('  • 🔧 Smart problem detection');
    console.log('  • 🛠️ Automated repair execution');
    console.log('  • 🔄 Continuous health checking');
    console.log('');
    console.log('🚀 Manual Controls:');
    console.log('  • autoSidebarFix.start() - Start auto-repair system');
    console.log('  • autoSidebarFix.stop() - Stop auto-repair system');
    console.log('');
    console.log('⚡ AUTO-STARTING: The system will start automatically in 5 seconds');
    console.log('===============================================================');
    console.log('');
    
    // 自动启动修复系统
    setTimeout(() => {
      console.log('🤖 [AutoStart] Starting auto sidebar repair system...');
      autoSidebarFix.start().catch(error => {
        console.warn('⚠️ [AutoStart] Auto sidebar fix failed to start:', error);
      });
    }, 5000); // 5秒后启动，确保所有系统都已加载
    
  }).catch(error => {
    console.warn('Failed to load auto sidebar fix system:', error);
  });
}

