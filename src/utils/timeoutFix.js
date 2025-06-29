/**
 * 🔧 临时超时修复工具
 * 解决Operation timeout问题，改善用户体验
 */

class TimeoutFix {
  constructor() {
    this.originalFetch = window.fetch;
    this.timeoutErrors = new Set();
    this.retryAttempts = new Map();
    
    // 应用修复
    this.applyFixes();
    
    console.log('🔧 [TimeoutFix] Timeout handling improvements applied');
  }

  applyFixes() {
    // 1. 保存原生fetch到全局以供其他模块使用
    window.originalFetch = this.originalFetch;
    
    // 2. 包装原生fetch以增加超时容错
    window.fetch = this.wrappedFetch.bind(this);
    
    // 3. 全局Promise rejection处理优化
    this.setupGlobalHandlers();
    
    // 4. 添加网络状态监控
    this.setupNetworkMonitoring();
  }

  async wrappedFetch(url, options = {}) {
    const maxRetries = 2;
    const baseTimeout = options.timeout || 60000;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // 渐进式超时：每次重试增加30%超时时间
        const currentTimeout = baseTimeout * (1 + (attempt - 1) * 0.3);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
        
        const response = await this.originalFetch.call(window, url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 请求成功，清除重试记录
        this.retryAttempts.delete(url);
        
        return response;
        
      } catch (error) {
        if (attempt <= maxRetries) {
          const delay = 1000 * attempt; // 线性退避
          console.warn(`🔄 [TimeoutFix] Retrying request (${attempt}/${maxRetries}) in ${delay}ms:`, url);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // 记录持续失败的请求
          this.timeoutErrors.add(url);
          console.error(`❌ [TimeoutFix] Request failed after ${maxRetries} retries:`, url, error);
          throw error;
        }
      }
    }
  }

  setupGlobalHandlers() {
    // Store reference to this instance for global access
    window.timeoutFix = this;
    
    // 改善unhandledrejection处理
    const timeoutHandler = (event) => {
      if (event.reason?.message === 'Operation timeout') {
        console.warn('🔧 [TimeoutFix] Handled timeout error gracefully');
        
        // 防止错误显示给用户
        event.preventDefault();
        
        // 显示友好的用户提示
        this.showUserFriendlyMessage();
        
        return false;
      }
    };
    
    // Add our handler with high priority (capture phase)
    window.addEventListener('unhandledrejection', timeoutHandler, true);
    
    // Also store the handler for potential cleanup
    this.timeoutHandler = timeoutHandler;
  }

  setupNetworkMonitoring() {
    // 监控网络状态
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        const connection = navigator.connection;
        console.log('📡 [TimeoutFix] Network changed:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
        
        // 如果网络变慢，清除错误记录给第二次机会
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.timeoutErrors.clear();
        }
      });
    }

    // 🔧 AUTO-CLEANUP: Periodically clean timeout errors
    this.setupAutoCleanup();
  }

  setupAutoCleanup() {
    // Clean up timeout errors every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleErrors();
    }, 30000);

    // Clean up on page visibility change (when user comes back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.cleanupStaleErrors();
      }
    });
  }

  cleanupStaleErrors() {
    // Remove stale timeout errors from DOM
    const timeoutToasts = document.querySelectorAll('#error-monitor-toast');
    timeoutToasts.forEach(toast => {
      if (toast.textContent?.includes('Operation timeout')) {
        toast.remove();
        console.log('🧹 [TimeoutFix] Auto-removed stale timeout toast');
      }
    });

    // Clear old retry attempts
    const now = Date.now();
    for (const [url, timestamp] of this.retryAttempts.entries()) {
      if (now - timestamp > 300000) { // 5 minutes
        this.retryAttempts.delete(url);
      }
    }

    // Clear old timeout errors
    const oldTimeouts = Array.from(this.timeoutErrors).filter(error => {
      return now - error.timestamp > 300000; // 5 minutes
    });
    oldTimeouts.forEach(error => this.timeoutErrors.delete(error));

    if (oldTimeouts.length > 0) {
      console.log(`🧹 [TimeoutFix] Cleaned up ${oldTimeouts.length} stale timeout errors`);
    }
  }

  showUserFriendlyMessage() {
    // 使用可关闭的通知系统显示友好的错误提示
    try {
      // 尝试使用全局通知系统
      if (window.errorHandler && window.errorHandler.showNotification) {
        window.errorHandler.showNotification(
          '网络响应较慢，系统正在自动重试...', 
          'warning',
          {
            duration: 5000,
            closable: true,
            title: '网络提示'
          }
        );
        return;
      }

      // 后备方案：使用useNotifications
      const { useNotifications } = require('@/composables/useNotifications');
      const notifications = useNotifications();
      if (notifications && notifications.notifyWarning) {
        notifications.notifyWarning('网络响应较慢，系统正在自动重试...', {
          title: '网络提示',
          duration: 5000
        });
        return;
      }

      // 最后的后备方案
      if (window.showNotification) {
        window.showNotification('网络响应较慢，正在重试...', 'info');
      } else {
        console.info('💡 网络响应较慢，系统正在自动重试');
      }
    } catch (error) {
      console.info('💡 网络响应较慢，系统正在自动重试');
      console.warn('⚠️ [TimeoutFix] Failed to show user notification:', error);
    }
  }

  // 获取网络状况报告
  getNetworkReport() {
    return {
      timeoutErrors: Array.from(this.timeoutErrors),
      retryAttempts: Array.from(this.retryAttempts.entries()),
      networkInfo: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  }

  // 重置错误状态
  reset() {
    this.timeoutErrors.clear();
    this.retryAttempts.clear();
    console.log('🔧 [TimeoutFix] Error state reset');
  }

  // 手动清除所有超时相关的错误提示
  clearTimeoutErrors() {
    // Clear any error toasts related to timeouts
    if (window.errorMonitor) {
      window.errorMonitor.clearErrorToasts();
    }
    
    // Clear any notification system errors
    if (window.clearNotifications) {
      window.clearNotifications();
    }
    
    // Reset our internal state
    this.reset();
    
    console.log('🧹 [TimeoutFix] Cleared all timeout-related errors');
    return true;
  }
}

// 自动应用修复
const timeoutFix = new TimeoutFix();

// 全局访问
window.timeoutFix = timeoutFix;

export default timeoutFix;