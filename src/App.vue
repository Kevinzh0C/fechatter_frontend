<template>
  <div id="app" class="discord-chat-container">
    <!-- Global notifications -->
    <NotificationContainer />

    <!-- Auth Loading Overlay -->
    <div v-if="isAuthLoading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-violet-600 mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-700">Loading...</h2>
        <p class="text-gray-500 mt-2">Preparing your workspace and chat data</p>
      </div>
    </div>

    <!-- Main App Content -->
    <div v-else>
      <!-- PUBLIC ROUTES (not authenticated) -->
      <div v-if="!authStore.isAuthenticated">
        <router-view />
      </div>

      <!-- PROTECTED ROUTES WITH SIDEBAR (authenticated + should show sidebar) -->
      <div v-else-if="shouldShowSidebar" class="app-container">
        <!-- GLOBAL SIDEBAR - Only visible on protected app pages -->
        <aside class="global-sidebar">
          <div class="global-sidebar-content">
            <!-- Admin Status Bar (only for admins) -->
            <AdminStatusBar v-if="isCurrentUserAdmin" />

            <!-- Quick Actions -->
            <div class="sidebar-nav-section">
              <nav class="sidebar-nav-list">
                <router-link to="/home" class="sidebar-nav-item" :class="{ active: $route.path === '/home' }">
                  <span class="sidebar-nav-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                  </span>
                  <span class="sidebar-nav-text">Home</span>
                </router-link>
              </nav>
            </div>

            <!-- Unified Channel List - handles both channels and direct messages -->
            <div class="sidebar-unified-channels">
              <ChannelList 
                :channels="channels" 
                :directMessages="directMessages" 
                :groupMessages="groupMessages"
                :isLoading="isLoading" 
                :currentChatId="currentChatId" 
                @channel-selected="handleChannelSelected"
                @create-channel="showCreateChannelModal = true" 
                @create-dm="showCreateDMModal = true"
                @refresh="refreshData" 
              />
            </div>
          </div>

          <!-- User Bottom Bar -->
          <UserBottomBar @logout="handleLogout" />
        </aside>

        <!-- Main Content Area -->
        <main class="global-main-content">
          <router-view />
        </main>

        <!-- Global Modals -->
        <CreateChannelModal 
          v-if="showCreateChannelModal" 
          @close="showCreateChannelModal = false"
          @created="onChannelCreated" 
        />

        <CreateDMModal 
          v-if="showCreateDMModal" 
          @close="showCreateDMModal = false"
          @created="onDMCreated" 
        />
      </div>

      <!-- PROTECTED ROUTES WITHOUT SIDEBAR (login, register, etc.) -->
      <div v-else>
        <router-view />
      </div>
    </div>

    <!-- Error Boundary for unknown errors -->
    <div v-if="hasGlobalError" class="fixed inset-0 bg-red-50 z-50 flex items-center justify-center">
      <div class="text-center p-8">
        <h2 class="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
        <p class="text-gray-700 mb-4">{{ globalError }}</p>
        <button @click="reloadPage" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Reload Page
        </button>
      </div>
    </div>

    <!-- Notification Toast Container -->
    <ToastContainer />
    <!-- Keyboard Shortcuts Modal -->
    <KeyboardShortcutsModal v-model="showShortcutsModal" :shortcuts="keyboardShortcuts.shortcuts" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal.vue';
import ToastContainer from './components/ui/ToastContainer.vue';
import NotificationContainer from './components/ui/NotificationContainer.vue';
import ChannelList from './components/layout/ChannelList.vue';
import AdminStatusBar from './components/layout/AdminStatusBar.vue';
import UserBottomBar from './components/layout/UserBottomBar.vue';
import CreateChannelModal from './components/modals/CreateChannelModal.vue';
import CreateDMModal from './components/modals/CreateDMModal.vue';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import healthCheck from './utils/healthCheck';
import { useAuthStore } from './stores/auth';
import { useChatStore } from './stores/chat';
import presenceService from './services/presence.js';

// Keyboard shortcuts state
const showShortcutsModal = ref(false);

// Initialize keyboard shortcuts
const keyboardShortcuts = useKeyboardShortcuts({
  enableGlobalShortcuts: true,
  enableNavigationShortcuts: true,
  enableChatShortcuts: true,
  enableSearchShortcuts: true
});

