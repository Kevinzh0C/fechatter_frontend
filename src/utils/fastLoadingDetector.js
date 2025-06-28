/**
 * 🚀 超快速历史消息加载完成检测器
 * 专为高性能和准确性设计
 */

class FastLoadingDetector {
  constructor() {
    this.loadPatterns = new Map() // chatId -> load history
    this.startTimes = new Map()   // chatId -> start timestamp
    this.thresholds = {
      timeout: 5000,           // 5秒超时
      smallLoadLimit: 2,       // 小加载阈值
      consecutiveLimit: 2,     // 连续小加载次数
      scrollAwayThreshold: 0.3, // 滚动离开阈值
      performanceLimit: 200    // 性能保护消息数
    }
  }

  /**
   * 开始监控加载
   */
  startLoading(chatId, currentMessageCount) {
    this.startTimes.set(chatId, Date.now())
    console.log(`⚡ [FastDetector] Started monitoring chat ${chatId} with ${currentMessageCount} messages`)
  }

  /**
   * 极速检测是否应该停止加载
   */
  shouldStop(chatId, newLength, previousCount, hasMoreMessages, container) {
    const newCount = newLength - previousCount
    const startTime = this.startTimes.get(chatId) || Date.now()
    const duration = Date.now() - startTime

    console.log(`⚡ [FastDetector] Quick check: +${newCount} messages in ${duration}ms`)

    // === 第一优先级：绝对条件 ===
    if (!hasMoreMessages) {
      return this._createResult(true, 'Backend reports no more messages', 'backend_signal')
    }

    if (newCount <= 0) {
      return this._createResult(true, `No new messages (${newCount})`, 'zero_load')
    }

    // === 第二优先级：性能保护 ===
    if (duration > this.thresholds.timeout) {
      return this._createResult(true, `Timeout (${duration}ms)`, 'timeout')
    }

    if (newLength > this.thresholds.performanceLimit) {
      return this._createResult(true, `Performance limit (${newLength} messages)`, 'performance')
    }

    // === 第三优先级：模式识别 ===
    if (newCount <= this.thresholds.smallLoadLimit) {
      const pattern = this._updateLoadPattern(chatId, newCount)
      if (this._isEndPattern(pattern)) {
        return this._createResult(true, `End pattern: ${pattern.join(',')}`, 'pattern')
      }
    }

    // === 第四优先级：用户行为 ===
    if (container) {
      const scrollRatio = container.scrollTop / (container.scrollHeight - container.clientHeight)
      if (scrollRatio > this.thresholds.scrollAwayThreshold) {
        return this._createResult(true, `User scrolled away (${(scrollRatio * 100).toFixed(0)}%)`, 'user_behavior')
      }
    }

    // === 继续加载 ===
    return this._createResult(false, 'Continue loading', 'continue')
  }

  /**
   * 更新加载模式
   */
  _updateLoadPattern(chatId, newCount) {
    const patterns = this.loadPatterns.get(chatId) || []
    patterns.push(newCount)
    
    // 只保留最近的加载记录
    const recent = patterns.slice(-this.thresholds.consecutiveLimit)
    this.loadPatterns.set(chatId, recent)
    
    return recent
  }

  /**
   * 检测是否为结束模式
   */
  _isEndPattern(pattern) {
    return pattern.length >= this.thresholds.consecutiveLimit && 
           pattern.every(count => count <= this.thresholds.smallLoadLimit)
  }

  /**
   * 创建检测结果
   */
  _createResult(shouldStop, reason, trigger) {
    return {
      shouldStop,
      reason,
      trigger,
      timestamp: Date.now()
    }
  }

  /**
   * 清理特定聊天的记录
   */
  cleanup(chatId) {
    this.loadPatterns.delete(chatId)
    this.startTimes.delete(chatId)
    console.log(`⚡ [FastDetector] Cleaned up records for chat ${chatId}`)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      activeChats: this.loadPatterns.size,
      thresholds: this.thresholds
    }
  }
}

// 创建全局实例
export const fastLoadingDetector = new FastLoadingDetector()

// 添加到全局作用域以便调试
if (typeof window !== 'undefined') {
  window.fastLoadingDetector = fastLoadingDetector
} 