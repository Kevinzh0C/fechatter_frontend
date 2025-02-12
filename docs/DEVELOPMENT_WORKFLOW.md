# FeChatter Frontend 开发工作流

## 🎯 核心原则

1. **稳定性优先** - 新功能不能破坏现有功能
2. **渐进式开发** - 小步快跑，频繁验证
3. **可追踪性** - 所有更改都有日志和测试
4. **错误可恢复** - 快速定位和修复问题

## 📋 开发前检查清单

在开始任何新功能开发前，必须确认：

```bash
# 1. 运行健康检查
npm run dev
# 在浏览器控制台运行：
healthCheck.runAllChecks()

# 2. 检查错误日志
errorMonitor.getErrorStats()

# 3. 确保所有测试通过
npm run test

# 4. 拉取最新代码
git pull origin main
```

## 🔄 标准开发流程

### 1. 功能规划阶段

```markdown
## 功能名称：[功能名]
## 开发者：[姓名]
## 日期：[YYYY-MM-DD]

### 影响范围分析
- [ ] 影响的组件：
- [ ] 影响的API：
- [ ] 影响的Store：
- [ ] 潜在风险：

### 实施计划
1. 步骤一：
2. 步骤二：
3. 步骤三：
```

### 2. 开发阶段

#### 2.1 创建功能分支
```bash
git checkout -b feature/[功能名称]
```

#### 2.2 实施开发规范

**组件开发规范：**
```vue
<template>
  <!-- 使用语义化的类名 -->
  <div class="feature-container">
    <!-- 添加适当的loading和error状态 -->
    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else class="content">
      <!-- 功能内容 -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { logError } from '@/utils/errorMonitor';

// Props定义要明确类型
const props = defineProps({
  id: {
    type: [Number, String],
    required: true
  }
});

// 状态管理
const loading = ref(false);
const error = ref(null);

// 错误处理包装器
const handleError = (err, context) => {
  error.value = err.message || 'An error occurred';
  logError(err, { 
    component: 'FeatureName',
    context,
    props: props
  });
};

// 异步操作示例
const loadData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // 你的异步操作
  } catch (err) {
    handleError(err, 'loadData');
  } finally {
    loading.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadData();
});

// 清理资源
onUnmounted(() => {
  // 清理定时器、事件监听等
});
</script>
```

**Store开发规范：**
```javascript
// stores/featureStore.js
import { defineStore } from 'pinia';
import api from '@/services/api';
import { logError } from '@/utils/errorMonitor';

export const useFeatureStore = defineStore('feature', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
    // 添加缓存支持
    lastFetch: null,
    cacheTimeout: 5 * 60 * 1000 // 5分钟
  }),

  getters: {
    // 派生状态
    hasValidCache: (state) => {
      return state.lastFetch && 
        (Date.now() - state.lastFetch) < state.cacheTimeout;
    }
  },

  actions: {
    async fetchItems(force = false) {
      // 检查缓存
      if (!force && this.hasValidCache) {
        return this.items;
      }

      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/feature/items');
        this.items = response.data;
        this.lastFetch = Date.now();
        return this.items;
      } catch (error) {
        this.error = error.message;
        logError(error, { 
          store: 'feature',
          action: 'fetchItems' 
        });
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 清理方法
    clearCache() {
      this.items = [];
      this.lastFetch = null;
      this.error = null;
    }
  }
});
```

### 3. 测试阶段

#### 3.1 单元测试
```javascript
// tests/unit/FeatureComponent.spec.js
import { mount } from '@vue/test-utils';
import FeatureComponent from '@/components/FeatureComponent.vue';

describe('FeatureComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(FeatureComponent, {
      props: { id: 1 }
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('handles loading state', async () => {
    const wrapper = mount(FeatureComponent);
    expect(wrapper.find('.loading-state').exists()).toBe(true);
  });

  it('handles error state', async () => {
    // 模拟错误情况
    const wrapper = mount(FeatureComponent);
    await wrapper.setData({ error: 'Test error' });
    expect(wrapper.find('.error-state').text()).toBe('Test error');
  });
});
```

#### 3.2 集成测试清单
- [ ] 功能在不同浏览器中正常工作
- [ ] 功能在移动设备上正常工作  
- [ ] 与现有功能无冲突
- [ ] 错误处理正确
- [ ] 性能符合预期（<3s加载时间）

### 4. 部署前检查

```bash
# 1. 运行完整测试套件
npm run test:all

# 2. 检查构建
npm run build

# 3. 运行健康检查
# 在开发服务器控制台：
healthCheck.runAllChecks()

# 4. 检查是否有新错误
errorMonitor.getErrorStats()
```

## 🐛 问题排查流程

### 1. 快速诊断
```javascript
// 在浏览器控制台运行
// 1. 查看错误统计
errorMonitor.getErrorStats()

// 2. 查看健康状态
healthCheck.getDetailedReport()

// 3. 导出错误报告
errorMonitor.exportErrorReport()
```

### 2. 常见问题解决方案

#### MessageList不显示
```javascript
// 检查步骤：
1. 检查组件是否正确导入
2. 检查props是否传递
3. 检查chatStore.messages是否有数据
4. 检查网络请求是否成功

// 调试命令：
const chatStore = useChatStore();
console.log('Messages:', chatStore.messages);
console.log('Current Chat ID:', chatStore.currentChatId);
console.log('Loading:', chatStore.loading);
console.log('Error:', chatStore.error);
```

#### API请求失败
```javascript
// 检查API配置
window.diagnoseApi.diagnoseApiConfigurations()

// 测试直接请求
window.diagnoseApi.testDirectRequests()
```

## 📊 性能优化指南

### 1. 组件优化
- 使用 `v-show` 替代 `v-if` 对于频繁切换的元素
- 使用 `v-memo` 对于大列表
- 合理使用 `computed` 和 `watch`
- 避免在模板中使用复杂表达式

### 2. 网络请求优化
- 实施请求缓存策略
- 使用防抖和节流
- 并行请求而非串行
- 实施乐观更新

### 3. 状态管理优化
- 避免深层嵌套的响应式对象
- 使用 `shallowRef` 对于大型对象
- 及时清理不需要的状态
- 实施状态持久化策略

## 🔒 安全最佳实践

1. **输入验证** - 所有用户输入都要验证
2. **XSS防护** - 使用 `v-text` 而非 `v-html`
3. **认证检查** - 每个需要认证的操作都要检查
4. **错误信息** - 不要暴露敏感信息

## 📝 代码审查清单

提交PR前，确保：

- [ ] 代码符合ESLint规范
- [ ] 添加了适当的错误处理
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 通过所有测试
- [ ] 没有console.log（生产代码）
- [ ] 性能测试通过
- [ ] 安全检查通过

## 🚀 持续改进

1. **定期回顾** - 每周回顾错误日志
2. **性能监控** - 使用浏览器性能工具
3. **用户反馈** - 及时响应用户问题
4. **技术债务** - 定期重构和优化

## 📞 获取帮助

遇到问题时：

1. 查看错误日志和健康报告
2. 查阅本文档
3. 搜索已知问题
4. 向团队求助

记住：没有愚蠢的问题，只有未被发现的bug！ 