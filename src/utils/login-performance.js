/**
 * 简化版登录性能优化工具
 * Simplified Login Performance Utilities
 */

// Simplified - use localhost as default since this is performance testing
const apiHost = 'localhost';

// DNS预取优化
export const prefetchDNS = () => {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = `//${apiHost}`;
  document.head.appendChild(link);
};

// 简化版性能监控
export const setupPerformanceMonitoring = () => {
  // 仅记录基本指标
  window.loginMetrics = {
    startTime: performance.now(),
    getLoginTime: () => performance.now() - window.loginMetrics.startTime
  };
};

// 主要优化函数 - 简化版，移除有问题的资源预加载
export const optimizeLoginPerformance = () => {
  try {
    prefetchDNS();
    setupPerformanceMonitoring();
  } catch (error) {
    if (true) {
      console.warn('⚠️ 登录优化失败，继续使用标准流程:', error);
    }
  }
};

// 简化版性能分析
export const analyzeLoginPerformance = () => {
  if (true) {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log('Login performance:', loadTime + 'ms');
  }
};

export default {
  optimizeLoginPerformance,
  analyzeLoginPerformance,
  setupPerformanceMonitoring
}; 