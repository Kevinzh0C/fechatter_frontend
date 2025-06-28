<template>
  <div v-if="show" class="ssl-modal-overlay" @click="$emit('retry')">
    <div class="ssl-modal" @click.stop>
      <div class="ssl-header">
        <div class="ssl-icon">🔒</div>
        <h2>SSL Certificate Required</h2>
      </div>
      
      <div class="ssl-content">
        <p class="ssl-description">
          To connect to the backend server, you need to accept the SSL certificate.
        </p>
        
        <div class="ssl-steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>Open backend URL directly:</strong>
              <a :href="instructions.backendUrl" target="_blank" class="backend-link">
                {{ instructions.backendUrl }}
              </a>
            </div>
          </div>
          
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>Accept the security warning:</strong>
              <p>Click "Advanced" → "Proceed to {{ instructions.domain }} (unsafe)"</p>
            </div>
          </div>
          
          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>Return here and click "Try Again"</strong>
            </div>
          </div>
        </div>
        
        <div class="ssl-note">
          <p><strong>Why is this needed?</strong></p>
          <p>The backend server uses a self-signed SSL certificate for development. 
          This is safe for testing but requires manual acceptance in your browser.</p>
        </div>
      </div>
      
      <div class="ssl-actions">
        <button @click="handleAccept" class="accept-btn">
          Open Backend URL
        </button>
        <button @click="$emit('retry')" class="retry-btn">
          Try Again
        </button>
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
      required: true,
      default: () => ({
        backendUrl: 'https://hook-nav-attempt-size.trycloudflare.com',
        domain: 'hook-nav-attempt-size.trycloudflare.com'
      })
    }
  },
  emits: ['accept', 'retry'],
  methods: {
    handleAccept() {
      // Open backend URL in new tab
      window.open(this.instructions.backendUrl, '_blank');
      this.$emit('accept');
    }
  }
}
</script>

<style scoped>
.ssl-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.ssl-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.ssl-header {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  padding: 24px;
  text-align: center;
}

.ssl-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.ssl-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.ssl-content {
  padding: 24px;
}

.ssl-description {
  font-size: 16px;
  color: #374151;
  margin-bottom: 24px;
  text-align: center;
}

.ssl-steps {
  margin-bottom: 24px;
}

.step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
}

.step-number {
  background: #3b82f6;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  margin-right: 16px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content strong {
  display: block;
  color: #111827;
  margin-bottom: 4px;
}

.step-content p {
  margin: 4px 0 0 0;
  color: #6b7280;
  font-size: 14px;
}

.backend-link {
  display: block;
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 6px;
  color: #3b82f6;
  text-decoration: none;
  font-family: monospace;
  font-size: 14px;
  margin-top: 8px;
  word-break: break-all;
}

.backend-link:hover {
  background: #e5e7eb;
  color: #2563eb;
}

.ssl-note {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
}

.ssl-note p {
  margin: 0 0 8px 0;
  color: #0c4a6e;
  font-size: 14px;
}

.ssl-note p:last-child {
  margin-bottom: 0;
}

.ssl-actions {
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.accept-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.accept-btn:hover {
  background: #2563eb;
}

.retry-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #4b5563;
}
</style> 