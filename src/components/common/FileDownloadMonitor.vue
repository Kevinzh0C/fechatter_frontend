<template>
  <div v-if="showMonitor" class="file-download-monitor">
    <div class="monitor-header">
      <h4>📊 File Download Monitor</h4>
      <button @click="toggleMonitor" class="toggle-btn">{{ isExpanded ? '−' : '+' }}</button>
    </div>
    
    <div v-if="isExpanded" class="monitor-content">
      <!-- 实时统计 -->
      <div class="stats-grid">
        <div class="stat-item level1">
          <div class="stat-label">Level 1 (Static)</div>
          <div class="stat-value">{{ stats.level1_success }}</div>
          <div class="stat-desc">Direct file access</div>
        </div>
        
        <div class="stat-item level2">
          <div class="stat-label">Level 2 (Auth API)</div>
          <div class="stat-value">{{ stats.level2_success }}</div>
          <div class="stat-desc">Authenticated download</div>
        </div>
        
        <div class="stat-item level3">
          <div class="stat-label">Level 3 (Workspace)</div>
          <div class="stat-value">{{ stats.level3_success }}</div>
          <div class="stat-desc">Workspace path access</div>
        </div>
        
        <div class="stat-item failures">
          <div class="stat-label">Total Failures</div>
          <div class="stat-value">{{ stats.total_failures }}</div>
          <div class="stat-desc">All methods failed</div>
        </div>
      </div>
      
      <!-- 成功率显示 -->
      <div class="success-rate">
        <div class="rate-label">Overall Success Rate</div>
        <div class="rate-bar">
          <div 
            class="rate-fill" 
            :style="{ width: stats.success_rate + '%' }"
            :class="getRateClass(stats.success_rate)"
          ></div>
        </div>
        <div class="rate-text">{{ stats.success_rate }}%</div>
      </div>
      
      <!-- 当前下载活动 -->
      <div v-if="activeDownloads.length > 0" class="active-downloads">
        <h5>🔄 Active Downloads</h5>
        <div v-for="download in activeDownloads" :key="download.id" class="download-item">
          <div class="download-name">{{ download.fileName }}</div>
          <div class="download-level">Level {{ download.currentLevel }}</div>
          <div class="download-duration">{{ getDuration(download.startTime) }}s</div>
        </div>
      </div>
      
      <!-- 最近下载历史 -->
      <div v-if="recentDownloads.length > 0" class="recent-downloads">
        <h5>📝 Recent Downloads</h5>
        <div v-for="download in recentDownloads.slice(-5)" :key="download.id" class="recent-item">
          <div class="recent-name">{{ download.fileName }}</div>
          <div class="recent-result" :class="download.success ? 'success' : 'failure'">
            {{ download.success ? `✅ Level ${download.level}` : '❌ Failed' }}
          </div>
          <div class="recent-time">{{ formatTime(download.timestamp) }}</div>
        </div>
      </div>
      
      <!-- 控制按钮 -->
      <div class="monitor-actions">
        <button @click="resetStats" class="action-btn reset">Reset Stats</button>
        <button @click="exportLogs" class="action-btn export">Export Logs</button>
        <button @click="hideMonitor" class="action-btn hide">Hide Monitor</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';

const showMonitor = ref(false);
const isExpanded = ref(true);
const stats = reactive({
  level1_success: 0,
  level2_success: 0,
  level3_success: 0,
  total_failures: 0,
  success_rate: 0
});

const activeDownloads = ref([]);
const recentDownloads = ref([]);
let fileDownloadFallback = null;
let updateInterval = null;

