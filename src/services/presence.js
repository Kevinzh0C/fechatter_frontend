import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import minimalSSE from './sse-minimal.js';

const onlineUserIds = ref(new Set());
const status = ref('disconnected');
const currentUserStatus = ref('offline');
const lastActivityTime = ref(Date.now());

const presenceService = {
  isInitialized: false,
  heartbeatInterval: null,
  activityTimer: null,
  backendSupportsPresence: null, // null = unknown, true = supported, false = not supported
  localOnlyMode: false,
  
  // Configuration
  config: {
    heartbeatInterval: 30000, // 30 seconds
    autoAwayTime: 300000, // 5 minutes of inactivity
    updateInterval: 5000, // 5 seconds between status updates
  },

  /**
   * Initialize the presence service and connect to the SSE stream
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🟢 [Presence] Initializing presence service...');

    // Check if backend supports presence
    await this.checkBackendSupport();
    
    if (this.backendSupportsPresence) {
      // Listen for SSE presence events
      this.setupSSEListeners();
      
      // Setup periodic status updates
      this.setupHeartbeat();
      
      // Set initial online status
      await this.updatePresenceStatus('online');
    } else {
      console.log('📴 [Presence] Backend does not support presence, running in local-only mode');
      this.localOnlyMode = true;
      status.value = 'connected'; // Simulate connected state
      currentUserStatus.value = 'online'; // Set to online by default
      
      // Add current user to online list in local mode
      const user = await this.getAuthUser();
      if (user && user.id) {
        onlineUserIds.value.add(user.id);
      }
    }
    
    // Setup activity tracking (works in both modes)
    this.setupActivityTracking();
    
    this.isInitialized = true;
    console.log('✅ [Presence] Service initialized successfully', 
                this.localOnlyMode ? '(local-only mode)' : '(server mode)');
  },

  /**
   * Check if the backend supports presence endpoints
   */
  async checkBackendSupport() {
    if (this.backendSupportsPresence !== null) {
      return this.backendSupportsPresence;
    }

    try {
      console.log('🔍 [Presence] Checking backend support...');
      
      // Try a simple GET to presence endpoint
      const response = await fetch('/presence', {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      // If we get a proper API response (not nginx default)
      if (response.ok) {
        const text = await response.text();
        // Check if it's not the default nginx response
        if (!text.includes('nginx-http')) {
          this.backendSupportsPresence = true;
          console.log('✅ [Presence] Backend supports presence');
          return true;
        }
      }
      
      this.backendSupportsPresence = false;
      console.log('📴 [Presence] Backend does not support presence endpoints');
      return false;
      
    } catch (error) {
      console.log('📴 [Presence] Backend presence check failed, assuming not supported:', error.message);
      this.backendSupportsPresence = false;
      return false;
    }
  },

  /**
   * Setup SSE event listeners for presence updates
   */
  setupSSEListeners() {
    // Listen for different presence event formats
    minimalSSE.on('message', (event) => {
      if (event.type === 'presence_update' || event.type === 'UserPresence' || event.type === 'presence') {
        this.handlePresenceUpdate(event.data || event);
      }
    });

    // Listen for connection status changes
    minimalSSE.on('connect', () => {
      status.value = 'connected';
      this.updatePresenceStatus('online');
    });

    minimalSSE.on('disconnect', () => {
      status.value = 'disconnected';
      currentUserStatus.value = 'offline';
    });

    console.log('📡 [Presence] SSE listeners configured');
  },

  /**
   * Setup user activity tracking for auto-away functionality
   */
  setupActivityTracking() {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      lastActivityTime.value = Date.now();
      
      // If user was away, set back to online
      if (currentUserStatus.value === 'away') {
        this.updatePresenceStatus('online');
      }
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity every minute
    this.activityTimer = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime.value;
      
      if (timeSinceActivity > this.config.autoAwayTime && currentUserStatus.value === 'online') {
        this.updatePresenceStatus('away');
      }
    }, 60000); // Check every minute

    console.log('👁️ [Presence] Activity tracking enabled');
  },

  /**
   * Setup periodic heartbeat to maintain presence
   */
  setupHeartbeat() {
    if (this.localOnlyMode) return; // No heartbeat in local-only mode
    
    this.heartbeatInterval = setInterval(async () => {
      if (status.value === 'connected' && currentUserStatus.value !== 'offline') {
        try {
          await this.sendHeartbeat();
        } catch (error) {
          console.warn('💔 [Presence] Heartbeat failed:', error);
        }
      }
    }, this.config.heartbeatInterval);

    console.log('💓 [Presence] Heartbeat configured');
  },

  /**
   * Handle incoming presence updates from the server
   */
  handlePresenceUpdate(update) {
    if (this.localOnlyMode) return; // Ignore in local-only mode
    
    if (!update || !update.user_id) {
      console.debug('[Presence] Invalid presence update:', update);
      return;
    }

    console.log('👋 [Presence] Received update:', {
      userId: update.user_id,
      status: update.status,
      timestamp: update.timestamp || new Date().toISOString()
    });

    if (update.status === 'online' || update.status === 'away') {
      onlineUserIds.value.add(update.user_id);
    } else {
      onlineUserIds.value.delete(update.user_id);
    }

    // Trigger reactivity
    onlineUserIds.value = new Set(onlineUserIds.value);
  },

  /**
   * Update current user's presence status
   */
  async updatePresenceStatus(newStatus) {
    if (currentUserStatus.value === newStatus) {
      return; // No change needed
    }

    // In local-only mode, just update local state
    if (this.localOnlyMode) {
      console.log(`🔄 [Presence] Updating status (local-only): ${currentUserStatus.value} → ${newStatus}`);
      currentUserStatus.value = newStatus;
      
      const user = await this.getAuthUser();
      if (user && user.id) {
        if (newStatus === 'online' || newStatus === 'away') {
          onlineUserIds.value.add(user.id);
        } else {
          onlineUserIds.value.delete(user.id);
        }
        // Trigger reactivity
        onlineUserIds.value = new Set(onlineUserIds.value);
      }
      
      console.log(`✅ [Presence] Status updated to: ${newStatus} (local-only)`);
      return;
    }

    // Server mode: enhanced authentication check with multiple fallbacks
    const token = await this.getAuthToken();
    const user = await this.getAuthUser();
    
    if (!token || !user) {
      console.debug('[Presence] Cannot update status - not authenticated', {
        hasToken: !!token,
        hasUser: !!user,
        localOnlyMode: this.localOnlyMode
      });
      return;
    }

    try {
      console.log(`🔄 [Presence] Updating status: ${currentUserStatus.value} → ${newStatus}`);
      
      const response = await fetch('/presence/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          status: newStatus,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        currentUserStatus.value = newStatus;
        
        // Update local state immediately for better UX
        if (newStatus === 'online' || newStatus === 'away') {
          onlineUserIds.value.add(user.id);
        } else {
          onlineUserIds.value.delete(user.id);
        }
        
        console.log(`✅ [Presence] Status updated to: ${newStatus}`);
      } else {
        console.warn(`⚠️ [Presence] Failed to update status:`, response.status, response.statusText);
        
        // If server rejects presence, switch to local-only mode
        if (response.status === 404 || response.status === 501) {
          console.log('📴 [Presence] Server does not support presence, switching to local-only mode');
          this.localOnlyMode = true;
          this.backendSupportsPresence = false;
          
          // Update local state
          currentUserStatus.value = newStatus;
          if (newStatus === 'online' || newStatus === 'away') {
            onlineUserIds.value.add(user.id);
          }
        }
      }
    } catch (error) {
      console.debug('❌ [Presence] Error updating status:', error);
      
      // On network error, switch to local-only mode
      console.log('📴 [Presence] Network error, switching to local-only mode');
      this.localOnlyMode = true;
      this.backendSupportsPresence = false;
      
      // Update local state
      currentUserStatus.value = newStatus;
      if (user && (newStatus === 'online' || newStatus === 'away')) {
        onlineUserIds.value.add(user.id);
      }
    }
  },

  /**
   * Get authentication token with multiple fallback strategies
   */
  async getAuthToken() {
    // Strategy 1: Auth store
    try {
      const authStore = useAuthStore();
      if (authStore.token && authStore.token.length > 20) {
        return authStore.token;
      }
    } catch (error) {
      console.debug('[Presence] Auth store token retrieval failed:', error);
    }

    // Strategy 2: Direct localStorage
    try {
      const token = localStorage.getItem('auth_token');
      if (token && token.length > 20) {
        return token;
      }
    } catch (error) {
      console.debug('[Presence] localStorage token retrieval failed:', error);
    }

    // Strategy 3: TokenManager
    try {
      if (window.tokenManager) {
        const token = window.tokenManager.getAccessToken();
        if (token && token.length > 20) {
          return token;
        }
      }
    } catch (error) {
      console.debug('[Presence] TokenManager token retrieval failed:', error);
    }

    // Strategy 4: Alternative localStorage keys
    try {
      const keys = ['access_token', 'token'];
      for (const key of keys) {
        const token = localStorage.getItem(key);
        if (token && token.length > 20) {
          return token;
        }
      }
    } catch (error) {
      console.debug('[Presence] Alternative localStorage token retrieval failed:', error);
    }

    return null;
  },

  /**
   * Get authenticated user with multiple fallback strategies
   */
  async getAuthUser() {
    // Strategy 1: Auth store
    try {
      const authStore = useAuthStore();
      if (authStore.user && authStore.user.id) {
        return authStore.user;
      }
    } catch (error) {
      console.debug('[Presence] Auth store user retrieval failed:', error);
    }

    // Strategy 2: Direct localStorage
    try {
      const userData = localStorage.getItem('auth_user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          return user;
        }
      }
    } catch (error) {
      console.debug('[Presence] localStorage user retrieval failed:', error);
    }

    // Strategy 3: Auth object in localStorage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.user && parsed.user.id) {
          return parsed.user;
        }
      }
    } catch (error) {
      console.debug('[Presence] Auth object user retrieval failed:', error);
    }

    return null;
  },

  /**
   * Send heartbeat to maintain presence
   */
  async sendHeartbeat() {
    if (this.localOnlyMode) {
      console.debug('💓 [Presence] Heartbeat skipped (local-only mode)');
      return;
    }

    const token = await this.getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/presence/heartbeat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        console.debug('💓 [Presence] Heartbeat sent');
      } else {
        console.warn('💔 [Presence] Heartbeat failed:', response.status);
        
        // If heartbeat fails due to missing endpoint, switch to local-only
        if (response.status === 404 || response.status === 501) {
          console.log('📴 [Presence] Heartbeat endpoint not found, switching to local-only mode');
          this.localOnlyMode = true;
          this.backendSupportsPresence = false;
        }
      }
    } catch (error) {
      console.debug('💔 [Presence] Heartbeat error:', error);
    }
  },

  /**
   * Get online users for a specific chat
   */
  async getChatOnlineUsers(chatId) {
    // In local-only mode, return just the current user if they're online
    if (this.localOnlyMode) {
      const user = await this.getAuthUser();
      if (user && user.id && (currentUserStatus.value === 'online' || currentUserStatus.value === 'away')) {
        return [{ 
          id: user.id, 
          fullname: user.fullname || user.username || 'User',
          status: currentUserStatus.value 
        }];
      }
      return [];
    }

    const token = await this.getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch(`/presence/chat/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.online_users || [];
      } else if (response.status === 404 || response.status === 501) {
        // Switch to local-only mode if endpoint doesn't exist
        console.log('📴 [Presence] Chat users endpoint not found, switching to local-only mode');
        this.localOnlyMode = true;
        this.backendSupportsPresence = false;
        
        // Return current user
        const user = await this.getAuthUser();
        if (user && user.id && (currentUserStatus.value === 'online' || currentUserStatus.value === 'away')) {
          return [{ 
            id: user.id, 
            fullname: user.fullname || user.username || 'User',
            status: currentUserStatus.value 
          }];
        }
      }
    } catch (error) {
      console.debug('[Presence] Failed to get chat online users:', error);
    }
    
    return [];
  },

  /**
   * Set user status manually
   */
  async setStatus(newStatus) {
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(newStatus)) {
      console.warn(`[Presence] Invalid status: ${newStatus}`);
      return;
    }

    await this.updatePresenceStatus(newStatus);
  },

  /**
   * Check if a user is online
   */
  isUserOnline(userId) {
    return onlineUserIds.value.has(userId);
  },

  /**
   * Get current presence status
   */
  getStatus() {
    return status.value;
  },

  /**
   * Get current user's status
   */
  getCurrentUserStatus() {
    return currentUserStatus.value;
  },

  /**
   * Cleanup when user logs out
   */
  async cleanup() {
    if (this.isInitialized) {
      console.log('🧹 [Presence] Cleaning up...');
      
      // Set offline status
      await this.updatePresenceStatus('offline');
      
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.activityTimer) {
        clearInterval(this.activityTimer);
        this.activityTimer = null;
      }
      
      // Reset state
      onlineUserIds.value.clear();
      currentUserStatus.value = 'offline';
      status.value = 'disconnected';
      this.isInitialized = false;
      
      console.log('✅ [Presence] Cleanup completed');
    }
  },

  // Export reactive properties for use in components
  onlineUserIds: computed(() => onlineUserIds.value),
  status: computed(() => status.value),
  currentUserStatus: computed(() => currentUserStatus.value),
};

// Setup automatic cleanup on page unload
window.addEventListener('beforeunload', () => {
  presenceService.cleanup();
});

export default presenceService; 