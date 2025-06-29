/**
 * Sidebar数据加载问题诊断工具
 * 用于在浏览器控制台中诊断Sidebar无法加载数据的问题
 */

class SidebarDebugger {
  constructor() {
    this.stores = {
      chatStore: null,
      workspaceStore: null,
      authStore: null
    };
    
    this.originalFunctions = {
      fetchChats: null,
      fetchWorkspaceChats: null
    };
    
    this.apiData = null;
    this.processedData = null;
    this.lastError = null;
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化调试器
   */
  init() {
    console.log('🔍 [SidebarDebugger] 初始化...');
    
    // 注册全局访问点
    window.sidebarDebugger = this;
    
    console.log('✅ [SidebarDebugger] 初始化完成，使用 window.sidebarDebugger 访问调试工具');
    console.log('📋 可用命令:');
    console.log('   - window.sidebarDebugger.diagnose() - 运行完整诊断');
    console.log('   - window.sidebarDebugger.testDirectAPI() - 直接测试API');
    console.log('   - window.sidebarDebugger.fixSidebar() - 尝试修复Sidebar');
  }
  
  /**
   * 获取Store实例
   */
  getStores() {
    try {
      // 尝试获取Pinia Store实例
      const app = window.__VUE_APP__;
      if (!app) {
        console.warn('⚠️ [SidebarDebugger] 无法访问Vue应用实例');
        return false;
      }
      
      // 尝试通过全局变量获取store
      if (window.chatStore) {
        this.stores.chatStore = window.chatStore;
      }
      
      if (window.workspaceStore) {
        this.stores.workspaceStore = window.workspaceStore;
      }
      
      if (window.authStore) {
        this.stores.authStore = window.authStore;
      }
      
      // 检查是否成功获取store
      const hasStores = !!(this.stores.chatStore || this.stores.workspaceStore || this.stores.authStore);
      
      if (hasStores) {
        console.log('✅ [SidebarDebugger] 成功获取Store实例');
      } else {
        console.warn('⚠️ [SidebarDebugger] 无法获取任何Store实例');
      }
      
      return hasStores;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 获取Store实例失败:', error);
      return false;
    }
  }
  
  /**
   * 检查认证状态
   */
  checkAuth() {
    console.log('🔍 [SidebarDebugger] 检查认证状态...');
    
    try {
      // 获取token
      const localToken = localStorage.getItem('auth_token');
      const sessionToken = sessionStorage.getItem('auth_token');
      
      // 检查Store中的认证状态
      let storeAuth = null;
      if (this.stores.authStore) {
        storeAuth = {
          isAuthenticated: this.stores.authStore.isAuthenticated,
          hasToken: !!this.stores.authStore.token,
          hasUser: !!this.stores.authStore.user,
          userId: this.stores.authStore.user?.id
        };
      }
      
      const authStatus = {
        localStorage_token: localToken ? `${localToken.substring(0, 20)}...` : null,
        sessionStorage_token: sessionToken ? `${sessionToken.substring(0, 20)}...` : null,
        authStore: storeAuth,
        isAuthenticated: !!(localToken || sessionToken || (storeAuth && storeAuth.isAuthenticated))
      };
      
      console.log('🔍 [SidebarDebugger] 认证状态:', authStatus);
      return authStatus;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 检查认证状态失败:', error);
      return null;
    }
  }
  
  /**
   * 直接测试API
   */
  async testDirectAPI() {
    console.log('🔍 [SidebarDebugger] 直接测试API...');
    
    try {
      // 获取token
      const token = localStorage.getItem('auth_token') || 
                    sessionStorage.getItem('auth_token') ||
                    (this.stores.authStore && this.stores.authStore.token);
      
      if (!token) {
        throw new Error('未找到有效的认证Token');
      }
      
      // 发送请求
      const response = await fetch('/workspace/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Skip-Deduplication': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      this.apiData = data;
      
      // 分析数据结构
      const dataStructure = data ? Object.keys(data) : [];
      const chatsCount = data.data ? data.data.length : (Array.isArray(data) ? data.length : 0);
      const sample = data.data ? data.data.slice(0, 2) : (Array.isArray(data) ? data.slice(0, 2) : []);
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        dataStructure,
        chatsCount,
        sample
      };
      
      console.log('✅ [SidebarDebugger] API测试成功:', result);
      return result;
    } catch (error) {
      console.error('❌ [SidebarDebugger] API测试失败:', error);
      this.lastError = error;
      return null;
    }
  }
  
  /**
   * 处理API数据
   */
  processApiData() {
    console.log('🔍 [SidebarDebugger] 处理API数据...');
    
    try {
      if (!this.apiData) {
        throw new Error('没有API数据，请先执行testDirectAPI()');
      }
      
      // 模拟chatStore中的数据处理逻辑
      let chatsData = [];
      const responseData = this.apiData;
      
      if (responseData) {
        if (responseData.data && Array.isArray(responseData.data)) {
          chatsData = responseData.data;
        } else if (Array.isArray(responseData)) {
          chatsData = responseData;
        } else if (responseData.chats && Array.isArray(responseData.chats)) {
          chatsData = responseData.chats;
        }
      }
      
      // 模拟normalizeChat处理
      this.processedData = chatsData.map(chat => ({
        ...chat,
        normalized: true,
        chat_type_display: chat.chat_type === 'Single' ? 'Direct Message' : 
                          chat.chat_type === 'Group' ? 'Group Chat' : 
                          chat.chat_type === 'PublicChannel' ? 'Public Channel' : 
                          chat.chat_type === 'PrivateChannel' ? 'Private Channel' : chat.chat_type
      }));
      
      // 分类处理，模拟App.vue中的计算属性
      const channels = this.processedData.filter(c => c.chat_type === 'PublicChannel' || c.chat_type === 'PrivateChannel');
      const directMessages = this.processedData.filter(c => c.chat_type === 'Single');
      const groupMessages = this.processedData.filter(c => c.chat_type === 'Group');
      
      const result = {
        totalProcessed: this.processedData.length,
        channels: channels.length,
        directMessages: directMessages.length,
        groupMessages: groupMessages.length
      };
      
      console.log('✅ [SidebarDebugger] 数据处理成功:', result);
      return result;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 数据处理失败:', error);
      this.lastError = error;
      return null;
    }
  }
  
  /**
   * 检查Store状态
   */
  checkStoreState() {
    console.log('🔍 [SidebarDebugger] 检查Store状态...');
    
    try {
      if (!this.getStores()) {
        throw new Error('无法访问Store实例');
      }
      
      const storeState = {
        chatStore: this.stores.chatStore ? {
          chats_length: this.stores.chatStore.chats ? this.stores.chatStore.chats.length : 0,
          loading: this.stores.chatStore.loading,
          error: this.stores.chatStore.error,
          _fetchingChats: this.stores.chatStore._fetchingChats,
          _lastFetchTime: this.stores.chatStore._lastFetchTime
        } : null,
        
        workspaceStore: this.stores.workspaceStore ? {
          workspaceChats_length: this.stores.workspaceStore.workspaceChats ? this.stores.workspaceStore.workspaceChats.length : 0,
          loading: this.stores.workspaceStore.loading,
          error: this.stores.workspaceStore.error,
          _fetchingChats: this.stores.workspaceStore._fetchingChats,
          _lastFetchTime: this.stores.workspaceStore._lastFetchTime
        } : null
      };
      
      console.log('🔍 [SidebarDebugger] Store状态:', storeState);
      return storeState;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 检查Store状态失败:', error);
      this.lastError = error;
      return null;
    }
  }
  
  /**
   * 重置Store标志位
   */
  resetStoreFlags() {
    console.log('🔍 [SidebarDebugger] 重置Store标志位...');
    
    try {
      if (this.stores.chatStore) {
        this.stores.chatStore._fetchingChats = false;
        this.stores.chatStore._lastFetchTime = 0;
        console.log('✅ [SidebarDebugger] 重置chatStore标志位成功');
      }
      
      if (this.stores.workspaceStore) {
        this.stores.workspaceStore._fetchingChats = false;
        this.stores.workspaceStore._lastFetchTime = 0;
        console.log('✅ [SidebarDebugger] 重置workspaceStore标志位成功');
      }
      
      return true;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 重置Store标志位失败:', error);
      this.lastError = error;
      return false;
    }
  }
  
  /**
   * 强制更新Store数据
   */
  async forceUpdateStoreData() {
    console.log('🔍 [SidebarDebugger] 强制更新Store数据...');
    
    try {
      if (!this.apiData) {
        await this.testDirectAPI();
        if (!this.apiData) {
          throw new Error('无法获取API数据');
        }
      }
      
      // 处理数据
      if (!this.processedData) {
        this.processApiData();
      }
      
      // 更新chatStore
      if (this.stores.chatStore && this.processedData) {
        this.stores.chatStore.chats = [...this.processedData];
        console.log('✅ [SidebarDebugger] 更新chatStore数据成功:', this.stores.chatStore.chats.length, '项');
      }
      
      // 更新workspaceStore
      if (this.stores.workspaceStore && this.processedData) {
        this.stores.workspaceStore.workspaceChats = [...this.processedData];
        console.log('✅ [SidebarDebugger] 更新workspaceStore数据成功:', this.stores.workspaceStore.workspaceChats.length, '项');
      }
      
      return true;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 强制更新Store数据失败:', error);
      this.lastError = error;
      return false;
    }
  }
  
  /**
   * 强制更新UI
   */
  forceUpdateUI() {
    console.log('🔍 [SidebarDebugger] 强制更新UI...');
    
    try {
      // 尝试获取Vue应用实例
      const app = window.__VUE_APP__;
      if (!app) {
        throw new Error('无法访问Vue应用实例');
      }
      
      // 触发强制更新
      app.$forceUpdate();
      console.log('✅ [SidebarDebugger] 强制更新UI成功');
      
      return true;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 强制更新UI失败:', error);
      this.lastError = error;
      return false;
    }
  }
  
  /**
   * 运行完整诊断
   */
  async diagnose() {
    console.log('🔍 [SidebarDebugger] 开始完整诊断...');
    
    try {
      // 1. 获取Store实例
      this.getStores();
      
      // 2. 检查认证状态
      const authStatus = this.checkAuth();
      if (!authStatus || !authStatus.isAuthenticated) {
        throw new Error('未通过认证检查，请确保已登录');
      }
      
      // 3. 检查Store状态
      this.checkStoreState();
      
      // 4. 直接测试API
      const apiResult = await this.testDirectAPI();
      if (!apiResult) {
        throw new Error('API测试失败，请检查网络和认证状态');
      }
      
      // 5. 处理API数据
      this.processApiData();
      
      // 6. 比较Store数据和API数据
      const storeState = this.checkStoreState();
      
      // 7. 诊断结果
      const diagnosticResult = {
        authStatus,
        apiWorking: !!apiResult,
        apiDataCount: apiResult ? apiResult.chatsCount : 0,
        storeDataCount: {
          chatStore: storeState.chatStore ? storeState.chatStore.chats_length : 0,
          workspaceStore: storeState.workspaceStore ? storeState.workspaceStore.workspaceChats_length : 0
        },
        possibleIssues: []
      };
      
      // 8. 识别可能的问题
      if (apiResult && apiResult.chatsCount > 0) {
        if (storeState.chatStore && storeState.chatStore.chats_length === 0) {
          diagnosticResult.possibleIssues.push('chatStore中没有数据，但API返回了数据');
        }
        
        if (storeState.workspaceStore && storeState.workspaceStore.workspaceChats_length === 0) {
          diagnosticResult.possibleIssues.push('workspaceStore中没有数据，但API返回了数据');
        }
        
        if (storeState.chatStore && storeState.chatStore._fetchingChats) {
          diagnosticResult.possibleIssues.push('chatStore._fetchingChats标志为true，可能阻止了新请求');
        }
        
        if (storeState.workspaceStore && storeState.workspaceStore._fetchingChats) {
          diagnosticResult.possibleIssues.push('workspaceStore._fetchingChats标志为true，可能阻止了新请求');
        }
      }
      
      console.log('✅ [SidebarDebugger] 诊断完成:', diagnosticResult);
      
      // 9. 提供修复建议
      console.log('📋 [SidebarDebugger] 修复建议:');
      if (diagnosticResult.possibleIssues.length > 0) {
        diagnosticResult.possibleIssues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue}`);
        });
        console.log('   - 运行 window.sidebarDebugger.fixSidebar() 尝试自动修复');
      } else if (apiResult && apiResult.chatsCount === 0) {
        console.log('   - API返回了空数据，这可能是正常的（新用户没有聊天）');
      } else {
        console.log('   - 未发现明显问题，可能是UI渲染问题');
        console.log('   - 尝试运行 window.sidebarDebugger.forceUpdateUI()');
      }
      
      return diagnosticResult;
    } catch (error) {
      console.error('❌ [SidebarDebugger] 诊断失败:', error);
      this.lastError = error;
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 尝试修复Sidebar
   */
  async fixSidebar() {
    console.log('🔧 [SidebarDebugger] 开始修复Sidebar...');
    
    try {
      // 1. 重置Store标志位
      this.resetStoreFlags();
      
      // 2. 获取新数据
      await this.testDirectAPI();
      
      // 3. 处理数据
      this.processApiData();
      
      // 4. 强制更新Store数据
      await this.forceUpdateStoreData();
      
      // 5. 强制更新UI
      this.forceUpdateUI();
      
      console.log('✅ [SidebarDebugger] Sidebar修复完成，请检查UI是否更新');
      
      return {
        success: true,
        message: 'Sidebar修复完成，请检查UI是否更新'
      };
    } catch (error) {
      console.error('❌ [SidebarDebugger] 修复失败:', error);
      this.lastError = error;
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 创建实例并导出
const sidebarDebugger = new SidebarDebugger();
export default sidebarDebugger;

// 在开发环境中自动初始化
if (process.env.NODE_ENV === 'development') {
  // 延迟初始化，确保Vue应用已加载
  setTimeout(() => {
    console.log('🔍 [SidebarDebugger] 自动初始化...');
    window.sidebarDebugger = sidebarDebugger;
  }, 2000);
} 