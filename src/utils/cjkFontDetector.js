/**
 * 🌏 CJK Font Detector - 中日韩字体自动检测器
 * 自动检测页面中的CJK内容并应用优化的统一字体显示
 * 解决中文、日语、韩语文字显示异常问题
 * 确保全部消息字体风格统一
 */

class CJKFontDetector {
  constructor() {
    this.cjkRanges = [
      // 中文字符范围
      { name: 'CJK Unified Ideographs', range: /[\u4E00-\u9FFF]/g, lang: 'zh' },
      { name: 'CJK Extension A', range: /[\u3400-\u4DBF]/g, lang: 'zh' },
      
      // 日语字符范围
      { name: 'Hiragana', range: /[\u3040-\u309F]/g, lang: 'ja' },
      { name: 'Katakana', range: /[\u30A0-\u30FF]/g, lang: 'ja' },
      { name: 'Katakana Extensions', range: /[\u31F0-\u31FF]/g, lang: 'ja' },
      
      // 韩语字符范围
      { name: 'Hangul Syllables', range: /[\uAC00-\uD7AF]/g, lang: 'ko' },
      { name: 'Hangul Jamo', range: /[\u1100-\u11FF]/g, lang: 'ko' },
      { name: 'Hangul Compatibility', range: /[\u3130-\u318F]/g, lang: 'ko' },
      
      // 通用CJK标点和符号
      { name: 'CJK Symbols', range: /[\u3000-\u303F]/g, lang: 'cjk' },
      { name: 'Full-width chars', range: /[\uFF00-\uFFEF]/g, lang: 'cjk' },
      { name: 'Halfwidth Katakana', range: /[\uFF65-\uFF9F]/g, lang: 'ja' }
    ];
    
    this.processedElements = new WeakSet();
    this.observer = null;
    this.isEnabled = true;
    
    console.log('🌏 CJK Font Detector initialized (Chinese, Japanese, Korean)');
  }

  /**
   * 检测文本是否包含CJK字符
   */
  containsCJK(text) {
    if (!text || typeof text !== 'string') return false;
    
    return this.cjkRanges.some(({ range }) => range.test(text));
  }

  /**
   * 检测文本的具体语言类型
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return null;
    
    const langCounts = { zh: 0, ja: 0, ko: 0, cjk: 0 };
    let totalCJKCount = 0;
    
    this.cjkRanges.forEach(({ range, lang }) => {
      const matches = text.match(range);
      if (matches) {
        const count = matches.length;
        langCounts[lang] += count;
        totalCJKCount += count;
      }
    });
    
    if (totalCJKCount === 0) return null;
    
    // 特殊检测：如果有平假名或片假名，很可能是日语
    if (langCounts.ja > 0) {
      const hiraganaMatches = text.match(/[\u3040-\u309F]/g);
      const katakanaMatches = text.match(/[\u30A0-\u30FF]/g);
      if (hiraganaMatches || katakanaMatches) {
        return 'ja';
      }
    }
    
    // 特殊检测：如果有韩文字母，确定是韩语
    if (langCounts.ko > 0) {
      return 'ko';
    }
    
    // 否则主要是中文（汉字主导）
    if (langCounts.zh > 0) {
      return 'zh';
    }
    
    return 'cjk'; // 通用CJK
  }

  /**
   * 获取CJK字符密度（CJK字符占总字符的比例）
   */
  getCJKDensity(text) {
    if (!text || typeof text !== 'string') return 0;
    
    let cjkCount = 0;
    const totalLength = text.length;
    
    this.cjkRanges.forEach(({ range }) => {
      const matches = text.match(range);
      if (matches) {
        cjkCount += matches.length;
      }
    });
    
    return totalLength > 0 ? cjkCount / totalLength : 0;
  }

