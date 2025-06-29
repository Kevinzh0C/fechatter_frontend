<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">Browse Channels</h2>
        <button @click="$emit('close')" class="modal-close" aria-label="Close modal" data-testid="modal-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Search bar -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search channels" 
              class="search-input"
              @input="filterChannels"
            />
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading channels...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-container">
          <div class="error-icon">⚠️</div>
          <p>{{ error }}</p>
          <button @click="fetchChannels" class="retry-button">Retry</button>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredChannels.length === 0" class="empty-container">
          <div class="empty-icon">🔍</div>
          <p v-if="searchQuery">No channels found matching "{{ searchQuery }}"</p>
          <p v-else>No channels available</p>
          <button @click="$emit('create-channel')" class="create-button">Create a Channel</button>
        </div>

        <!-- Channel list -->
        <div v-else class="channel-list">
          <div 
            v-for="channel in filteredChannels" 
            :key="channel.id" 
            class="channel-item"
            :class="{ 'joined': isJoinedChannel(channel) }"
          >
            <div class="channel-icon">
              {{ channel.chat_type === 'PrivateChannel' ? '🔒' : '#' }}
            </div>
            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-description">{{ channel.description || 'No description' }}</div>
              <div class="channel-meta">
                <span class="member-count">{{ channel.member_count || 0 }} members</span>
                <span v-if="channel.created_at" class="creation-date">Created {{ formatDate(channel.created_at) }}</span>
              </div>
            </div>
            <div class="channel-actions">
              <button 
                v-if="isJoinedChannel(channel)" 
                @click="navigateToChannel(channel)" 
                class="view-button"
              >
                View
              </button>
              <button 
                v-else 
                @click="joinChannel(channel)" 
                class="join-button"
                :disabled="isJoining === channel.id"
              >
                {{ isJoining === channel.id ? 'Joining...' : 'Join' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">Close</button>
        <button @click="$emit('create-channel')" class="btn btn-primary">Create Channel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';

const emit = defineEmits(['close', 'join', 'create-channel']);
const chatStore = useChatStore();

// State
const searchQuery = ref('');
const isLoading = ref(false);
const error = ref(null);
const channels = ref([]);
const isJoining = ref(null);

// Computed
const filteredChannels = computed(() => {
  if (!searchQuery.value) return channels.value;
  
  const query = searchQuery.value.toLowerCase();
  return channels.value.filter(channel => {
    return channel.name.toLowerCase().includes(query) || 
           (channel.description && channel.description.toLowerCase().includes(query));
  });
});

// Methods
const fetchChannels = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // First get current user's channels
    await chatStore.fetchChats();
    
    // Then get all available channels (this would typically be a different API call)
    // For now, we'll just use the existing chats as a placeholder
    // In a real implementation, you would fetch all available channels from the server
    channels.value = chatStore.chats.filter(chat => 
      chat.chat_type === 'PublicChannel' || chat.chat_type === 'PrivateChannel'
    );
  } catch (err) {
    console.error('Failed to fetch channels:', err);
    error.value = 'Failed to load channels. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const filterChannels = () => {
  // This is handled by the computed property
};

const isJoinedChannel = (channel) => {
  // Check if the user is already a member of this channel
  return chatStore.chats.some(chat => chat.id === channel.id);
};

const joinChannel = async (channel) => {
  isJoining.value = channel.id;
  
  try {
    // In a real implementation, you would call an API to join the channel
    // For now, we'll just emit the join event with the channel
    emit('join', channel);
  } catch (err) {
    console.error('Failed to join channel:', err);
    error.value = `Failed to join ${channel.name}. Please try again.`;
  } finally {
    isJoining.value = null;
  }
};

const navigateToChannel = (channel) => {
  emit('join', channel);
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (err) {
    return 'Unknown date';
  }
};

const handleOverlayClick = () => {
  emit('close');
};

// Lifecycle
onMounted(() => {
  fetchChannels();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg-primary, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #1a202c);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-text-secondary, #718096);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background-color: var(--color-bg-hover, #f7fafc);
  color: var(--color-text-primary, #1a202c);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.search-container {
  margin-bottom: 20px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-secondary, #718096);
}

.search-input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #4f46e5);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--color-primary, #4f46e5);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.retry-button,
.create-button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: var(--color-primary, #4f46e5);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.channel-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 6px;
  background-color: var(--color-bg-secondary, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  transition: all 0.2s ease;
}

.channel-item:hover {
  background-color: var(--color-bg-hover, #f1f5f9);
}

.channel-item.joined {
  border-left: 3px solid var(--color-primary, #4f46e5);
}

.channel-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-accent, #e9eef6);
  color: var(--color-primary, #4f46e5);
  border-radius: 6px;
  margin-right: 12px;
  font-size: 16px;
}

.channel-info {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--color-text-primary, #1a202c);
  margin-bottom: 4px;
}

.channel-description {
  font-size: 13px;
  color: var(--color-text-secondary, #718096);
  margin-bottom: 8px;
}

.channel-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-tertiary, #a0aec0);
}

.channel-actions {
  display: flex;
  align-items: center;
}

.join-button,
.view-button {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.join-button {
  background-color: var(--color-primary, #4f46e5);
  color: white;
  border: none;
}

.join-button:hover {
  background-color: var(--color-primary-dark, #4338ca);
}

.join-button:disabled {
  background-color: var(--color-primary-light, #c7d2fe);
  cursor: not-allowed;
}

.view-button {
  background-color: transparent;
  color: var(--color-primary, #4f46e5);
  border: 1px solid var(--color-primary, #4f46e5);
}

.view-button:hover {
  background-color: var(--color-primary-light, #eef2ff);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background-color: var(--color-bg-secondary, #f8fafc);
  color: var(--color-text-primary, #1a202c);
  border: 1px solid var(--color-border, #e2e8f0);
}

.btn-secondary:hover {
  background-color: var(--color-bg-hover, #f1f5f9);
}

.btn-primary {
  background-color: var(--color-primary, #4f46e5);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark, #4338ca);
}
</style> 