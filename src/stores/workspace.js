import { defineStore } from 'pinia';
import api from '../services/api.js';
import { userEndpointManager } from '../services/api/userEndpoints.js';

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    currentWorkspace: null,
    workspaces: [],
    workspaceUsers: [],
    workspaceChats: [],
    loading: false,
    error: null,
    statsRefreshInterval: null,
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
        // Stub implementation
        this.currentWorkspace = {
          id: 1,
          name: 'Fechatter Workspace',
          description: 'Default workspace',
          owner_id: null,
          member_count: 1,
          created_at: new Date().toISOString()
        };
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
        this.workspaceUsers = await userEndpointManager.fetchWorkspaceUsers();
        return this.workspaceUsers;
      } catch (error) {
        this.workspaceUsers = [];
        return this.workspaceUsers;
      } finally {
        this.loading = false;
      }
    },

    async fetchWorkspaceChats() {
      this.loading = true;
      try {
        console.log('🔍 [WorkspaceStore] Fetching workspace chats...');
        console.log('🔍 [WorkspaceStore] API base URL will be resolved dynamically');
        
        const response = await api.get('/workspace/chats');
        
        console.log('🔍 [WorkspaceStore] API Response status:', response.status);
        console.log('🔍 [WorkspaceStore] API Response data:', response.data);
        
        this.workspaceChats = response.data?.data || response.data || [];
        
        console.log('🔍 [WorkspaceStore] Parsed workspaceChats:', this.workspaceChats.length, 'items');
        
        return this.workspaceChats;
      } catch (error) {
        console.error('❌ [WorkspaceStore] Failed to fetch workspace chats:', error);
        console.error('❌ [WorkspaceStore] Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
        
        this.workspaceChats = [];
        return [];
      } finally {
        this.loading = false;
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