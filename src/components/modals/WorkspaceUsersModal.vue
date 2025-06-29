<template>
  <div class="workspace-users-modal-overlay" @click="handleOverlayClick">
    <div class="workspace-users-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">Member List</h2>
        <div class="header-actions">
          <button @click="openInviteModal" class="invite-button" title="Invite new members">
            <Icon name="user-plus" />
            <span>Invite</span>
          </button>
          <button @click="$emit('close')" class="close-button">
            <Icon name="x" />
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-input-container">
          <Icon name="search" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search users..." 
            class="search-input"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading workspace users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <Icon name="alert-circle" class="error-icon" />
        <p>{{ error }}</p>
        <button @click="loadUsers" class="retry-button">Retry</button>
      </div>

      <!-- Users List -->
      <div v-else class="users-content">
        <!-- User Stats -->
        <div class="user-stats">
          <span class="stats-text">{{ filteredUsers.length }} of {{ users.length }} users</span>
        </div>

        <!-- Users Grid -->
        <div class="users-grid">
          <div 
            v-for="user in filteredUsers" 
            :key="user.id"
            @click="selectUser(user)"
            class="user-card"
          >
            <!-- User Avatar -->
            <div class="user-avatar">
              <img 
                v-if="user.avatar_url" 
                :src="user.avatar_url" 
                :alt="user.fullname"
                class="avatar-image"
                @error="handleImageError"
              />
              <div v-else class="avatar-fallback">
                <span class="avatar-initials">{{ getUserInitials(user.fullname) }}</span>
              </div>
              
              <!-- Online Status -->
              <div class="status-indicator" :class="getStatusClass(user.status)"></div>
            </div>

            <!-- User Info -->
            <div class="user-info">
              <h3 class="user-name">{{ user.fullname || 'Unknown User' }}</h3>
              <p class="user-email">{{ user.email || 'No email' }}</p>
              <div class="user-meta">
                <span v-if="user.title" class="user-title">{{ user.title }}</span>
                <span v-if="user.department" class="user-department">{{ user.department }}</span>
              </div>
            </div>

            <!-- Action Button -->
            <div class="user-actions">
              <button @click.stop="startDirectMessage(user)" class="action-button">
                <Icon name="message-circle" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0 && searchQuery" class="empty-state">
          <Icon name="users" class="empty-icon" />
          <h3>No users found</h3>
          <p>Try adjusting your search terms</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Invite Members Modal -->
  <InviteMemberModal 
    v-if="showInviteModal"
    :is-open="showInviteModal"
    :chat-id="1"
    :chat-name="'Workspace'"
    :existing-member-ids="users.map(u => u.id)"
    @close="showInviteModal = false"
    @members-invited="handleMembersInvited"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { useChatManagementStore } from '@/stores/chatManagement';
import Icon from '@/components/ui/Icon.vue';
import InviteMemberModal from '@/components/modals/InviteMemberModal.vue';

const emit = defineEmits(['close', 'user-selected']);

const userStore = useUserStore();
const chatStore = useChatStore();
const authStore = useAuthStore();
const chatManagementStore = useChatManagementStore();

// State
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const users = ref([]);
const showInviteModal = ref(false);

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value;
  }

  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user => {
    return (
      user.fullname?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.title?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  });
});

// Methods
const loadUsers = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    // 🔧 ENHANCED: Use new API integration
    const workspaceUsers = await userStore.fetchWorkspaceUsers();
    users.value = workspaceUsers || [];
    
    console.log('✅ [WorkspaceUsersModal] Loaded users via enhanced API:', users.value.length);
    console.log('📊 [WorkspaceUsersModal] User store diagnostics:', userStore.getDiagnostics());
  } catch (err) {
    console.error('❌ [WorkspaceUsersModal] Failed to load users:', err);
    error.value = err.message || 'Failed to load workspace users';
    
    // 🔧 ENHANCED: Show specific error messaging
    if (err.response?.status === 401) {
      error.value = 'Authentication required. Please login again.';
    } else if (err.response?.status === 403) {
      error.value = 'You do not have permission to view workspace members.';
    }
  } finally {
    loading.value = false;
  }
};

const selectUser = (user) => {
  emit('user-selected', user);
};

const startDirectMessage = async (user) => {
  try {
    // 🔧 ENHANCED: Use enhanced chat creation system
    console.log('🔄 [WorkspaceUsersModal] Creating DM with user:', user.fullname);
    
    const chat = await chatStore.findOrCreateDM(user.id);
    if (chat) {
      emit('close');
      console.log('🎯 [WorkspaceUsersModal] Created/found DM:', chat.id);
      
      // 🔧 ENHANCED: Navigate to the new chat
      if (window.location.pathname !== `/chat/${chat.id}`) {
        window.location.href = `/chat/${chat.id}`;
      }
    }
  } catch (err) {
    console.error('❌ [WorkspaceUsersModal] Failed to create DM:', err);
    error.value = 'Failed to create direct message. Please try again.';
  }
};

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    emit('close');
  }
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
};

const getUserInitials = (fullname) => {
  if (!fullname) return '?';
  return fullname
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'active':
      return 'status-online';
    case 'away':
      return 'status-away';
    case 'busy':
    case 'dnd':
      return 'status-busy';
    case 'offline':
    case 'inactive':
    default:
      return 'status-offline';
  }
};

const openInviteModal = () => {
  showInviteModal.value = true;
};

const handleMembersInvited = async (inviteResult) => {
  console.log('✅ [WorkspaceUsersModal] Members invited:', inviteResult);
  showInviteModal.value = false;
  
  // 🔧 ENHANCED: Refresh user list after successful invite
  await loadUsers();
};

// Lifecycle
onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
/* Modal Overlay */
.workspace-users-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.workspace-users-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.invite-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.close-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Search Section */
.search-section {
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 20px;
  height: 20px;
  color: #6b7280;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.error-icon {
  width: 48px;
  height: 48px;
  color: #dc2626;
  margin-bottom: 16px;
}

.retry-button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #5856eb;
}

/* Users Content */
.users-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.user-stats {
  margin-bottom: 20px;
  text-align: center;
}

.stats-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Users Grid */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #f3f4f6;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.user-card:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
}

/* User Avatar */
.user-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-image,
.avatar-fallback {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-fallback {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-initials {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-online {
  background: #10b981;
}

.status-away {
  background: #f59e0b;
}

.status-busy {
  background: #ef4444;
}

.status-offline {
  background: #6b7280;
}

/* User Info */
.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-title,
.user-department {
  font-size: 12px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-title {
  font-weight: 500;
}

/* User Actions */
.user-actions {
  flex-shrink: 0;
}

.action-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #6366f1;
  color: white;
  transform: scale(1.1);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin: 0 auto 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .workspace-users-modal-overlay {
    padding: 0;
  }

  .workspace-users-modal {
    border-radius: 0;
    max-width: none;
    max-height: 100vh;
    height: 100vh;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }

  .user-card {
    margin: 0 -8px;
  }
}
</style> 