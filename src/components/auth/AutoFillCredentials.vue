<template>
  <div v-if="testAccounts.length > 0" class="auto-fill-container">
    <div class="auto-fill-header">
      <button @click="toggleDropdown" class="toggle-button">
        <span class="icon">👤</span>
        <span class="text">Quick Fill</span>
        <span class="arrow" :class="{ 'rotated': showDropdown }">▼</span>
      </button>
    </div>
    
    <Transition name="dropdown">
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="dropdown-header">
          <span>Test Accounts</span>
          <button @click="showDropdown = false" class="close-btn">×</button>
        </div>
        
        <div class="accounts-list">
          <button
            v-for="account in testAccounts"
            :key="account.email"
            @click="fillCredentials(account)"
            class="account-item"
          >
            <div class="account-avatar">
              {{ getInitials(account.name) }}
            </div>
            <div class="account-details">
              <div class="account-name">{{ account.name }}</div>
              <div class="account-email">{{ account.email }}</div>
            </div>
            <div class="fill-icon">⚡</div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { getTestAccounts, hasTestAccountConfig } from '@/utils/yamlConfigLoader.js'

export default {
  name: 'AutoFillCredentials',
  emits: ['fill-credentials'],
  setup(props, { emit }) {
    const testAccounts = ref([])
    const showDropdown = ref(false)

    onMounted(async () => {
      try {
        const hasTestConfig = await hasTestAccountConfig()
        if (hasTestConfig) {
          testAccounts.value = await getTestAccounts()
          console.log('🚀 Auto-fill accounts loaded:', testAccounts.value.length)
        }
      } catch (error) {
        console.warn('Failed to load test accounts for auto-fill:', error)
      }
    })

    const getInitials = (name) => {
      return name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value
    }

    const fillCredentials = (account) => {
      emit('fill-credentials', {
        email: account.email,
        password: account.password
      })
      showDropdown.value = false
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.auto-fill-container')) {
        showDropdown.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      testAccounts,
      showDropdown,
      getInitials,
      toggleDropdown,
      fillCredentials
    }
  }
}
</script>

<style scoped>
.auto-fill-container {
  position: relative;
  display: inline-block;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: #64748b;
}

.toggle-button:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #475569;
}

.icon {
  font-size: 1rem;
}

.arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 280px;
  margin-top: 4px;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #6b7280;
}

.accounts-list {
  max-height: 240px;
  overflow-y: auto;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.account-item:hover {
  background: #f8fafc;
}

.account-item:not(:last-child) {
  border-bottom: 1px solid #f1f5f9;
}

.account-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.account-details {
  flex: 1;
}

.account-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 2px;
}

.account-email {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', monospace;
}

.fill-icon {
  font-size: 1rem;
  opacity: 0.6;
}

.account-item:hover .fill-icon {
  opacity: 1;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
  transform-origin: top;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.95) translateY(-4px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: scaleY(1) translateY(0);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .dropdown-menu {
    min-width: 260px;
  }
  
  .account-item {
    padding: 14px 16px;
  }
}
</style> 