import { defineStore } from 'pinia';
import axios from 'axios';

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    currentChat: null,
    messages: [],
    loading: false,
    error: null,
    lastMessageId: null,
  }),

  actions: {
    async fetchChats() {
      try {
        this.loading = true;
        const response = await axios.get('/api/chat');
        this.chats = response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch chats';
      } finally {
        this.loading = false;
      }
    },

    async createChat(name, members, description = '', chatType = 'Group') {
      try {
        this.loading = true;
        const response = await axios.post('/api/chat', {
          name,
          chat_type: chatType,
          members,
          description
        });
        this.chats.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create chat';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async updateChat(chatId, name, description) {
      try {
        const response = await axios.patch(`/api/chat/${chatId}`, {
          name,
          description
        });
        const index = this.chats.findIndex(chat => chat.id === chatId);
        if (index !== -1) {
          this.chats[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update chat';
        return null;
      }
    },

    async fetchMessages(chatId, limit = 20) {
      try {
        this.loading = true;
        const params = { limit };
        if (this.lastMessageId) {
          params.last_id = this.lastMessageId;
        }
        const response = await axios.get(`/api/chat/${chatId}/messages`, { params });
        if (this.lastMessageId) {
          this.messages = [...this.messages, ...response.data];
        } else {
          this.messages = response.data;
        }
        if (response.data.length > 0) {
          this.lastMessageId = response.data[response.data.length - 1].id;
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch messages';
      } finally {
        this.loading = false;
      }
    },

    async sendMessage(chatId, content, files = []) {
      try {
        const response = await axios.post(`/api/chat/${chatId}/messages`, {
          content,
          files,
          idempotency_key: crypto.randomUUID()
        });
        this.messages.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to send message';
        return null;
      }
    },

    async uploadFiles(files) {
      try {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('file', file);
        });
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to upload files';
        return [];
      }
    },

    async listChatMembers(chatId) {
      try {
        const response = await axios.get(`/api/chat/${chatId}/members`);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch members';
        return [];
      }
    },

    async addChatMembers(chatId, memberIds) {
      try {
        await axios.post(`/api/chat/${chatId}/members`, memberIds);
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to add members';
      }
    },

    async removeChatMember(chatId, memberIds) {
      try {
        await axios.delete(`/api/chat/${chatId}/members`, { data: memberIds });
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to remove member';
      }
    },

    async transferOwnership(chatId, newOwnerId) {
      try {
        await axios.patch(`/api/chat/${chatId}/members/${newOwnerId}`, {
          operation: 'transfer_ownership'
        });
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to transfer ownership';
      }
    }
  },
});