import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    user: null,
    loading: false,
    error: null,
  }),

  actions: {
    async login(email, password) {
      try {
        this.loading = true;
        const response = await axios.post('/api/signin', { email, password });
        this.token = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Login failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    async register(fullname, email, password, workspace) {
      try {
        this.loading = true;
        const response = await axios.post('/api/signup', { 
          fullname,
          email, 
          password,
          workspace
        });
        this.token = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
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
        await axios.post('/api/logout', null, {
          headers: {
            Authorization: `Bearer ${this.refreshToken}`
          }
        });
      } finally {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    },

    async logoutAll() {
      try {
        await axios.post('/api/logout-all');
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } catch (error) {
        this.error = error.response?.data?.message || 'Logout failed';
      }
    },

    async refreshAccessToken() {
      try {
        const response = await axios.post('/api/refresh', null, {
          headers: {
            Authorization: `Bearer ${this.refreshToken}`
          }
        });
        this.token = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        return this.token;
      } catch (error) {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        throw error;
      }
    }
  },
});