  /**
   * 为元素应用统一CJK字体优化
   */
  applyCJKFontOptimization(element, detectedLang = null) {
    if (!element || this.processedElements.has(element)) return;
    
    // 添加统一CJK字体类
    element.classList.add('unified-cjk-font');
    
    // 根据检测到的语言设置更具体的属性
    if (detectedLang) {
      element.setAttribute('lang', detectedLang);
      element.classList.add(`${detectedLang}-text`);
      
      // 🇯🇵 特殊处理：日语频道优化
      if (detectedLang === 'ja') {
        element.classList.add('japanese-channel-optimized');
        
        // 检查是否在日语频道中
        const channelTitle = document.querySelector('.channel-title, .chat-title, h1, h2, h3');
        if (channelTitle && this.containsJapanese(channelTitle.textContent)) {
          element.classList.add('force-japanese-font');
          
          if (import.meta.env.DEV) {
            console.log('🇯🇵 Applied Japanese channel optimization to element:', element);
          }
        }
      }
    } else {
      // 如果没有明确检测到语言，使用通用CJK
      element.classList.add('cjk-text');
    }
    
    // 标记为已处理
    this.processedElements.add(element);
    
    if (import.meta.env.DEV) {
      console.log(`🌏 Applied CJK font optimization to element (${detectedLang || 'cjk'}):`, element);
    }
  }

  /**
   * 处理单个文本节点
   */
  processTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent;
    if (!this.containsCJK(text)) return;
    
    const density = this.getCJKDensity(text);
    const detectedLang = this.detectLanguage(text);
    
