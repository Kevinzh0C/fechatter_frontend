/**
 * 🎯 实时通信服务迁移指南和选择器
 * 
 * 这个文件提供了从当前SSE实现迁移到业界最佳方案的完整指南
 */

// 导入所有实时通信服务
import { socketService } from './socketio-service.js';
import { modernSSEService } from './modern-sse-service.js';  
import { simpleSSEService } from './simple-sse-service.js';
import { sseService as legacySSEService } from './sse-minimal.js';

/**
 * 🎯 服务选择器配置
 */
const REALTIME_SERVICES = {
  // 🥇 推荐：Socket.IO (功能最完整)
  socketio: {
    service: socketService,
    name: 'Socket.IO',
    pros: [
      '自动连接降级 (WebSocket → polling → SSE)',
      '房间和命名空间支持',
      '消息确认和缓存',
      '打字状态实时同步',
      '离线消息处理',
      '生产级可靠性'
    ],
    cons: [
      '相对较重 (~34KB)',
      '需要后端Socket.IO支持'
    ],
    useCase: '功能完整的聊天应用，需要房间管理和高级功能'
  },

  // 🥈 推荐：Modern SSE (轻量级但强大)
  modernSSE: {
    service: modernSSEService,
    name: '@microsoft/fetch-event-source',
    pros: [
      '现代fetch API',
      '支持Authorization header',
      '自动重连机制',
      '轻量级 (~5KB)',
      'TypeScript原生支持',
      '微软出品，可靠性高'
    ],
    cons: [
      '需要现代浏览器',
      '仅支持SSE单向通信'
    ],
    useCase: '现代应用，需要可靠的服务器推送，轻量级要求'
  },

  // 🥉 备选：Simple SSE (最简单)
  simpleSSE: {
    service: simpleSSEService,
    name: 'reconnecting-eventsource',
    pros: [
      '超轻量级 (~2KB)',
      '直接替换原生EventSource',
      '零学习成本',
      '自动重连',
      '兼容性好'
    ],
    cons: [
      '功能相对简单',
      '仅URL参数认证',
      '错误处理基础'
    ],
    useCase: '简单SSE增强，最小迁移成本'
  },

  // ❌ 当前实现（有问题）
  legacy: {
    service: legacySSEService,
    name: '当前SSE实现',
    pros: [
      '自定义实现',
      '完全控制'
    ],
    cons: [
      'EventSource创建失败',
      '超时逻辑有bug',
      '错误处理不完善',
      '状态管理混乱',
      '维护成本高'
    ],
    useCase: '不推荐，建议迁移'
  }
};

/**
 * 🎯 智能服务选择器
 */
class RealtimeServiceSelector {
  constructor() {
    this.currentService = null;
    this.serviceType = null;
  }

  /**
   * 🎯 根据需求自动选择最佳服务
   */
  async selectBestService(requirements = {}) {
    const {
      needRooms = false,          // 是否需要房间功能
      needTypingStatus = false,   // 是否需要打字状态
      needMessageConfirm = false, // 是否需要消息确认
      preferLightweight = false,  // 是否偏好轻量级
      needModernFeatures = true   // 是否需要现代特性
    } = requirements;

    console.log('🎯 [ServiceSelector] Analyzing requirements:', requirements);

    let selectedService;
    let serviceType;

    if (needRooms || needTypingStatus || needMessageConfirm) {
      // 需要高级功能，选择Socket.IO
      selectedService = REALTIME_SERVICES.socketio.service;
      serviceType = 'socketio';
      console.log('✅ [ServiceSelector] Selected Socket.IO for advanced features');
      
    } else if (preferLightweight && !needModernFeatures) {
      // 偏好轻量级且不需要现代特性，选择Simple SSE
      selectedService = REALTIME_SERVICES.simpleSSE.service;
      serviceType = 'simpleSSE';
      console.log('✅ [ServiceSelector] Selected Simple SSE for lightweight requirement');
      
    } else {
      // 默认选择Modern SSE，平衡功能和大小
      selectedService = REALTIME_SERVICES.modernSSE.service;
      serviceType = 'modernSSE';
      console.log('✅ [ServiceSelector] Selected Modern SSE as balanced choice');
    }

    // 测试连接
    try {
      await selectedService.connect();
      this.currentService = selectedService;
      this.serviceType = serviceType;
      
      console.log(`✅ [ServiceSelector] Successfully connected using ${REALTIME_SERVICES[serviceType].name}`);
      return selectedService;
      
    } catch (error) {
      console.warn(`⚠️ [ServiceSelector] ${REALTIME_SERVICES[serviceType].name} failed, trying fallback:`, error);
      return this._tryFallbackServices(serviceType);
    }
  }

