/**
 * NavigationEventManager - 系统性导航事件管理器
 * 确保从sidebar加载数据到导航成功的全流程事件管理
 */

import { ref, computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAuthStore } from '@/stores/auth';
import { createDataLoadingMonitor } from './DataLoadingMonitor.js';

class NavigationEventManager {
  constructor() {
    this.isInitialized = false;
    this.router = null;
    this.stores = {
      chat: null,
      workspace: null,
      auth: null
    };
    
    // 数据加载监控器
    this.dataMonitor = null;
    
    // 导航状态管理
    this.navigationState = ref({
      isNavigating: false,
      currentStep: null,
      targetChatId: null,
      startTime: null,
      errors: [],
      completedSteps: []
    });
    
    // 数据加载状态
    this.dataLoadingState = ref({
      chatsLoaded: false,
      workspaceLoaded: false,
      usersLoaded: false,
      lastLoadTime: null
    });
    
    // 导航步骤定义
    this.navigationSteps = [
      'validate_target',
      'ensure_data_loaded', 
      'prepare_navigation',
      'execute_router_push',
      'verify_route_change',
      'load_chat_context',
      'setup_sse_connection',
      'complete_navigation'
    ];
    
    // 事件监听器
    this.eventListeners = new Map();
    this.setupEventListeners();
    
    console.log('🎯 [NavigationEventManager] Initialized');
  }
  
  /**
   * 初始化导航事件管理器
   */
  initialize(router) {
    if (this.isInitialized) return;
    
    this.router = router;
    this.stores.chat = useChatStore();
    this.stores.workspace = useWorkspaceStore();
    this.stores.auth = useAuthStore();
    
    // 初始化数据加载监控器
    this.dataMonitor = createDataLoadingMonitor(this.stores);
    
    this.isInitialized = true;
    console.log('✅ [NavigationEventManager] Fully initialized with stores, router, and data monitor');
  }
  
  /**
   * 设置全局事件监听器
   */
  setupEventListeners() {
    // 监听数据加载完成事件
    this.addEventListener('chats-loaded', (data) => {
      this.dataLoadingState.value.chatsLoaded = true;
      this.dataLoadingState.value.lastLoadTime = Date.now();
      console.log('📊 [NavigationEventManager] Chats data loaded:', data.length, 'items');
    });
    
    // 监听导航错误
    this.addEventListener('navigation-error', (error) => {
      this.navigationState.value.errors.push({
        error: error.message,
        step: this.navigationState.value.currentStep,
        timestamp: Date.now()
      });
      console.error('❌ [NavigationEventManager] Navigation error:', error);
    });
    
    // 监听导航完成
    this.addEventListener('navigation-complete', (result) => {
      this.navigationState.value.isNavigating = false;
      this.navigationState.value.currentStep = null;
      console.log('✅ [NavigationEventManager] Navigation completed:', result);
    });
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(eventName, handler) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(handler);
  }
  
