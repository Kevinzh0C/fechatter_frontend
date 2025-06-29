/**
 * 🚀 一键迁移执行器
 * 从自定义SSE实现迁移到工业级Modern SSE方案
 */

import { modernSSEService } from './modern-sse-service.js';
import { simpleSSEService } from './simple-sse-service.js';

class MigrationExecutor {
  constructor() {
    this.oldService = null;
    this.newService = null;
    this.backupReferences = new Map();
  }

  /**
   * 🎯 执行完整迁移
   */
  async executeFullMigration() {
    console.log('🚀 [Migration] Starting complete migration from legacy SSE...');

    try {
      // Step 1: 备份现有服务引用
      await this.backupCurrentServices();

      // Step 2: 选择最佳的新服务
      const selectedService = await this.selectOptimalService();

      // Step 3: 无缝替换服务
      await this.replaceServices(selectedService);

      // Step 4: 验证迁移成功
      const isSuccess = await this.validateMigration();

      if (isSuccess) {
        console.log('✅ [Migration] Migration completed successfully!');
        console.log('🎉 [Migration] You are now using industry-standard SSE solution');
        
        // 展示迁移后的优势
        this.showMigrationBenefits();
        
        return {
          success: true,
          service: this.newService,
          oldService: this.oldService
        };
      } else {
        throw new Error('Migration validation failed');
      }

    } catch (error) {
      console.error('❌ [Migration] Migration failed:', error);
      
      // 自动回滚
      await this.rollback();
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🛡️ 备份现有服务引用
   */
  async backupCurrentServices() {
    console.log('🛡️ [Migration] Backing up current services...');

    // 备份window对象上的引用
    if (window.minimalSSE) {
      this.backupReferences.set('window.minimalSSE', window.minimalSSE);
    }
    if (window.sseService) {
      this.backupReferences.set('window.sseService', window.sseService);
    }
    if (window.realtimeCommunicationService) {
      this.backupReferences.set('window.realtimeCommunicationService', window.realtimeCommunicationService);
    }

    this.oldService = window.minimalSSE || window.sseService;
    console.log('✅ [Migration] Services backed up successfully');
  }

  /**
   * 🎯 选择最优服务
   */
  async selectOptimalService() {
    console.log('🎯 [Migration] Selecting optimal service...');

    // 根据当前需求选择最佳服务
    // 对于聊天应用，Modern SSE是最佳选择（轻量级但功能完整）
    const service = modernSSEService;
    
    console.log('✅ [Migration] Selected Modern SSE (@microsoft/fetch-event-source)');
    console.log('📋 [Migration] Benefits: Authorization headers, auto-reconnect, fetch API, TypeScript support');
    
    return service;
  }

  /**
   * 🔄 无缝替换服务
   */
  async replaceServices(newService) {
    console.log('🔄 [Migration] Replacing services seamlessly...');

    // 1. 断开旧服务
    if (this.oldService && typeof this.oldService.disconnect === 'function') {
      await this.oldService.disconnect();
      console.log('🔌 [Migration] Old service disconnected');
    }

    // 2. 设置新服务
    this.newService = newService;

    // 3. 替换所有全局引用
    window.minimalSSE = newService;
    window.sseService = newService;
    window.realtimeCommunicationService = newService;

    // 4. 如果有token，立即连接新服务
    const token = this.getValidToken();
    if (token) {
      console.log('🔗 [Migration] Connecting new service with existing token...');
      await newService.connect(token);
    }

    console.log('✅ [Migration] Service replacement completed');
  }

  /**
   * 🧪 验证迁移成功
   */
  async validateMigration() {
    console.log('🧪 [Migration] Validating migration...');

    try {
      // 检查新服务是否正确设置
      if (!window.minimalSSE || window.minimalSSE !== this.newService) {
        throw new Error('New service not properly set in window references');
      }

      // 检查连接状态
      if (this.getValidToken()) {
        // 如果有token，检查连接
        const isConnected = await this.testConnection();
        if (!isConnected) {
          throw new Error('New service failed to connect');
        }
      }

      // 检查事件监听能力
      if (typeof this.newService.on !== 'function') {
        throw new Error('New service missing event listener methods');
      }

      console.log('✅ [Migration] Validation passed');
      return true;

    } catch (error) {
      console.error('❌ [Migration] Validation failed:', error);
      return false;
    }
  }

  /**
   * 🔙 回滚迁移
   */
  async rollback() {
    console.log('🔙 [Migration] Rolling back migration...');

    try {
      // 断开新服务
      if (this.newService && typeof this.newService.disconnect === 'function') {
        await this.newService.disconnect();
      }

      // 恢复备份的引用
      for (const [key, service] of this.backupReferences) {
        if (key === 'window.minimalSSE') {
          window.minimalSSE = service;
        } else if (key === 'window.sseService') {
          window.sseService = service;
        } else if (key === 'window.realtimeCommunicationService') {
          window.realtimeCommunicationService = service;
        }
      }

      // 重新连接旧服务
      if (this.oldService && typeof this.oldService.connect === 'function') {
        const token = this.getValidToken();
        if (token) {
          await this.oldService.connect(token);
        }
      }

      console.log('✅ [Migration] Rollback completed successfully');

    } catch (error) {
      console.error('❌ [Migration] Rollback failed:', error);
    }
  }

  /**
   * 🧪 测试连接
   */
  async testConnection() {
    try {
      // 等待短暂时间让连接建立
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 检查连接状态
      return this.newService.connected || this.newService.isConnected;
    } catch (error) {
      console.warn('⚠️ [Migration] Connection test failed:', error);
      return false;
    }
  }

  /**
   * 🎫 获取有效token
   */
  getValidToken() {
    // 尝试多个token源
    const sources = [
      () => window.authStore?.token,
      () => localStorage.getItem('auth_token'),
      () => localStorage.getItem('access_token'),
      () => sessionStorage.getItem('auth_token'),
      () => window.tokenManager?.getAccessToken?.()
    ];

    for (const getToken of sources) {
      try {
        const token = getToken();
        if (token && typeof token === 'string' && token.length > 20) {
          return token;
        }
      } catch (error) {
        // 忽略错误，尝试下一个源
      }
    }

    return null;
  }

  /**
   * 🎉 展示迁移优势
   */
  showMigrationBenefits() {
    console.log('');
    console.log('🎉 ======================== MIGRATION SUCCESS ========================');
    console.log('✅ You have successfully migrated to Microsoft\'s Modern SSE!');
    console.log('');
    console.log('📈 IMPROVEMENTS:');
    console.log('   • ✅ Authorization header support (more secure)');
    console.log('   • ✅ Automatic reconnection with exponential backoff');
    console.log('   • ✅ Modern fetch API (better error handling)');
    console.log('   • ✅ TypeScript native support');
    console.log('   • ✅ Industry-standard reliability');
    console.log('   • ✅ Smaller bundle size (~5KB vs custom implementation)');
    console.log('');
    console.log('🚫 PROBLEMS SOLVED:');
    console.log('   • ❌ EventSource creation failures');
    console.log('   • ❌ Timeout logic bugs');
    console.log('   • ❌ Inconsistent error handling');
    console.log('   • ❌ State management issues');
    console.log('   • ❌ High maintenance cost');
    console.log('');
    console.log('🔧 DEBUG COMMANDS (still available):');
    console.log('   • window.minimalSSE.connect(token) - Manual connection');
    console.log('   • window.minimalSSE.getConnectionInfo() - Status info');
    console.log('   • window.minimalSSE.on(event, callback) - Event listeners');
    console.log('==================================================================');
    console.log('');
  }
}

// 创建单例
const migrationExecutor = new MigrationExecutor();

// 导出迁移函数
export async function executeOneClickMigration() {
  return await migrationExecutor.executeFullMigration();
}

// 开发环境暴露调试工具
if (import.meta.env.DEV) {
  window.migrationExecutor = migrationExecutor;
  window.executeOneClickMigration = executeOneClickMigration;
  
  console.log('🔧 [Migration] Debug tools available:');
  console.log('  • executeOneClickMigration() - Execute migration');
  console.log('  • window.migrationExecutor - Full migration controller');
}

export default migrationExecutor; 