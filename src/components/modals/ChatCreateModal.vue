<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- 模态框头部 -->
      <div class="modal-header">
        <h3 class="modal-title">创建新聊天</h3>
        <button @click="close" class="modal-close-btn">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <!-- 聊天类型选择 -->
        <div class="chat-type-tabs">
          <button v-for="type in chatTypes" :key="type.key" @click="selectedType = type.key" class="chat-type-tab"
            :class="{ 'active': selectedType === type.key }">
            <svg class="tab-icon" fill="currentColor" viewBox="0 0 20 20">
              <path :d="type.icon" />
            </svg>
            {{ type.label }}
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-alert">
          <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- 创建表单 -->
        <form @submit.prevent="handleSubmit" class="create-form">
          <!-- 聊天名称 -->
          <div v-if="selectedType !== 'direct'" class="form-group">
            <label for="chatName" class="form-label">
              {{ selectedType === 'channel' ? '频道名称' : '群组名称' }} *
            </label>
            <input id="chatName" v-model="formData.name" type="text" class="form-input"
              :class="{ 'form-input-error': validationErrors.name }"
              :placeholder="selectedType === 'channel' ? '例如：general' : '例如：项目讨论组'" required />
            <span v-if="validationErrors.name" class="form-error">
              {{ validationErrors.name }}
            </span>
          </div>

          <!-- 聊天描述 -->
          <div v-if="selectedType !== 'direct'" class="form-group">
            <label for="chatDescription" class="form-label">描述</label>
            <textarea id="chatDescription" v-model="formData.description" class="form-textarea" rows="3"
              :placeholder="selectedType === 'channel' ? '这个频道是用来...' : '这个群组用于...'" />
          </div>

          <!-- 私密性设置 -->
          <div v-if="selectedType === 'channel'" class="form-group">
            <div class="checkbox-group">
              <input id="isPublic" v-model="formData.is_public" type="checkbox" class="form-checkbox" />
              <label for="isPublic" class="checkbox-label">
                <span class="checkbox-text">公开频道</span>
                <span class="checkbox-description">
                  所有工作区成员都可以找到并加入这个频道
                </span>
              </label>
            </div>
          </div>

          <!-- 成员选择 -->
          <div v-if="selectedType !== 'channel' || !formData.is_public" class="form-group">
            <UserSelector
              v-model="selectedUsers"
              :mode="selectedType === 'direct' ? 'single' : 'multiple'"
              :label="selectedType === 'direct' ? '选择聊天对象 *' : '添加成员'"
              placeholder="通过姓名或邮箱搜索..."
            />
            <span v-if="validationErrors.members" class="form-error">
              {{ validationErrors.members }}
            </span>
          </div>
        </form>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button type="button" @click="close" class="btn btn-secondary" :disabled="loading">
          取消
        </button>

        <button @click="handleSubmit" class="btn btn-primary" :disabled="loading || !isFormValid">
          <span v-if="loading" class="loading-spinner" />
          {{ loading ? '创建中...' : getCreateButtonText() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import ChatService from '@/services/ChatService'
import UserSelector from '@/components/common/UserSelector.vue'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialType: {
    type: String,
    default: 'channel'
  },
  isPrivateChannel: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'created'])

// Composables
const { notifySuccess, notifyError } = useToast()

// State
const loading = ref(false)
const error = ref('')
const selectedType = ref('channel')
const selectedUsers = ref([])

// Form Data
const formData = reactive({
  name: '',
  description: '',
  is_public: true,
})

// Validation
const validationErrors = reactive({})

