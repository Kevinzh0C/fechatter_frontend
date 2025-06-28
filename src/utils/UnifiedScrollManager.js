/**
 * 🎯 SIMPLIFIED UnifiedScrollManager - Performance Optimized
 * Eliminates forced reflows and complex DOM operations
 */

class SimplifiedScrollManager {
  constructor() {
    this.chatInstances = new Map();
    this.isLoading = false;
    console.log('[SimplifiedScroll] Manager initialized with minimal overhead');
  }

  registerChat(chatId, scrollContainer, options = {}) {
    if (!scrollContainer) return null;
    
    const instance = new SimpleScrollInstance(chatId, scrollContainer, options);
    this.chatInstances.set(chatId, instance);
    
    console.log(`[SimplifiedScroll] Registered chat ${chatId}`);
    return instance;
  }

  unregisterChat(chatId) {
    const instance = this.chatInstances.get(chatId);
    if (instance) {
      instance.destroy();
      this.chatInstances.delete(chatId);
    }
  }
}

class SimpleScrollInstance {
  constructor(chatId, scrollContainer, options = {}) {
    this.chatId = chatId;
    this.scrollContainer = scrollContainer;
    this.options = options;
    this.destroyed = false;
    
    // 🎯 MINIMAL: Only capture essential position data
    this.savedPosition = null;
    
    this.config = {
      nearBottomThreshold: 150,
      historyLoadThreshold: 200,
      ...options
    };
    
    this.setupMinimalListeners();
  }

  setupMinimalListeners() {
    if (!this.scrollContainer || this.destroyed) return;
    
    // 🎯 PERFORMANCE: Throttled scroll handler
    let scrollTimer = null;
    this.scrollHandler = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => this.handleScroll(), 32); // 30fps, lighter load
    };
    
    this.scrollContainer.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  handleScroll() {
    if (!this.scrollContainer || this.destroyed) return;
    
    try {
      const { scrollTop } = this.scrollContainer;
      
      if (scrollTop <= this.config.historyLoadThreshold && !this.isLoading) {
        this.triggerHistoryLoad();
      }
    } catch (error) {
      // Silent error handling
    }
  }

  async triggerHistoryLoad() {
    if (this.isLoading || !this.options.onLoadMore) return;
    
    this.isLoading = true;
    
    try {
      // 🎯 MINIMAL: Capture only scroll position (no complex anchoring)
      this.savedPosition = {
        scrollTop: this.scrollContainer.scrollTop,
        scrollHeight: this.scrollContainer.scrollHeight,
        timestamp: Date.now()
      };
      
      console.log(`[SimplifiedScroll:${this.chatId}] Captured position: ${this.savedPosition.scrollTop}px`);
      
      // Trigger loading
      await this.options.onLoadMore();
      
      // 🎯 PERFORMANCE: Single requestAnimationFrame for position restore
      requestAnimationFrame(() => {
        this.restoreSimplePosition();
      });
      
    } catch (error) {
      console.warn(`[SimplifiedScroll:${this.chatId}] History load failed:`, error);
    } finally {
      this.isLoading = false;
    }
  }

  restoreSimplePosition() {
    if (!this.savedPosition || !this.scrollContainer) return;
    
    try {
      const container = this.scrollContainer;
      const saved = this.savedPosition;
      
      // 🎯 SIMPLE: Calculate height difference and adjust
      const heightDifference = container.scrollHeight - saved.scrollHeight;
      const targetScrollTop = saved.scrollTop + heightDifference;
      
      // 🎯 PERFORMANCE: Single DOM write, no validation loops
      container.scrollTop = Math.max(0, targetScrollTop);
      
      console.log(`[SimplifiedScroll:${this.chatId}] Position restored: ${saved.scrollTop} -> ${container.scrollTop} (+${heightDifference}px)`);
      
    } catch (error) {
      console.warn(`[SimplifiedScroll:${this.chatId}] Position restore failed:`, error);
    } finally {
      this.savedPosition = null;
    }
  }

  async scrollToBottom(smooth = false) {
    if (!this.scrollContainer || this.destroyed) return;
    
    try {
      const container = this.scrollContainer;
      const targetScrollTop = container.scrollHeight - container.clientHeight;
      
      if (smooth) {
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = targetScrollTop;
      }
      
      console.log(`[SimplifiedScroll:${this.chatId}] Scrolled to bottom`);
    } catch (error) {
      // Silent error handling
    }
  }

  handleNewMessage() {
    if (!this.scrollContainer || this.destroyed || this.isLoading) return;
    
    // 🎯 NEW: Check for active user scrolling to prevent conflicts
    const isUserActivelyScrolling = window.lastUserScrollTime && 
                                   (Date.now() - window.lastUserScrollTime < 2000);
    
    if (isUserActivelyScrolling) {
      console.log(`[SimplifiedScroll:${this.chatId}] Skipping auto-scroll - user actively scrolling`);
      return;
    }
    
    // Auto-scroll if near bottom
    if (this.isNearBottom()) {
      this.scrollToBottom(false);
    }
  }

  isNearBottom() {
    if (!this.scrollContainer || this.destroyed) return false;
    
    try {
      const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;
      return scrollHeight - scrollTop - clientHeight <= this.config.nearBottomThreshold;
    } catch (error) {
      return false;
    }
  }

  pauseLoadMore(reason) {
    this.isLoading = true;
    console.log(`[SimplifiedScroll:${this.chatId}] Load more paused: ${reason}`);
  }

  resumeLoadMore() {
    this.isLoading = false;
    console.log(`[SimplifiedScroll:${this.chatId}] Load more resumed`);
  }

  destroy() {
    this.destroyed = true;
    
    if (this.scrollContainer && this.scrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    }
    
    this.scrollContainer = null;
    this.scrollHandler = null;
    this.savedPosition = null;
  }
}

// Create singleton instance
export const unifiedScrollManager = new SimplifiedScrollManager();

// Browser environment only
if (typeof window !== 'undefined') {
  window.unifiedScrollManager = unifiedScrollManager;
}

export default unifiedScrollManager; 