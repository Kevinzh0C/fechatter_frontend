<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <div class="flex items-center mb-4">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-lg font-medium text-gray-900">
            {{ instructions.title }}
          </h3>
        </div>
      </div>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600 mb-3">
          {{ instructions.message }}
        </p>
        
        <ol class="text-sm text-gray-600 space-y-1">
          <li v-for="step in instructions.steps" :key="step" class="flex items-start">
            <span class="text-blue-500 mr-2">•</span>
            <span>{{ step }}</span>
          </li>
        </ol>
      </div>
      
      <div class="flex space-x-3">
        <button
          @click="handleAccept"
          class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {{ instructions.buttonText }}
        </button>
        <button
          @click="handleRetry"
          class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
        >
          Retry
        </button>
      </div>
      
      <div class="mt-3 text-xs text-gray-500 text-center">
        This is required because the backend uses a self-signed SSL certificate
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SSLCertificateModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    instructions: {
      type: Object,
      required: true
    }
  },
  emits: ['accept', 'retry'],
  methods: {
    handleAccept() {
      this.instructions.action();
      this.$emit('accept');
    },
    handleRetry() {
      this.$emit('retry');
    }
  }
}
</script> 