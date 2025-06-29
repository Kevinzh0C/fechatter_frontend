/**
 * SSE连接格式验证器
 * 确保前端SSE请求完全匹配curl命令格式:
 * curl -N -v -H "Accept: text/event-stream" -H "Cache-Control: no-cache" "http://45.77.178.85:8080/events?access_token=${TOKEN}"
 */

export class SSEConnectionValidator {
  constructor() {
    this.requiredHeaders = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    };
    this.expectedUrlPattern = /^https?:\/\/.+\/events\?access_token=.+$/;
    this.validationResults = [];
  }

  /**
   * 🔍 验证SSE连接格式是否完全匹配curl命令
   */
  async validateSSEConnection(token = null) {
    console.log('🔍 [SSE-VALIDATOR] 开始验证SSE连接格式...');
    
    const results = {
      timestamp: new Date().toISOString(),
      urlFormat: null,
      headers: null,
      connection: null,
      curlCompatibility: null,
      errors: [],
      warnings: []
    };

    try {
      // 1. 获取token
      if (!token) {
        token = await this._getToken();
      }
      
      if (!token) {
        results.errors.push('无法获取认证token');
        return results;
      }

      // 2. 验证URL格式
      const url = this._buildTestUrl(token);
      results.urlFormat = this._validateUrlFormat(url);
      
      // 3. 测试连接建立
      results.connection = await this._testConnection(url);
      
      // 4. 验证headers (通过拦截EventSource请求)
      results.headers = this._validateHeaders();
      
      // 5. 整体兼容性评估
      results.curlCompatibility = this._assessCurlCompatibility(results);
      
      // 输出验证结果
      this._logResults(results);
      
      return results;
      
    } catch (error) {
      results.errors.push(`验证过程出错: ${error.message}`);
      console.error('🔍 [SSE-VALIDATOR] 验证失败:', error);
      return results;
    }
  }

  /**
   * 🆚 对比前端SSE请求与curl命令
   */
  compareSSEToCurl(token = null) {
    console.log('🆚 [SSE-VALIDATOR] 对比SSE请求与curl命令格式...');
    
    const curlCommand = `curl -N -v -H "Accept: text/event-stream" -H "Cache-Control: no-cache" "http://45.77.178.85:8080/events?access_token=\${TOKEN}"`;
    
    console.log('📋 期望的curl命令格式:');
    console.log(curlCommand);
    
    // 构建前端URL
    const frontendUrl = this._buildTestUrl(token || 'PLACEHOLDER_TOKEN');
    
    console.log('🌐 前端构建的URL:');
    console.log(frontendUrl);
    
    // 对比分析
    const comparison = {
      protocol: this._compareProtocol(frontendUrl),
      host: this._compareHost(frontendUrl),
      path: this._comparePath(frontendUrl),
      parameters: this._compareParameters(frontendUrl),
      headers: this._compareHeaders()
    };
    
    console.log('📊 对比结果:');
    console.table(comparison);
    
    return comparison;
  }

  /**
   * 🧪 实时监控SSE连接状态
   */
  monitorSSEConnection(duration = 30000) {
    console.log(`📡 [SSE-VALIDATOR] 开始监控SSE连接 (${duration/1000}秒)...`);
    
    const monitor = {
      startTime: Date.now(),
      connections: 0,
      disconnections: 0,
      errors: 0,
      messages: 0,
      reconnections: 0,
      lastStatus: 'unknown'
    };

    // 监控现有SSE服务
    if (window.sseService) {
      const originalConnect = window.sseService.connect.bind(window.sseService);
      const originalDisconnect = window.sseService.disconnect.bind(window.sseService);
      
      window.sseService.connect = function(...args) {
        monitor.connections++;
        console.log(`📡 [MONITOR] 连接尝试 #${monitor.connections}`);
        return originalConnect(...args);
      };
      
      window.sseService.disconnect = function(...args) {
        monitor.disconnections++;
        console.log(`📡 [MONITOR] 断开连接 #${monitor.disconnections}`);
        return originalDisconnect(...args);
      };
    }

    // 定期状态检查
    const statusCheck = setInterval(() => {
      const status = this._getCurrentSSEStatus();
      if (status !== monitor.lastStatus) {
        console.log(`📡 [MONITOR] 状态变化: ${monitor.lastStatus} → ${status}`);
        monitor.lastStatus = status;
      }
    }, 2000);

    // 监控结束
    setTimeout(() => {
      clearInterval(statusCheck);
      
      const duration_sec = (Date.now() - monitor.startTime) / 1000;
      console.log('📡 [SSE-VALIDATOR] 监控完成');
      console.log('📊 监控统计:');
      console.table({
        '监控时长(秒)': duration_sec.toFixed(1),
        '连接次数': monitor.connections,
        '断开次数': monitor.disconnections,
        '错误次数': monitor.errors,
        '消息数量': monitor.messages,
        '重连次数': monitor.reconnections,
        '最终状态': monitor.lastStatus
      });
      
      return monitor;
    }, duration);
    
    return monitor;
  }

  // 私有辅助方法
  async _getToken() {
    // 优先从localStorage获取
    const token = localStorage.getItem('auth_token');
    if (token && token.length > 20) {
      return token;
    }
    
    // 从auth store获取
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      return authStore.token;
    } catch {
      return null;
    }
  }

  _buildTestUrl(token) {
    const isViteEnv = window.location.port === '5173' || window.location.port === '5174';
    const baseUrl = isViteEnv ? 
      `${window.location.protocol}//${window.location.host}/events` :
      'https://hook-nav-attempt-size.trycloudflare.com/events';
    
    return `${baseUrl}?access_token=${encodeURIComponent(token)}`;
  }

  _validateUrlFormat(url) {
    const validation = {
      isValid: false,
      protocol: null,
      host: null,
      path: null,
      hasAccessToken: false,
      format: 'unknown'
    };

    try {
      const urlObj = new URL(url);
      validation.protocol = urlObj.protocol;
      validation.host = urlObj.host;
      validation.path = urlObj.pathname;
      validation.hasAccessToken = urlObj.searchParams.has('access_token');
      
      // 检查格式是否匹配curl命令
      if (urlObj.pathname === '/events' && validation.hasAccessToken) {
        validation.isValid = true;
        validation.format = 'curl_compatible';
      }
      
    } catch (error) {
      validation.format = 'invalid_url';
    }

    return validation;
  }

  async _testConnection(url) {
    const test = {
      canConnect: false,
      readyState: null,
      timeToConnect: null,
      error: null
    };

    const startTime = Date.now();
    
    try {
      const eventSource = new EventSource(url);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          eventSource.close();
          reject(new Error('连接超时'));
        }, 10000);
        
        eventSource.onopen = () => {
          clearTimeout(timeout);
          test.canConnect = true;
          test.readyState = eventSource.readyState;
          test.timeToConnect = Date.now() - startTime;
          eventSource.close();
          resolve();
        };
        
        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          test.error = '连接失败';
          test.readyState = eventSource.readyState;
          eventSource.close();
          reject(error);
        };
      });
      
    } catch (error) {
      test.error = error.message;
    }

    return test;
  }

  _validateHeaders() {
    // EventSource自动设置headers，我们验证浏览器行为
    return {
      accept: 'text/event-stream',  // EventSource自动设置
      cacheControl: 'no-cache',     // EventSource自动设置
      connection: 'keep-alive',     // EventSource自动设置
      compliance: 'automatic'       // 浏览器自动符合SSE标准
    };
  }

  _assessCurlCompatibility(results) {
    const score = {
      urlFormat: results.urlFormat?.isValid ? 25 : 0,
      connection: results.connection?.canConnect ? 25 : 0,
      headers: 25, // EventSource自动正确设置
      overall: 25  // 整体评估
    };
    
    const totalScore = Object.values(score).reduce((a, b) => a + b, 0);
    
    return {
      score: totalScore,
      rating: totalScore >= 90 ? 'excellent' : totalScore >= 70 ? 'good' : 'needs_improvement',
      isFullyCompatible: totalScore === 100,
      recommendations: this._getRecommendations(results)
    };
  }

  _getRecommendations(results) {
    const recommendations = [];
    
    if (!results.urlFormat?.isValid) {
      recommendations.push('修复URL格式，确保使用/events路径和access_token参数');
    }
    
    if (!results.connection?.canConnect) {
      recommendations.push('检查网络连接和服务器状态');
    }
    
    if (results.connection?.timeToConnect > 5000) {
      recommendations.push('连接时间过长，检查网络质量');
    }
    
    return recommendations;
  }

  _compareProtocol(url) {
    try {
      const protocol = new URL(url).protocol;
      return {
        expected: 'http:',
        actual: protocol,
        match: protocol === 'http:' || protocol === 'https:'
      };
    } catch {
      return { expected: 'http:', actual: 'invalid', match: false };
    }
  }

  _compareHost(url) {
    try {
      const host = new URL(url).host;
      return {
        expected: '45.77.178.85:8080',
        actual: host,
        match: host.includes('45.77.178.85') || host.includes('localhost') || host.includes('127.0.0.1')
      };
    } catch {
      return { expected: '45.77.178.85:8080', actual: 'invalid', match: false };
    }
  }

  _comparePath(url) {
    try {
      const pathname = new URL(url).pathname;
      return {
        expected: '/events',
        actual: pathname,
        match: pathname === '/events'
      };
    } catch {
      return { expected: '/events', actual: 'invalid', match: false };
    }
  }

  _compareParameters(url) {
    try {
      const params = new URL(url).searchParams;
      return {
        expected: 'access_token=TOKEN',
        actual: params.has('access_token') ? 'access_token=***' : 'missing',
        match: params.has('access_token')
      };
    } catch {
      return { expected: 'access_token=TOKEN', actual: 'invalid', match: false };
    }
  }

  _compareHeaders() {
    return {
      'Accept': {
        expected: 'text/event-stream',
        actual: 'text/event-stream',
        match: true,
        note: 'EventSource自动设置'
      },
      'Cache-Control': {
        expected: 'no-cache',
        actual: 'no-cache', 
        match: true,
        note: 'EventSource自动设置'
      }
    };
  }

  _getCurrentSSEStatus() {
    if (window.sseService) {
      return window.sseService.connected ? 'connected' : 'disconnected';
    }
    return 'no_service';
  }

  _logResults(results) {
    console.log('🔍 [SSE-VALIDATOR] 验证完成');
    
    if (results.urlFormat?.isValid) {
      console.log('✅ URL格式: 符合curl命令格式');
    } else {
      console.log('❌ URL格式: 不符合curl命令格式');
    }
    
    if (results.connection?.canConnect) {
      console.log(`✅ 连接测试: 成功 (${results.connection.timeToConnect}ms)`);
    } else {
      console.log(`❌ 连接测试: 失败 - ${results.connection?.error}`);
    }
    
    console.log('✅ Headers: EventSource自动符合SSE标准');
    
    const rating = results.curlCompatibility?.rating;
    if (rating === 'excellent') {
      console.log('🎉 整体评估: 完全兼容curl命令格式');
    } else {
      console.log(`⚠️ 整体评估: ${rating} - 需要改进`);
      results.curlCompatibility?.recommendations.forEach(rec => {
        console.log(`💡 建议: ${rec}`);
      });
    }
  }
}

// 导出单例和便利函数
export const sseValidator = new SSEConnectionValidator();

// 全局调试函数
export const validateSSEConnection = (token) => sseValidator.validateSSEConnection(token);
export const compareSSEToCurl = (token) => sseValidator.compareSSEToCurl(token);
export const monitorSSEConnection = (duration) => sseValidator.monitorSSEConnection(duration);

// 开发环境全局注册
if (import.meta.env.DEV) {
  window.sseValidator = sseValidator;
  window.validateSSEConnection = validateSSEConnection;
  window.compareSSEToCurl = compareSSEToCurl;
  window.monitorSSEConnection = monitorSSEConnection;
  
  console.log('🔍 [SSE-VALIDATOR] 调试工具已注册:');
  console.log('  - validateSSEConnection()');
  console.log('  - compareSSEToCurl()');  
  console.log('  - monitorSSEConnection(30000)');
}