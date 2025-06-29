/**
 * DataLoadingMonitor - 数据加载状态监控器
 * 确保sidebar数据正确加载并可用于导航
 */

import { ref, computed } from 'vue';

class DataLoadingMonitor {
  constructor() {
    this.isInitialized = false;
    this.stores = {
      chat: null,
      workspace: null,
      auth: null
    };
    
    // 数据加载状态
    this.loadingState = ref({
      chats: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      },
      workspaceChats: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      },
      workspaceUsers: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      }
    });
    
    // 加载历史
    this.loadingHistory = ref([]);
    
    console.log('📊 [DataLoadingMonitor] Initialized');
  }
  
  /**
   * 初始化监控器
   */
  initialize(stores) {
    if (this.isInitialized) return;
    
    this.stores = stores;
    this.isInitialized = true;
    
    // 设置数据监听器
    this.setupDataWatchers();
    
    console.log('✅ [DataLoadingMonitor] Fully initialized with stores');
  }
  
  /**
   * 设置数据监听器
   */
  setupDataWatchers() {
    // 监听聊天数据变化
    if (this.stores.chat) {
      this.watchChatData();
    }
    
    // 监听工作区数据变化
    if (this.stores.workspace) {
      this.watchWorkspaceData();
    }
    
    console.log('🔍 [DataLoadingMonitor] Data watchers setup completed');
  }
  
  /**
   * 监听聊天数据
   */
  watchChatData() {
    const chatStore = this.stores.chat;
    
    // 监听聊天列表变化
    const originalFetchChats = chatStore.fetchChats;
    chatStore.fetchChats = async (...args) => {
      this.loadingState.value.chats.loading = true;
      this.recordLoadingEvent('chats', 'start');
      
      try {
        const result = await originalFetchChats.apply(chatStore, args);
        
        this.loadingState.value.chats = {
          loading: false,
          loaded: true,
          count: chatStore.chats?.length || 0,
          lastLoadTime: Date.now(),
          error: null
        };
        
        this.recordLoadingEvent('chats', 'success', {
          count: this.loadingState.value.chats.count
        });
        
        console.log('📊 [DataLoadingMonitor] Chats data loaded:', this.loadingState.value.chats.count);
        
        return result;
      } catch (error) {
        this.loadingState.value.chats = {
          loading: false,
          loaded: false,
          count: 0,
          lastLoadTime: Date.now(),
          error: error.message
        };
        
        this.recordLoadingEvent('chats', 'error', { error: error.message });
        
        console.error('❌ [DataLoadingMonitor] Chats data loading failed:', error);
        throw error;
      }
    };
  }
  
  /**
   * 监听工作区数据
   */
  watchWorkspaceData() {
    const workspaceStore = this.stores.workspace;
    
    // 监听工作区聊天数据
    const originalFetchWorkspaceChats = workspaceStore.fetchWorkspaceChats;
    workspaceStore.fetchWorkspaceChats = async (...args) => {
      this.loadingState.value.workspaceChats.loading = true;
      this.recordLoadingEvent('workspaceChats', 'start');
      
      try {
        const result = await originalFetchWorkspaceChats.apply(workspaceStore, args);
        
        this.loadingState.value.workspaceChats = {
          loading: false,
          loaded: true,
          count: workspaceStore.workspaceChats?.length || 0,
          lastLoadTime: Date.now(),
          error: null
        };
        
        this.recordLoadingEvent('workspaceChats', 'success', {
          count: this.loadingState.value.workspaceChats.count
        });
        
        console.log('📊 [DataLoadingMonitor] Workspace chats data loaded:', this.loadingState.value.workspaceChats.count);
        
        return result;
      } catch (error) {
        this.loadingState.value.workspaceChats = {
          loading: false,
          loaded: false,
          count: 0,
          lastLoadTime: Date.now(),
          error: error.message
        };
        
        this.recordLoadingEvent('workspaceChats', 'error', { error: error.message });
        
        console.error('❌ [DataLoadingMonitor] Workspace chats data loading failed:', error);
        throw error;
      }
    };
    
    // 监听工作区用户数据
    const originalFetchWorkspaceUsers = workspaceStore.fetchWorkspaceUsers;
    workspaceStore.fetchWorkspaceUsers = async (...args) => {
      this.loadingState.value.workspaceUsers.loading = true;
      this.recordLoadingEvent('workspaceUsers', 'start');
      
      try {
        const result = await originalFetchWorkspaceUsers.apply(workspaceStore, args);
        
        this.loadingState.value.workspaceUsers = {
          loading: false,
          loaded: true,
          count: workspaceStore.workspaceUsers?.length || 0,
          lastLoadTime: Date.now(),
          error: null
        };
        
        this.recordLoadingEvent('workspaceUsers', 'success', {
          count: this.loadingState.value.workspaceUsers.count
        });
        
        console.log('📊 [DataLoadingMonitor] Workspace users data loaded:', this.loadingState.value.workspaceUsers.count);
        
        return result;
      } catch (error) {
        this.loadingState.value.workspaceUsers = {
          loading: false,
          loaded: false,
          count: 0,
          lastLoadTime: Date.now(),
          error: error.message
        };
        
        this.recordLoadingEvent('workspaceUsers', 'error', { error: error.message });
        
        console.error('❌ [DataLoadingMonitor] Workspace users data loading failed:', error);
        throw error;
      }
    };
  }
  
  /**
   * 记录加载事件
   */
  recordLoadingEvent(dataType, eventType, details = {}) {
    const event = {
      dataType,
      eventType,
      timestamp: Date.now(),
      details
    };
    
    this.loadingHistory.value.push(event);
    
    // 保持历史记录在合理范围内
    if (this.loadingHistory.value.length > 100) {
      this.loadingHistory.value = this.loadingHistory.value.slice(-50);
    }
  }
  
  /**
   * 检查所有数据是否已加载
   */
  isAllDataLoaded() {
    const state = this.loadingState.value;
    return state.chats.loaded && 
           state.workspaceChats.loaded && 
           state.workspaceUsers.loaded;
  }
  
  /**
   * 检查是否有任何数据正在加载
   */
  isAnyDataLoading() {
    const state = this.loadingState.value;
    return state.chats.loading || 
           state.workspaceChats.loading || 
           state.workspaceUsers.loading;
  }
  
  /**
   * 获取数据加载状态摘要
   */
  getLoadingStateSummary() {
    const state = this.loadingState.value;
    
    return {
      allLoaded: this.isAllDataLoaded(),
      anyLoading: this.isAnyDataLoading(),
      chats: {
        status: state.chats.loaded ? 'loaded' : (state.chats.loading ? 'loading' : 'not_loaded'),
        count: state.chats.count,
        error: state.chats.error
      },
      workspaceChats: {
        status: state.workspaceChats.loaded ? 'loaded' : (state.workspaceChats.loading ? 'loading' : 'not_loaded'),
        count: state.workspaceChats.count,
        error: state.workspaceChats.error
      },
      workspaceUsers: {
        status: state.workspaceUsers.loaded ? 'loaded' : (state.workspaceUsers.loading ? 'loading' : 'not_loaded'),
        count: state.workspaceUsers.count,
        error: state.workspaceUsers.error
      }
    };
  }
  
  /**
   * 等待所有数据加载完成
   */
  async waitForDataLoaded(timeout = 30000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Data loading timeout after ${timeout}ms`));
          return;
        }
        
        if (this.isAllDataLoaded()) {
          clearInterval(checkInterval);
          resolve(this.getLoadingStateSummary());
          return;
        }
        
        // 检查是否有错误
        const state = this.loadingState.value;
        const hasErrors = state.chats.error || state.workspaceChats.error || state.workspaceUsers.error;
        
        if (hasErrors && !this.isAnyDataLoading()) {
          clearInterval(checkInterval);
          reject(new Error(`Data loading failed: ${hasErrors}`));
          return;
        }
      }, 100);
    });
  }
  
  /**
   * 强制刷新所有数据
   */
  async forceRefreshAllData() {
    console.log('🔄 [DataLoadingMonitor] Force refreshing all data...');
    
    const promises = [];
    
    if (this.stores.chat) {
      promises.push(this.stores.chat.fetchChats());
    }
    
    if (this.stores.workspace) {
      promises.push(this.stores.workspace.fetchWorkspaceChats());
      promises.push(this.stores.workspace.fetchWorkspaceUsers());
    }
    
    try {
      await Promise.allSettled(promises);
      console.log('✅ [DataLoadingMonitor] Force refresh completed');
      return this.getLoadingStateSummary();
    } catch (error) {
      console.error('❌ [DataLoadingMonitor] Force refresh failed:', error);
      throw error;
    }
  }
  
  /**
   * 获取加载历史
   */
  getLoadingHistory() {
    return this.loadingHistory.value.slice();
  }
  
  /**
   * 重置监控状态
   */
  reset() {
    this.loadingState.value = {
      chats: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      },
      workspaceChats: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      },
      workspaceUsers: {
        loading: false,
        loaded: false,
        count: 0,
        lastLoadTime: null,
        error: null
      }
    };
    
    this.loadingHistory.value = [];
    
    console.log('🔄 [DataLoadingMonitor] State reset');
  }
}

// 创建单例实例
const dataLoadingMonitor = new DataLoadingMonitor();

// 导出单例和工厂函数
export default dataLoadingMonitor;

export function createDataLoadingMonitor(stores) {
  dataLoadingMonitor.initialize(stores);
  
  return {
    isAllDataLoaded: () => dataLoadingMonitor.isAllDataLoaded(),
    isAnyDataLoading: () => dataLoadingMonitor.isAnyDataLoading(),
    getLoadingStateSummary: () => dataLoadingMonitor.getLoadingStateSummary(),
    waitForDataLoaded: (timeout) => dataLoadingMonitor.waitForDataLoaded(timeout),
    forceRefreshAllData: () => dataLoadingMonitor.forceRefreshAllData(),
    getLoadingHistory: () => dataLoadingMonitor.getLoadingHistory(),
    reset: () => dataLoadingMonitor.reset(),
    loadingState: computed(() => dataLoadingMonitor.loadingState.value)
  };
}
