/**
 * 🚀 Complete Token System Migration
 * 从多个混乱的token管理器迁移到现代化的统一系统
 * 
 * 业界最佳实践：
 * - 单一数据源 (Single Source of Truth)
 * - 自动token刷新
 * - 安全的cookie存储
 * - Vue 3 Composition API响应式
 */

class TokenMigration {
  constructor() {
    this.migrationSteps = [];
    this.backupData = new Map();
    this.modernAuth = null;
    this.modernApi = null;
  }

  /**
   * 🎯 执行完整迁移
   */
  async executeFullMigration() {
    console.log('🚀 [TokenMigration] Starting complete token system migration...');
    console.log('');
    console.log('🔄 ================= TOKEN MIGRATION =================');
    console.log('🎯 Migrating from: Multiple chaotic token managers');
    console.log('✅ Migrating to: Modern unified authentication system');
    console.log('================================================');
    console.log('');

    try {
      // Step 1: 备份现有数据
      await this.backupExistingTokens();

      // Step 2: 初始化现代化系统
      await this.initializeModernSystems();

      // Step 3: 迁移现有token
      await this.migrateTokenData();

      // Step 4: 替换所有API调用
      await this.replaceApiCalls();

      // Step 5: 清理旧系统
      await this.cleanupLegacySystems();

      // Step 6: 验证迁移
      await this.validateMigration();

      this.showMigrationSuccess();
      return { success: true, details: this.migrationSteps };

    } catch (error) {
      console.error('❌ [TokenMigration] Migration failed:', error);
      await this.rollbackMigration();
      return { success: false, error: error.message };
    }
  }

  /**
   * 💾 备份现有token数据
   */
  async backupExistingTokens() {
    console.log('💾 [TokenMigration] Step 1: Backing up existing tokens...');

    const tokenSources = {
      localStorage_auth_token: localStorage.getItem('auth_token'),
      localStorage_access_token: localStorage.getItem('access_token'),
      sessionStorage_auth_token: sessionStorage.getItem('auth_token'),
      cookies: this.getCookieToken(),
      authStore: null,
      tokenManager: null,
      tokenSynchronizer: null
    };

    // 尝试从各种store获取token
    try {
      if (window.authStore?.token) {
        tokenSources.authStore = window.authStore.token;
      }
    } catch (error) {
      console.warn('⚠️ AuthStore backup failed:', error);
    }

    try {
      if (window.tokenManager?.getAccessToken) {
        tokenSources.tokenManager = window.tokenManager.getAccessToken();
      }
    } catch (error) {
      console.warn('⚠️ TokenManager backup failed:', error);
    }

    try {
      const { default: tokenSynchronizer } = await import('../services/tokenSynchronizer');
      tokenSources.tokenSynchronizer = await tokenSynchronizer.getToken();
    } catch (error) {
      console.warn('⚠️ TokenSynchronizer backup failed:', error);
    }

    // 找到最佳token
    const validTokens = Object.entries(tokenSources)
      .filter(([key, token]) => token && typeof token === 'string' && token.length > 20)
      .map(([source, token]) => ({ source, token, length: token.length }));

    this.backupData.set('tokens', validTokens);
    
    console.log(`✅ [TokenMigration] Backed up ${validTokens.length} valid tokens from ${Object.keys(tokenSources).length} sources`);
    this.migrationSteps.push('✅ Token backup completed');
  }

  /**
   * 🏗️ 初始化现代化系统
   */
  async initializeModernSystems() {
    console.log('🏗️ [TokenMigration] Step 2: Initializing modern systems...');

    // 初始化现代认证store
    const { useModernAuth } = await import('../stores/modernAuth.js');
    this.modernAuth = useModernAuth();

    // 初始化现代API
    const modernApi = await import('../services/modernApi.js');
    this.modernApi = modernApi.default;

    console.log('✅ [TokenMigration] Modern systems initialized');
    this.migrationSteps.push('✅ Modern systems initialization completed');
  }

