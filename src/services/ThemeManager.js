/**
 * 主题管理服务
 * 处理亮色/暗色主题切换和持久化
 */
class ThemeManager {
  constructor() {
    this.currentTheme = 'light'
    this.listeners = new Set()
    this.storageKey = 'fechatter-theme'
    
    // 初始化主题
    this.initialize()
  }

  /**
   * 初始化主题系统
   */
  initialize() {
    // 从 localStorage 获取保存的主题
    const savedTheme = this.getSavedTheme()
    
    // 默认使用浅色主题，除非用户明确保存了其他选择
    const theme = savedTheme || 'light'
    
    // 应用主题
    this.setTheme(theme, false) // false = 不保存到 localStorage（避免重复保存）
    
    // 监听系统主题变化
    this.watchSystemTheme()
    
    console.log('🎨 [ThemeManager] 初始化完成，当前主题:', this.currentTheme)
  }

  /**
   * 获取系统主题偏好
   */
  getSystemTheme() {
    if (typeof window === 'undefined') return 'light'
    
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (error) {
      console.warn('[ThemeManager] 无法检测系统主题:', error)
      return 'light'
    }
  }

  /**
   * 从 localStorage 获取保存的主题
   */
  getSavedTheme() {
    if (typeof window === 'undefined') return null
    
    try {
      const saved = localStorage.getItem(this.storageKey)
      return saved === 'dark' || saved === 'light' ? saved : null
    } catch (error) {
      console.warn('[ThemeManager] 无法读取保存的主题:', error)
      return null
    }
  }

  /**
   * 保存主题到 localStorage
   */
  saveTheme(theme) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.storageKey, theme)
    } catch (error) {
      console.warn('[ThemeManager] 无法保存主题:', error)
    }
  }

  /**
   * 设置主题
   */
  setTheme(theme, save = true) {
    if (!['light', 'dark'].includes(theme)) {
      console.warn('[ThemeManager] 无效的主题:', theme)
      return
    }

    const oldTheme = this.currentTheme
    this.currentTheme = theme

    // 应用到 DOM
    this.applyThemeToDOM(theme)

    // 保存到 localStorage
    if (save) {
      this.saveTheme(theme)
    }

    // 通知监听器
    this.notifyListeners(theme, oldTheme)

    console.log(`🎨 [ThemeManager] 主题已切换: ${oldTheme} → ${theme}`)
  }

  /**
   * 应用主题到 DOM
   */
  applyThemeToDOM(theme) {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    // 设置 data-theme 属性
    html.setAttribute('data-theme', theme)
    
    // 设置 class（兼容性）
    if (theme === 'dark') {
      html.classList.add('dark')
      body.classList.add('dark-theme')
    } else {
      html.classList.remove('dark')
      body.classList.remove('dark-theme')
    }

    // 触发自定义事件
    this.dispatchThemeEvent(theme)
  }

  /**
   * 触发主题变化事件
   */
  dispatchThemeEvent(theme) {
    if (typeof window === 'undefined') return

    try {
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { 
          theme,
          timestamp: Date.now()
        }
      }))
    } catch (error) {
      console.warn('[ThemeManager] 无法触发主题事件:', error)
    }
  }

  /**
   * 切换主题
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
    return newTheme
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.currentTheme
  }

  /**
   * 检查是否为暗色主题
   */
  isDark() {
    return this.currentTheme === 'dark'
  }

  /**
   * 检查是否为亮色主题
   */
  isLight() {
    return this.currentTheme === 'light'
  }

  /**
   * 监听系统主题变化
   */
  watchSystemTheme() {
    if (typeof window === 'undefined') return

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e) => {
        // 只有在没有手动设置主题时才跟随系统
        if (!this.getSavedTheme()) {
          const systemTheme = e.matches ? 'dark' : 'light'
          this.setTheme(systemTheme, false) // 不保存，继续跟随系统
        }
      }

      // 现代浏览器
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        // 兼容旧浏览器
        mediaQuery.addListener(handleChange)
      }
    } catch (error) {
      console.warn('[ThemeManager] 无法监听系统主题变化:', error)
    }
  }

  /**
   * 添加主题变化监听器
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback)
    }
  }

  /**
   * 移除主题变化监听器
   */
  removeListener(callback) {
    this.listeners.delete(callback)
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(newTheme, oldTheme) {
    this.listeners.forEach(callback => {
      try {
        callback(newTheme, oldTheme)
      } catch (error) {
        console.error('[ThemeManager] 监听器执行错误:', error)
      }
    })
  }

  /**
   * 重置为系统主题
   */
  resetToSystem() {
    // 清除保存的主题偏好
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.warn('[ThemeManager] 无法清除保存的主题:', error)
    }

    // 应用系统主题
    const systemTheme = this.getSystemTheme()
    this.setTheme(systemTheme, false) // 不保存，跟随系统
  }

  /**
   * 获取主题状态信息
   */
  getThemeInfo() {
    return {
      current: this.currentTheme,
      saved: this.getSavedTheme(),
      system: this.getSystemTheme(),
      isDark: this.isDark(),
      isLight: this.isLight(),
      isFollowingSystem: !this.getSavedTheme()
    }
  }

  /**
   * 销毁主题管理器
   */
  destroy() {
    this.listeners.clear()
  }
}

// 创建全局实例
const themeManager = new ThemeManager()

// 暴露到全局
if (typeof window !== 'undefined') {
  window.themeManager = themeManager
}

export default themeManager 