// Global event listeners for keyboard shortcuts
const handleGlobalEvents = (event) => {
  switch (event.type.replace('fechatter:', '')) {
    case 'show-shortcuts-help':
      showShortcutsModal.value = true;
      break;
    case 'open-settings':
      // This will be handled by specific components
      break;
    default:
      // Let other components handle their specific events
      break;
  }
};

// Initialize theme system
const initializeTheme = () => {
  // Get saved theme from localStorage
  const savedTheme = localStorage.getItem('fechatter-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Determine theme to use
  const useDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;

  // Apply theme
  const html = document.documentElement;
  if (useDark) {
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark');
  } else {
    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark');
  }
};

// Store
const authStore = useAuthStore();
const chatStore = useChatStore();
const route = useRoute();
const router = useRouter();

// State
const isInitialized = ref(false);
const hasGlobalError = ref(false);
const globalError = ref('');
const isAuthLoading = ref(true);

// Global sidebar state
const showCreateChannelModal = ref(false);
const showCreateDMModal = ref(false);

// CRITICAL FIX: Force reactivity trigger for sidebar updates
const forceUpdateKey = ref(0);
const forceSidebarUpdate = () => {
  forceUpdateKey.value += 1;
  console.log('🔄 [APP] Force sidebar update triggered:', forceUpdateKey.value);
};

// Computed for sidebar data
const channels = computed(() => chatStore.chats.filter(c => c.chat_type === 'PublicChannel' || c.chat_type === 'PrivateChannel'));
const directMessages = computed(() => chatStore.chats.filter(c => c.chat_type === 'Single'));
const groupMessages = computed(() => chatStore.chats.filter(c => c.chat_type === 'Group'));
const isLoading = computed(() => chatStore.loading);
const currentUser = computed(() => authStore.user);
const isCurrentUserAdmin = computed(() => {
  return currentUser.value?.role === 'admin' || currentUser.value?.role === 'super_admin'
});
const currentChatId = computed(() => {
  const id = route.params.id;
  return id ? parseInt(id, 10) : null;
});

// INDUSTRY STANDARD: Simple binary sidebar logic
const shouldShowSidebar = computed(() => {
  // CRITICAL FIX: Include force update key to ensure reactivity
  const _forceUpdate = forceUpdateKey.value; // This ensures reactivity triggers
  
  // STEP 1: Authentication check - most critical factor
  const isAuthenticated = authStore.isAuthenticated;
  
  if (!isAuthenticated) {
    console.log('🚫 [App.vue] Sidebar hidden - user not authenticated');
    return false;
  }
  
  // STEP 2: Route-based exclusions - ONLY exclude auth/error pages
  const currentPath = route.path;
  
  // INDUSTRY STANDARD: Minimal exclusion list - only auth and error pages
  const excludedRoutes = [
    '/login',
    '/register',
    '/error',
    '/404'
  ];
  
  // Check if current route should be excluded
  const shouldExclude = excludedRoutes.some(excludedRoute => 
    currentPath === excludedRoute || currentPath.startsWith(excludedRoute + '/')
  );
  
  if (shouldExclude) {
    console.log('🚫 [App.vue] Sidebar hidden - auth/error page:', currentPath);
    return false;
  }
  
  // STEP 3: Default behavior - SHOW sidebar for all authenticated app pages
  // This includes: /home, /chat/*, /settings, /profile, /workspace, /admin, / (root)
  const shouldShow = true; // Default to showing sidebar when authenticated and not excluded
  
  // ENHANCED: Clear debugging logs with more detail
  console.log('🔍 [App.vue] Sidebar visibility decision (Industry Standard):', {
    currentPath,
    isAuthenticated,
    shouldExclude,
    shouldShow,
    'Decision Logic': 'Authenticated + Not Excluded = Show Sidebar',
    authDetails: {
      store_isAuthenticated: authStore.isAuthenticated,
      has_token: !!authStore.token,
      has_user: !!authStore.user,
      token_preview: authStore.token ? authStore.token.substring(0, 20) + '...' : 'null',
      user_id: authStore.user?.id || 'null'
    },
    storeState: {
      isInitialized: authStore.isInitialized,
      isLoading: authStore.isLoading,
      error: authStore.error
    },
    forceUpdateKey: forceUpdateKey.value,
    timestamp: new Date().toISOString()
  });
  
  return shouldShow;
});

// Methods
const reloadPage = () => {
  window.location.reload();
};

// Global sidebar event handlers
const handleChannelSelected = async (channel) => {
  try {
    console.log('🎯 [App.vue] Global channel selected:', channel);
    const chatId = channel.id || channel;
    await router.push(`/chat/${chatId}`);
  } catch (error) {
    console.error('Navigation error:', error);
  }
};

// OPTIMIZED: Debounced refresh to prevent excessive API calls
let refreshDebounceTimer = null;
const refreshData = () => {
  // Clear existing timer
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer);
  }

  // Set new timer with 300ms delay  
  refreshDebounceTimer = setTimeout(() => {
    console.log('🔄 [App.vue] Debounced refresh triggered');
    chatStore.fetchChats();
  }, 300);
};