    // 如果CJK密度超过20%，优化父元素
    if (density > 0.2) {
      let parentElement = textNode.parentElement;
      if (parentElement && !this.processedElements.has(parentElement)) {
        this.applyCJKFontOptimization(parentElement, detectedLang);
      }
    }
  }

  /**
   * 处理元素及其子元素
   */
  processElement(element) {
    if (!element || this.processedElements.has(element)) return;
    
    // 检查元素的直接文本内容
    const directText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join('');
    
    if (this.containsCJK(directText)) {
      const detectedLang = this.detectLanguage(directText);
      this.applyCJKFontOptimization(element, detectedLang);
    }
    
    // 🔢 NEW: 保护数字和符号
    this.protectNumbersAndSymbols(element);
    
    // 处理所有文本节点
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      this.processTextNode(textNode);
    }
  }

  /**
   * 扫描整个页面
   */
  scanPage() {
    if (!this.isEnabled) return;
    
    console.log('🌏 Scanning page for CJK content...');
    
    // 扫描所有可能包含文本的元素
    const textElements = document.querySelectorAll(
      'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, button, a, small, em, strong, i, b, .message-content, .discord-message-item, .username-button, .sender-name, .channel-item, .name-text, .channel-title, .section-title, .last-message, .message-sender, .dm-item, .group-item'
    );
    
    let processedCount = 0;
    
    textElements.forEach(element => {
      if (!this.processedElements.has(element)) {
        this.processElement(element);
        processedCount++;
      }
    });
    
    // 🏷️ 特别处理频道列表
    this.optimizeChannelList();
    
    console.log(`🌏 Processed ${processedCount} elements for CJK content`);
  }

  /**
   * 设置MutationObserver监听DOM变化
   */
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      mutations.forEach(mutation => {
        // 处理新增的节点
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            this.processTextNode(node);
          }
        });
        
        // 处理文本内容变化
        if (mutation.type === 'characterData') {
          this.processTextNode(mutation.target);
        }
      });
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    console.log('🌏 MutationObserver setup for dynamic CJK content detection');
  }

  /**
   * 初始化检测器
   */
  initialize() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.scanPage();
        this.optimizeJapaneseChannel(); // 🇯🇵 检测并优化日语频道
        this.setupObserver();
      });
    } else {
      this.scanPage();
      this.optimizeJapaneseChannel(); // 🇯🇵 检测并优化日语频道
      this.setupObserver();
    }
    
    console.log('🌏 CJK Font Detector ready');
  }

  /**
   * 手动触发扫描
   */
  rescan() {
    console.log('🌏 Manual CJK rescan triggered');
    this.processedElements = new WeakSet(); // 重置已处理的元素
    this.scanPage();
  }

  /**
   * 启用/禁用检测器
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🌏 CJK Font Detector ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 销毁检测器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedElements = new WeakSet();
    console.log('🌏 CJK Font Detector destroyed');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const elementsWithCJK = document.querySelectorAll('.unified-cjk-font').length;
    const elementsWithLangZh = document.querySelectorAll('[lang="zh"]').length;
    const elementsWithLangJa = document.querySelectorAll('[lang="ja"]').length;
    const elementsWithLangKo = document.querySelectorAll('[lang="ko"]').length;
    
    return {
      elementsOptimized: elementsWithCJK,
      elementsWithLangZh: elementsWithLangZh,
      elementsWithLangJa: elementsWithLangJa,
      elementsWithLangKo: elementsWithLangKo,
      isEnabled: this.isEnabled,
      hasObserver: !!this.observer
    };
  }

  /**
   * 向后兼容：保留原日语检测方法
   */
  containsJapanese(text) {
    return this.containsCJK(text);
  }

  /**
   * 向后兼容：保留原日语密度方法
   */
  getJapaneseDensity(text) {
    return this.getCJKDensity(text);
  }

  /**
   * 🇯🇵 检测是否为日语频道
   */
  isJapaneseChannel() {
    // 检查频道标题
    const channelTitles = document.querySelectorAll('.channel-title, .chat-title, h1, h2, h3');
    
    for (const title of channelTitles) {
      const text = title.textContent || '';
      if (this.detectLanguage(text) === 'ja' || this.containsJapanese(text)) {
        return true;
      }
    }
    
    // 检查URL中是否包含日语相关内容
    const url = window.location.href;
    if (url.includes('japan') || url.includes('japanese') || url.includes('%E6%97%A5%E6%9C%AC')) {
      return true;
    }
    
    return false;
  }

  /**
   * 🇯🇵 为日语频道应用特殊优化
   */
  optimizeJapaneseChannel() {
    if (!this.isJapaneseChannel()) return;
    
    console.log('🇯🇵 Japanese channel detected, applying optimizations...');
    
    // 为整个应用添加日语频道优化类
    document.body.classList.add('japanese-channel-optimized');
    
    // 优化所有现有的日语内容
    const allElements = document.querySelectorAll('*');
    let optimizedCount = 0;
    
    allElements.forEach(element => {
      const text = element.textContent || '';
      if (this.detectLanguage(text) === 'ja' || this.containsJapanese(text)) {
        element.classList.add('force-japanese-font');
        element.setAttribute('lang', 'ja');
        optimizedCount++;
      }
    });
    
    console.log(`🇯🇵 Applied Japanese channel optimization to ${optimizedCount} elements`);
  }

  /**
   * 🏷️ 优化频道列表的CJK字体显示
   */
  optimizeChannelList() {
    console.log('🏷️ Optimizing channel list CJK fonts...');
    
    // 检测和优化频道列表整体
    const channelList = document.querySelector('.channel-list');
    if (channelList) {
      channelList.classList.add('channel-list-cjk-optimized');
    }
    
    // 优化所有频道项
    const channelItems = document.querySelectorAll('.channel-item, .dm-item, .group-item');
    let optimizedChannels = 0;
    
    channelItems.forEach(item => {
      const nameElement = item.querySelector('.name-text, .channel-name, .dm-name, .group-name');
      if (nameElement) {
        const text = nameElement.textContent || '';
        const detectedLang = this.detectLanguage(text);
        
        if (this.containsCJK(text)) {
          // 添加CJK优化类
          nameElement.classList.add('force-channel-cjk-font');
          item.classList.add('channel-list-cjk-optimized');
          
          // 设置语言属性
          if (detectedLang) {
            nameElement.setAttribute('lang', detectedLang);
            item.setAttribute('lang', detectedLang);
          }
          
          optimizedChannels++;
          
          if (import.meta.env.DEV) {
            console.log(`🏷️ Optimized channel: "${text}" (${detectedLang || 'cjk'})`);
          }
        }
      }
      
      // 优化最后消息预览
      const lastMessage = item.querySelector('.last-message, .message-content');
      if (lastMessage) {
        const messageText = lastMessage.textContent || '';
        const messageLang = this.detectLanguage(messageText);
        
        if (this.containsCJK(messageText)) {
          lastMessage.classList.add('force-channel-cjk-font');
          if (messageLang) {
            lastMessage.setAttribute('lang', messageLang);
          }
        }
      }
    });
    
    // 优化分组标题
    const sectionTitles = document.querySelectorAll('.section-title, .section-toggle');
    sectionTitles.forEach(title => {
      const text = title.textContent || '';
      if (this.containsCJK(text)) {
        const detectedLang = this.detectLanguage(text);
        title.classList.add('force-channel-cjk-font');
        if (detectedLang) {
          title.setAttribute('lang', detectedLang);
        }
      }
    });
    
    console.log(`🏷️ Optimized ${optimizedChannels} channel items for CJK display`);
  }

  /**
   * 🔢 检测文本中是否包含数字
   */
  containsNumbers(text) {
    if (!text || typeof text !== 'string') return false;
    return /\d/.test(text);
  }

  /**
   * 📊 检测文本中是否包含数学符号
   */
  containsMathSymbols(text) {
    if (!text || typeof text !== 'string') return false;
    return /[+\-×÷=≠≤≥<>±∞√∑∏∫%‰°]/.test(text);
  }

  /**
   * 💰 检测文本中是否包含货币符号
   */
  containsCurrencySymbols(text) {
    if (!text || typeof text !== 'string') return false;
    return /[$€£¥₹₩₽¢₡₨]/.test(text);
  }

  /**
   * 🔤 检测文本中是否包含ASCII字符
   */
  containsASCII(text) {
    if (!text || typeof text !== 'string') return false;
    return /[a-zA-Z]/.test(text);
  }

  /**
   * 📝 检测文本中是否包含标点符号
   */
  containsPunctuation(text) {
    if (!text || typeof text !== 'string') return false;
    return /[.,;:!?()[\]{}\"'`~|\\/_—–…]/.test(text);
  }

  /**
   * 🔢 为数字和符号应用保护
   */
  protectNumbersAndSymbols(element) {
    if (!element) return;
    
    const text = element.textContent || '';
    let needsProtection = false;
    
    // 检测需要保护的内容类型
    if (this.containsNumbers(text)) {
      element.classList.add('numbers-not-emoji');
      needsProtection = true;
    }
    
    if (this.containsMathSymbols(text)) {
      element.classList.add('symbols-not-emoji', 'math-not-emoji');
      needsProtection = true;
    }
    
    if (this.containsCurrencySymbols(text)) {
      element.classList.add('symbols-not-emoji', 'currency-not-emoji');
      needsProtection = true;
    }
    
    if (this.containsASCII(text)) {
      element.classList.add('ascii-not-emoji');
      needsProtection = true;
    }
    
    if (this.containsPunctuation(text)) {
      element.classList.add('punctuation-not-emoji');
      needsProtection = true;
    }
    
    if (needsProtection) {
      // 设置数据属性用于CSS选择器
      if (this.containsNumbers(text)) element.setAttribute('data-number', 'true');
      if (this.containsMathSymbols(text)) element.setAttribute('data-math', 'true');
      if (this.containsCurrencySymbols(text)) element.setAttribute('data-currency', 'true');
      
      if (import.meta.env.DEV) {
        console.log(`🔢 Protected numbers/symbols in element: "${text.substring(0, 50)}..."`);
      }
    }
  }
}

