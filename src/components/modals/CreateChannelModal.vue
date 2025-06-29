<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">
          Create {{ channelType === 'public' ? 'Public' : 'Private' }} Channel
        </h2>
        <button @click="$emit('close')" class="modal-close" aria-label="Close modal" data-testid="modal-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Channel Type Info -->
        <div class="channel-type-info" :class="channelType === 'public' ? 'public-info' : 'private-info'">
          <div class="channel-type-icon">
            {{ channelType === 'public' ? '#' : '🔒' }}
          </div>
          <div>
            <h4>{{ channelType === 'public' ? 'Public Channel' : 'Private Channel' }}</h4>
            <p>{{ channelType === 'public'
              ? 'Anyone in the workspace can find and join this channel'
              : 'Only invited members can see and join this channel' }}</p>
          </div>
        </div>

        <div class="form-group">
          <label for="channel-name">Channel name <span class="required">*</span></label>
          <div class="input-with-prefix">
            <span class="input-prefix">{{ channelType === 'public' ? '#' : '🔒' }}</span>
            <input v-model="channelName" id="channel-name" type="text" required
              placeholder="e.g. general, random, announcements" class="form-input" :class="{ 'error': hasNameError }"
              @input="validateChannelName" data-testid="channel-name-input" />
          </div>
          <p v-if="hasNameError" class="form-error-text">{{ nameError }}</p>
          <p v-else class="form-help">Channel names must be lowercase, no spaces (use dashes instead)</p>
        </div>

        <div class="form-group">
          <label for="channel-description">Description (optional)</label>
          <textarea v-model="description" id="channel-description" rows="3" placeholder="What's this channel about?"
            class="form-input" data-testid="channel-description-input" />
          <p class="form-help">Help others understand what this channel is for</p>
        </div>

        <!-- Members for private channels -->
        <div v-if="channelType === 'private'" class="form-group">
          <label for="member-search">Add Members (Optional)</label>
          <div class="member-search">
            <input v-model="searchQuery" id="member-search" type="text" placeholder="Search users to invite..."
              class="form-input" @input="searchUsers" />
            <div v-if="searchResults.length > 0" class="search-results">
              <div v-for="user in searchResults" :key="user.id" @click="addMember(user)" class="search-result-item">
                <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Members -->
          <div v-if="selectedMembers.length > 0" class="selected-members">
            <div class="member-chips">
              <div v-for="member in selectedMembers" :key="member.id" class="member-chip">
                <span>{{ member.name }}</span>
                <button type="button" @click="removeMember(member.id)" class="remove-member">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="form-error">
          {{ error }}
        </div>

        <div class="modal-footer">
          <button type="button" @click="$emit('close')" class="btn btn-secondary" data-testid="modal-cancel"
            :disabled="isLoading">
            Cancel
          </button>
          <button type="submit" :disabled="!isFormValid || isLoading" class="btn btn-primary"
            data-testid="modal-submit">
            <span v-if="isLoading">Creating...</span>
            <span v-else>Create Channel</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useChatStore } from '@/stores/chat';

const props = defineProps({
  channelType: {
    type: String,
    default: 'public',
    validator: (value) => ['public', 'private'].includes(value)
  },
  availableUsers: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'created']);
const chatStore = useChatStore();

// Form data
const channelName = ref('');
const description = ref('');
const searchQuery = ref('');
const selectedMembers = ref([]);
const searchResults = ref([]);
const isLoading = ref(false);
const error = ref(null);
const nameError = ref('');

// Computed properties
const hasNameError = computed(() => nameError.value !== '');

const isFormValid = computed(() => {
  return channelName.value.trim() !== '' && !hasNameError.value;
});

// Reset form when modal opens
watch(() => props.channelType, () => {
  resetForm();
});

function resetForm() {
  channelName.value = '';
  description.value = '';
  searchQuery.value = '';
  selectedMembers.value = [];
  searchResults.value = [];
  error.value = null;
  nameError.value = '';
}

