import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
// import viteShikiPlugin from "./vite-plugin-shiki.js";
import { fileURLToPath, URL } from 'node:url'
import VitePluginVueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  
  return {
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
      port: 5173,  // Fixed port for development
      strictPort: true,  // 🔧 FIXED: Force strict port - fail if 5173 is occupied
      host: true,  // Show network URLs
      open: false, // 🚀 Don't auto-open browser
      cors: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      fs: {
        allow: ['..']
      },

      // 🔧 CORS FIX: Add proxy to avoid CORS issues
      proxy: {
        '/api': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              console.log(`🔗 Proxying ${req.method} ${req.url} to ${options.target}${req.url}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error('❌ Proxy error:', err);
            });
          }
        },
        '/health': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              console.log(`🔗 Proxying health ${req.method} ${req.url} to ${options.target}${req.url}`);
            });
          }
        },
        '/presence': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              console.log(`🔗 Proxying presence ${req.method} ${req.url} to ${options.target}${req.url}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error('❌ Presence proxy error:', err);
            });
          }
        },
        '/events': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          ws: true, // Enable WebSocket proxying for SSE
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              // Mask token in SSE URLs for security
              const maskedUrl = req.url.replace(/access_token=[^&]+/, 'access_token=***');
              console.log(`🔗 Proxying SSE ${req.method} ${maskedUrl} to ${options.target}${maskedUrl}`);
            });
          }
        },
        '/files': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              console.log(`🔗 Proxying file ${req.method} ${req.url} to ${options.target}${req.url}`);
            });
          }
        },
        '/notify': {
          target: 'https://hook-nav-attempt-size.trycloudflare.com',
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              console.log(`🔗 Proxying notify ${req.method} ${req.url} to ${options.target}${req.url}`);
            });
          }
        }
      },

      hmr: {
        protocol: "ws",
        port: 1421,
      },
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },

    define: {
      // 🔧 FIXED: Support both dev and production builds
      'import.meta.env.DEV': JSON.stringify(isDev),
      __VERCEL_ENV__: JSON.stringify(isDev ? 'development' : 'production'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    // Include WASM files as assets
    // assetsInclude: ['**/*.wasm'],

    build: {
      // 🔧 ENHANCED: Development-friendly build options
      minify: isDev ? false : 'esbuild',
      sourcemap: true,  // Always enable sourcemap
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
      outDir: 'dist'
    },

    // Show all logs including server URL
    logLevel: 'info',
    esbuild: {
      logOverride: {
        'this-is-undefined-in-esm': 'silent',
        'import-is-undefined': 'silent'
      }
    },

    // Simplified environment variables - no VERCEL_ prefix needed
    envPrefix: ['VITE_']
  }
}); 