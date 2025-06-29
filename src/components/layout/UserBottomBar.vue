<template>
  <div class="user-bottom-bar">
    <div class="user-section" @click="toggleUserMenu" ref="userSection">
      <!-- User Avatar -->
      <div class="user-avatar">
        <Avatar :user="currentUser" :size="32" :show-status="true" :status="currentUserStatus" :role="currentUser?.role" />
      </div>

      <!-- User Info -->
      <div class="user-info">
        <div class="user-name">{{ currentUser?.fullname || 'User' }}</div>
        <div class="user-status">{{ getStatusText() }}</div>
      </div>

      <!-- Menu Indicator -->
      <div class="menu-indicator" :class="{ 'active': showUserMenu }">
        <Icon name="chevron-up" class="chevron-icon" />
      </div>
    </div>

    <!-- User Menu Dropdown -->
    <Transition name="menu-slide">
      <div v-if="showUserMenu" class="user-menu" @click.stop>
        <div class="menu-header">
          <div class="menu-user-info">
            <div class="menu-user-name">{{ currentUser?.fullname || currentUser?.name || 'User' }}</div>
            <div class="menu-user-email">{{ currentUser?.email || 'No email' }}</div>
          </div>
        </div>

        <!-- Presence Status Section -->
        <div class="menu-section">
          <div class="menu-section-title">Status</div>
          <div class="status-options">
            <button 
              class="status-option" 
              :class="{ active: currentUserStatus === 'online' }"
              @click="setPresenceStatus('online')"
            >
              <div class="status-dot status-online"></div>
              <span>Online</span>
            </button>
            <button 
              class="status-option" 
              :class="{ active: currentUserStatus === 'away' }"
              @click="setPresenceStatus('away')"
            >
              <div class="status-dot status-away"></div>
              <span>Away</span>
            </button>
            <button 
              class="status-option" 
              :class="{ active: currentUserStatus === 'busy' }"
              @click="setPresenceStatus('busy')"
            >
              <div class="status-dot status-busy"></div>
              <span>Busy</span>
            </button>
          </div>
        </div>

        <div class="menu-divider"></div>

        <div class="menu-items">
          <button @click="openProfile" class="menu-item">
            <Icon name="user" class="menu-icon" />
            <span>Profile</span>
          </button>

          <button @click="openSettings" class="menu-item">
            <Icon name="settings" class="menu-icon" />
            <span>Settings</span>
          </button>

          <div class="menu-item theme-toggle-container">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Theme</span>
            <div class="theme-switch-wrapper">
              <div class="theme-switch" @click="toggleTheme" :class="{ 'dark': currentTheme === 'dark' }">
                <div class="switch-track" :class="{ 'dark': currentTheme === 'dark' }">
                  <div class="switch-thumb" :class="{ 'dark': currentTheme === 'dark' }">
                    <!-- Sun Icon -->
                    <svg v-if="currentTheme !== 'dark'" class="switch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                    <!-- Moon Icon -->
                    <svg v-else class="switch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button v-if="canSwitchRole" @click="switchRole" class="menu-item">
            <Icon name="user-plus" class="menu-icon" />
            <span>Switch role</span>
          </button>
        </div>

        <div class="menu-divider"></div>

        <button @click="signOut" class="menu-item menu-item-danger">
          <Icon name="log-out" class="menu-icon" />
          <span>Sign out</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import Icon from '@/components/ui/Icon.vue'
import presenceService from '@/services/presence'
import Avatar from '@/components/ui/Avatar.vue'
import themeManager from '@/services/ThemeManager.js'

