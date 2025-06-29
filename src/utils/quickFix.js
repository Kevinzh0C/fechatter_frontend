/**
 * 🔧 快速修复工具 - 解决Token和API连接问题
 */

import tokenSynchronizer from '../services/tokenSynchronizer';
import api from '../services/api';

class QuickFix {
  constructor() {
    this.fixResults = [];
  }

  /**
   * 🚀 执行所有修复
   */
  async executeAllFixes() {
    console.log('🔧 [QuickFix] Starting comprehensive fix...');
    
    const fixes = [
      { name: 'Token Synchronization', fn: () => this.fixTokenSync() },
      { name: 'API Connection Test', fn: () => this.testAPIConnection() },
      { name: 'Migration Completion', fn: () => this.completeMigration() },
      { name: 'Sidebar Data Load', fn: () => this.fixSidebarData() }
    ];

    for (const fix of fixes) {
      try {
        console.log(`🔄 [QuickFix] Executing: ${fix.name}...`);
        const result = await fix.fn();
        this.fixResults.push({ name: fix.name, success: true, result });
        console.log(`✅ [QuickFix] ${fix.name} completed`);
      } catch (error) {
        console.error(`❌ [QuickFix] ${fix.name} failed:`, error);
        this.fixResults.push({ name: fix.name, success: false, error: error.message });
      }
    }

    // 显示修复结果
    this.showResults();
    return this.fixResults;
  }

  /**
   * 🎫 修复Token同步
   */
  async fixTokenSync() {
    console.log('🎫 [QuickFix] Fixing token synchronization...');

    // 1. 检查所有token源
    const tokenSources = {
      localStorage_auth_token: localStorage.getItem('auth_token'),
      localStorage_access_token: localStorage.getItem('access_token'),
      sessionStorage_auth_token: sessionStorage.getItem('auth_token'),
      tokenSynchronizer: null,
      authStore: null
    };

    // 2. 尝试从tokenSynchronizer获取
    try {
      tokenSources.tokenSynchronizer = await tokenSynchronizer.getToken();
    } catch (error) {
      console.warn('⚠️ TokenSynchronizer failed:', error);
    }

    // 3. 尝试从authStore获取
    try {
      if (window.authStore && window.authStore.token) {
        tokenSources.authStore = window.authStore.token;
      }
    } catch (error) {
      console.warn('⚠️ AuthStore access failed:', error);
    }

    // 4. 找到最佳token
    const validToken = this.findBestToken(tokenSources);
    
    if (!validToken) {
      throw new Error('No valid token found in any source');
    }

    // 5. 同步到所有位置
    console.log('🔄 [QuickFix] Synchronizing token to all sources...');
    
    // 更新localStorage
    localStorage.setItem('auth_token', validToken);
    localStorage.setItem('access_token', validToken);
    
    // 更新tokenSynchronizer
    try {
      await tokenSynchronizer.setTokenAndUser(validToken, null);
    } catch (error) {
      console.warn('⚠️ Failed to update tokenSynchronizer:', error);
    }

    // 更新authStore如果存在
    if (window.authStore) {
      window.authStore.token = validToken;
    }

    console.log('✅ [QuickFix] Token synchronized successfully');
    return { tokenFound: true, tokenLength: validToken.length };
  }

  /**
   * 🎯 找到最佳token
   */
  findBestToken(sources) {
    const tokens = Object.values(sources).filter(token => 
      token && typeof token === 'string' && token.length > 20
    );

    if (tokens.length === 0) return null;

    // 返回最长的token（通常是最完整的）
    return tokens.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  }

  /**
   * 🔗 测试API连接
   */
  async testAPIConnection() {
    console.log('🔗 [QuickFix] Testing API connection...');

    try {
      // 测试workspace chats API
      const response = await api.get('/workspace/chats');
      
      const chats = response.data?.data || [];
      console.log(`✅ [QuickFix] API working! Found ${chats.length} chats`);
      
      return { 
        success: true, 
        chatsCount: chats.length,
        responseTime: response.duration || 'unknown'
      };
    } catch (error) {
      console.error('❌ [QuickFix] API test failed:', error);
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  /**
   * 🚀 完成Migration
   */
  async completeMigration() {
    console.log('🚀 [QuickFix] Completing migration if needed...');

    // 检查migration状态
    if (window.migrationExecutor) {
      // 检查newService是否已设置
      if (window.migrationExecutor.newService && window.minimalSSE) {
        console.log('✅ [QuickFix] Migration already completed');
        return { status: 'already_completed' };
      }
    }

    // 如果migration没有完成，强制完成
    if (window.modernSSEService) {
      console.log('🔄 [QuickFix] Forcing migration completion...');
      
      // 设置全局引用
      window.minimalSSE = window.modernSSEService;
      window.sseService = window.modernSSEService;
      
      // 连接到服务
      const token = this.findBestToken({
        localStorage: localStorage.getItem('auth_token'),
        authStore: window.authStore?.token
      });
      
      if (token) {
        await window.modernSSEService.connect(token);
      }
      
      console.log('✅ [QuickFix] Migration completed successfully');
      return { status: 'completed', service: 'modernSSE' };
    }

    return { status: 'no_migration_needed' };
  }

  /**
   * 📊 修复Sidebar数据
   */
  async fixSidebarData() {
    console.log('📊 [QuickFix] Fixing sidebar data...');

    try {
      // 强制刷新聊天数据
      if (window.chatStore && typeof window.chatStore.fetchChats === 'function') {
        console.log('🔄 [QuickFix] Forcing chat store refresh...');
        await window.chatStore.fetchChats();
      }

      // 强制刷新workspace数据
      if (window.workspaceStore && typeof window.workspaceStore.fetchWorkspaceChats === 'function') {
        console.log('🔄 [QuickFix] Forcing workspace store refresh...');
        await window.workspaceStore.fetchWorkspaceChats();
      }

      // 检查数据加载结果
      const chatCount = window.chatStore?.chats?.length || 0;
      const workspaceCount = window.workspaceStore?.chats?.length || 0;

      console.log(`📊 [QuickFix] Data loaded - Chat store: ${chatCount}, Workspace store: ${workspaceCount}`);

      return {
        chatStoreCount: chatCount,
        workspaceStoreCount: workspaceCount,
        totalCount: Math.max(chatCount, workspaceCount)
      };

    } catch (error) {
      console.error('❌ [QuickFix] Sidebar data fix failed:', error);
      throw error;
    }
  }

  /**
   * 📋 显示修复结果
   */
  showResults() {
    console.log('');
    console.log('🔧 ================ QUICK FIX RESULTS ================');
    
    let successCount = 0;
    let failCount = 0;

    for (const result of this.fixResults) {
      if (result.success) {
        console.log(`✅ ${result.name}: SUCCESS`);
        if (result.result) {
          console.log(`   ${JSON.stringify(result.result)}`);
        }
        successCount++;
      } else {
        console.log(`❌ ${result.name}: FAILED`);
        console.log(`   Error: ${result.error}`);
        failCount++;
      }
    }

    console.log('');
    console.log(`📊 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (successCount > failCount) {
      console.log('🎉 Overall result: SUCCESS - Your chat should now work!');
    } else {
      console.log('⚠️  Overall result: PARTIAL - Some issues may remain');
    }
    
    console.log('====================================================');
    console.log('');
  }
}

// 创建实例并暴露到全局
const quickFix = new QuickFix();

// 开发环境暴露
if (import.meta.env.DEV) {
  window.quickFix = quickFix;
  window.executeQuickFix = () => quickFix.executeAllFixes();
}

export default quickFix; 