function validateChannelName() {
  const name = channelName.value.trim();

  if (name === '') {
    nameError.value = '';
    return;
  }

  // Channel name validation rules
  if (name.length < 2) {
    nameError.value = 'Channel name must be at least 2 characters';
    return;
  }

  if (name.length > 21) {
    nameError.value = 'Channel name must be 21 characters or fewer';
    return;
  }

  if (!/^[a-z0-9\-_]+$/.test(name)) {
    nameError.value = 'Channel names must be lowercase, numbers, dashes, and underscores only';
    return;
  }

  if (name.startsWith('-') || name.endsWith('-') || name.startsWith('_') || name.endsWith('_')) {
    nameError.value = 'Channel names cannot start or end with dashes or underscores';
    return;
  }

  nameError.value = '';
}

function searchUsers() {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  const query = searchQuery.value.toLowerCase();
  searchResults.value = props.availableUsers.filter(user => {
    const isAlreadySelected = selectedMembers.value.some(member => member.id === user.id);
    const matchesQuery = user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query);
    return !isAlreadySelected && matchesQuery;
  });
}

function addMember(user) {
  selectedMembers.value.push(user);
  searchQuery.value = '';
  searchResults.value = [];
}

function removeMember(userId) {
  selectedMembers.value = selectedMembers.value.filter(member => member.id !== userId);
}

const handleOverlayClick = () => {
  emit('close');
};

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    // 使用chat store创建频道
    const channelData = {
      name: channelName.value.trim(),
      description: description.value.trim() || null,
      type: props.channelType,
      members: props.channelType === 'private' ? selectedMembers.value.map(member => member.id) : []
    };

    const channel = await chatStore.createChat(
      channelData.name,
      channelData.members,
      channelData.description,
      props.channelType === 'private' ? 'PrivateChannel' : 'PublicChannel'
    );

    emit('created', channel);
    emit('close');
  } catch (err) {
    console.error('Failed to create channel:', err);
    error.value = err.response?.data?.message || 'Failed to create channel';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: #2f3136;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #202225;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #dcddde;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #b9bbbe;
  transition: color 0.15s;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-form {
  padding: 24px;
}

/* Channel Type Info */
.channel-type-info {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.channel-type-info.public-info {
  background: #22c55a;
  border: 1px solid #4ade80;
}

.channel-type-info.private-info {
  background: #f9a828;
  border: 1px solid #fcd34d;
}

.channel-type-icon {
  font-size: 20px;
  margin-right: 12px;
  color: #ffffff;
}

.private-info .channel-type-icon {
  color: #ffffff;
}

.channel-type-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.private-info h4 {
  color: #ffffff;
}

.channel-type-info p {
  margin: 0;
  font-size: 12px;
  color: #ffffff;
}

.private-info p {
  color: #ffffff;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #b9bbbe;
  margin-bottom: 6px;
}

.required {
  color: #f84f31;
}

/* Input with prefix */
.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: #b9bbbe;
  font-size: 14px;
  z-index: 1;
}

.input-with-prefix .form-input {
  padding-left: 32px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #202225;
  border-radius: 6px;
  font-size: 14px;
  background: #202225;
  color: #dcddde;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #5865f2;
  box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
}

.form-input.error {
  border-color: #f84f31;
}

.form-input.error:focus {
  border-color: #f84f31;
  box-shadow: 0 0 0 3px rgba(248, 79, 49, 0.1);
}

.form-error-text {
  color: #f84f31;
  font-size: 12px;
  margin-top: 4px;
}

.form-help {
  font-size: 12px;
  color: #b9bbbe;
  margin-top: 4px;
}

/* Member search */
.member-search {
  position: relative;
}

.search-results {
  position: absolute;
  z-index: 10;
  width: 100%;
  margin-top: 4px;
  background: #2f3136;
  border: 1px solid #202225;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #202225;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #40444b;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #40444b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #dcddde;
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #dcddde;
}

.user-email {
  font-size: 12px;
  color: #b9bbbe;
}

/* Selected members */
.selected-members {
  margin-top: 12px;
}

.member-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  background: #40444b;
  color: #dcddde;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 16px;
}

.remove-member {
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 4px;
  color: #b9bbbe;
  padding: 2px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-member:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #202225;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.btn-primary {
  background: #5865f2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f5cda;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #40444b;
  color: #dcddde;
  border-color: #202225;
}

.btn-secondary:hover {
  background: #4f545c;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  color: #f84f31;
  font-size: 14px;
  margin: 12px 0 0 0;
  padding: 8px 12px;
  background: #f84f31;
  border-radius: 4px;
}
</style>
