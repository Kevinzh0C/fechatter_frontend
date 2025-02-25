import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
// import viteShikiPlugin from "./vite-plugin-shiki.js";
import { fileURLToPath, URL } from 'node:url'
import VitePluginVueDevTools from 'vite-plugin-vue-devtools'

const host = process.env.TAURI_DEV_HOST;

// 🔐 SECURITY: Function to sanitize sensitive data in URLs
function sanitizeUrl(url) {
  return url
    .replace(/access_token=([^&]+)/g, (match, token) => `access_token=${token.substring(0, 8)}***`)
    .replace(/token=([^&]+)/g, (match, token) => `token=${token.substring(0, 8)}***`)
    .replace(/password=([^&]+)/g, 'password=***')
    .replace(/secret=([^&]+)/g, 'secret=***')
    .replace(/key=([^&]+)/g, 'key=***');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }),
    // viteShikiPlugin({
    //   theme: 'dark',
    //   lineNumbers: true,
    //   cache: true
    // }),
    // VitePluginVueDevTools() // 🔧 临时禁用解决格式化器卡死问题
  ],

  // Path aliases
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,

  // Optimize dependencies - 移除Shiki相关配置
  optimizeDeps: {
    include: ['highlight.js'],
    exclude: ['@tauri-apps/api']
  },

  // Worker支持
  worker: {
    format: 'es'
  },

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: !process.env.PORT, // Allow dynamic port for Vercel dev
    host: host || false,
    open: false, // 🚀 CHANGED: 不自动打开浏览器，显示URL供手动打开
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      allow: ['..']
    },

    // 🔗 Simplified proxy configuration with ngrok tunnel
    // All requests now go through the ngrok HTTPS tunnel
    proxy: {
      // All API requests to ngrok tunnel
      '/api': {
        target: 'https://62f5-45-77-178-85.ngrok-free.app',
        changeOrigin: true,
        secure: true, // ngrok provides valid SSL
        timeout: 10000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('🚨 ngrok API Proxy error:', err.message);
            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({
                error: 'Backend service unavailable',
                code: 'NGROK_PROXY_ERROR',
                development: true
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔗 [ngrok] API: ${req.method} ${sanitizeUrl(req.url)}`);
          });
        }
      },
      // File service through ngrok
      '/files': {
        target: 'https://62f5-45-77-178-85.ngrok-free.app',
        changeOrigin: true,
        secure: true,
        timeout: 15000
      },
      // SSE events through ngrok
      '/events': {
        target: 'https://62f5-45-77-178-85.ngrok-free.app',
        changeOrigin: true,
        secure: true,
        timeout: 0,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔗 [ngrok] SSE: ${req.method} ${sanitizeUrl(req.url)}`);
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        }
      },
      // Notifications through ngrok
      '/notify': {
        target: 'https://62f5-45-77-178-85.ngrok-free.app',
        changeOrigin: true,
        secure: true,
        timeout: 10000
      }
    },

    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || 'development'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Include WASM files as assets
  // assetsInclude: ['**/*.wasm'],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 优化依赖分块 - 移除Shiki，添加highlight.js
          'highlight-chunk': ['highlight.js'],
          'vue-chunk': ['vue', 'vue-router', 'pinia'],
          'ui-chunk': ['@headlessui/vue', '@heroicons/vue']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development'
  },

  // Suppress specific warnings
  logLevel: 'warn',
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'import-is-undefined': 'silent'
    }
  },

  // Environment variables prefix
  envPrefix: ['VITE_', 'VERCEL_']
}); 