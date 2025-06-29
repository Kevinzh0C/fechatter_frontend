<template>
  <div class="user-selector">
    <label v-if="label" class="form-label">{{ label }}</label>
    
    <!-- 用户搜索输入框 -->
    <div class="user-search-wrapper">
      <input
        v-model="searchQuery"
        type="text"
        class="form-input"
        :placeholder="placeholder"
        @input="debouncedSearch"
        @focus="isSearchFocused = true"
        @blur="handleBlur"
        :disabled="disabled"
      />
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <!-- 搜索结果列表 -->
    <Transition name="fade">
      <div v-if="isSearchFocused && filteredUsers.length > 0" class="user-search-results">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          @mousedown.prevent="toggleUserSelection(user)"
          class="user-search-item"
          :class="{ 'selected': isUserSelected(user.id) }"
        >
          <slot name="user-item" :user="user" :is-selected="isUserSelected(user.id)">
            <div class="user-avatar">
              <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.fullname" class="avatar-image" />
              <span v-else class="avatar-initials">{{ getUserInitials(user.fullname) }}</span>
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.fullname }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
            <div v-if="isUserSelected(user.id)" class="selection-indicator">
              <svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </slot>
        </div>
      </div>
    </Transition>

    <!-- 已选择的用户标签 -->
    <div v-if="localSelectedUsers.length > 0" class="selected-users-list">
      <div v-for="user in localSelectedUsers" :key="user.id" class="selected-user-tag">
        <slot name="selected-user-tag" :user="user">
          {{ user.fullname }}
        </slot>
        <button @click="removeUserSelection(user.id)" class="remove-user-btn" :disabled="disabled">
          <svg class="remove-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import UserService from '@/services/UserService';
import type { UserProfileResponse } from '@/types/api';
import { useAuthStore } from '@/stores/auth';

// --- Props ---
interface Props {
  modelValue: UserProfileResponse[];
  mode?: 'single' | 'multiple';
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  excludeUsers?: UserProfileResponse[];
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'multiple',
  label: '',
  placeholder: '搜索用户...',
  disabled: false,
  excludeUsers: () => [],
});

// --- Emits ---
const emit = defineEmits<{
  (e: 'update:modelValue', users: UserProfileResponse[]): void;
}>();

// --- State ---
const authStore = useAuthStore();
const searchQuery = ref('');
const allUsers = ref<UserProfileResponse[]>([]); // Cache for initial user list
const searchResults = ref<UserProfileResponse[]>([]);
const isSearchFocused = ref(false);
const localSelectedUsers = ref<UserProfileResponse[]>([]);

// --- Computed ---
const excludeUserIds = computed(() => new Set(props.excludeUsers.map(u => u.id)));

const filteredUsers = computed(() => {
  const usersToShow = searchQuery.value.trim() ? searchResults.value : allUsers.value;
  // Filter out excluded users and the current user
  return usersToShow.filter(user => 
    !excludeUserIds.value.has(user.id) && user.id !== authStore.user?.id
  );
});

// --- Watchers ---
watch(() => props.modelValue, (newValue) => {
  if (JSON.stringify(newValue) !== JSON.stringify(localSelectedUsers.value)) {
    localSelectedUsers.value = [...newValue];
  }
}, { deep: true, immediate: true });

watch(localSelectedUsers, (newValue) => {
  emit('update:modelValue', newValue);
}, { deep: true });

// --- Methods ---
const getUserInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
};

const isUserSelected = (userId: number): boolean => {
  return localSelectedUsers.value.some(user => user.id === userId);
};

const toggleUserSelection = (user: UserProfileResponse) => {
  if (props.disabled) return;
  
  const index = localSelectedUsers.value.findIndex(u => u.id === user.id);

  if (index >= 0) {
    // User is already selected, so remove them
    localSelectedUsers.value.splice(index, 1);
  } else {
    // User is not selected, so add them
    if (props.mode === 'single') {
      localSelectedUsers.value = [user];
    } else {
      localSelectedUsers.value.push(user);
    }
  }
  
  // If in single mode, blur the input after selection
  if (props.mode === 'single') {
    isSearchFocused.value = false;
    searchQuery.value = '';
  }
};

const removeUserSelection = (userId: number) => {
  if (props.disabled) return;
  const index = localSelectedUsers.value.findIndex(u => u.id === userId);
  if (index >= 0) {
    localSelectedUsers.value.splice(index, 1);
  }
};

const handleBlur = () => {
  // Use a timeout to allow click events on search results to register
  setTimeout(() => {
    isSearchFocused.value = false;
  }, 150);
};

// --- API Calls & Debouncing ---
let debounceTimer: number;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    performSearch();
  }, 300);
};

const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  try {
    searchResults.value = await UserService.searchUsers(searchQuery.value, 15);
  } catch (err) {
    console.error('Failed to search users:', err);
    searchResults.value = [];
  }
};

const loadInitialUsers = async () => {
  try {
    allUsers.value = await UserService.searchUsers('', 50);
  } catch (err) {
    console.error('Failed to load initial users:', err);
  }
};

onMounted(() => {
  loadInitialUsers();
});
</script>

<style scoped>
.user-selector {
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.user-search-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 40px 12px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-background-secondary);
  color: var(--color-text);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #5865f2;
  box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
}

.form-input:disabled {
  background-color: var(--color-background-muted);
  cursor: not-allowed;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
}

.user-search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.user-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-search-item:hover {
  background-color: var(--color-background-soft);
}

.user-search-item.selected {
  background-color: #4f5cda;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(45deg, #5865f2, #7983f5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.user-email {
  font-size: 12px;
  color: var(--color-text-muted);
}

.selection-indicator {
  color: #23a55a;
}

.check-icon {
  width: 20px;
  height: 20px;
}

.selected-users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.selected-user-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.remove-user-btn {
  padding: 2px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.remove-user-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.remove-user-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.remove-icon {
  width: 14px;
  height: 14px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
