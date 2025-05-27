<template>
  <router-view></router-view>
</template>

<script setup>
import { useAuthStore } from './stores/auth';
import axios from 'axios';

const authStore = useAuthStore();

// Configure axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

axios.interceptors.request.use(
  (config) => {
    const token = authStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
</script>