// Props
const props = defineProps({
  showAdminFeatures: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['profile-opened', 'settings-opened', 'role-switched', 'logout'])

// Stores
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

// State
const showUserMenu = ref(false)
const userSection = ref(null)
const currentTheme = ref('light')

// Theme management
const setTheme = (theme) => {
  themeManager.setTheme(theme)
  currentTheme.value = theme
}

const toggleTheme = () => {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
}

// Listen for theme changes
const handleThemeChange = (event) => {
  currentTheme.value = event.detail.theme
}

// Reactive presence status - this will track changes automatically
const currentUserStatus = computed(() => {
  return presenceService.currentUserStatus.value || 'offline'
})

// Watch for status changes and log them
watch(currentUserStatus, (newStatus, oldStatus) => {
  console.log('🔄 [UserBottomBar] Status changed:', { from: oldStatus, to: newStatus })
}, { immediate: true })

// Computed
const currentUser = computed(() => authStore.user)

const canSwitchRole = computed(() => {
  return currentUser.value?.role === 'admin' || currentUser.value?.role === 'moderator'
})

const isOnline = computed(() => {
  if (!currentUser.value) return false;
  
  console.log('👋 [UserBottomBar] Current user presence status:', {
    userId: currentUser.value.id,
    status: currentUserStatus.value,
    serviceConnected: presenceService.getStatus()
  });
  
  return currentUserStatus.value === 'online' || currentUserStatus.value === 'away';
})

const getStatusClass = () => {
  if (!currentUser.value) return 'status-offline';
  
  switch (currentUserStatus.value) {
    case 'online':
      return 'status-online';
    case 'away':
      return 'status-away';
    case 'busy':
      return 'status-busy';
    default:
      return 'status-offline';
  }
};

const getStatusText = () => {
  if (!currentUser.value) return 'Offline';
  
  if (currentUser.value.role === 'admin') return 'Administrator';
  
  switch (currentUserStatus.value) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    default:
      return 'Offline';
  }
};

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const getUserInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const handleAvatarError = () => {
  // Handle avatar loading error by showing initials
  console.warn('Failed to load user avatar')
}

const openProfile = () => {
  closeUserMenu()
  emit('profile-opened')
  // Could open profile modal or navigate to profile page
}

const openSettings = () => {
  closeUserMenu()
  router.push('/settings')
  console.log('🔧 [UserBottomBar] Navigating to user settings page')
}

const switchRole = () => {
  closeUserMenu()
  emit('role-switched')
  // Implementation for role switching
}

const setPresenceStatus = async (status) => {
  try {
    console.log(`🔄 [UserBottomBar] Setting presence status to: ${status}`);
    
    // Call the presence service to update status
    await presenceService.setStatus(status);
    
    // The status will be automatically updated via the reactive computed property
    console.log(`✅ [UserBottomBar] Presence status set successfully to: ${status}`);
    
    // Force a small UI update by closing and reopening menu briefly to show the change
    setTimeout(() => {
      console.log(`🔍 [UserBottomBar] Status after update: ${currentUserStatus.value}`);
    }, 100);
    
  } catch (error) {
    console.error('❌ [UserBottomBar] Failed to update presence status:', error);
  }
};

const signOut = async () => {
  console.log('🚪 [USER_BAR] Starting logout process...')
  
  try {
    // 关闭用户菜单
    closeUserMenu()
    
    // 🔧 FIXED: Emit logout event to App.vue instead of handling directly
    console.log('🚀 [USER_BAR] Emitting logout event to App.vue...')
    
    // Let App.vue handle the complete logout flow
    emit('logout')
    
    console.log('✅ [USER_BAR] Logout event emitted successfully')
    
  } catch (error) {
    console.error('❌ [USER_BAR] Failed to emit logout event:', error)
    
    // 紧急回退：直接调用authStore
    try {
      console.warn('⚠️ [USER_BAR] Using emergency fallback - direct authStore logout')
      authStore.logout()
    } catch (emergencyError) {
      // 最后手段：强制导航
      console.error('❌ [USER_BAR] Emergency fallback failed, forcing navigation')
      window.location.href = '/login'
    }
  }
}

// Click outside handler
const handleClickOutside = (event) => {
  if (userSection.value && !userSection.value.contains(event.target)) {
    closeUserMenu()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // Initialize theme
  currentTheme.value = themeManager.getCurrentTheme()
  window.addEventListener('theme-changed', handleThemeChange)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('theme-changed', handleThemeChange)
})
</script>

