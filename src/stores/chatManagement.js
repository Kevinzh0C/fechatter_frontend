import { defineStore } from 'pinia';
import { chatEndpointManager } from '../services/api/chatEndpoints.js';

export const useChatManagementStore = defineStore('chatManagement', {
  state: () => ({
    chatDetails: new Map(),
    chatMembers: new Map(),
    loading: false,
    error: null,
    inviteLoading: false,
    inviteError: null,
    memberLoading: false,
    memberError: null
  }),

  actions: {
    /**
     * Get chat details by ID
     */
    async getChatDetails(chatId) {
      try {
        this.loading = true;
        this.error = null;
        
        // Check if we already have cached details
        if (this.chatDetails.has(chatId)) {
          const cached = this.chatDetails.get(chatId);
          // Return cached if less than 5 minutes old
          if (Date.now() - cached.timestamp < 300000) {
            console.log('✅ [ChatManagementStore] Returning cached chat details');
            return cached.data;
          }
        }
        
        const details = await chatEndpointManager.getChatDetails(chatId);
        
        // Cache the details
        this.chatDetails.set(chatId, {
          data: details,
          timestamp: Date.now()
        });
        
        console.log('✅ [ChatManagementStore] Chat details fetched for ID:', chatId);
        return details;
      } catch (error) {
        this.error = error.message;
        console.error(`❌ [ChatManagementStore] Failed to fetch chat details for ID ${chatId}:`, error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Get chat members
     */
    async getChatMembers(chatId) {
      try {
        this.memberLoading = true;
        this.memberError = null;
        
        // Check if we already have cached members
        if (this.chatMembers.has(chatId)) {
          const cached = this.chatMembers.get(chatId);
          // Return cached if less than 2 minutes old
          if (Date.now() - cached.timestamp < 120000) {
            console.log('✅ [ChatManagementStore] Returning cached chat members');
            return cached.data;
          }
        }
        
        const members = await chatEndpointManager.getChatMembers(chatId);
        
        // Cache the members
        this.chatMembers.set(chatId, {
          data: members,
          timestamp: Date.now()
        });
        
        console.log('✅ [ChatManagementStore] Chat members fetched for ID:', chatId);
        return members;
      } catch (error) {
        this.memberError = error.message;
        console.error(`❌ [ChatManagementStore] Failed to fetch chat members for ID ${chatId}:`, error);
        throw error;
      } finally {
        this.memberLoading = false;
      }
    },

    /**
     * Add members to chat (Core invite functionality)
     */
    async addChatMembers(chatId, memberData) {
      try {
        this.inviteLoading = true;
        this.inviteError = null;
        
        const result = await chatEndpointManager.addChatMembers(chatId, memberData);
        
        // Clear cached members to force refresh
        this.chatMembers.delete(chatId);
        this.chatDetails.delete(chatId);
        
        console.log('✅ [ChatManagementStore] Members added to chat:', chatId);
        return result;
      } catch (error) {
        this.inviteError = error.message;
        console.error(`❌ [ChatManagementStore] Failed to add members to chat ${chatId}:`, error);
        throw error;
      } finally {
        this.inviteLoading = false;
      }
    },

    /**
     * Invite users to chat with enhanced options
     */
    async inviteUsersToChat(chatId, userIds, inviteOptions = {}) {
      try {
        this.inviteLoading = true;
        this.inviteError = null;
        
        const result = await chatEndpointManager.inviteUsersToChat(chatId, userIds, inviteOptions);
        
        // Clear cached data to force refresh
        this.chatMembers.delete(chatId);
        this.chatDetails.delete(chatId);
        
        console.log('✅ [ChatManagementStore] Users invited to chat:', chatId);
        return result;
      } catch (error) {
        this.inviteError = error.message;
        console.error(`❌ [ChatManagementStore] Failed to invite users to chat ${chatId}:`, error);
        throw error;
      } finally {
        this.inviteLoading = false;
      }
    },

    /**
     * Remove member from chat
     */
    async removeChatMember(chatId, userId) {
      try {
        this.memberLoading = true;
        this.memberError = null;
        
        const result = await chatEndpointManager.removeChatMember(chatId, userId);
        
        // Clear cached data to force refresh
        this.chatMembers.delete(chatId);
        this.chatDetails.delete(chatId);
        
        console.log('✅ [ChatManagementStore] Member removed from chat:', chatId);
        return result;
      } catch (error) {
        this.memberError = error.message;
        console.error(`❌ [ChatManagementStore] Failed to remove member from chat ${chatId}:`, error);
        throw error;
      } finally {
        this.memberLoading = false;
      }
    },

    /**
     * Update chat settings
     */
    async updateChatSettings(chatId, settingsData) {
      try {
        this.loading = true;
        this.error = null;
        
        const result = await chatEndpointManager.updateChatSettings(chatId, settingsData);
        
        // Update cached details
        this.chatDetails.set(chatId, {
          data: result,
          timestamp: Date.now()
        });
        
        console.log('✅ [ChatManagementStore] Chat settings updated:', chatId);
        return result;
      } catch (error) {
        this.error = error.message;
        console.error(`❌ [ChatManagementStore] Failed to update chat settings for ${chatId}:`, error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create new chat
     */
    async createChat(chatData) {
      try {
        this.loading = true;
        this.error = null;
        
        const result = await chatEndpointManager.createChat(chatData);
        
        // Cache the new chat details
        this.chatDetails.set(result.id, {
          data: result,
          timestamp: Date.now()
        });
        
        console.log('✅ [ChatManagementStore] Chat created:', result.id);
        return result;
      } catch (error) {
        this.error = error.message;
        console.error('❌ [ChatManagementStore] Failed to create chat:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Clear errors
     */
    clearErrors() {
      this.error = null;
      this.inviteError = null;
      this.memberError = null;
    },

    /**
     * Clear cache for specific chat or all chats
     */
    clearCache(chatId = null) {
      if (chatId) {
        this.chatDetails.delete(chatId);
        this.chatMembers.delete(chatId);
        console.log(`✅ [ChatManagementStore] Cache cleared for chat ${chatId}`);
      } else {
        this.chatDetails.clear();
        this.chatMembers.clear();
        console.log('✅ [ChatManagementStore] All cache cleared');
      }
    },

    /**
     * Get diagnostics information
     */
    getDiagnostics() {
      return {
        cachedChats: this.chatDetails.size,
        cachedMembers: this.chatMembers.size,
        loading: this.loading,
        error: this.error,
        inviteLoading: this.inviteLoading,
        inviteError: this.inviteError,
        memberLoading: this.memberLoading,
        memberError: this.memberError
      };
    }
  },

  getters: {
    /**
     * Get cached chat details
     */
    getCachedChatDetails: (state) => (chatId) => {
      const cached = state.chatDetails.get(chatId);
      if (cached && Date.now() - cached.timestamp < 300000) {
        return cached.data;
      }
      return null;
    },

    /**
     * Get cached chat members
     */
    getCachedChatMembers: (state) => (chatId) => {
      const cached = state.chatMembers.get(chatId);
      if (cached && Date.now() - cached.timestamp < 120000) {
        return cached.data;
      }
      return null;
    },

    /**
     * Check if any operation is loading
     */
    isLoading: (state) => {
      return state.loading || state.inviteLoading || state.memberLoading;
    },

    /**
     * Get all errors
     */
    getAllErrors: (state) => {
      const errors = [];
      if (state.error) errors.push(state.error);
      if (state.inviteError) errors.push(state.inviteError);
      if (state.memberError) errors.push(state.memberError);
      return errors;
    }
  }
});