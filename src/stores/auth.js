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
        // Super user bypass
        if (email === 'super@test.com' && password === 'super123') {
          const mockToken = 'super_token_123';
          const mockRefreshToken = 'super_refresh_token_123';
          this.token = mockToken;
          this.refreshToken = mockRefreshToken;
          localStorage.setItem('token', mockToken);
          localStorage.setItem('refreshToken', mockRefreshToken);
          return true;
        }

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
        if (this.token !== 'super_token_123') {
          await axios.post('/api/logout', null, {
            headers: {
              Authorization: `Bearer ${this.refreshToken}`
            }
          });
        }
      } finally {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    },

    async logoutAll() {
      try {
        if (this.token !== 'super_token_123') {
          await axios.post('/api/logout-all');
        }
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
        if (this.refreshToken === 'super_refresh_token_123') {
          this.token = 'super_token_123';
          return this.token;
        }

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