<template>
  <div class="sse-quality-monitor">
    <div class="monitor-header">
      <h3>🔗 SSE连接质量监控</h3>
      <div class="monitor-controls">
        <button @click="toggleMonitoring" :class="['btn', isMonitoring ? 'btn-danger' : 'btn-primary']">
          {{ isMonitoring ? '停止监控' : '开始监控' }}
        </button>
        <button @click="clearStats" class="btn btn-secondary">清除统计</button>
        <button @click="exportReport" class="btn btn-info">导出报告</button>
      </div>
    </div>

    <!-- 实时状态 -->
    <div class="status-grid">
      <div class="status-card" :class="connectionStatus.class">
        <div class="status-icon">{{ connectionStatus.icon }}</div>
        <div class="status-info">
          <div class="status-title">连接状态</div>
          <div class="status-value">{{ connectionStatus.text }}</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">📊</div>
        <div class="status-info">
          <div class="status-title">消息计数</div>
          <div class="status-value">{{ stats.messageCount }}</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">⚡</div>
        <div class="status-info">
          <div class="status-title">消息速率</div>
          <div class="status-value">{{ messageRate }}/秒</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">🕐</div>
        <div class="status-info">
          <div class="status-title">连接时长</div>
          <div class="status-value">{{ connectionDuration }}</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">📈</div>
        <div class="status-info">
          <div class="status-title">平均延迟</div>
          <div class="status-value">{{ averageLatency }}ms</div>
        </div>
      </div>

      <div class="status-card" :class="stats.errorCount > 0 ? 'status-error' : ''">
        <div class="status-icon">❌</div>
        <div class="status-info">
          <div class="status-title">错误计数</div>
          <div class="status-value">{{ stats.errorCount }}</div>
        </div>
      </div>
    </div>

    <!-- 详细统计 -->
    <div class="stats-section">
      <h4>📊 详细统计</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <label>重连次数:</label>
          <span>{{ stats.reconnectCount }}</span>
        </div>
        <div class="stat-item">
          <label>最大延迟:</label>
          <span>{{ stats.maxLatency }}ms</span>
        </div>
        <div class="stat-item">
          <label>最小延迟:</label>
          <span>{{ stats.minLatency === Infinity ? 0 : stats.minLatency }}ms</span>
        </div>
        <div class="stat-item">
          <label>数据传输量:</label>
          <span>{{ formatBytes(stats.bytesReceived) }}</span>
        </div>
        <div class="stat-item">
          <label>心跳检测:</label>
          <span>{{ stats.heartbeatCount }}</span>
        </div>
        <div class="stat-item">
          <label>连接质量:</label>
          <span :class="qualityClass">{{ connectionQuality }}</span>
        </div>
      </div>
    </div>

    <!-- 实时日志 -->
    <div class="logs-section">
      <h4>📝 实时日志 <span class="log-count">({{ logs.length }})</span></h4>
      <div class="logs-container">
        <div v-for="log in recentLogs" :key="log.id" :class="['log-entry', `log-${log.level}`]">
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 网络诊断 -->
    <div class="diagnostic-section">
      <h4>🔍 网络诊断</h4>
      <div class="diagnostic-grid">
        <div class="diagnostic-item">
          <label>服务器地址:</label>
          <span>{{ serverInfo.host }}:{{ serverInfo.port }}</span>
        </div>
        <div class="diagnostic-item">
          <label>协议版本:</label>
          <span>{{ serverInfo.protocol }}</span>
        </div>
        <div class="diagnostic-item">
          <label>用户代理:</label>
          <span>{{ navigator.userAgent.split(' ')[0] }}</span>
        </div>
        <div class="diagnostic-item">
          <label>网络类型:</label>
          <span>{{ networkInfo.effectiveType || '未知' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 状态管理
const authStore = useAuthStore()
const isMonitoring = ref(false)
const eventSource = ref(null)
const startTime = ref(null)
const logs = ref([])

// 统计数据
const stats = ref({
  messageCount: 0,
  errorCount: 0,
  reconnectCount: 0,
  bytesReceived: 0,
  heartbeatCount: 0,
  maxLatency: 0,
  minLatency: Infinity,
  totalLatency: 0,
  lastMessageTime: null,
  connectionStartTime: null
})

// 服务器信息
const serverInfo = ref({
  host: '45.77.178.85',
  port: '8080',
  protocol: 'HTTP/1.1'
})

// 网络信息
const networkInfo = ref({
  effectiveType: navigator.connection?.effectiveType || '未知'
})

// 计算属性
const connectionStatus = computed(() => {
  if (!isMonitoring.value) {
    return { icon: '⭕', text: '未连接', class: 'status-disconnected' }
  }
  if (eventSource.value?.readyState === EventSource.CONNECTING) {
    return { icon: '🔄', text: '连接中', class: 'status-connecting' }
  }
  if (eventSource.value?.readyState === EventSource.OPEN) {
    return { icon: '✅', text: '已连接', class: 'status-connected' }
  }
  return { icon: '❌', text: '连接失败', class: 'status-error' }
})

const messageRate = computed(() => {
  if (!startTime.value || stats.value.messageCount === 0) return '0.00'
  const duration = (Date.now() - startTime.value) / 1000
  return (stats.value.messageCount / duration).toFixed(2)
})

const connectionDuration = computed(() => {
  if (!startTime.value) return '00:00:00'
  const duration = Math.floor((Date.now() - startTime.value) / 1000)
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const averageLatency = computed(() => {
  if (stats.value.messageCount === 0) return '0.00'
  return (stats.value.totalLatency / stats.value.messageCount).toFixed(2)
})

const connectionQuality = computed(() => {
  const avgLatency = parseFloat(averageLatency.value)
  const errorRate = stats.value.errorCount / Math.max(stats.value.messageCount, 1)
  
  if (avgLatency < 100 && errorRate < 0.01) return '优秀'
  if (avgLatency < 300 && errorRate < 0.05) return '良好'
  if (avgLatency < 500 && errorRate < 0.1) return '一般'
  return '较差'
})

const qualityClass = computed(() => {
  const quality = connectionQuality.value
  if (quality === '优秀') return 'quality-excellent'
  if (quality === '良好') return 'quality-good'
  if (quality === '一般') return 'quality-fair'
  return 'quality-poor'
})

const recentLogs = computed(() => {
  return logs.value.slice(-50).reverse()
})

// 方法
const addLog = (level, message) => {
  logs.value.push({
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    level,
    message
  })
  
  // 限制日志数量
  if (logs.value.length > 1000) {
    logs.value = logs.value.slice(-500)
  }
}

const startMonitoring = () => {
  if (!authStore.token) {
    addLog('error', '未找到认证token')
    return
  }
  
  const sseUrl = `http://${serverInfo.value.host}:${serverInfo.value.port}/events?access_token=${authStore.token}`
  
  try {
    eventSource.value = new EventSource(sseUrl)
    startTime.value = Date.now()
    stats.value.connectionStartTime = Date.now()
    isMonitoring.value = true
    
    addLog('info', '开始建立SSE连接...')
    
    eventSource.value.onopen = () => {
      addLog('success', 'SSE连接建立成功')
    }
    
    eventSource.value.onmessage = (event) => {
      const messageTime = Date.now()
      const latency = stats.value.lastMessageTime ? messageTime - stats.value.lastMessageTime : 0
      
      stats.value.messageCount++
      stats.value.bytesReceived += new Blob([event.data]).size
      stats.value.lastMessageTime = messageTime
      
      if (latency > 0) {
        stats.value.totalLatency += latency
        stats.value.maxLatency = Math.max(stats.value.maxLatency, latency)
        stats.value.minLatency = Math.min(stats.value.minLatency, latency)
      }
      
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'heartbeat') {
          stats.value.heartbeatCount++
          addLog('debug', '收到心跳消息')
        } else {
          addLog('info', `收到消息: ${data.type || 'unknown'}`)
        }
      } catch (e) {
        addLog('debug', `收到原始消息: ${event.data.substring(0, 100)}...`)
      }
    }
    
    eventSource.value.onerror = (error) => {
      stats.value.errorCount++
      addLog('error', `SSE连接错误: ${error.type}`)
      
      if (eventSource.value?.readyState === EventSource.CLOSED) {
        addLog('warning', 'SSE连接已关闭，尝试重连...')
        stats.value.reconnectCount++
        
        // 自动重连
        setTimeout(() => {
          if (isMonitoring.value) {
            startMonitoring()
          }
        }, 5000)
      }
    }
    
  } catch (error) {
    addLog('error', `启动监控失败: ${error.message}`)
    isMonitoring.value = false
  }
}

const stopMonitoring = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
  isMonitoring.value = false
  addLog('info', 'SSE监控已停止')
}

const toggleMonitoring = () => {
  if (isMonitoring.value) {
    stopMonitoring()
  } else {
    startMonitoring()
  }
}

const clearStats = () => {
  stats.value = {
    messageCount: 0,
    errorCount: 0,
    reconnectCount: 0,
    bytesReceived: 0,
    heartbeatCount: 0,
    maxLatency: 0,
    minLatency: Infinity,
    totalLatency: 0,
    lastMessageTime: null,
    connectionStartTime: null
  }
  logs.value = []
  startTime.value = null
  addLog('info', '统计数据已清除')
}

const exportReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    serverInfo: serverInfo.value,
    networkInfo: networkInfo.value,
    connectionStatus: connectionStatus.value,
    stats: stats.value,
    connectionDuration: connectionDuration.value,
    messageRate: messageRate.value,
    averageLatency: averageLatency.value,
    connectionQuality: connectionQuality.value,
    logs: logs.value.slice(-100)
  }
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sse_quality_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  addLog('success', '质量报告已导出')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生命周期
onMounted(() => {
  // 监听网络状态变化
  if (navigator.connection) {
    navigator.connection.addEventListener('change', () => {
      networkInfo.value.effectiveType = navigator.connection.effectiveType
      addLog('info', `网络类型变更: ${navigator.connection.effectiveType}`)
    })
  }
})