  /**
   * 🔄 迁移token数据
   */
  async migrateTokenData() {
    console.log('🔄 [TokenMigration] Step 3: Migrating token data...');

    const backedUpTokens = this.backupData.get('tokens') || [];
    
    if (backedUpTokens.length === 0) {
      console.log('ℹ️ [TokenMigration] No valid tokens to migrate');
      this.migrationSteps.push('ℹ️ No tokens to migrate');
      return;
    }

    // 选择最佳token（最长的通常是最完整的）
    const bestToken = backedUpTokens.reduce((best, current) => 
      current.length > best.length ? current : best
    );

    console.log(`🎯 [TokenMigration] Selected best token from: ${bestToken.source} (${bestToken.length} chars)`);

    // 设置到现代认证系统
    try {
      this.modernAuth.setToken(bestToken.token);
      console.log('✅ [TokenMigration] Token migrated to modern auth system');
      this.migrationSteps.push(`✅ Token migrated from ${bestToken.source}`);
    } catch (error) {
      console.error('❌ [TokenMigration] Token validation failed:', error);
      throw new Error(`Token migration failed: ${error.message}`);
    }
  }

  /**
   * 🔄 替换API调用
   */
  async replaceApiCalls() {
    console.log('🔄 [TokenMigration] Step 4: Replacing API system...');

    // 替换全局API引用
    const oldApi = window.api;
    window.api = this.modernApi;
    
    // 备份旧的API以防回滚
    this.backupData.set('oldApi', oldApi);

    // 更新全局引用
    window.modernAuth = this.modernAuth;
    window.modernApi = this.modernApi;

    console.log('✅ [TokenMigration] API system replaced');
    this.migrationSteps.push('✅ API system replaced with modern implementation');
  }

