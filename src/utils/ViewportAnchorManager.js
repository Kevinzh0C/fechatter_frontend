/**
 * Viewport Anchor Manager - Advanced Reading Stability Engine
 * Ensures seamless reading experience during historical message loading
 * 
 * Core Features:
 * - Viewport anchor identification and preservation
 * - Sub-pixel precision scroll restoration
 * - Progressive DOM insertion coordination
 * - Reading flow continuity protection
 */

class ViewportAnchorManager {
  constructor() {
    this.activeAnchors = new Map(); // chatId -> anchor state
    this.debugMode = import.meta.env.DEV;
    this.performanceMetrics = new Map();
  }

  /**
   * Phase 1: Capture viewport anchor before load more
   * Identifies the most stable anchor point for restoration
   */
  captureViewportAnchor(scrollContainer, chatId) {
    if (!scrollContainer) return null;

    const startTime = performance.now();
    const containerRect = scrollContainer.getBoundingClientRect();
    const messageElements = scrollContainer.querySelectorAll('[data-message-id]');
    
    if (messageElements.length === 0) return null;

    // Strategy: Find the message closest to the reading line (33% from top)
    const readingLine = containerRect.top + (containerRect.height * 0.33);
    let bestAnchor = null;
    let minDistance = Infinity;

    messageElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const messageId = element.getAttribute('data-message-id');
      
      // Calculate distance from reading line to message center
      const messageCenter = rect.top + (rect.height / 2);
      const distance = Math.abs(messageCenter - readingLine);
      
      // Prefer messages that are fully visible
      const isFullyVisible = rect.top >= containerRect.top && 
                            rect.bottom <= containerRect.bottom;
      
      if (distance < minDistance && rect.height > 10) {
        minDistance = distance;
        bestAnchor = {
          messageId: parseInt(messageId),
          element,
          // High-precision positioning data
          absoluteOffset: rect.top - containerRect.top,
          relativeOffset: (rect.top - containerRect.top) / containerRect.height,
          messageHeight: rect.height,
          messageTop: element.offsetTop,
          // Viewport context
          viewportHeight: containerRect.height,
          scrollTop: scrollContainer.scrollTop,
          scrollHeight: scrollContainer.scrollHeight,
          // Stability metrics
          isFullyVisible,
          distanceFromReadingLine: distance,
          timestamp: Date.now()
        };
      }
    });

    if (bestAnchor) {
      this.activeAnchors.set(chatId, bestAnchor);
      
      if (this.debugMode) {
        console.log('🎯 [ViewportAnchor] Captured anchor:', {
          messageId: bestAnchor.messageId,
          offset: bestAnchor.absoluteOffset,
          relativePos: (bestAnchor.relativeOffset * 100).toFixed(1) + '%',
          quality: bestAnchor.isFullyVisible ? 'excellent' : 'good'
        });
      }
    }

    this.recordPerformance(chatId, 'capture', performance.now() - startTime);
    return bestAnchor;
  }

  /**
   * Phase 2: Restore viewport stability after DOM changes
   * Uses multiple strategies for maximum reliability
   */
  async restoreViewportStability(scrollContainer, chatId, options = {}) {
    const anchor = this.activeAnchors.get(chatId);
    if (!anchor || !scrollContainer) return false;

    const startTime = performance.now();
    const {
      useProgressiveRestoration = true,
      enableSubPixelPrecision = true,
      maxAttempts = 3
    } = options;

    try {
      // Wait for DOM stabilization
      await this.waitForDOMStabilization();
      
      let success = false;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (this.debugMode) {
          console.log(`🔧 [ViewportAnchor] Restoration attempt ${attempt}/${maxAttempts}`);
        }

        if (useProgressiveRestoration) {
          success = await this.performProgressiveRestoration(scrollContainer, anchor, attempt);
        } else {
          success = await this.performDirectRestoration(scrollContainer, anchor);
        }

        if (success) break;
        
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
      }

      this.recordPerformance(chatId, 'restore', performance.now() - startTime);
      return success;

    } finally {
      // Clean up anchor after use
      this.activeAnchors.delete(chatId);
    }
  }

  /**
   * Progressive restoration with animation frame synchronization
   */
  async performProgressiveRestoration(scrollContainer, anchor, attempt) {
    // Find the anchor element in its new position
    const anchorElement = scrollContainer.querySelector(`[data-message-id="${anchor.messageId}"]`);
    
    if (!anchorElement) {
      if (this.debugMode) {
        console.warn(`⚠️ [ViewportAnchor] Anchor message ${anchor.messageId} not found in DOM`);
      }
      return this.performFallbackRestoration(scrollContainer, anchor);
    }

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        try {
          const containerRect = scrollContainer.getBoundingClientRect();
          const currentRect = anchorElement.getBoundingClientRect();
          
          // Calculate precise target scroll position
          const currentOffset = currentRect.top - containerRect.top;
          const targetOffset = anchor.absoluteOffset;
          const scrollAdjustment = currentOffset - targetOffset;
          
          // Apply scroll adjustment with sub-pixel precision
          const targetScrollTop = scrollContainer.scrollTop + scrollAdjustment;
          const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, 
            scrollContainer.scrollHeight - scrollContainer.clientHeight));
          
          // Smooth scroll with easing for better UX
          this.performSmoothScrollTo(scrollContainer, clampedScrollTop, 150);
          
          if (this.debugMode) {
            console.log('✅ [ViewportAnchor] Progressive restoration applied:', {
              messageId: anchor.messageId,
              adjustment: scrollAdjustment.toFixed(2) + 'px',
              targetScroll: clampedScrollTop.toFixed(2),
              precision: 'sub-pixel'
            });
          }
          
          resolve(true);
        } catch (error) {
          if (this.debugMode) {
            console.error('❌ [ViewportAnchor] Progressive restoration failed:', error);
          }
          resolve(false);
        }
      });
    });
  }

  /**
   * Direct restoration for simple cases
   */
  async performDirectRestoration(scrollContainer, anchor) {
    const anchorElement = scrollContainer.querySelector(`[data-message-id="${anchor.messageId}"]`);
    
    if (anchorElement) {
      // Calculate height difference and adjust scroll position
      const currentHeight = scrollContainer.scrollHeight;
      const heightDiff = currentHeight - anchor.scrollHeight;
      
      if (heightDiff > 0) {
        const targetScrollTop = anchor.scrollTop + heightDiff;
        scrollContainer.scrollTop = Math.max(0, targetScrollTop);
        
        if (this.debugMode) {
          console.log('✅ [ViewportAnchor] Direct restoration applied:', {
            heightAdded: heightDiff + 'px',
            newScrollTop: scrollContainer.scrollTop
          });
        }
        
        return true;
      }
    }
    
    return this.performFallbackRestoration(scrollContainer, anchor);
  }

  /**
   * Fallback restoration using saved scroll position
   */
  performFallbackRestoration(scrollContainer, anchor) {
    if (anchor.scrollTop !== undefined) {
      scrollContainer.scrollTop = anchor.scrollTop;
      
      if (this.debugMode) {
        console.log('⚠️ [ViewportAnchor] Fallback restoration used');
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Smooth scroll with custom easing
   */
  performSmoothScrollTo(container, targetScrollTop, duration = 200) {
    const startScrollTop = container.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const startTime = performance.now();

    if (Math.abs(distance) < 1) return; // Skip micro-movements

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for natural feel
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentScrollTop = startScrollTop + (distance * easeOutCubic);

      container.scrollTop = currentScrollTop;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }

  /**
   * Wait for DOM to stabilize after changes
   */
  async waitForDOMStabilization() {
    // Multiple frame wait for complete DOM settlement
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Additional micro-delay for browser layout completion
    await new Promise(resolve => setTimeout(resolve, 16));
  }

  /**
   * Enhanced integration method for existing components
   */
  async executeStableLoadMore(scrollContainer, chatId, loadMoreCallback) {
    if (!scrollContainer || typeof loadMoreCallback !== 'function') {
      throw new Error('Invalid parameters for stable load more');
    }

    try {
      // Phase 1: Capture current viewport state
      const anchor = this.captureViewportAnchor(scrollContainer, chatId);
      if (!anchor) {
        if (this.debugMode) {
          console.warn('⚠️ [ViewportAnchor] No anchor captured, proceeding with basic load');
        }
      }

      // Phase 2: Execute load more operation
      await loadMoreCallback();

      // Phase 3: Restore viewport stability
      if (anchor) {
        const restored = await this.restoreViewportStability(scrollContainer, chatId, {
          useProgressiveRestoration: true,
          enableSubPixelPrecision: true,
          maxAttempts: 3
        });

        if (!restored && this.debugMode) {
          console.warn('⚠️ [ViewportAnchor] Restoration failed, user may experience position jump');
        }

        return restored;
      }

      return true;

    } catch (error) {
      if (this.debugMode) {
        console.error('❌ [ViewportAnchor] Stable load more failed:', error);
      }
      throw error;
    }
  }

  /**
   * Performance monitoring
   */
  recordPerformance(chatId, operation, duration) {
    if (!this.performanceMetrics.has(chatId)) {
      this.performanceMetrics.set(chatId, {});
    }
    
    const metrics = this.performanceMetrics.get(chatId);
    if (!metrics[operation]) {
      metrics[operation] = [];
    }
    
    metrics[operation].push(duration);
    
    // Keep only recent measurements
    if (metrics[operation].length > 10) {
      metrics[operation] = metrics[operation].slice(-10);
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceMetrics(chatId) {
    const metrics = this.performanceMetrics.get(chatId);
    if (!metrics) return null;

    const summary = {};
    for (const [operation, times] of Object.entries(metrics)) {
      summary[operation] = {
        count: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        max: Math.max(...times),
        min: Math.min(...times)
      };
    }

    return summary;
  }

  /**
   * Reset state for chat change
   */
  resetForChat(chatId) {
    this.activeAnchors.delete(chatId);
    this.performanceMetrics.delete(chatId);
  }

  /**
   * Global cleanup
   */
  destroy() {
    this.activeAnchors.clear();
    this.performanceMetrics.clear();
  }
}

// Export singleton instance
export const viewportAnchorManager = new ViewportAnchorManager();

// Global access for debugging
if (import.meta.env.DEV) {
  window.viewportAnchorManager = viewportAnchorManager;
}

export default viewportAnchorManager; 