onUnmounted(() => {
  stopMonitoring()
})
</script>

<style scoped>
.sse-quality-monitor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.monitor-header h3 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.monitor-controls {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary { background: #007bff; color: white; }
.btn-danger { background: #dc3545; color: white; }
.btn-secondary { background: #6c757d; color: white; }
.btn-info { background: #17a2b8; color: white; }

.btn:hover { opacity: 0.9; transform: translateY(-1px); }

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.status-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.status-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.status-connected { border-left: 4px solid #28a745; }
.status-connecting { border-left: 4px solid #ffc107; }
.status-disconnected { border-left: 4px solid #6c757d; }
.status-error { border-left: 4px solid #dc3545; }

.status-icon {
  font-size: 24px;
  min-width: 30px;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stats-section, .logs-section, .diagnostic-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.stats-section h4, .logs-section h4, .diagnostic-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-grid, .diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item, .diagnostic-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item label, .diagnostic-item label {
  font-weight: 500;
  color: #666;
}

.quality-excellent { color: #28a745; font-weight: 600; }
.quality-good { color: #20c997; font-weight: 600; }
.quality-fair { color: #ffc107; font-weight: 600; }
.quality-poor { color: #dc3545; font-weight: 600; }

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  background: #f8f9fa;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  border-bottom: 1px solid #e9ecef;
}

.log-time { color: #666; min-width: 80px; }
.log-level { min-width: 60px; font-weight: 600; }
.log-message { flex: 1; }

.log-info .log-level { color: #007bff; }
.log-success .log-level { color: #28a745; }
.log-warning .log-level { color: #ffc107; }
.log-error .log-level { color: #dc3545; }
.log-debug .log-level { color: #6c757d; }

.log-count {
  font-size: 12px;
  color: #666;
  font-weight: normal;
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .monitor-controls {
    justify-content: center;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid, .diagnostic-grid {
    grid-template-columns: 1fr;
  }
}
</style> 