onMounted(async () => {
  // 检查开发模式或调试模式
  const isDev = import.meta.env.DEV || window.location.search.includes('debug=true');
  if (isDev) {
    showMonitor.value = true;
  }
  
  try {
    // 动态导入文件下载服务
    const module = await import('@/utils/fileDownloadFallback.js');
    fileDownloadFallback = module.fileDownloadFallback;
    
    // 开始定期更新统计
    startStatsUpdate();
    
  } catch (error) {
    console.warn('FileDownloadMonitor: Unable to load download service', error);
  }
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

function startStatsUpdate() {
  updateInterval = setInterval(() => {
    if (fileDownloadFallback) {
      // 更新统计数据
      const newStats = fileDownloadFallback.getStats();
      Object.assign(stats, newStats);
      
      // 更新活动下载列表
      activeDownloads.value = Array.from(fileDownloadFallback.currentAttempts.values());
    }
  }, 1000);
}

function toggleMonitor() {
  isExpanded.value = !isExpanded.value;
}

function hideMonitor() {
  showMonitor.value = false;
}

function resetStats() {
  if (fileDownloadFallback) {
    fileDownloadFallback.resetStats();
    recentDownloads.value = [];
    console.log('📊 Download statistics reset');
  }
}

function exportLogs() {
  const logData = {
    stats: { ...stats },
    recentDownloads: [...recentDownloads.value],
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `file-download-logs-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  
  console.log('📁 Download logs exported');
}

function getRateClass(rate) {
  if (rate >= 90) return 'excellent';
  if (rate >= 70) return 'good';
  if (rate >= 50) return 'fair';
  return 'poor';
}

function getDuration(startTime) {
  return Math.floor((Date.now() - startTime) / 1000);
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

// 监听自定义事件（如果需要从外部控制）
if (typeof window !== 'undefined') {
  window.addEventListener('file-download-complete', (event) => {
    recentDownloads.value.push({
      id: Date.now(),
      fileName: event.detail.fileName,
      success: event.detail.success,
      level: event.detail.level,
      timestamp: new Date().toISOString()
    });
  });
}

// 全局方法暴露（用于调试）
if (typeof window !== 'undefined') {
  window.showFileDownloadMonitor = () => {
    showMonitor.value = true;
    isExpanded.value = true;
  };
}
</script>

<style scoped>
.file-download-monitor {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(45, 45, 45, 0.95);
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
  min-width: 300px;
  max-width: 400px;
  color: #e0e0e0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  z-index: 9999;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #555;
}

.monitor-header h4 {
  margin: 0;
  font-size: 14px;
  color: #00d4aa;
}

.toggle-btn {
  background: #555;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.stat-item {
  background: #3a3a3a;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  border-left: 3px solid #666;
}

.stat-item.level1 { border-left-color: #90ee90; }
.stat-item.level2 { border-left-color: #87ceeb; }
.stat-item.level3 { border-left-color: #ffa500; }
.stat-item.failures { border-left-color: #ff6b6b; }

.stat-label {
  font-size: 10px;
  color: #aaa;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: white;
}

.stat-desc {
  font-size: 9px;
  color: #888;
}

.success-rate {
  margin-bottom: 15px;
}

.rate-label {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 5px;
}

.rate-bar {
  background: #2a2a2a;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.rate-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.rate-fill.excellent { background: #90ee90; }
.rate-fill.good { background: #87ceeb; }
.rate-fill.fair { background: #ffa500; }
.rate-fill.poor { background: #ff6b6b; }

.rate-text {
  text-align: center;
  font-weight: bold;
  color: white;
}

.active-downloads, .recent-downloads {
  margin-bottom: 15px;
}

.active-downloads h5, .recent-downloads h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #00d4aa;
}

.download-item, .recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #2a2a2a;
  border-radius: 3px;
  margin-bottom: 3px;
}

.download-name, .recent-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.download-level {
  color: #ffa500;
  font-size: 10px;
}

.download-duration {
  color: #aaa;
  font-size: 10px;
  min-width: 30px;
  text-align: right;
}

.recent-result.success {
  color: #90ee90;
  font-size: 10px;
}

.recent-result.failure {
  color: #ff6b6b;
  font-size: 10px;
}

.recent-time {
  color: #aaa;
  font-size: 9px;
  min-width: 60px;
  text-align: right;
}

.monitor-actions {
  display: flex;
  gap: 5px;
  justify-content: space-between;
}

.action-btn {
  background: #555;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 10px;
  flex: 1;
}

.action-btn:hover {
  background: #666;
}

.action-btn.reset:hover {
  background: #ff6b6b;
}

.action-btn.export:hover {
  background: #87ceeb;
}

.action-btn.hide:hover {
  background: #ffa500;
}
</style>