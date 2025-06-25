/**
 * SSE Connection Cleanup Utility
 * 用于清理多余的SSE连接
 */

export function cleanupSSEConnections() {
  if (import.meta.env.DEV) {
    console.log('🧹 Starting SSE connection cleanup...');
  }

  // 1. 清理全局管理器中的连接
  if (window.sseGlobalManager) {
    const status = window.sseGlobalManager.getStatus();
    if (import.meta.env.DEV) {
      console.log(`Found ${status.connections.length} connections in global manager`);
    }

    // 重置管理器
    window.sseGlobalManager.reset();
    if (import.meta.env.DEV) {
      console.log('✅ Global manager reset');
    }

  // 2. 断开当前服务的连接
  if (window.realtimeCommunicationService) {
    window.realtimeCommunicationService.disconnect();
    if (import.meta.env.DEV) {
      console.log('✅ Current service disconnected');
    }

  // 3. 清理所有EventSource实例
  if (typeof EventSource !== 'undefined') {
    // 遍历所有可能的EventSource连接
    const potentialConnections = [
      window.eventSource,
      window.sse,
      window.sseConnection
    ];

    potentialConnections.forEach((conn, index) => {
      if (conn && conn.close) {
        try {
          conn.close();
          if (import.meta.env.DEV) {
            console.log(`✅ Closed EventSource connection ${index + 1}`);
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn(`Failed to close connection ${index + 1}:`, e);
          }
    });

  if (import.meta.env.DEV) {
    console.log('🧹 SSE cleanup completed');
  }

// 自动执行清理（在开发环境）
if (import.meta.env.DEV) {
  // 将清理函数暴露到window对象
  window.cleanupSSE = cleanupSSEConnections;

  // 监听自定义事件来触发清理
  window.addEventListener('sse-cleanup-needed', cleanupSSEConnections);
}

export default {
  cleanup: cleanupSSEConnections
}; 