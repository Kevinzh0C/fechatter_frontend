<template>
  <div class="user-settings-container">
    <!-- Settings Header -->
    <div class="settings-header">
      <div class="header-content">
        <h1 class="settings-title">User Settings</h1>
        <p class="settings-subtitle">Manage your account preferences and security</p>
      </div>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- Profile Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Profile Information</h2>
          <p class="section-description">Update your personal information</p>
        </div>
        
        <div class="section-content">
          <div v-if="profileLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading profile...</span>
          </div>
          
          <div v-else-if="profileError" class="error-state">
            <Icon name="alert-circle" class="error-icon" />
            <span>{{ profileError }}</span>
            <button @click="loadUserProfile" class="retry-button">Retry</button>
          </div>
          
          <form v-else @submit.prevent="updateProfile" class="profile-form">
            <div class="form-group">
              <label for="fullname" class="form-label">Full Name</label>
              <input 
                id="fullname"
                v-model="profileForm.fullname"
                type="text"
                class="form-input"
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="email" class="form-label">Email Address</label>
              <input 
                id="email"
                v-model="profileForm.email"
                type="email"
                class="form-input"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="title" class="form-label">Job Title</label>
              <input 
                id="title"
                v-model="profileForm.title"
                type="text"
                class="form-input"
                placeholder="Enter your job title"
              />
            </div>
            
            <div class="form-group">
              <label for="department" class="form-label">Department</label>
              <input 
                id="department"
                v-model="profileForm.department"
                type="text"
                class="form-input"
                placeholder="Enter your department"
              />
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                :disabled="profileUpdateLoading"
                class="btn btn-primary"
              >
                <div v-if="profileUpdateLoading" class="button-spinner"></div>
                <span>{{ profileUpdateLoading ? 'Updating...' : 'Update Profile' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Security Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Security & Password</h2>
          <p class="section-description">Change your password and security settings</p>
        </div>
        
        <div class="section-content">
          <form @submit.prevent="changePassword" class="password-form">
            <div class="form-group">
              <label for="current-password" class="form-label">Current Password</label>
              <input 
                id="current-password"
                v-model="passwordForm.currentPassword"
                type="password"
                class="form-input"
                placeholder="Enter your current password"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="new-password" class="form-label">New Password</label>
              <input 
                id="new-password"
                v-model="passwordForm.newPassword"
                type="password"
                class="form-input"
                placeholder="Enter your new password"
                required
                minlength="8"
              />
              <div class="form-hint">Password must be at least 8 characters long</div>
            </div>
            
            <div class="form-group">
              <label for="confirm-password" class="form-label">Confirm New Password</label>
              <input 
                id="confirm-password"
                v-model="passwordForm.confirmPassword"
                type="password"
                class="form-input"
                placeholder="Confirm your new password"
                required
              />
              <div v-if="passwordMismatch" class="form-error">Passwords do not match</div>
            </div>
            
            <div v-if="passwordError" class="error-message">
              <Icon name="alert-circle" class="error-icon" />
              <span>{{ passwordError }}</span>
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                :disabled="passwordChangeLoading || passwordMismatch || !isPasswordFormValid"
                class="btn btn-primary"
              >
                <div v-if="passwordChangeLoading" class="button-spinner"></div>
                <span>{{ passwordChangeLoading ? 'Changing...' : 'Change Password' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAuthStore } from '@/stores/auth';
import Icon from '@/components/ui/Icon.vue';

const userStore = useUserStore();
const authStore = useAuthStore();

// State
const profileLoading = ref(false);
const profileError = ref('');
const profileUpdateLoading = ref(false);
const passwordChangeLoading = ref(false);
const passwordError = ref('');

// Profile Form
const profileForm = ref({
  fullname: '',
  email: '',
  title: '',
  department: ''
});

// Password Form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Computed
const passwordMismatch = computed(() => {
  return passwordForm.value.newPassword && 
         passwordForm.value.confirmPassword && 
         passwordForm.value.newPassword !== passwordForm.value.confirmPassword;
});

const isPasswordFormValid = computed(() => {
  return passwordForm.value.currentPassword &&
         passwordForm.value.newPassword &&
         passwordForm.value.confirmPassword &&
         passwordForm.value.newPassword.length >= 8 &&
         !passwordMismatch.value;
});

// Methods
const loadUserProfile = async () => {
  try {
    profileLoading.value = true;
    profileError.value = '';
    
    console.log('🔍 [UserSettings] Loading current user profile...');
    
    const profile = await userStore.getCurrentUserProfile();
    
    if (profile) {
      profileForm.value = {
        fullname: profile.fullname || '',
        email: profile.email || '',
        title: profile.title || '',
        department: profile.department || ''
      };
      
      console.log('✅ [UserSettings] Profile loaded successfully');
    }
  } catch (error) {
    console.error('❌ [UserSettings] Failed to load profile:', error);
    profileError.value = error.message || 'Failed to load profile';
  } finally {
    profileLoading.value = false;
  }
};

const updateProfile = async () => {
  try {
    profileUpdateLoading.value = true;
    
    console.log('🔄 [UserSettings] Updating user profile...');
    
    const updatedProfile = await userStore.updateCurrentUserProfile(profileForm.value);
    
    if (updatedProfile) {
      console.log('✅ [UserSettings] Profile updated successfully');
      
      // Show success notification
      if (window.showNotification) {
        window.showNotification('Profile updated successfully!', 'success');
      }
    }
  } catch (error) {
    console.error('❌ [UserSettings] Failed to update profile:', error);
    
    let errorMessage = 'Failed to update profile';
    if (error.response?.status === 400) {
      errorMessage = error.response.data?.message || 'Invalid profile data';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication required. Please login again.';
    }
    
    if (window.showNotification) {
      window.showNotification(errorMessage, 'error');
    }
  } finally {
    profileUpdateLoading.value = false;
  }
};

const changePassword = async () => {
  try {
    passwordChangeLoading.value = true;
    passwordError.value = '';
    
    console.log('🔄 [UserSettings] Changing user password...');
    
    const passwordData = {
      current_password: passwordForm.value.currentPassword,
      new_password: passwordForm.value.newPassword,
      confirm_password: passwordForm.value.confirmPassword
    };
    
    await userStore.changePassword(passwordData);
    
    console.log('✅ [UserSettings] Password changed successfully');
    
    // Clear form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    // Show success notification
    if (window.showNotification) {
      window.showNotification('Password changed successfully!', 'success');
    }
  } catch (error) {
    console.error('❌ [UserSettings] Failed to change password:', error);
    
    let errorMessage = 'Failed to change password';
    if (error.response?.status === 400) {
      errorMessage = error.response.data?.message || 'Invalid password data';
    } else if (error.response?.status === 401) {
      errorMessage = 'Current password is incorrect';
    }
    
    passwordError.value = errorMessage;
  } finally {
    passwordChangeLoading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadUserProfile();
});
</script>

<style scoped>
.user-settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Settings Header */
.settings-header {
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  text-align: center;
}

.settings-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.settings-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Settings Content */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.section-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.section-content {
  padding: 24px;
}

/* Loading and Error States */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  text-align: center;
  color: #6b7280;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-icon {
  width: 24px;
  height: 24px;
  color: #dc2626;
}

.retry-button {
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #5856eb;
}

/* Forms */
.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
}

.form-error {
  font-size: 12px;
  color: #dc2626;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.form-actions {
  margin-top: 16px;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5856eb;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .user-settings-container {
    padding: 16px;
  }

  .settings-header {
    padding: 20px;
    margin-bottom: 24px;
  }

  .settings-title {
    font-size: 24px;
  }

  .section-header {
    padding: 20px 20px 12px 20px;
  }

  .section-content {
    padding: 20px;
  }

  .section-title {
    font-size: 18px;
  }

  .form-input {
    font-size: 16px; /* Prevent iOS zoom */
  }
}
</style>