// Chat Type Config
const chatTypes = [
  { key: 'channel', label: '频道', icon: 'M7 4V2c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2h4c1.1 0 2 .9 2 2v2h-2V8h-4v12c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V8H3v2H1V6c0-1.1.9-2 2-2h4z' },
  { key: 'group', label: '群组', icon: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z' },
  { key: 'direct', label: '私信', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
]

// Computed Properties
const isFormValid = computed(() => {
  if (loading.value) return false
  if (selectedType.value === 'direct') {
    return selectedUsers.value.length === 1
  }
  if (selectedType.value === 'channel' || selectedType.value === 'group') {
    return formData.name.trim().length > 0
  }
  return false
})

const getCreateButtonText = () => {
  switch (selectedType.value) {
    case 'channel': return '创建频道'
    case 'group': return '创建群组'
    case 'direct': return '开始聊天'
    default: return '创建'
  }
}

// Methods
const validateForm = () => {
  Object.keys(validationErrors).forEach(key => delete validationErrors[key])
  let isValid = true

  if (selectedType.value !== 'direct' && !formData.name.trim()) {
    validationErrors.name = '请输入聊天名称'
    isValid = false
  } else if (selectedType.value !== 'direct' && formData.name.length < 2) {
    validationErrors.name = '聊天名称至少需要2个字符'
    isValid = false
  }

  if (selectedType.value === 'direct' && selectedUsers.value.length !== 1) {
    validationErrors.members = '请选择一个聊天对象'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  loading.value = true
  error.value = ''

  try {
    if (selectedType.value === 'direct') {
      // Create direct message chat
      const chat = await ChatService.createDirectMessage(selectedUsers.value[0].id)
      notifySuccess('私信创建成功')
      emit('created', chat)
      close()
      return
    }

    // Create channel or group chat
    const chatData = {
      name: formData.name.trim(),
      chat_type: selectedType.value === 'channel' 
        ? (formData.is_public ? 'PublicChannel' : 'PrivateChannel') 
        : 'Group',
      description: formData.description.trim() || undefined,
      members: selectedUsers.value.map(user => user.id),
    }

    console.log('🔄 [ChatCreateModal] Creating chat with data:', chatData)
    const chat = await ChatService.createChat(chatData)
    
    const chatTypeName = selectedType.value === 'channel' ? '频道' : '群组'
    notifySuccess(`${chatTypeName}创建成功: "${chat.chat_name || chat.name}"`)
    emit('created', chat)
    close()

  } catch (err) {
    console.error('❌ [ChatCreateModal] Chat creation failed:', err)
    
    // Enhanced error handling
    let errorMessage = '创建失败'
    
    if (err.response?.status === 400) {
      errorMessage = err.response.data?.error?.message || '请求参数无效'
    } else if (err.response?.status === 401) {
      errorMessage = '认证失败，请重新登录'
    } else if (err.response?.status === 403) {
      errorMessage = '权限不足，无法创建聊天'
    } else if (err.response?.status === 409) {
      errorMessage = '聊天名称已存在，请使用其他名称'
    } else if (err.response?.status >= 500) {
      errorMessage = '服务器错误，请稍后重试'
    } else if (err.message) {
      errorMessage = err.message
    }
    
    error.value = errorMessage
    notifyError(errorMessage)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formData.name = ''
  formData.description = ''
  formData.is_public = true
  selectedUsers.value = []
  error.value = ''
  Object.keys(validationErrors).forEach(key => delete validationErrors[key])
}

const close = () => {
  resetForm()
  emit('close')
}

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    selectedType.value = props.initialType
    resetForm()
    // 如果是私有频道，设置为非公开
    if (props.isPrivateChannel && selectedType.value === 'channel') {
      formData.is_public = false
    }
  }
})

watch(selectedType, () => {
  // Reset only users when type changes, not the whole form
  selectedUsers.value = []
  // Clear validation errors when type changes
  Object.keys(validationErrors).forEach(key => delete validationErrors[key])
})
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
  background: #2f3136;
  border-radius: 12px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #dcddde;
}

.modal-close-btn {
  padding: 8px;
  border: none;
  background: none;
  color: #b9bbbe;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.modal-close-btn:hover {
  background-color: #40444b;
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-content {
  padding: 0 24px;
  overflow-y: auto;
  flex-grow: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #202225;
  margin-top: 24px;
  flex-shrink: 0;
}

.chat-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-radius: 8px;
  background-color: #202225;
  padding: 4px;
}

.chat-type-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: none;
  color: #b9bbbe;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-type-tab.active {
  background-color: #40444b;
  color: #5865f2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  width: 16px;
  height: 16px;
}

.error-alert {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 20px;
  background-color: #f84f31;
  border: 1px solid #f84f31;
  border-radius: 8px;
  color: #ffffff;
}

.error-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  flex-shrink: 0;
}

.create-form .form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #b9bbbe;
  margin-bottom: 6px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #202225;
  border-radius: 6px;
  font-size: 14px;
  background: #202225;
  color: #dcddde;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #5865f2;
  box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
}

.form-input-error {
  border-color: #f84f31;
}

.form-input-error:focus {
  border-color: #f84f31;
  box-shadow: 0 0 0 3px rgba(248, 79, 49, 0.1);
}

.form-error {
  font-size: 12px;
  color: #f84f31;
  margin-top: 4px;
  display: block;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
}

.checkbox-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.checkbox-text {
  font-size: 14px;
  font-weight: 500;
  color: #dcddde;
}

.checkbox-description {
  font-size: 12px;
  color: #b9bbbe;
  line-height: 1.4;
}

.btn {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #40444b;
  color: #dcddde;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4f545c;
}

.btn-primary {
  background-color: #5865f2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #4f5cda;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
