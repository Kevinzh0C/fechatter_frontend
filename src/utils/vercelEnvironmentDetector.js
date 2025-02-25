/**
 * Vercel Environment Detector
 * 确保Vercel部署保留所有本地开发功能
 */

export class VercelEnvironmentDetector {
  constructor() {
    this.isVercel = this.detectVercelEnvironment();
    this.hostname = window.location.hostname;
    this.forceDevelopmentMode = true; // 强制开发模式
    
    if (this.isVercel) {
      console.log('🌐 [Vercel] 检测到Vercel部署环境');
      this.setupVercelEnvironment();
    }
  }

  detectVercelEnvironment() {
    return (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com') ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV !== undefined
    );
  }

  setupVercelEnvironment() {
    // 强制设置开发环境变量
    window.VERCEL_ENV = 'development';
    window.NODE_ENV = 'development';
    
    // 启用所有调试功能
    window.ENABLE_DEBUG = true;
    window.ENABLE_TEST_ACCOUNTS = true;
    window.ENABLE_DEV_TOOLS = true;
    
    // 设置控制台样式
    console.log('%c🎯 Vercel开发模式已启用', 'color: #00ff00; font-weight: bold;');
    console.log('%c📱 测试账户功能已启用', 'color: #00ff00; font-weight: bold;');
    console.log('%c🔧 调试工具已启用', 'color: #00ff00; font-weight: bold;');
    
    // 模拟本地开发环境
    this.simulateLocalEnvironment();
  }

  simulateLocalEnvironment() {
    // 覆盖import.meta.env以模拟开发环境
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      import.meta.env.DEV = true;
      import.meta.env.MODE = 'development';
      import.meta.env.PROD = false;
    }
    
    // 设置全局开发标志
    window.__FECHATTER_DEV__ = true;
    window.__VERCEL_DEPLOYMENT__ = true;
  }

  getConfigFileName() {
    return this.isVercel ? 'vercel.yml' : 'development.yml';
  }

  shouldEnableTestAccounts() {
    return true; // 在Vercel上始终启用测试账户
  }

  shouldEnableDebugTools() {
    return true; // 在Vercel上始终启用调试工具
  }

  getEnvironmentInfo() {
    return {
      isVercel: this.isVercel,
      hostname: this.hostname,
      configFile: this.getConfigFileName(),
      testAccountsEnabled: this.shouldEnableTestAccounts(),
      debugToolsEnabled: this.shouldEnableDebugTools(),
      forceDevelopmentMode: this.forceDevelopmentMode
    };
  }
}

// 立即初始化环境检测器
export const vercelEnvDetector = new VercelEnvironmentDetector();

// 全局可用
window.vercelEnvDetector = vercelEnvDetector;

// 导出环境信息供其他模块使用
export const VERCEL_ENV_INFO = vercelEnvDetector.getEnvironmentInfo();

export default vercelEnvDetector; 