<style scoped>
/* 🎨 [FIX] User Bottom Bar: Polished Design System */
.user-bottom-bar {
  position: relative;
  padding: 12px;
  border-top: 1px solid var(--color-sidebar-border);
  background: var(--color-sidebar-bg);
  min-height: 64px;
  display: flex;
  align-items: center;
}

/* User Section: Clickable Area */
.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
}

.user-section:hover {
  background-color: var(--color-sidebar-hover);
}

/* User Avatar */
.user-avatar {
  flex-shrink: 0;
}

/* User Info Text Block */
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 12px;
  color: var(--color-sidebar-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Menu Indicator Arrow */
.menu-indicator {
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-indicator.active {
  transform: rotate(180deg);
}

.chevron-icon {
  width: 18px;
  height: 18px;
  color: var(--color-sidebar-text-muted);
}

/* User Menu Dropdown: Main Container */
.user-menu {
  position: absolute;
  bottom: calc(100% + 8px); /* Position above the bar with margin */
  left: 12px;
  right: 12px;
  background-color: var(--color-background-secondary);
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  z-index: var(--z-dropdown, 1000);
  display: flex;
  flex-direction: column;
  gap: 4px; /* Consistent gap between sections */
  padding: 8px;
}

/* Menu Header */
.menu-header {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.menu-user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.menu-user-email {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* Menu Divider */
.menu-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 8px; /* Consistent margin */
}

/* Menu Section: For Status Options */
.menu-section {
  padding: 0 8px;
}

.menu-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding: 0 4px;
}

/* Status Options */
.status-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  border-radius: 6px;
  width: 100%;
}

.status-option:hover {
  background-color: var(--color-background-muted);
}

.status-option.active {
  background-color: var(--color-primary);
  color: white;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.status-online { background-color: var(--color-online); }
.status-dot.status-away { background-color: var(--color-warning); }
.status-dot.status-busy { background-color: var(--color-danger); }

/* Menu Items: General Buttons */
.menu-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-radius: 6px;
  min-height: 40px;
}

.menu-item:hover {
  background-color: var(--color-background-muted);
}

.menu-item-danger {
  color: var(--color-danger);
}

.menu-item-danger:hover {
  background-color: var(--color-danger);
  color: white;
}
.menu-item-danger:hover .menu-icon {
  color: white;
}

.menu-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

/* Theme Switch - Modern Toggle Design */
.theme-toggle-container {
  justify-content: space-between;
}

.theme-switch-wrapper {
  display: flex;
  align-items: center;
}

.theme-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--color-background-muted);
  cursor: pointer;
  position: relative;
  transition: background-color 0.3s ease;
  border: 1px solid var(--color-border);
}

.theme-switch:hover {
  background-color: var(--color-background-soft);
}

.switch-track {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.switch-track.dark {
  background-color: var(--color-primary);
}

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: white;
  position: absolute;
  top: 1px;
  left: 1px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.switch-thumb.dark {
  transform: translateX(20px);
  background-color: white;
}

.switch-icon {
  width: 12px;
  height: 12px;
  color: var(--color-primary);
  transition: color 0.2s ease;
  stroke-width: 2;
  flex-shrink: 0;
}

.switch-thumb.dark .switch-icon {
  color: var(--color-primary);
}

/* Hover effects */
.theme-switch:hover .switch-track {
  box-shadow: 0 0 0 2px var(--color-primary-alpha);
}

.theme-switch:hover .switch-thumb {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Menu Transitions */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: bottom center;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* Responsive Design */
@media (max-width: 768px) {
  .user-bottom-bar {
    padding: 8px;
  }
  .user-menu {
    left: 8px;
    right: 8px;
  }
  .menu-item {
    padding: 12px;
    min-height: 44px;
  }
}

/* High Contrast & Reduced Motion */
@media (prefers-contrast: high) {
  .user-menu {
    border: 2px solid var(--color-border);
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-indicator, .menu-slide-enter-active, .menu-slide-leave-active {
    transition: none;
  }
}
</style>
