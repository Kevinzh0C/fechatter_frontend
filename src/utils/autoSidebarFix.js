/**
 * 🤖 自动Sidebar修复工具
 * 在系统启动时自动检测并修复sidebar数据流问题
 */

class AutoSidebarFix {
  constructor() {
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.checkInterval = null;
    this.listeners = [];
  }

  /**
   * 🚀 启动自动修复
   */
  async start() {
    if (this.isRunning) {
      console.log('🤖 [AutoSidebarFix] Already running');
      return;
    }

    console.log('🤖 [AutoSidebarFix] Starting auto-repair system...');
    this.isRunning = true;

    // 等待页面和stores完全加载
    await this.waitForSystemReady();

    // 开始监控和修复
    await this.startMonitoring();
  }

  /**
   * 🕐 等待系统准备就绪
   */
  async waitForSystemReady() {
    console.log('🕐 [AutoSidebarFix] Waiting for system ready...');
    
    const maxWaitTime = 30000; // 30秒最大等待时间
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      // 检查关键系统是否已加载
      const systemReady = this.checkSystemReady();
      
      if (systemReady.ready) {
        console.log('✅ [AutoSidebarFix] System ready:', systemReady);
        return;
      }
      
      console.log('⏳ [AutoSidebarFix] Waiting... Missing:', systemReady.missing);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.warn('⚠️ [AutoSidebarFix] System not fully ready after 30s, proceeding anyway');
  }

  /**
   * 🔍 检查系统是否准备就绪
   */
  checkSystemReady() {
    const checks = {
      pinia: !!window.pinia,
      modernAuth: !!window.modernAuth,
      chatStore: !!window.chatStore,
      workspaceStore: !!window.workspaceStore,
      router: !!window.$router,
      dom: document.readyState === 'complete'
    };

    const missing = Object.keys(checks).filter(key => !checks[key]);
    const ready = missing.length === 0;

    return { ready, missing, checks };
  }

  /**
   * 🔧 执行自动修复
   */
  async performAutoFix() {
    try {
      const issue = await this.detectSidebarIssue();
      
      if (issue.hasIssue) {
        console.log('🔧 [AutoSidebarFix] Detected issue:', issue.description);
        
        // 根据问题类型选择修复策略
        await this.applySolutionForIssue(issue);
        
        this.retryCount++;
        
        if (this.retryCount >= this.maxRetries) {
          console.warn('⚠️ [AutoSidebarFix] Max retries reached, switching to manual mode');
          this.showManualFixSuggestion();
        }
      } else {
        // 没有问题，重置重试计数
        this.retryCount = 0;
      }
    } catch (error) {
      console.error('❌ [AutoSidebarFix] Auto fix error:', error);
    }
  }

  /**
   * 🔍 检测sidebar问题
   */
  async detectSidebarIssue() {
    const issues = [];
    
    // 检查Store数据
    const storeIssue = this.checkStoreIssue();
    if (storeIssue.hasIssue) issues.push(storeIssue);

    if (issues.length > 0) {
      return {
        hasIssue: true,
        type: 'multiple',
        issues,
        description: `Found ${issues.length} issues: ${issues.map(i => i.type).join(', ')}`
      };
    }

    return { hasIssue: false };
  }

  /**
   * 📊 检查Store数据问题
   */
  checkStoreIssue() {
    const chatStoreChats = window.chatStore?.chats?.length || 0;
    const workspaceStoreChats = window.workspaceStore?.workspaceChats?.length || 0;

    if (chatStoreChats === 0 && workspaceStoreChats === 0) {
      return {
        hasIssue: true,
        type: 'store',
        description: 'No chat data in stores',
        severity: 'medium'
      };
    }

    return { hasIssue: false };
  }

  /**
   * 🛠️ 为问题应用解决方案
   */
  async applySolutionForIssue(issue) {
    console.log(`🛠️ [AutoSidebarFix] Applying solution for: ${issue.type}`);

    if (issue.type === 'store' || issue.type === 'multiple') {
      await this.fixStoreIssue();
    }
  }

  /**
   * 📊 修复Store问题
   */
  async fixStoreIssue() {
    try {
      // 使用数据流修复工具
      if (window.fixSidebarDataFlow) {
        await window.fixSidebarDataFlow();
        console.log('✅ [AutoSidebarFix] Store issue fixed with data flow repair');
      } else if (window.quickSidebarFlow) {
        await window.quickSidebarFlow();
        console.log('✅ [AutoSidebarFix] Store issue fixed with quick flow repair');
      }
    } catch (error) {
      console.error('❌ [AutoSidebarFix] Store fix failed:', error);
    }
  }

  /**
   * 📋 显示手动修复建议
   */
  showManualFixSuggestion() {
    console.log('');
    console.log('🛠️ ============= MANUAL FIX SUGGESTIONS =============');
    console.log('⚠️ Auto-fix reached max retries. Try manual commands:');
    console.log('');
    console.log('🔧 Available Manual Commands:');
    console.log('  • fixSidebarDataFlow() - Complete data flow repair');
    console.log('  • executeUltimateFix() - Ultimate system repair');
    console.log('  • quickSidebarFlow() - Quick data refresh');
    console.log('');
    console.log('🔄 Or try refreshing the page');
    console.log('==================================================');
    console.log('');
  }

  /**
   * 🛑 停止自动修复
   */
  stop() {
    if (!this.isRunning) return;
    console.log('🛑 [AutoSidebarFix] Stopping auto-repair system...');
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('✅ [AutoSidebarFix] Auto-repair system stopped');
  }
}

// 创建全局实例
const autoSidebarFix = new AutoSidebarFix();

// 暴露到全局
if (typeof window !== 'undefined') {
  window.autoSidebarFix = autoSidebarFix;
}

export default autoSidebarFix;
