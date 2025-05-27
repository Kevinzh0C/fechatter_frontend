import { defineStore } from 'pinia';
import axios from 'axios';

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    currentChat: null,
    messages: [],
    loading: false,
    error: null,
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

    async createChat(title, members) {
      try {
        this.loading = true;
        const response = await axios.post('/api/chat', { title, members });
        this.chats.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create chat';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async fetchMessages(chatId) {
      try {
        this.loading = true;
        const response = await axios.get(`/api/chat/${chatId}/messages`);
        this.messages = response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch messages';
      } finally {
        this.loading = false;
      }
    },

    async sendMessage(chatId, content) {
      try {
        const response = await axios.post(`/api/chat/${chatId}/messages`, { content });
        this.messages.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to send message';
        return null;
      }
    },
  },
});