  /**
   * 🔄 尝试备选服务
   */
  async _tryFallbackServices(excludeType) {
    const fallbackOrder = ['simpleSSE', 'modernSSE', 'socketio'].filter(type => type !== excludeType);
    
    for (const serviceType of fallbackOrder) {
      try {
        console.log(`🔄 [ServiceSelector] Trying fallback: ${REALTIME_SERVICES[serviceType].name}`);
        const service = REALTIME_SERVICES[serviceType].service;
        await service.connect();
        
        this.currentService = service;
        this.serviceType = serviceType;
        console.log(`✅ [ServiceSelector] Fallback successful: ${REALTIME_SERVICES[serviceType].name}`);
        return service;
        
      } catch (error) {
        console.warn(`⚠️ [ServiceSelector] Fallback ${REALTIME_SERVICES[serviceType].name} failed:`, error);
      }
    }
    
    throw new Error('All realtime services failed to connect');
  }

  /**
   * 📊 获取当前服务信息
   */
  getCurrentServiceInfo() {
    if (!this.currentService || !this.serviceType) {
      return { connected: false, service: null };
    }

    const serviceConfig = REALTIME_SERVICES[this.serviceType];
    return {
      connected: this.currentService.connected,
      service: serviceConfig.name,
      type: this.serviceType,
      info: this.currentService.getConnectionInfo?.() || {},
      pros: serviceConfig.pros,
      cons: serviceConfig.cons
    };
  }

  /**
   * 🔌 断开当前服务
   */
  disconnect() {
    if (this.currentService) {
      this.currentService.disconnect();
      this.currentService = null;
      this.serviceType = null;
    }
  }
}

/**
 * 🎯 一键迁移函数
 */
export async function migrateFromLegacySSE(requirements = {}) {
  console.log('🚀 [Migration] Starting migration from legacy SSE...');
  
  // 断开旧的SSE连接
  try {
    legacySSEService.disconnect();
    console.log('🔌 [Migration] Legacy SSE disconnected');
  } catch (error) {
    console.warn('⚠️ [Migration] Error disconnecting legacy SSE:', error);
  }
  
  // 选择并连接新服务
  const selector = new RealtimeServiceSelector();
  try {
    const newService = await selector.selectBestService(requirements);
    const serviceInfo = selector.getCurrentServiceInfo();
    
    console.log('✅ [Migration] Migration completed successfully!');
    console.log('📊 [Migration] New service info:', serviceInfo);
    
    return {
      success: true,
      service: newService,
      serviceInfo: serviceInfo,
      selector: selector
    };
    
  } catch (error) {
    console.error('❌ [Migration] Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🎯 快速测试所有服务
 */
export async function testAllServices() {
  console.log('🧪 [Test] Testing all realtime services...');
  
  const results = {};
  
  for (const [serviceType, config] of Object.entries(REALTIME_SERVICES)) {
    if (serviceType === 'legacy') continue; // 跳过有问题的legacy服务
    
    console.log(`🧪 [Test] Testing ${config.name}...`);
    
    try {
      await config.service.connect();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒确保连接稳定
      
      results[serviceType] = {
        success: true,
        info: config.service.getConnectionInfo?.() || { connected: true },
        name: config.name
      };
      
      config.service.disconnect();
      console.log(`✅ [Test] ${config.name} test passed`);
      
    } catch (error) {
      results[serviceType] = {
        success: false,
        error: error.message,
        name: config.name
      };
      console.error(`❌ [Test] ${config.name} test failed:`, error);
    }
  }
  
  console.log('📊 [Test] All tests completed:', results);
  return results;
}

// 导出服务和工具
export {
  REALTIME_SERVICES,
  RealtimeServiceSelector,
  socketService,
  modernSSEService,
  simpleSSEService
};

// 开发环境调试
if (import.meta.env.DEV) {
  window.realtimeMigration = {
    migrate: migrateFromLegacySSE,
    testAll: testAllServices,
    services: REALTIME_SERVICES,
    selector: RealtimeServiceSelector
  };
  
  console.log('🔧 [Migration] Debug tools available:');
  console.log('  - realtimeMigration.migrate() - 一键迁移');
  console.log('  - realtimeMigration.testAll() - 测试所有服务');
  console.log('  - testSocketIO() - 测试Socket.IO');
  console.log('  - testModernSSE() - 测试Modern SSE');
  console.log('  - testSimpleSSE() - 测试Simple SSE');
} 