// 创建全局实例
const cjkFontDetector = new CJKFontDetector();

// 开发环境下提供调试工具
if (import.meta.env.DEV) {
  window.cjkFontDetector = cjkFontDetector;
  
  // 向后兼容：保持原有的日语检测器名称
  window.japaneseFontDetector = cjkFontDetector;
  
  // 调试命令
  window.scanCJK = () => cjkFontDetector.rescan();
  window.getCJKStats = () => cjkFontDetector.getStats();
  window.testCJKDetection = (text) => ({
    containsCJK: cjkFontDetector.containsCJK(text),
    density: cjkFontDetector.getCJKDensity(text),
    detectedLang: cjkFontDetector.detectLanguage(text)
  });
  
  // 向后兼容的命令
  window.scanJapanese = () => cjkFontDetector.rescan();
  window.getJapaneseStats = () => cjkFontDetector.getStats();
  window.testJapaneseDetection = (text) => window.testCJKDetection(text);
  
  // 🇯🇵 日语频道专用调试工具
  window.isJapaneseChannel = () => cjkFontDetector.isJapaneseChannel();
  window.optimizeJapaneseChannel = () => cjkFontDetector.optimizeJapaneseChannel();
  window.forceJapaneseOptimization = () => {
    document.body.classList.add('japanese-channel-optimized');
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && cjkFontDetector.containsJapanese(el.textContent)) {
        el.classList.add('force-japanese-font');
        el.setAttribute('lang', 'ja');
      }
    });
    console.log('🇯🇵 Force applied Japanese optimization to all elements');
  };
  
  // 🏷️ 频道列表专用调试工具
  window.optimizeChannelList = () => cjkFontDetector.optimizeChannelList();
  window.forceChannelCJKOptimization = () => {
    document.querySelector('.channel-list')?.classList.add('channel-list-cjk-optimized');
    document.querySelectorAll('.channel-item, .dm-item, .group-item').forEach(item => {
      const nameElement = item.querySelector('.name-text, .channel-name, .dm-name, .group-name');
      if (nameElement && nameElement.textContent) {
        nameElement.classList.add('force-channel-cjk-font');
        const detectedLang = cjkFontDetector.detectLanguage(nameElement.textContent);
        if (detectedLang) {
          nameElement.setAttribute('lang', detectedLang);
          item.setAttribute('lang', detectedLang);
        }
      }
    });
    console.log('🏷️ Force applied channel list CJK optimization to all channel items');
  };
  
  // 🔢 数字符号保护调试工具
  window.testNumbersSymbolsDetection = (text) => ({
    containsNumbers: cjkFontDetector.containsNumbers(text),
    containsMathSymbols: cjkFontDetector.containsMathSymbols(text),
    containsCurrencySymbols: cjkFontDetector.containsCurrencySymbols(text),
    containsASCII: cjkFontDetector.containsASCII(text),
    containsPunctuation: cjkFontDetector.containsPunctuation(text)
  });
  
  window.protectAllNumbersSymbols = () => {
    document.querySelectorAll('*').forEach(element => {
      if (element.textContent) {
        cjkFontDetector.protectNumbersAndSymbols(element);
      }
    });
    console.log('🔢 Applied numbers and symbols protection to all elements');
  };
  
  window.enableNumbersProtectionDebug = () => {
    document.body.classList.add('debug-numbers-protection');
    console.log('🔢 Numbers protection debug mode enabled - protected elements will be highlighted');
  };
  
  window.disableNumbersProtectionDebug = () => {
    document.body.classList.remove('debug-numbers-protection');
    console.log('🔢 Numbers protection debug mode disabled');
  };
  
  console.log('🌏 CJK Font Detector debug tools available:');
  console.log('  - window.scanCJK() - Manual CJK rescan');
  console.log('  - window.getCJKStats() - Get CJK statistics');
  console.log('  - window.testCJKDetection(text) - Test CJK text detection');
  console.log('  - window.isJapaneseChannel() - Check if current page is Japanese channel');
  console.log('  - window.optimizeJapaneseChannel() - Apply Japanese channel optimizations');
  console.log('  - window.forceJapaneseOptimization() - Force Japanese font optimization');
  console.log('  - window.optimizeChannelList() - Optimize channel list CJK fonts');
  console.log('  - window.forceChannelCJKOptimization() - Force channel list CJK optimization');
  console.log('  - window.testNumbersSymbolsDetection(text) - Test numbers/symbols detection');
  console.log('  - window.protectAllNumbersSymbols() - Apply numbers/symbols protection');
  console.log('  - window.enableNumbersProtectionDebug() - Enable numbers protection debug mode');
  console.log('  - window.disableNumbersProtectionDebug() - Disable numbers protection debug mode');
  console.log('  - 向后兼容的日语命令仍然可用');
}

export default cjkFontDetector; 