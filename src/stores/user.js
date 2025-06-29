import { defineStore } from 'pinia';
import { userEndpointManager } from '../services/api/userEndpoints.js';

export const useUserStore = defineStore('user', {
  state: () => ({
    workspaceUsers: [],
    currentUserProfile: null,
    loading: false,
    error: null,
    userCache: new Map(),
    hasFetchedAllUsers: false,
    users: [],
    lastFetch: 0,
    fetchPromise: null,
    initializationAttempts: 0,
    maxInitializationAttempts: 3,
    initializationInProgress: false,
    profileLoading: false,
    profileError: null
  }),

  actions: {
    /**
     * Fetch all users in the workspace, ensuring it only runs once.
     */
    async fetchWorkspaceUsers() {
      if (this.loading && this.fetchPromise) {
        return this.fetchPromise;
      }

      const now = Date.now();
      if (this.workspaceUsers.length > 0 && (now - this.lastFetch < 300000)) {
        return this.workspaceUsers;
      }

      this.loading = true;
      this.fetchPromise = (async () => {
        try {
          const users = await userEndpointManager.fetchWorkspaceUsers();
          this.workspaceUsers = users;
          this.userCache.clear();
          users.forEach(user => this.userCache.set(user.id, user));
          this.lastFetch = Date.now();
          this.hasFetchedAllUsers = true;
          this.error = null;

          if (true) {
            console.log(`✅ [UserStore] Successfully fetched ${users.length} workspace users`);
          }

          return users;
        } catch (error) {
          this.error = error.message;
          if (true) {
            console.error('[UserStore] Failed to fetch users:', error);
          }
          return [];
        } finally {
          this.loading = false;
          this.fetchPromise = null;
        }
      })();
      return this.fetchPromise;
    },

    async initializeWithRetry() {
      if (this.initializationInProgress) {
        return false;
      }

      this.initializationInProgress = true;

      try {
        while (this.initializationAttempts < this.maxInitializationAttempts) {
          this.initializationAttempts++;

          if (true) {
            console.log(`🔄 [UserStore] Initialization attempt ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
          }

          try {
            const users = await this.fetchWorkspaceUsers();
            if (users && users.length > 0) {
              if (true) {
                console.log(`✅ [UserStore] Initialization successful on attempt ${this.initializationAttempts}`);
              }
              return true;
            }
          } catch (error) {
            if (true) {
              console.warn(`⚠️ [UserStore] Attempt ${this.initializationAttempts} failed:`, error.message);
            }
          }

          if (this.initializationAttempts < this.maxInitializationAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.initializationAttempts - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (true) {
          console.warn(`❌ [UserStore] All ${this.maxInitializationAttempts} initialization attempts failed`);
        }
        return false;
      } finally {
        this.initializationInProgress = false;
      }
    },

    async forceRefresh() {
      this.lastFetch = 0;
      this.initializationAttempts = 0;
      return this.fetchWorkspaceUsers();
    },

    clearError() {
      this.error = null;
    },

    async fetchUsersByIds(userIds) {
      if (!userIds || userIds.length === 0) {
        return;
      }
      try {
        const users = await userEndpointManager.fetchUsersByIds(userIds);
        users.forEach(user => {
          this.userCache.set(user.id, user);
        });
      } catch (error) {
        if (true) {
          console.error('[UserStore] Failed to fetch users by IDs:', error);
        }
      }
    },

    addUserToCache(user) {
      if (user && user.id) {
        this.userCache.set(user.id, user);

        const existingUser = this.workspaceUsers.find(u => u.id === user.id);
        if (!existingUser) {
          this.workspaceUsers.push(user);
        }
      }
    },

    /**
     * Get current user profile
     */
    async getCurrentUserProfile() {
      try {
        this.profileLoading = true;
        this.profileError = null;
        
        const profile = await userEndpointManager.getCurrentUserProfile();
        this.currentUserProfile = profile;
        
        console.log('✅ [UserStore] Current user profile fetched');
        return profile;
      } catch (error) {
        this.profileError = error.message;
        console.error('❌ [UserStore] Failed to fetch current user profile:', error);
        throw error;
      } finally {
        this.profileLoading = false;
      }
    },

    /**
     * Update current user profile
     */
    async updateCurrentUserProfile(profileData) {
      try {
        this.profileLoading = true;
        this.profileError = null;
        
        const updatedProfile = await userEndpointManager.updateCurrentUserProfile(profileData);
        this.currentUserProfile = updatedProfile;
        
        console.log('✅ [UserStore] Current user profile updated');
        return updatedProfile;
      } catch (error) {
        this.profileError = error.message;
        console.error('❌ [UserStore] Failed to update current user profile:', error);
        throw error;
      } finally {
        this.profileLoading = false;
      }
    },

    /**
     * Get specific user profile by ID
     */
    async getUserProfile(userId) {
      try {
        const profile = await userEndpointManager.getUserProfile(userId);
        
        // Update cache with the profile data
        this.userCache.set(userId, profile);
        
        console.log('✅ [UserStore] User profile fetched for ID:', userId);
        return profile;
      } catch (error) {
        console.error(`❌ [UserStore] Failed to fetch user profile for ID ${userId}:`, error);
        throw error;
      }
    },

    /**
     * Update specific user profile by ID (admin function)
     */
    async updateUserProfile(userId, profileData) {
      try {
        const updatedProfile = await userEndpointManager.updateUserProfile(userId, profileData);
        
        // Update cache with the updated profile data
        this.userCache.set(userId, updatedProfile);
        
        // Update workspace users array if the user exists there
        const userIndex = this.workspaceUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          this.workspaceUsers[userIndex] = updatedProfile;
        }
        
        console.log('✅ [UserStore] User profile updated for ID:', userId);
        return updatedProfile;
      } catch (error) {
        console.error(`❌ [UserStore] Failed to update user profile for ID ${userId}:`, error);
        throw error;
      }
    },

    /**
     * Change user password
     */
    async changePassword(passwordData) {
      try {
        const result = await userEndpointManager.changePassword(passwordData);
        
        console.log('✅ [UserStore] Password changed successfully');
        return result;
      } catch (error) {
        console.error('❌ [UserStore] Failed to change password:', error);
        throw error;
      }
    },

    /**
     * Clear profile-related errors
     */
    clearProfileError() {
      this.profileError = null;
    },

    getDiagnostics() {
      return {
        workspaceUsersCount: this.workspaceUsers.length,
        cacheSize: this.userCache.size,
        loading: this.loading,
        error: this.error,
        hasFetchedAllUsers: this.hasFetchedAllUsers,
        lastFetch: this.lastFetch,
        lastFetchAge: this.lastFetch ? Date.now() - this.lastFetch : null,
        initializationAttempts: this.initializationAttempts,
        initializationInProgress: this.initializationInProgress,
        currentUserProfile: !!this.currentUserProfile,
        profileLoading: this.profileLoading,
        profileError: this.profileError
      };
    }
  },

  getters: {
    getWorkspaceUsers: (state) => state.workspaceUsers,

    getAvailableUsers: (state) => (excludeIds = []) => {
      return state.workspaceUsers.filter(user => !excludeIds.includes(user.id));
    },

    hasUser: (state) => (userId) => {
      return state.userCache.has(userId);
    },

    getUserById: (state) => (userId) => {
      return state.userCache.get(userId);
    },

    getUserByIdWithFallback: (state) => (userId) => {
      let user = state.userCache.get(userId);

      if (!user) {
        user = state.workspaceUsers.find(u => u.id === userId);
        if (user) {
          state.userCache.set(userId, user);
        }
      }

      return user;
    },

    isReady: (state) => {
      return state.hasFetchedAllUsers && state.workspaceUsers.length > 0;
    }
  }
}); 