  /**
   * 触发事件
   */
  emitEvent(eventName, data) {
    const handlers = this.eventListeners.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`❌ [NavigationEventManager] Event handler error for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * 确保数据已加载 - 使用DataLoadingMonitor
   */
  async ensureDataLoaded() {
    console.log('🔄 [NavigationEventManager] Ensuring data is loaded using DataLoadingMonitor...');
    
    try {
      // 检查当前数据状态
      const currentState = this.dataMonitor.getLoadingStateSummary();
      console.log('📊 [NavigationEventManager] Current data state:', currentState);
      
      // 如果所有数据已加载，直接返回
      if (currentState.allLoaded) {
        console.log('ℹ️ [NavigationEventManager] All data already loaded');
        return true;
      }
      
      // 如果有数据正在加载，等待完成
      if (currentState.anyLoading) {
        console.log('⏳ [NavigationEventManager] Data loading in progress, waiting...');
        try {
          await this.dataMonitor.waitForDataLoaded(15000); // 15秒超时
          console.log('✅ [NavigationEventManager] Data loading completed via wait');
          return true;
        } catch (waitError) {
          console.warn('⚠️ [NavigationEventManager] Wait for data loading timed out:', waitError.message);
          // 继续尝试强制刷新
        }
      }
      
      // 强制刷新所有数据
      console.log('🔄 [NavigationEventManager] Force refreshing all data...');
      const refreshResult = await this.dataMonitor.forceRefreshAllData();
      
      console.log('✅ [NavigationEventManager] Data refresh completed:', refreshResult);
      
      // 验证数据是否真正可用
      const finalState = this.dataMonitor.getLoadingStateSummary();
      if (!finalState.allLoaded) {
        console.warn('⚠️ [NavigationEventManager] Some data still not loaded after refresh:', finalState);
        
        // 检查关键数据
        if (finalState.chats.count === 0 && !finalState.chats.error) {
          console.warn('⚠️ [NavigationEventManager] No chats loaded, but proceeding anyway');
        }
      }
      
      // 发送数据加载完成事件
      this.emitEvent('chats-loaded', this.stores.chat.chats || []);
      
      return true;
      
    } catch (error) {
      console.error('❌ [NavigationEventManager] Data loading failed:', error);
      this.emitEvent('navigation-error', error);
      
      // 即使数据加载失败，也允许导航继续（可能是网络问题）
      console.log('⚠️ [NavigationEventManager] Proceeding with navigation despite data loading issues');
      return true;
    }
  }
  
  /**
   * 系统性导航到聊天
   */
  async navigateToChat(chatId, options = {}) {
    console.log('🎯 [NavigationEventManager] Starting systematic navigation to chat:', chatId);
    
    // 重置导航状态
    this.navigationState.value = {
      isNavigating: true,
      currentStep: null,
      targetChatId: parseInt(chatId),
      startTime: Date.now(),
      errors: [],
      completedSteps: []
    };
    
    try {
      // Step 1: 验证目标
      await this.executeStep('validate_target', async () => {
        if (!chatId || isNaN(parseInt(chatId))) {
          throw new Error(`Invalid chat ID: ${chatId}`);
        }
        
        if (!this.router) {
          throw new Error('Router not initialized');
        }
        
        console.log('✅ [NavigationEventManager] Target validated:', chatId);
      });
      
      // Step 2: 确保数据已加载 - 使用DataLoadingMonitor
      await this.executeStep('ensure_data_loaded', async () => {
        const dataLoaded = await this.ensureDataLoaded();
        if (!dataLoaded) {
          throw new Error('Failed to load required data');
        }
        
        // 验证目标聊天是否存在
        const targetChat = this.stores.chat.chats.find(chat => chat.id === parseInt(chatId));
        if (!targetChat) {
          console.warn('⚠️ [NavigationEventManager] Target chat not found in loaded data, proceeding anyway');
          
          // 记录数据状态用于调试
          const dataState = this.dataMonitor.getLoadingStateSummary();
          console.log('📊 [NavigationEventManager] Data state when target chat not found:', dataState);
        } else {
          console.log('✅ [NavigationEventManager] Target chat found:', targetChat.name);
        }
      });
      
      // Step 3: 准备导航
      await this.executeStep('prepare_navigation', async () => {
        // 清理当前状态
        this.stores.chat.currentChatId = null;
        
        // 关闭移动端侧边栏
        if (window.mobileSwipeManager?.isMobile?.value && window.mobileSwipeManager?.sidebarVisible?.value) {
          console.log('📱 [NavigationEventManager] Closing mobile sidebar');
          window.mobileSwipeManager.closeSidebar();
        }
        
        console.log('✅ [NavigationEventManager] Navigation prepared');
      });
      
      // Step 4: 执行路由跳转
      await this.executeStep('execute_router_push', async () => {
        const targetRoute = `/chat/${chatId}`;
        console.log('🔄 [NavigationEventManager] Executing router.push to:', targetRoute);
        
        try {
          await this.router.push(targetRoute);
        } catch (routerError) {
          // 处理路由重复导航错误
          if (routerError.name === 'NavigationDuplicated' || 
              routerError.message?.includes('redundant')) {
            console.log('ℹ️ [NavigationEventManager] Redundant navigation detected, continuing');
          } else {
            throw routerError;
          }
        }
        
        console.log('✅ [NavigationEventManager] Router push completed');
      });
      
      // Step 5: 验证路由变化
      await this.executeStep('verify_route_change', async () => {
        // 等待路由变化生效
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const currentRoute = this.router.currentRoute.value;
        const expectedChatId = parseInt(chatId);
        const actualChatId = parseInt(currentRoute.params.id);
        
        if (actualChatId !== expectedChatId) {
          throw new Error(`Route verification failed: expected ${expectedChatId}, got ${actualChatId}`);
        }
        
        console.log('✅ [NavigationEventManager] Route change verified');
      });
      
      // Step 6: 加载聊天上下文
      await this.executeStep('load_chat_context', async () => {
        console.log('🔄 [NavigationEventManager] Loading chat context...');
        
        // 设置当前聊天ID
        this.stores.chat.currentChatId = parseInt(chatId);
        
        // 使用chatStore的navigateToChat方法加载消息
        await this.stores.chat.navigateToChat(parseInt(chatId));
        
        console.log('✅ [NavigationEventManager] Chat context loaded');
      });
      
      // Step 7: 设置SSE连接
      await this.executeStep('setup_sse_connection', async () => {
        // 确保SSE连接已建立
        if (window.minimalSSE && !window.minimalSSE.isConnected) {
          try {
            const token = this.stores.auth.token;
            if (token) {
              await window.minimalSSE.connect(token);
              console.log('✅ [NavigationEventManager] SSE connection established');
            }
          } catch (sseError) {
            console.warn('⚠️ [NavigationEventManager] SSE connection failed:', sseError);
            // SSE失败不应该阻止导航完成
          }
        }
      });
      
      // Step 8: 完成导航
      await this.executeStep('complete_navigation', async () => {
        // 发送导航完成事件
        const navigationResult = {
          chatId: parseInt(chatId),
          duration: Date.now() - this.navigationState.value.startTime,
          completedSteps: this.navigationState.value.completedSteps,
          dataState: this.dataMonitor.getLoadingStateSummary(),
          timestamp: Date.now()
        };
        
        this.emitEvent('navigation-complete', navigationResult);
        
        // 发送全局导航完成事件
        window.dispatchEvent(new CustomEvent('fechatter:navigation-complete', {
          detail: navigationResult
        }));
        
        console.log('🎉 [NavigationEventManager] Navigation completed successfully:', navigationResult);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ [NavigationEventManager] Navigation failed:', error);
      
      this.navigationState.value.isNavigating = false;
      this.emitEvent('navigation-error', error);
      
      // 发送全局导航错误事件
      window.dispatchEvent(new CustomEvent('fechatter:navigation-error', {
        detail: {
          chatId: parseInt(chatId),
          error: error.message,
          step: this.navigationState.value.currentStep,
          dataState: this.dataMonitor?.getLoadingStateSummary(),
          timestamp: Date.now()
        }
      }));
      
      // 尝试备用导航
      if (options.allowFallback !== false) {
        console.log('🔄 [NavigationEventManager] Attempting fallback navigation');
        window.location.href = `/chat/${chatId}`;
      }
      
      throw error;
    }
  }
  
  /**
   * 执行单个导航步骤
   */
  async executeStep(stepName, stepFunction) {
    this.navigationState.value.currentStep = stepName;
    console.log(`🔄 [NavigationEventManager] Executing step: ${stepName}`);
    
    try {
      await stepFunction();
      this.navigationState.value.completedSteps.push({
        name: stepName,
        timestamp: Date.now(),
        success: true
      });
      console.log(`✅ [NavigationEventManager] Step completed: ${stepName}`);
    } catch (error) {
      this.navigationState.value.completedSteps.push({
        name: stepName,
        timestamp: Date.now(),
        success: false,
        error: error.message
      });
      console.error(`❌ [NavigationEventManager] Step failed: ${stepName}`, error);
      throw error;
    }
  }
  
  /**
   * 获取导航状态
   */
  getNavigationState() {
    return {
      ...this.navigationState.value,
      dataLoadingState: this.dataLoadingState.value,
      dataMonitorState: this.dataMonitor?.getLoadingStateSummary()
    };
  }
  
  /**
   * 重置导航状态
   */
  resetNavigationState() {
    this.navigationState.value = {
      isNavigating: false,
      currentStep: null,
      targetChatId: null,
      startTime: null,
      errors: [],
      completedSteps: []
    };
    
    console.log('🔄 [NavigationEventManager] Navigation state reset');
  }
  
  /**
   * 获取导航指标
   */
  getNavigationMetrics() {
    const state = this.navigationState.value;
    const completedSteps = state.completedSteps.filter(step => step.success);
    const failedSteps = state.completedSteps.filter(step => !step.success);
    
    return {
      totalSteps: this.navigationSteps.length,
      completedSteps: completedSteps.length,
      failedSteps: failedSteps.length,
      successRate: completedSteps.length / this.navigationSteps.length,
      totalDuration: state.startTime ? Date.now() - state.startTime : 0,
      errors: state.errors,
      isNavigating: state.isNavigating,
      dataState: this.dataMonitor?.getLoadingStateSummary()
    };
  }
}

// 创建单例实例
const navigationEventManager = new NavigationEventManager();

// 导出单例和工厂函数
export default navigationEventManager;

export function createNavigationEventHelper(router) {
  navigationEventManager.initialize(router);
  
  return {
    navigateToChat: (chatId, options) => navigationEventManager.navigateToChat(chatId, options),
    getNavigationState: () => navigationEventManager.getNavigationState(),
    resetNavigationState: () => navigationEventManager.resetNavigationState(),
    getNavigationMetrics: () => navigationEventManager.getNavigationMetrics(),
    addEventListener: (eventName, handler) => navigationEventManager.addEventListener(eventName, handler),
    isNavigating: computed(() => navigationEventManager.navigationState.value.isNavigating)
  };
}
