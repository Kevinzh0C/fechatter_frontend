<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Modal Header -->
      <div class="modal-header">
        <h3 class="modal-title">邀请成员加入 "{{ chatName }}"</h3>
        <button @click="close" class="modal-close-btn">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="modal-content">
        <p class="modal-description">选择您想邀请加入这个频道的新成员。已经在本频道的用户将不会显示���搜索结果中。</p>
        
        <div v-if="error" class="error-alert">
          {{ error }}
        </div>

        <UserSelector
          v-model="selectedUsers"
          :exclude-users="existingMembers"
          mode="multiple"
          label="搜索用户"
          placeholder="通过姓名或邮箱搜索..."
        />
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" @click="close" class="btn btn-secondary" :disabled="loading">
          取消
        </button>
        <button @click="handleInvite" class="btn btn-primary" :disabled="loading || selectedUsers.length === 0">
          <span v-if="loading" class="loading-spinner" />
          {{ loading ? '邀请中...' : `发送邀请 (${selectedUsers.length})` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UserSelector from '@/components/common/UserSelector.vue';
import { useChatManagementStore } from '@/stores/chatManagement';
import { useToast } from '@/composables/useToast';
import type { UserProfileResponse } from '@/types/api';

// --- Props ---
interface Props {
  isOpen: boolean;
  chatId: number;
  chatName: string;
  existingMembers: UserProfileResponse[];
}
const props = defineProps<Props>();

// --- Emits ---
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'members-invited', newMembers: UserProfileResponse[]): void;
}>();

// --- Composables ---
const { notifySuccess, notifyError } = useToast();
const chatManagementStore = useChatManagementStore();

// --- State ---
const loading = ref(false);
const error = ref('');
const selectedUsers = ref<UserProfileResponse[]>([]);

// --- Methods ---
const handleInvite = async () => {
  if (selectedUsers.value.length === 0) return;

  loading.value = true;
  error.value = '';

  try {
    const memberIds = selectedUsers.value.map(user => user.id);
    
    // Use new chatManagementStore API
    await chatManagementStore.inviteUsersToChat(props.chatId, memberIds, {
      message: '',
      sendNotification: true
    });
    
    notifySuccess(`成功邀请 ${selectedUsers.value.length} 位新成员!`);
    emit('members-invited', selectedUsers.value);
    close();
  } catch (err: any) {
    error.value = err.message || '邀请失败，请重试。';
    notifyError('邀请失败', err.message);
  } finally {
    loading.value = false;
  }
};

const close = () => {
  selectedUsers.value = [];
  error.value = '';
  emit('close');
};

const handleOverlayClick = (event: Event) => {
  if (event.target === event.currentTarget) {
    close();
  }
};
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
  padding: 16px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-close-btn {
  padding: 8px;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.modal-close-btn:hover {
  background-color: #f3f4f6;
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
}

.modal-description {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
  line-height: 1.5;
}

.error-alert {
  padding: 12px;
  margin-bottom: 20px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
}

.btn {
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
}

.btn-primary {
  background-color: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5856eb;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
