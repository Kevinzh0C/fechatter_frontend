# 🚀 Vercel 开发环境部署指南

## 📋 概述

这个指南将帮助你在Vercel上部署一个开发环境版本的Fechatter前端，同时保持本地开发的完整功能。

## 🎯 解决方案架构

```
本地开发 (localhost:5173)
    ↓
开发构建 (yarn build:staging)
    ↓
Vercel部署 (开发模式静态文件)
    ↓
生产后端 (hook-nav-attempt-size.trycloudflare.com)
```

## 🔧 配置文件说明

### 1. package.json 脚本
```json
{
  "scripts": {
    "dev": "node scripts/copy-configs.js && vite",
    "build": "node scripts/copy-configs.js && vite build",
    "build:staging": "node scripts/copy-configs.js && cross-env NODE_ENV=development vite build"
  }
}
```

### 2. vercel.json 配置
```json
{
  "version": 2,
  "name": "fechatter-frontend-dev",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "buildCommand": "yarn build:staging",
        "outputDirectory": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://hook-nav-attempt-size.trycloudflare.com/api/$1"
    },
    {
      "src": "/events(.*)",
      "dest": "https://hook-nav-attempt-size.trycloudflare.com/events$1"
    },
    {
      "src": "/files/(.*)",
      "dest": "https://hook-nav-attempt-size.trycloudflare.com/files/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "development",
    "VITE_API_URL": "https://hook-nav-attempt-size.trycloudflare.com/api",
    "VITE_APP_ENV": "development"
  }
}
```

### 3. vite.config.js 修改
```javascript
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  
  return {
    // ... 其他配置
    define: {
      'import.meta.env.DEV': JSON.stringify(isDev),
      __VERCEL_ENV__: JSON.stringify(isDev ? 'development' : 'production'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    build: {
      minify: isDev ? false : 'esbuild',
      sourcemap: true,
      // ... 其他构建配置
    }
  }
})
```

## 🚀 部署步骤

### 步骤1：本地测试开发构建
```bash
# 安装依赖（如果还没有安装cross-env）
yarn add -D cross-env

# 测试开发构建
yarn build:staging

# 预览构建结果
yarn preview
```

### 步骤2：提交代码到Git
```bash
git add .
git commit -m "feat: add Vercel dev deployment configuration"
git push origin main
```

### 步骤3：在Vercel中创建项目
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的GitHub仓库
4. 配置项目设置：
   - **Project Name**: `fechatter-frontend-dev`
   - **Framework Preset**: `Vue.js`
   - **Build Command**: `yarn build:staging`
   - **Output Directory**: `dist`

### 步骤4：配置环境变量
在Vercel项目设置中添加以下环境变量：
```
NODE_ENV=development
VITE_API_URL=https://hook-nav-attempt-size.trycloudflare.com/api
VITE_APP_ENV=development
VITE_SSE_ENDPOINT=/events
VITE_ENABLE_DEBUG=true
```

### 步骤5：部署
点击 "Deploy" 按钮开始部署。

## 🔍 验证部署

### 1. 检查构建日志
确保构建过程中没有错误，特别注意：
- ✅ 配置文件复制成功
- ✅ Vite构建完成
- ✅ 所有资源文件生成

### 2. 检查运行时功能
部署完成后，访问Vercel提供的URL，测试：
- ✅ 页面正常加载
- ✅ API请求正常代理
- ✅ SSE连接工作
- ✅ 文件上传功能
- ✅ 开发者工具可用

### 3. 检查网络请求
在浏览器开发者工具中确认：
- ✅ API请求正确代理到后端
- ✅ 静态资源从Vercel CDN加载
- ✅ 没有CORS错误

## 🎛️ 开发模式特性

### 启用的功能
- ✅ 完整的调试信息
- ✅ Source Maps
- ✅ 开发者控制台
- ✅ 性能监控
- ✅ 错误详情显示
- ✅ 热重载（本地开发）

### 禁用的功能
- ❌ 代码压缩（便于调试）
- ❌ 生产优化
- ❌ 分析追踪
- ❌ Vue DevTools（Vercel环境）

## 🔄 更新部署

### 自动部署
每次推送到主分支时，Vercel会自动重新部署。

### 手动部署
```bash
# 本地测试
yarn build:staging

# 提交更改
git add .
git commit -m "update: development deployment"
git push origin main
```

## 🐛 常见问题

### 1. 构建失败
**问题**: `cross-env: command not found`
**解决**: 
```bash
yarn add -D cross-env
```

### 2. API请求失败
**问题**: CORS或代理错误
**解决**: 检查vercel.json中的routes配置是否正确

### 3. SSE连接失败
**问题**: EventSource连接被阻止
**解决**: 确保events路由正确配置在vercel.json中

### 4. 环境变量未生效
**问题**: 开发配置未加载
**解决**: 
- 检查Vercel项目设置中的环境变量
- 确认VITE_前缀正确
- 重新部署项目

## 📊 性能对比

| 环境 | 构建时间 | 包大小 | 加载速度 | 调试能力 |
|------|----------|--------|----------|----------|
| 本地开发 | N/A | N/A | 快 | 完整 |
| Vercel开发 | ~10s | 较大 | 中等 | 完整 |
| Vercel生产 | ~15s | 小 | 快 | 有限 |

## 🔗 相关链接

- [Vercel文档](https://vercel.com/docs)
- [Vue.js部署指南](https://vuejs.org/guide/best-practices/production-deployment.html)
- [Vite构建指南](https://vitejs.dev/guide/build.html)

## 📝 注意事项

1. **开发构建包含调试信息**，不适合生产环境
2. **Source Maps暴露源码**，仅用于开发测试
3. **未压缩的代码**会增加加载时间
4. **开发模式功能**在生产环境中应该禁用

## 🎉 完成

现在你已经成功在Vercel上部署了开发环境版本！你可以：
- 🔗 分享开发环境链接给团队成员
- 🐛 在真实环境中调试问题
- 🧪 测试新功能
- 📱 在不同设备上验证功能 