const handleLogout = async () => {
  try {
    console.log('🚪 [App.vue] Starting logout process...');
    
    // Cleanup presence service before logout
    try {
      await presenceService.cleanup();
      console.log('✅ [APP] Presence service cleaned up');
    } catch (presenceError) {
      console.warn('⚠️ [APP] Presence cleanup failed:', presenceError);
    }
    
    // 🔧 FIXED: Let authStore handle navigation, don't skip it
    await authStore.logout('You have been signed out successfully.', false);
    console.log('✅ [App.vue] Logout completed successfully');
  } catch (error) {
    console.error('❌ [App.vue] Logout failed:', error);
    
    // Emergency fallback only if authStore logout completely failed
    try {
      console.warn('⚠️ [App.vue] Using emergency navigation fallback');
      await router.push('/login');
    } catch (routerError) {
      console.error('❌ [App.vue] Router navigation failed, using window.location');
      window.location.href = '/login';
    }
  }
};

const onChannelCreated = (channel) => {
  showCreateChannelModal.value = false;
  refreshData();
  if (channel && channel.id) {
    router.push(`/chat/${channel.id}`);
  }
};

const onDMCreated = (dm) => {
  showCreateDMModal.value = false;
  refreshData();
  if (dm && dm.id) {
    router.push(`/chat/${dm.id}`);
  }
};

// Initialize authentication state on app startup
const initializeAuthState = async () => {
  try {
    isAuthLoading.value = true;
    console.log('🔐 [APP] Starting authentication initialization...');

    const isInitialized = await authStore.initialize();

    if (isInitialized) {
      console.log('✅ [APP] Authentication initialized successfully');
      
      // Initialize presence service after successful authentication
      // Small delay to ensure auth state is fully stable
      setTimeout(async () => {
        try {
          console.log('🟢 [APP] Initializing presence service...');
          await presenceService.initialize();
          console.log('✅ [APP] Presence service initialized successfully');
        } catch (presenceError) {
          console.warn('⚠️ [APP] Presence service initialization failed:', presenceError);
        }
      }, 200); // 200ms delay for auth stability
      
      // Trigger immediate ChatBar data loading after auth initialization
      try {
        console.log('🔧 [APP] Triggering immediate ChatBar data loading...');
        await chatStore.fetchChats();
        console.log('✅ [APP] ChatBar data loaded successfully');
      } catch (chatError) {
        console.warn('⚠️ [APP] ChatBar data loading failed:', chatError);
      }
    } else {
      console.log('ℹ️ [APP] No valid authentication found - user will need to login');
    }

  } catch (error) {
    console.error('❌ [APP] Error during auth initialization:', error);
    hasGlobalError.value = true;
    globalError.value = error.message || 'Authentication initialization failed';

    try {
      authStore.clearAuth();
      console.log('🧹 [APP] Cleared corrupted auth state');
    } catch (clearError) {
      console.error('❌ [APP] Failed to clear auth state:', clearError);
    }
  } finally {
    // CRITICAL FIX: Force Vue reactivity update cycle before hiding loading
    await nextTick(); // Ensure all reactive updates are processed
    
    setTimeout(() => {
      isAuthLoading.value = false;
      
              // INDUSTRY STANDARD: Force reactive recalculation after auth state stabilizes
        nextTick(() => {
          console.log('🔄 [APP] Forcing sidebar reactivity update after auth completion');
          
          // CRITICAL FIX: Force sidebar computed property to recalculate
          forceSidebarUpdate();
          
          // Verify final state with enhanced debugging
          nextTick(() => {
            const currentSidebarState = shouldShowSidebar.value;
            const detailedState = {
              shouldShowSidebar: currentSidebarState,
              isAuthenticated: authStore.isAuthenticated,
              hasToken: !!authStore.token,
              hasUser: !!authStore.user,
              currentPath: route.path,
              chatStoreChats: chatStore.chats.length,
              forceUpdateKey: forceUpdateKey.value
            };
            
            console.log('🎯 [APP] Final post-auth detailed state:', detailedState);
            
            // 🔧 FIXED: Only log error if user is authenticated but sidebar not showing
            // During login flow, it's normal for sidebar to be hidden
            if (!currentSidebarState && authStore.isAuthenticated && route.path !== '/login') {
              console.error('❌ [APP] CRITICAL: Sidebar not showing for authenticated user!');
              console.error('🔍 [APP] Debug info:', detailedState);
              
              // Try additional forced updates with delay
              setTimeout(() => {
                console.log('🔧 [APP] Attempting recovery - forcing multiple updates...');
                forceSidebarUpdate();
                
                setTimeout(() => {
                  const recoveryState = shouldShowSidebar.value;
                  console.log('🩺 [APP] Recovery attempt result:', {
                    recovered: recoveryState,
                    authStore_isAuthenticated: authStore.isAuthenticated,
                    path: route.path
                  });
                }, 100);
              }, 200);
            } else if (currentSidebarState && authStore.isAuthenticated) {
              console.log('✅ [APP] SUCCESS: Sidebar properly showing for authenticated user');
            } else {
              console.log('ℹ️ [APP] Sidebar correctly hidden - user not authenticated or on login page');
            }
          });
        });
    }, 100);
  }
};

