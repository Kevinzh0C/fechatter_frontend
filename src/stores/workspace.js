import { defineStore } from 'pinia';
import api from '../services/api.js';
import { userEndpointManager } from '../services/api/userEndpoints.js';
import tokenSynchronizer from '../services/tokenSynchronizer';
import { dataConsistencyManager } from '../services/DataConsistencyManager';
import { useAuthStore } from './auth.js';

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    currentWorkspace: null,
    workspaces: [],
    workspaceUsers: [],
    workspaceChats: [],
    loading: false,
    error: null,
    statsRefreshInterval: null,
    _lastFetchTime: null,
    _fetchingChats: false,
    _fetchingStartTime: null,
  }),

  getters: {
    workspaceName: (state) => {
      return state.currentWorkspace?.name || 'Fechatter';
    },

    workspaceOwner: (state) => {
      if (!state.currentWorkspace) return null;
      return state.workspaceUsers.find(user => user.id === state.currentWorkspace.owner_id);
    },

    isWorkspaceOwner: (state) => (userId) => {
      return state.currentWorkspace?.owner_id === userId;
    },

    memberCount: (state) => {
      return state.workspaceUsers.length;
    },

    chatStats: (state) => {
      return state.workspaceChats.map(chat => ({
        ...chat,
        activity_level: chat.activity_score > 50 ? 'high' : chat.activity_score > 20 ? 'medium' : 'low'
      }));
    }
  },

  actions: {
    async fetchCurrentWorkspace() {
      this.loading = true;
      try {
        // 🔧 FIX: 尝试从API获取真实workspace数据，包含多个端点尝试
        const workspaceEndpoints = [
          '/workspace/current',
          '/workspaces/current', 
          '/user/workspace',
          '/workspace'
        ];
        
        for (const endpoint of workspaceEndpoints) {
          try {
            console.log(`🔍 [WorkspaceStore] Trying endpoint: ${endpoint}`);
            const response = await api.get(endpoint);
            
            if (response.data) {
              // Handle different response formats
              const workspaceData = response.data.workspace || response.data.data || response.data;
              
              if (workspaceData && (workspaceData.id || workspaceData.name)) {
                this.currentWorkspace = {
                  id: workspaceData.id || 1,
                  name: workspaceData.name || workspaceData.workspace_name || 'Workspace',
                  description: workspaceData.description || '',
                  owner_id: workspaceData.owner_id,
                  member_count: workspaceData.member_count || 1,
                  created_at: workspaceData.created_at || new Date().toISOString(),
                  ...workspaceData
                };
                console.log('✅ [WorkspaceStore] Fetched workspace from API:', this.currentWorkspace.name, 'via', endpoint);
                return this.currentWorkspace;
              }
            }
          } catch (apiError) {
            console.log(`⚠️ [WorkspaceStore] Endpoint ${endpoint} failed:`, apiError.response?.status || apiError.message);
            // Continue to next endpoint
          }
        }
        
        console.warn('⚠️ [WorkspaceStore] All workspace API endpoints failed, using fallbacks');
        
        // 🔧 FIX: 尝试从auth store获取workspace信息，支持多种字段名
        const authStore = useAuthStore();
        if (authStore.user) {
          const user = authStore.user;
          const workspaceName = user.workspace_name || 
                               user.workspaceName || 
                               (user.workspace && user.workspace.name) ||
                               'My Workspace';
          
          this.currentWorkspace = {
            id: user.workspace_id || user.workspaceId || 1,
            name: workspaceName,
            description: 'User workspace',
            owner_id: user.id,
            member_count: 1,
            created_at: new Date().toISOString()
          };
          console.log('✅ [WorkspaceStore] Using auth store workspace:', this.currentWorkspace.name);
          return this.currentWorkspace;
        }
        
        // 🔧 FIX: 最后的fallback
        this.currentWorkspace = {
          id: 1,
          name: 'Workspace',
          description: 'Default workspace',
          owner_id: null,
          member_count: 1,
          created_at: new Date().toISOString()
        };
        console.log('✅ [WorkspaceStore] Using fallback workspace:', this.currentWorkspace.name);
        return this.currentWorkspace;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchWorkspaceUsers() {
      this.loading = true;
      try {
        // 🔧 CRITICAL FIX: Ensure token is initialized before fetching
        await tokenSynchronizer.initialize();
        // 🔧 ENHANCED: 使用tokenSynchronizer获取token
        const token = await tokenSynchronizer.getToken();
        if (!token) {
          console.warn('⚠️ [WorkspaceStore] 无法获取认证token');
          throw new Error('未找到认证token');
        }

        this.workspaceUsers = await userEndpointManager.fetchWorkspaceUsers();
        return this.workspaceUsers;
      } catch (error) {
        console.warn('⚠️ [WorkspaceStore] 获取工作区用户失败:', error);
        this.workspaceUsers = [];
        return this.workspaceUsers;
      } finally {
        this.loading = false;
      }
    },

    async fetchWorkspaceChats() {
      const now = Date.now();
      
      // 🔧 ENHANCED: 请求限流，30秒内不重复请求
      if (this._lastFetchTime && now - this._lastFetchTime < 30000) {
        if (this.workspaceChats.length > 0) {
          console.log('🔄 [WorkspaceStore] 请求限流: 上次请求在30秒内，使用缓存数据');
          return this.workspaceChats;
        }
      }
      
      // 🔧 ENHANCED: 防止重复请求
      if (this._fetchingChats) {
        if (now - this._fetchingStartTime > 30000) {
          // 请求时间过长，重置状态
          console.warn('⚠️ [WorkspaceStore] 请求超时，重置状态');
          this._fetchingChats = false;
        } else {
          console.log('🔄 [WorkspaceStore] 已经在请求中，使用缓存数据');
          return this.workspaceChats;
        }
      }
      
      this._fetchingChats = true;
      this._fetchingStartTime = now;
      this._lastFetchTime = now;
      this.loading = true;
      
      // 🔧 ENHANCED: 添加请求超时保护
      const fetchTimeout = setTimeout(() => {
        if (this._fetchingChats) {
          console.warn('⚠️ [WorkspaceStore] 请求超时，重置状态');
          this._fetchingChats = false;
          this.loading = false;
        }
      }, 15000); // 15秒超时
      
      try {
        console.log('🔍 [WorkspaceStore] 使用DataConsistencyManager获取工作区聊天列表...');
        
        // 🔧 ENHANCED: 使用DataConsistencyManager统一管理请求和缓存
        const chatsData = await dataConsistencyManager.deduplicatedFetch(
          'workspace_chats',
          async () => {
            // 确保token初始化
            await tokenSynchronizer.initialize();
            const token = await tokenSynchronizer.getToken();
            
            if (!token) {
              throw new Error('未找到认证token');
            }
            
            console.log('🔐 [WorkspaceStore] 发送API请求...');
            
            // 🔧 API is automatically initialized by wrapper
            
            const response = await api.get('/workspace/chats', {
              timeout: 30000, // 增加到30秒，适应网络延迟
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            return response.data?.data || response.data || [];
          },
          {
            forceRefresh: false,
            timeout: 30000, // 与API超时保持一致
            cacheTime: 30000 // 30秒缓存
          }
        );
        
        this.workspaceChats = chatsData;
        console.log('🔍 [WorkspaceStore] 获取工作区聊天列表:', this.workspaceChats.length, '项');
        console.log('🔍 [WorkspaceStore] 聊天数据示例:', this.workspaceChats.slice(0, 2));
        
        return this.workspaceChats;
      } catch (error) {
        console.error('❌ [WorkspaceStore] 获取工作区聊天列表失败:', error);
        console.error('❌ [WorkspaceStore] 错误详情:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          stack: error.stack
        });
        
        // 根据错误类型设置适当的错误消息
        if (error.response?.status === 401) {
          this.error = '认证错误，请重新登录';
          
          // 处理认证错误
          try {
            // 清除所有token
            await tokenSynchronizer.clearAll();
            
            // 重定向到登录页
            window.location.href = '/login';
          } catch (logoutError) {
            console.error('登出失败:', logoutError);
          }
        } else if (error.response?.status === 404) {
          this.error = '聊天列表端点不存在，请检查API配置';
          console.warn('⚠️ [WorkspaceStore] API端点可能不存在: /api/chats');
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          this.error = '连接超时，请检查网络连接';
        } else {
          this.error = error.response?.data?.message || error.message || '获取工作区聊天列表失败';
        }
        
        this.workspaceChats = [];
        return [];
      } finally {
        clearTimeout(fetchTimeout);
        this.loading = false;
        this._fetchingChats = false;
        
        // 设置冷却期
        const cooldownTime = 10000; // 10秒
        setTimeout(() => {
          console.log('🔄 [WorkspaceStore] 冷却期结束，允许新的请求');
          this._fetchingChats = false;
        }, cooldownTime);
      }
    },

    async initializeWorkspace() {
      try {
        await this.fetchCurrentWorkspace();
        await Promise.all([
          this.fetchWorkspaceUsers().catch(() => []),
          this.fetchWorkspaceChats().catch(() => [])
        ]);
      } catch (error) {
        if (true) {
          console.error('Failed to initialize workspace:', error);
        }
      }
    },

    clearError() {
      this.error = null;
    },

    setCurrentWorkspaceId(workspaceId) {
      if (this.currentWorkspace) {
        this.currentWorkspace.id = workspaceId;
      } else {
        this.currentWorkspace = {
          id: workspaceId,
          name: 'Workspace',
          description: 'User workspace',
          owner_id: null
        };
      }
      return this.currentWorkspace;
    }
  }
}); 