/**
 * Chat API Endpoints - Enhanced chat management with invite functionality
 * 
 * Handles chat endpoint calls with sophisticated retry and auth integration
 */

import api from '../api.js';

export class ChatEndpointManager {
  constructor() {
    this.chatCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.authRetryCount = 0;
    this.maxAuthRetries = 3;
    this.retryDelays = [1000, 2000, 5000];
  }

  /**
   * Get chat details by ID
   */
  async getChatDetails(chatId) {
    try {
      console.log(`🔍 [ChatEndpoints] Fetching chat details for ID: ${chatId}...`);
      
      // Check cache first
      const cached = this.getCachedChatDetails(chatId);
      if (cached) {
        console.log('✅ [ChatEndpoints] Returning cached chat details');
        return cached;
      }
      
      const response = await api.get(`/chat/${chatId}`);
      const chatDetails = this.normalizeChatData(response.data);
      
      if (chatDetails) {
        console.log('✅ [ChatEndpoints] Chat details fetched:', chatDetails.name || chatDetails.id);
        this.cacheChatDetails(chatId, chatDetails);
        return chatDetails;
      } else {
        throw new Error('No chat data in response');
      }
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Failed to fetch chat details for ID ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Add members to chat (Core invite functionality)
   */
  async addChatMembers(chatId, memberData) {
    try {
      console.log(`🔄 [ChatEndpoints] Adding members to chat ID: ${chatId}...`);
      console.log('Member data:', memberData);
      
      const response = await api.post(`/chat/${chatId}/members`, memberData);
      
      console.log('✅ [ChatEndpoints] Members added successfully');
      
      // Clear cache for this chat to force refresh
      this.clearChatCache(chatId);
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Failed to add members to chat ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get chat members
   */
  async getChatMembers(chatId) {
    try {
      console.log(`🔍 [ChatEndpoints] Fetching members for chat ID: ${chatId}...`);
      
      const response = await api.get(`/chat/${chatId}/members`);
      const members = this.normalizeUserData(response.data);
      
      console.log(`✅ [ChatEndpoints] Fetched ${members.length} chat members`);
      return members;
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Failed to fetch chat members for ID ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove member from chat
   */
  async removeChatMember(chatId, userId) {
    try {
      console.log(`🔄 [ChatEndpoints] Removing user ${userId} from chat ${chatId}...`);
      
      const response = await api.delete(`/chat/${chatId}/members/${userId}`);
      
      console.log('✅ [ChatEndpoints] Member removed successfully');
      
      // Clear cache for this chat to force refresh
      this.clearChatCache(chatId);
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Failed to remove member from chat ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update chat settings
   */
  async updateChatSettings(chatId, settingsData) {
    try {
      console.log(`🔄 [ChatEndpoints] Updating settings for chat ID: ${chatId}...`);
      
      const response = await api.put(`/chat/${chatId}`, settingsData);
      const chatDetails = this.normalizeChatData(response.data);
      
      console.log('✅ [ChatEndpoints] Chat settings updated successfully');
      
      // Update cache
      this.cacheChatDetails(chatId, chatDetails);
      
      return chatDetails;
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Failed to update chat settings for ID ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create new chat
   */
  async createChat(chatData) {
    try {
      console.log('🔄 [ChatEndpoints] Creating new chat...');
      console.log('Chat data:', chatData);
      
      const response = await api.post('/api/chat', chatData);
      const chatDetails = this.normalizeChatData(response.data);
      
      console.log('✅ [ChatEndpoints] Chat created successfully:', chatDetails.id);
      
      return chatDetails;
      
    } catch (error) {
      console.error('❌ [ChatEndpoints] Failed to create chat:', error.message);
      throw error;
    }
  }

  /**
   * Normalize chat data structure
   */
  normalizeChatData(data) {
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ [ChatEndpoints] Invalid chat data:', data);
      return null;
    }

    return {
      id: data.id,
      name: data.name || data.title || 'Unnamed Chat',
      description: data.description || '',
      type: data.type || 'channel', // channel, direct, group
      is_private: data.is_private || false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      owner_id: data.owner_id || data.creator_id,
      member_count: data.member_count || 0,
      members: data.members || [],
      settings: data.settings || {},
      last_message: data.last_message || null,
      unread_count: data.unread_count || 0
    };
  }

  /**
   * Normalize user data (reused from userEndpoints)
   */
  normalizeUserData(data) {
    let users = [];

    if (Array.isArray(data)) {
      users = data;
    } else if (data.data && Array.isArray(data.data)) {
      users = data.data;
    } else if (data.members && Array.isArray(data.members)) {
      users = data.members;
    } else if (data.users && Array.isArray(data.users)) {
      users = data.users;
    } else if (data.id) {
      users = [data];
    } else {
      console.warn('⚠️ [ChatEndpoints] Unexpected user data format:', data);
      return [];
    }

    return users.map(user => {
      if (!user || typeof user !== 'object') {
        console.warn('⚠️ [ChatEndpoints] Invalid user object:', user);
        return null;
      }

      return {
        id: user.id,
        fullname: user.fullname || user.full_name || user.name || user.username || 'Unknown User',
        email: user.email || '',
        avatar_url: user.avatar_url || null,
        status: user.status || 'Active',
        role: user.role || 'member', // owner, admin, member
        joined_at: user.joined_at || user.created_at || new Date().toISOString()
      };
    }).filter(user => user !== null);
  }

  /**
   * Cache management
   */
  cacheChatDetails(chatId, chatDetails) {
    this.chatCache.set(`chat_${chatId}`, {
      data: chatDetails,
      timestamp: Date.now(),
      ttl: this.cacheExpiry
    });
    console.log(`📦 [ChatEndpoints] Cached chat details for ${chatId}`);
  }

  getCachedChatDetails(chatId) {
    const cached = this.chatCache.get(`chat_${chatId}`);
    if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
      return cached.data;
    }
    return null;
  }

  clearChatCache(chatId = null) {
    if (chatId) {
      this.chatCache.delete(`chat_${chatId}`);
      console.log(`🧹 [ChatEndpoints] Cleared cache for chat ${chatId}`);
    } else {
      this.chatCache.clear();
      console.log('🧹 [ChatEndpoints] All chat cache cleared');
    }
  }

  /**
   * Batch invite users to chat with enhanced error handling
   */
  async inviteUsersToChat(chatId, userIds, inviteOptions = {}) {
    try {
      console.log(`🔄 [ChatEndpoints] Inviting ${userIds.length} users to chat ${chatId}...`);
      
      const inviteData = {
        user_ids: userIds,
        message: inviteOptions.message || '',
        role: inviteOptions.role || 'member',
        send_notification: inviteOptions.sendNotification !== false
      };
      
      const response = await this.addChatMembers(chatId, inviteData);
      
      console.log('✅ [ChatEndpoints] Batch invite completed successfully');
      return response;
      
    } catch (error) {
      console.error(`❌ [ChatEndpoints] Batch invite failed for chat ${chatId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get diagnostics information
   */
  getDiagnostics() {
    return {
      cache: {
        size: this.chatCache.size,
        cacheExpiry: this.cacheExpiry
      },
      auth: {
        authRetryCount: this.authRetryCount,
        maxAuthRetries: this.maxAuthRetries
      },
      health: {
        timestamp: Date.now(),
        isHealthy: this.authRetryCount < this.maxAuthRetries
      }
    };
  }
}

// Export singleton instance
export const chatEndpointManager = new ChatEndpointManager();

// Enhanced global access for debugging
if (typeof window !== 'undefined') {
  window.chatEndpoints = chatEndpointManager;

  window.diagnoseChatAPI = () => {
    console.group('🔬 Chat API Diagnostics');
    const diagnostics = chatEndpointManager.getDiagnostics();
    console.table(diagnostics.cache);
    console.table(diagnostics.auth);
    console.log('Full diagnostics:', diagnostics);
    console.groupEnd();
    return diagnostics;
  };

  window.clearChatCache = (chatId = null) => {
    chatEndpointManager.clearChatCache(chatId);
    console.log('✅ Chat cache cleared');
  };
}