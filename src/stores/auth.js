import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
    loading: false,
    error: null,
  }),

  actions: {
    async login(email, password) {
      try {
        this.loading = true;
        const response = await axios.post('/api/signin', { email, password });
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Login failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    async register(email, password) {
      try {
        this.loading = true;
        const response = await axios.post('/api/signup', { email, password });
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Registration failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await axios.post('/api/logout');
      } finally {
        this.token = null;
        localStorage.removeItem('token');
      }
    },
  },
});