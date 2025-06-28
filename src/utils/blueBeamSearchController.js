/**
 * 🔵⚡ Blue Beam Search Controller
 * Advanced blue light beam effects for search message targeting
 * Production-grade visual feedback system with sci-fi aesthetics
 */

class BlueBeamSearchController {
  constructor() {
    this.activeTargets = new Set()
    this.cleanupTimers = new Map()
    this.isEnabled = true
    this.defaultDuration = 5000
    this.intenseDuration = 7000
    
    // Performance optimization
    this.animationFrame = null
    this.lastSearchQuery = null
    
    console.log('[BlueBeam] 🔵 Blue Beam Search Controller initialized')
  }

  /**
   * 🎯 Apply blue beam target effect to a message
   */
  async applyBlueBeamTarget(messageElement, options = {}) {
    if (!this.isEnabled || !messageElement) {
      console.warn('[BlueBeam] Controller disabled or invalid element')
      return { success: false, reason: 'disabled_or_invalid' }
    }

    const {
      intensity = 'normal',
      searchQuery = null,
      duration = null,
      scrollBehavior = 'smooth',
      showIndicator = true,
      autoCleanup = true
    } = options

    try {
      this.clearAllBlueBeams()

      const messageId = messageElement.dataset.messageId || 
                       messageElement.id || 
                       `msg-${Date.now()}`

      const effectClass = intensity === 'intense' ? 'blue-beam-intense' : 'blue-beam-target'
      messageElement.classList.add(effectClass)

      // 🔧 Simplified: Ensure proper positioning for top-right indicator
      this.ensureProperPositioning(messageElement)

      if (searchQuery) {
        await this.applyBlueSearchHighlight(messageElement, searchQuery)
      }

      if (scrollBehavior) {
        await this.scrollToBlueBeamTarget(messageElement, scrollBehavior)
      }

      this.activeTargets.add(messageId)

      const effectDuration = duration || 
                            (intensity === 'intense' ? this.intenseDuration : this.defaultDuration)
      
      if (autoCleanup) {
        this.scheduleBlueBeamCleanup(messageElement, messageId, effectDuration)
      }

      console.log(`[BlueBeam] 🎯 Applied ${effectClass} with top-right indicator`)

      return {
        success: true,
        messageId,
        effectClass,
        duration: effectDuration,
        hasSearchHighlight: !!searchQuery,
        hasBreathingBorder: true,
        indicatorPosition: 'top-right'
      }

    } catch (error) {
      console.error('[BlueBeam] Failed to apply blue beam effect:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🔧 Simplified: Ensure proper positioning for top-right indicator
   */
  ensureProperPositioning(messageElement) {
    try {
      // Ensure the message element has relative positioning for absolute indicator
      const computedStyle = window.getComputedStyle(messageElement)
      if (computedStyle.position === 'static') {
        messageElement.style.position = 'relative'
      }

      // Ensure overflow is visible for indicator
      messageElement.style.overflow = 'visible'
      
      console.log('[BlueBeam] 🔧 Positioning optimized for top-right indicator')

    } catch (error) {
      console.warn('[BlueBeam] Failed to optimize positioning:', error)
    }
  }

  /**
   * 🔍 Apply blue search term highlighting
   */
  async applyBlueSearchHighlight(messageElement, searchQuery) {
    if (!searchQuery || typeof searchQuery !== 'string') return

    try {
      // Find text content elements in the message
      const textElements = messageElement.querySelectorAll(
        '.message-content, .message-text, .result-content, .discord-message-content, .message-body'
      )

      for (const textElement of textElements) {
        const originalText = textElement.textContent
        if (!originalText) continue

        // Store original content for restoration
        textElement.setAttribute('data-original-blue-content', originalText)

        // Create highlighted HTML with blue highlighting
        const highlightedHTML = this.createBlueHighlightHTML(originalText, searchQuery)
        textElement.innerHTML = highlightedHTML
      }

      console.log(`[BlueBeam] 🔍 Applied blue search highlighting for query: "${searchQuery}"`)
    } catch (error) {
      console.warn('[BlueBeam] Search highlighting failed:', error)
    }
  }

  /**
   * 🎨 Create blue highlighted HTML
   */
  createBlueHighlightHTML(text, searchQuery) {
    if (!text || !searchQuery) return text

    // Escape special regex characters
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Create case-insensitive regex
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    
    // Replace matches with blue highlighting
    return text.replace(regex, '<span class="blue-search-highlight">$1</span>')
  }

  /**
   * 📍 Scroll to blue beam target
   */
  async scrollToBlueBeamTarget(messageElement, behavior = 'smooth') {
    return new Promise((resolve) => {
      try {
        // Calculate optimal scroll position
        const elementRect = messageElement.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const isInViewport = elementRect.top >= 0 && elementRect.bottom <= viewportHeight

        let scrollOptions = {
          behavior,
          block: 'center',
          inline: 'nearest'
        }

        // If already in viewport, use gentle positioning
        if (isInViewport) {
          scrollOptions.block = 'nearest'
        }

        // Perform scroll
        messageElement.scrollIntoView(scrollOptions)

        // Wait for scroll completion
        const scrollContainer = this.findScrollContainer(messageElement)
        if (scrollContainer) {
          const onScrollEnd = () => {
            scrollContainer.removeEventListener('scrollend', onScrollEnd)
            console.log('[BlueBeam] 📍 Scroll to blue beam target completed')
            resolve()
          }

          scrollContainer.addEventListener('scrollend', onScrollEnd)
          
          // Fallback timer
          setTimeout(onScrollEnd, 1000)
        } else {
          setTimeout(resolve, 300)
        }

      } catch (error) {
        console.warn('[BlueBeam] Scroll to target failed:', error)
        resolve()
      }
    })
  }

  /**
   * 🔍 Find appropriate scroll container
   */
  findScrollContainer(element) {
    const selectors = [
      '.simple-message-list',
      '.messages-container', 
      '.discord-message-list',
      '.message-list',
      '.chat-container'
    ]

    for (const selector of selectors) {
      const container = element.closest(selector)
      if (container) return container
    }

    return document.documentElement
  }

  /**
   * ⏰ Schedule blue beam cleanup
   */
  scheduleBlueBeamCleanup(messageElement, messageId, duration) {
    // Clear existing timer if any
    if (this.cleanupTimers.has(messageId)) {
      clearTimeout(this.cleanupTimers.get(messageId))
    }

    // Set new cleanup timer
    const timerId = setTimeout(() => {
      this.removeBlueBeamEffect(messageElement, messageId)
    }, duration)

    this.cleanupTimers.set(messageId, timerId)
  }

  /**
   * 🧹 Remove blue beam effect from specific message
   */
  removeBlueBeamEffect(messageElement, messageId) {
    try {
      if (!messageElement) {
        messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      }

      if (messageElement) {
        // Remove blue beam classes
        messageElement.classList.remove('blue-beam-target', 'blue-beam-intense')

        // Restore original text content
        const highlightedElements = messageElement.querySelectorAll('[data-original-blue-content]')
        highlightedElements.forEach(el => {
          const originalContent = el.getAttribute('data-original-blue-content')
          if (originalContent) {
            el.textContent = originalContent
            el.removeAttribute('data-original-blue-content')
          }
        })

        console.log(`[BlueBeam] 🧹 Removed blue beam effect from message ${messageId}`)
      }

      // Clean up tracking
      this.activeTargets.delete(messageId)
      if (this.cleanupTimers.has(messageId)) {
        clearTimeout(this.cleanupTimers.get(messageId))
        this.cleanupTimers.delete(messageId)
      }

    } catch (error) {
      console.warn(`[BlueBeam] Failed to remove effect from ${messageId}:`, error)
    }
  }

  /**
   * 🧹 Clear all blue beam effects
   */
  clearAllBlueBeams() {
    try {
      // Remove all blue beam classes
      document.querySelectorAll('.blue-beam-target, .blue-beam-intense').forEach(el => {
        el.classList.remove('blue-beam-target', 'blue-beam-intense')
      })

      // Restore all highlighted text
      document.querySelectorAll('[data-original-blue-content]').forEach(el => {
        const originalContent = el.getAttribute('data-original-blue-content')
        if (originalContent) {
          el.textContent = originalContent
          el.removeAttribute('data-original-blue-content')
        }
      })

      // Clear all timers
      this.cleanupTimers.forEach(timerId => clearTimeout(timerId))
      this.cleanupTimers.clear()
      this.activeTargets.clear()

      console.log('[BlueBeam] 🧹 Cleared all blue beam effects')
    } catch (error) {
      console.warn('[BlueBeam] Failed to clear all blue beams:', error)
    }
  }

  /**
   * 🎯 Jump to message with blue beam effect (main API)
   */
  async jumpToMessageWithBlueBeam(params) {
    const {
      messageId,
      chatId = null,
      searchQuery = null,
      intensity = 'normal',
      router = null
    } = params

    try {
      // Navigate to chat if needed
      if (chatId && router) {
        const currentPath = window.location.pathname
        const targetPath = `/chat/${chatId}`
        
        if (currentPath !== targetPath) {
          console.log(`[BlueBeam] 🚀 Navigating to chat ${chatId}`)
          await router.push(targetPath)
          
          // Wait for navigation and component mounting
          await this.waitForChatLoad(chatId)
        }
      }

      // Find target message element
      const messageElement = await this.findMessageElement(messageId)
      
      if (!messageElement) {
        console.warn(`[BlueBeam] Message ${messageId} not found in DOM`)
        return { success: false, reason: 'message_not_found' }
      }

      // Apply blue beam effect
      const result = await this.applyBlueBeamTarget(messageElement, {
        intensity,
        searchQuery,
        duration: intensity === 'intense' ? this.intenseDuration : this.defaultDuration,
        scrollBehavior: 'smooth',
        showIndicator: true,
        autoCleanup: true
      })

      console.log(`[BlueBeam] 🎯 Jump to message ${messageId} completed:`, result)
      return result

    } catch (error) {
      console.error(`[BlueBeam] Jump to message ${messageId} failed:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * ⏳ Wait for chat to load
   */
  async waitForChatLoad(chatId, timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const checkChatLoaded = () => {
        // Check if messages are loaded
        const messageContainer = document.querySelector(
          '.simple-message-list, .messages-container, .discord-message-list'
        )
        
        if (messageContainer && messageContainer.children.length > 0) {
          console.log(`[BlueBeam] ✅ Chat ${chatId} loaded successfully`)
          resolve(true)
          return
        }

        // Timeout check
        if (Date.now() - startTime > timeout) {
          console.warn(`[BlueBeam] ⏰ Chat ${chatId} load timeout`)
          resolve(false)
          return
        }

        // Continue checking
        setTimeout(checkChatLoaded, 100)
      }

      checkChatLoaded()
    })
  }

  /**
   * 🔍 Find message element with retries
   */
  async findMessageElement(messageId, maxRetries = 10, delay = 100) {
    for (let i = 0; i < maxRetries; i++) {
      // Try multiple selectors
      const selectors = [
        `[data-message-id="${messageId}"]`,
        `#message-${messageId}`,
        `[id="${messageId}"]`,
        `.message-${messageId}`
      ]

      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          console.log(`[BlueBeam] 🔍 Found message ${messageId} with selector: ${selector}`)
          return element
        }
      }

      // Wait before retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    console.warn(`[BlueBeam] 🚫 Message ${messageId} not found after ${maxRetries} retries`)
    return null
  }

  /**
   * ⚙️ Configuration methods
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
    console.log(`[BlueBeam] ⚙️ Controller ${enabled ? 'enabled' : 'disabled'}`)
  }

  setDefaultDuration(duration) {
    this.defaultDuration = duration
    console.log(`[BlueBeam] ⚙️ Default duration set to ${duration}ms`)
  }

  setIntenseDuration(duration) {
    this.intenseDuration = duration
    console.log(`[BlueBeam] ⚙️ Intense duration set to ${duration}ms`)
  }

  /**
   * 📊 Get controller status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      activeTargets: Array.from(this.activeTargets),
      activeTimers: this.cleanupTimers.size,
      defaultDuration: this.defaultDuration,
      intenseDuration: this.intenseDuration
    }
  }

  /**
   * 🧹 Cleanup and destroy
   */
  destroy() {
    this.clearAllBlueBeams()
    this.isEnabled = false
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    
    console.log('[BlueBeam] 🧹 Controller destroyed')
  }
}

// Export singleton instance
export const blueBeamSearchController = new BlueBeamSearchController()

// Development debugging
if (import.meta.env.DEV) {
  window.blueBeamSearchController = blueBeamSearchController
}

// Vue composable
export function useBlueBeamSearch() {
  return {
    jumpToMessage: (params) => blueBeamSearchController.jumpToMessageWithBlueBeam(params),
    applyBlueBeam: (element, options) => blueBeamSearchController.applyBlueBeamTarget(element, options),
    clearBlueBeams: () => blueBeamSearchController.clearAllBlueBeams(),
    setEnabled: (enabled) => blueBeamSearchController.setEnabled(enabled),
    getStatus: () => blueBeamSearchController.getStatus()
  }
}

export default blueBeamSearchController 