  /**
   * 🧹 清理旧系统
   */
  async cleanupLegacySystems() {
    console.log('🧹 [TokenMigration] Step 5: Cleaning up legacy systems...');

    const legacyCleanupTasks = [
      // 清理全局引用
      () => {
        delete window.tokenManager;
        delete window.tokenSynchronizer;
        delete window.authStateManager;
        console.log('✅ Cleared legacy global references');
      },

      // 清理localStorage
      () => {
        const legacyKeys = [
          'auth_token', 'access_token', 'refresh_token',
          'user_data', 'auth_state', 'token_expiry',
          'fechatter_auth_state', 'fechatter_user_cache'
        ];
        
        legacyKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
          }
        });
        console.log('✅ Cleared legacy localStorage');
      },

      // 清理sessionStorage
      () => {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('access_token');
        console.log('✅ Cleared legacy sessionStorage');
      },

      // 清理旧cookies
      () => {
        const legacyCookies = ['auth_token', 'access_token', 'user_session'];
        legacyCookies.forEach(name => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        console.log('✅ Cleared legacy cookies');
      }
    ];

    for (const task of legacyCleanupTasks) {
      try {
        task();
      } catch (error) {
        console.warn('⚠️ Legacy cleanup task failed:', error);
      }
    }

    console.log('✅ [TokenMigration] Legacy systems cleaned up');
    this.migrationSteps.push('✅ Legacy systems cleanup completed');
  }

  /**
   * ✅ 验证迁移
   */
  async validateMigration() {
    console.log('✅ [TokenMigration] Step 6: Validating migration...');

    const validationChecks = [
      // 检查现代认证系统
      {
        name: 'Modern Auth System',
        check: () => this.modernAuth.isAuthenticated,
        expected: true
      },
      
      // 检查token有效性
      {
        name: 'Token Validity',
        check: () => this.modernAuth.isTokenValid,
        expected: true
      },
      
      // 检查API系统
      {
        name: 'Modern API System',
        check: () => !!window.modernApi,
        expected: true
      },
      
      // 检查用户信息
      {
        name: 'User Information',
        check: () => !!this.modernAuth.userInfo,
        expected: true
      },
      
      // 检查旧系统清理
      {
        name: 'Legacy Cleanup',
        check: () => !window.tokenManager && !window.tokenSynchronizer,
        expected: true
      }
    ];

    let passedChecks = 0;
    const totalChecks = validationChecks.length;

    for (const { name, check, expected } of validationChecks) {
      try {
        const result = check();
        if (result === expected) {
          console.log(`✅ ${name}: PASS`);
          passedChecks++;
        } else {
          console.log(`❌ ${name}: FAIL (expected: ${expected}, got: ${result})`);
        }
      } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
      }
    }

    const successRate = (passedChecks / totalChecks) * 100;
    console.log(`📊 Validation Results: ${passedChecks}/${totalChecks} checks passed (${successRate.toFixed(1)}%)`);

    if (successRate < 80) {
      throw new Error(`Migration validation failed: ${successRate.toFixed(1)}% success rate`);
    }

    this.migrationSteps.push(`✅ Migration validation passed: ${passedChecks}/${totalChecks} checks`);
  }

  /**
   * 🔙 回滚迁移
   */
  async rollbackMigration() {
    console.log('🔙 [TokenMigration] Rolling back migration...');

    try {
      // 恢复旧API
      const oldApi = this.backupData.get('oldApi');
      if (oldApi) {
        window.api = oldApi;
      }

      // 恢复token数据
      const backedUpTokens = this.backupData.get('tokens') || [];
      if (backedUpTokens.length > 0) {
        const bestToken = backedUpTokens[0];
        localStorage.setItem('auth_token', bestToken.token);
      }

      console.log('✅ [TokenMigration] Rollback completed');
    } catch (error) {
      console.error('❌ [TokenMigration] Rollback failed:', error);
    }
  }

  /**
   * 🍪 获取cookie中的token
   */
  getCookieToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token' || name === 'access_token') {
        return value;
      }
    }
    return null;
  }

  /**
   * 🎉 显示迁移成功信息
   */
  showMigrationSuccess() {
    console.log('');
    console.log('🎉 ================= MIGRATION SUCCESS =================');
    console.log('✅ Token system migration completed successfully!');
    console.log('');
    console.log('🏆 NEW FEATURES AVAILABLE:');
    console.log('  • ✅ Unified authentication system');
    console.log('  • ✅ Automatic token refresh');
    console.log('  • ✅ Secure cookie storage');
    console.log('  • ✅ Industry-standard JWT handling');
    console.log('  • ✅ Request deduplication');
    console.log('  • ✅ Better error handling');
    console.log('');
    console.log('🚫 ELIMINATED PROBLEMS:');
    console.log('  • ❌ Multiple conflicting token managers');
    console.log('  • ❌ Token synchronization issues');
    console.log('  • ❌ Manual token refresh');
    console.log('  • ❌ Inconsistent authentication state');
    console.log('  • ❌ Security vulnerabilities');
    console.log('');
    console.log('🔧 AVAILABLE COMMANDS:');
    console.log('  • window.modernAuth - Modern authentication store');
    console.log('  • window.modernApi - Modern API client');
    console.log('  • window.modernAuth.userInfo - Current user information');
    console.log('  • window.modernAuth.tokenExpiresAt - Token expiration time');
    console.log('====================================================');
    console.log('');
  }

  /**
   * 📊 获取迁移统计
   */
  getStats() {
    return {
      stepsCompleted: this.migrationSteps.length,
      backupData: Array.from(this.backupData.keys()),
      modernAuthActive: !!this.modernAuth,
      modernApiActive: !!this.modernApi
    };
  }
}

// 创建迁移实例
const tokenMigration = new TokenMigration();

// 开发环境暴露
if (import.meta.env.DEV) {
  window.tokenMigration = tokenMigration;
  window.executeTokenMigration = () => tokenMigration.executeFullMigration();
}

export default tokenMigration;
export { TokenMigration }; 