<template>
  <div class="test-accounts-panel" v-if="showTestAccounts && testAccounts.length > 0">
    <div class="panel-header">
      <h3>🚀 Quick Login</h3>
      <p>Select a test account for quick access</p>
    </div>
    
    <div class="test-accounts-grid">
      <div 
        v-for="account in testAccounts" 
        :key="account.email"
        class="test-account-card"
        @click="quickLogin(account)"
        :class="{ 'logging-in': isLoggingIn === account.email }"
      >
        <div class="account-avatar">
          <span>{{ getInitials(account.name) }}</span>
        </div>
        <div class="account-info">
          <h4>{{ account.name }}</h4>
          <p class="email">{{ account.email }}</p>
          <p class="description">{{ account.description }}</p>
        </div>
        <div class="login-button">
          <span v-if="isLoggingIn === account.email">⏳</span>
          <span v-else>🚀</span>
        </div>
      </div>
    </div>
    
    <div class="panel-footer">
      <button @click="hideTestAccounts" class="hide-button">
        Hide Test Accounts
      </button>
    </div>
  </div>

  <!-- Show button when test accounts are hidden -->
  <div v-else-if="testAccounts.length > 0 && !showTestAccounts" class="show-test-accounts">
    <button @click="showTestAccountsPanel" class="show-button">
      🚀 Show Test Accounts
    </button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getTestAccounts, hasTestAccountConfig } from '@/utils/yamlConfigLoader.js'

export default {
  name: 'TestAccountQuickLogin',
  setup() {
    const authStore = useAuthStore()
    const testAccounts = ref([])
    const showTestAccounts = ref(false)
    const isLoggingIn = ref(null)

    // Load test accounts from YAML configuration
    onMounted(async () => {
      try {
        // Check if user has hidden test accounts
        const isHidden = localStorage.getItem('fechatter_hide_test_accounts') === 'true'
        
        const hasTestConfig = await hasTestAccountConfig()
        if (hasTestConfig) {
          testAccounts.value = await getTestAccounts()
          // Show test accounts unless explicitly hidden
          showTestAccounts.value = !isHidden
          console.log('🚀 Test accounts loaded:', testAccounts.value.length)
        }
      } catch (error) {
        console.warn('Failed to load test accounts:', error)
      }
    })

    const getInitials = (name) => {
      return name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const quickLogin = async (account) => {
      if (isLoggingIn.value) return

      isLoggingIn.value = account.email

      try {
        console.log('🚀 Quick login attempt:', account.email)
        
        await authStore.login(account.email, account.password)

        console.log('✅ Quick login successful')
        
        // Hide test accounts after successful login
        showTestAccounts.value = false
        
      } catch (error) {
        console.error('❌ Quick login failed:', error)
        
        // Show error notification
        if (window.$toast) {
          window.$toast.error(`Login failed: ${error.message}`)
        } else {
          alert(`Login failed: ${error.message}`)
        }
      } finally {
        isLoggingIn.value = null
      }
    }

    const hideTestAccounts = () => {
      showTestAccounts.value = false
      localStorage.setItem('fechatter_hide_test_accounts', 'true')
    }

    const showTestAccountsPanel = () => {
      showTestAccounts.value = true
      localStorage.removeItem('fechatter_hide_test_accounts')
    }

    return {
      testAccounts,
      showTestAccounts,
      isLoggingIn,
      getInitials,
      quickLogin,
      hideTestAccounts,
      showTestAccountsPanel
    }
  }
}
</script>

<style scoped>
.test-accounts-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  text-align: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  color: white;
  font-size: 1.4rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.panel-header p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.test-accounts-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.test-account-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.test-account-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.test-account-card.logging-in {
  opacity: 0.7;
  cursor: not-allowed;
  transform: scale(0.98);
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1.1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.account-info {
  flex: 1;
}

.account-info h4 {
  color: white;
  font-size: 1.1rem;
  margin-bottom: 4px;
  font-weight: 600;
}

.account-info .email {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  margin-bottom: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.account-info .description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
}

.login-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.test-account-card:hover .login-button {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.panel-footer {
  text-align: center;
  margin-top: 20px;
}

.hide-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hide-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.show-test-accounts {
  text-align: center;
  margin: 20px 0;
}

.show-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.show-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

/* Dark mode compatibility */
@media (prefers-color-scheme: dark) {
  .test-accounts-panel {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .test-accounts-grid {
    grid-template-columns: 1fr;
  }
  
  .test-accounts-panel {
    margin: 16px;
    padding: 20px;
  }
}
</style>
