<template>
  <div class="workspace-settings-modal-overlay" @click="handleOverlayClick">
    <div class="workspace-settings-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">Workspace Settings</h2>
        <button @click="$emit('close')" class="close-button">
          <Icon name="x" />
        </button>
      </div>

      <!-- Settings Content -->
      <div class="modal-content">
        <WorkspaceSettings @close="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue';
import Icon from '@/components/ui/Icon.vue';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings.vue';

const emit = defineEmits(['close']);

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    emit('close');
  }
};
</script>

<style scoped>
/* Modal Overlay */
.workspace-settings-modal-overlay {
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

.workspace-settings-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 1000px;
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
  flex-shrink: 0;
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

/* Content */
.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Override WorkspaceSettings styles to fit modal */
.modal-content :deep(.bg-white) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  max-width: none !important;
  max-height: none !important;
  overflow: visible !important;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modal-content :deep(.px-6.py-4.border-b) {
  display: none; /* Hide the original header since we have our own */
}

.modal-content :deep(.flex.h-full) {
  flex: 1;
  overflow: hidden;
}

.modal-content :deep(.w-64.bg-gray-50) {
  background: #f9fafb !important;
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

/* Responsive Design */
@media (max-width: 768px) {
  .workspace-settings-modal-overlay {
    padding: 0;
  }

  .workspace-settings-modal {
    border-radius: 0;
    max-width: none;
    max-height: 100vh;
    height: 100vh;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-title {
    font-size: 20px;
  }
}
</style> 