// Handle auth state force updates
const handleAuthStateUpdate = (event) => {
  console.log('🔧 [APP] Received force auth state update:', event.detail);
  
  if (event.detail.type === 'logout') {
    console.log('🚪 [APP] Processing logout - forcing sidebar update');
    forceSidebarUpdate();
    
    // Additional step: verify sidebar is now hidden
    nextTick(() => {
      const sidebarState = shouldShowSidebar.value;
      console.log('🔍 [APP] Post-logout sidebar state:', sidebarState);
      
      if (sidebarState) {
        console.error('❌ [APP] CRITICAL: Sidebar still showing after logout!');
        // Force another update
        forceSidebarUpdate();
      } else {
        console.log('✅ [APP] SUCCESS: Sidebar properly hidden after logout');
      }
    });
  }
};

// Ensure health check runs after app is fully mounted
onMounted(async () => {
  // First initialize theme
  initializeTheme();

  // Setup global keyboard shortcut event listeners
  window.addEventListener('fechatter:show-shortcuts-help', handleGlobalEvents);
  window.addEventListener('fechatter:open-settings', handleGlobalEvents);
  
  // Setup auth state force update listener
  window.addEventListener('force-auth-state-update', handleAuthStateUpdate);

  // Initialize authentication state validation
  await initializeAuthState();
});

onUnmounted(() => {
  // Cleanup global event listeners
  window.removeEventListener('fechatter:show-shortcuts-help', handleGlobalEvents);
  window.removeEventListener('fechatter:open-settings', handleGlobalEvents);
  window.removeEventListener('force-auth-state-update', handleAuthStateUpdate);
  
  // Clear refresh debounce timer
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = null;
  }
});
</script>

<style>
/* Import Discord theme system */
@import './styles/theme.css';
@import './styles/channel-list-variables.css';
@import './styles/enhanced-code-highlight.css';
@import './style.css';

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.375;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #f8f9fa;
}

.global-sidebar {
  width: 260px;
  background: #3f0f40;
  color: white;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.global-sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-nav-section {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.sidebar-nav-icon {
  margin-right: 12px;
  opacity: 0.8;
}

.sidebar-nav-text {
  flex: 1;
}

.sidebar-unified-channels {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.global-main-content {
  flex: 1;
  background: white;
  overflow: hidden;
  position: relative;
}
</style>
