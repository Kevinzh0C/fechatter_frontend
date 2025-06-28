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
      { name: 'CJK Extension B', range: /[\u20000-\u2A6DF]/g, lang: 'zh' },
      
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
   * 为元素应用日语字体优化
   */
  applyJapaneseFontOptimization(element) {
    if (!element || this.processedElements.has(element)) return;
    
    // 添加日语字体类
    element.classList.add('japanese-font-fix');
    
    // 设置语言属性
    if (!element.getAttribute('lang')) {
      element.setAttribute('lang', 'ja');
    }
    
    // 标记为已处理
    this.processedElements.add(element);
    
    if (import.meta.env.DEV) {
      console.log('🇯🇵 Applied Japanese font optimization to element:', element);
    }
  }

  /**
   * 处理单个文本节点
   */
  processTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent;
    if (!this.containsJapanese(text)) return;
    
    const density = this.getJapaneseDensity(text);
    
    // 如果日语密度超过30%，优化父元素
    if (density > 0.3) {
      let parentElement = textNode.parentElement;
      if (parentElement && !this.processedElements.has(parentElement)) {
        this.applyJapaneseFontOptimization(parentElement);
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
    
    if (this.containsJapanese(directText)) {
      this.applyJapaneseFontOptimization(element);
    }
    
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
    
    console.log('🇯🇵 Scanning page for Japanese content...');
    
    // 扫描所有可能包含文本的元素
    const textElements = document.querySelectorAll(
      'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, button, a, small, em, strong, i, b'
    );
    
    let processedCount = 0;
    
    textElements.forEach(element => {
      if (!this.processedElements.has(element)) {
        this.processElement(element);
        processedCount++;
      }
    });
    
    console.log(`🇯🇵 Processed ${processedCount} elements for Japanese content`);
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
    
    console.log('🇯🇵 MutationObserver setup for dynamic Japanese content detection');
  }

  /**
   * 初始化检测器
   */
  initialize() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.scanPage();
        this.setupObserver();
      });
    } else {
      this.scanPage();
      this.setupObserver();
    }
    
    console.log('🇯🇵 Japanese Font Detector ready');
  }

  /**
   * 手动触发扫描
   */
  rescan() {
    console.log('🇯🇵 Manual rescan triggered');
    this.processedElements = new WeakSet(); // 重置已处理的元素
    this.scanPage();
  }

  /**
   * 启用/禁用检测器
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🇯🇵 Japanese Font Detector ${enabled ? 'enabled' : 'disabled'}`);
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
    console.log('🇯🇵 Japanese Font Detector destroyed');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const elementsWithJapanese = document.querySelectorAll('.japanese-font-fix').length;
    const elementsWithLangJa = document.querySelectorAll('[lang="ja"]').length;
    
    return {
      elementsOptimized: elementsWithJapanese,
      elementsWithLangJa: elementsWithLangJa,
      isEnabled: this.isEnabled,
      hasObserver: !!this.observer
    };
  }
}

// 创建全局实例
const japaneseFontDetector = new JapaneseFontDetector();

// 开发环境下提供调试工具
if (import.meta.env.DEV) {
  window.japaneseFontDetector = japaneseFontDetector;
  
  // 调试命令
  window.scanJapanese = () => japaneseFontDetector.rescan();
  window.getJapaneseStats = () => japaneseFontDetector.getStats();
  window.testJapaneseDetection = (text) => ({
    containsJapanese: japaneseFontDetector.containsJapanese(text),
    density: japaneseFontDetector.getJapaneseDensity(text)
  });
  
  console.log('🇯🇵 Japanese Font Detector debug tools available:');
  console.log('  - window.scanJapanese() - Manual rescan');
  console.log('  - window.getJapaneseStats() - Get statistics');
  console.log('  - window.testJapaneseDetection(text) - Test text detection');
}

export default japaneseFontDetector; 