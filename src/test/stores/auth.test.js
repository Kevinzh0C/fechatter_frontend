import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('login', () => {
    it('should successfully login', async () => {
      const store = useAuthStore();
      const mockResponse = {
        data: {
          access_token: 'access123',
          refresh_token: 'refresh123'
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await store.login('test@example.com', 'password');

      expect(result).toBe(true);
      expect(store.token).toBe('access123');
      expect(store.refreshToken).toBe('refresh123');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access123');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh123');
    });

    it('should handle login failure', async () => {
      const store = useAuthStore();
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });

      const result = await store.login('test@example.com', 'wrong');

      expect(result).toBe(false);
      expect(store.error).toBe('Invalid credentials');
      expect(store.token).toBeNull();
    });
  });

  describe('register', () => {
    it('should successfully register', async () => {
      const store = useAuthStore();
      const mockResponse = {
        data: {
          access_token: 'access123',
          refresh_token: 'refresh123'
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await store.register('Test User', 'test@example.com', 'password', 'workspace');

      expect(result).toBe(true);
      expect(store.token).toBe('access123');
      expect(store.refreshToken).toBe('refresh123');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access123');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh123');
    });
  });

  describe('logout', () => {
    it('should clear tokens on logout', async () => {
      const store = useAuthStore();
      store.token = 'access123';
      store.refreshToken = 'refresh123';

      await store.logout();

      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh tokens', async () => {
      const store = useAuthStore();
      const mockResponse = {
        data: {
          access_token: 'newAccess123',
          refresh_token: 'newRefresh123'
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      store.refreshToken = 'oldRefresh123';
      const result = await store.refreshAccessToken();

      expect(result).toBe('newAccess123');
      expect(store.token).toBe('newAccess123');
      expect(store.refreshToken).toBe('newRefresh123');
    });
  });
});