<!--
  ErrorBoundary.vue
  Basic Error Boundary Component for Vue Applications
-->
<template>
  <div class="error-boundary">
    <slot v-if="!hasError"></slot>
    <div v-else class="error-fallback">
      <h2>🚨 Something went wrong</h2>
      <p>{{ error?.message || 'An unexpected error occurred' }}</p>
      <button @click="retry" class="retry-btn">
        Try Again
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

// ================================
// 🎯 Props & Emits
// ================================

const props = defineProps({
  fallback: {
    type: String,
    default: 'An error occurred'
  }
})

const emit = defineEmits(['error', 'retry'])

// ================================
// 🎯 Reactive State
// ================================

const hasError = ref(false)
const error = ref(null)

// ================================
// 🎯 Error Handling
// ================================

onErrorCaptured((err, instance, info) => {
  hasError.value = true
  error.value = err
  
  console.error('ErrorBoundary caught error:', {
    error: err,
    component: instance?.$options.name || 'Unknown',
    info
  })
  
  emit('error', { error: err, instance, info })
  
  // Return false to prevent the error from propagating further
  return false
})

// ================================
// 🎯 Methods
// ================================

const retry = () => {
  hasError.value = false
  error.value = null
  emit('retry')
}

// Expose retry method for parent components
defineExpose({
  retry,
  hasError: () => hasError.value,
  getError: () => error.value
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: #2f3136;
  border-radius: 8px;
  border: 1px solid #202225;
  min-height: 200px;
}

.error-fallback h2 {
  color: #f84f31;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.error-fallback p {
  color: #b9bbbe;
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.retry-btn {
  background: #5865f2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: #4f5cda;
}
</style>
 