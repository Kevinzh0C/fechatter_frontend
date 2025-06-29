<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex justify-center mb-4">
          <AppIcon :size="64" :preserve-gradient="true" start-color="#6366f1" end-color="#8b5cf6"
            title="Fechatter Logo" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-white">Create your account</h2>
        <p class="mt-2 text-center text-sm text-gray-400">
          Join Fechatter and start collaborating
        </p>
      </div>

      <!-- Error Display -->
      <AuthError :error="error" title="Registration Error" :suggestion="errorSuggestion" @dismiss="dismissError"
        dismissible />

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit" data-testid="register-form">
        <div class="rounded-md shadow-xl border-2 border-blue-500 bg-gray-800 -space-y-px">
          <!-- First Name and Last Name Fields -->
          <div class="grid grid-cols-2 gap-0">
            <div>
              <label for="firstName" class="sr-only">First Name</label>
              <input v-model="firstName" id="firstName" name="firstName" type="text" required autocomplete="given-name"
                :disabled="loading || isSubmitting"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-white rounded-tl-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-r border-blue-500"
                placeholder="First Name" data-testid="firstName-input" />
            </div>
            <div>
              <label for="lastName" class="sr-only">Last Name</label>
              <input v-model="lastName" id="lastName" name="lastName" type="text" required autocomplete="family-name"
                :disabled="loading || isSubmitting"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-white rounded-tr-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                placeholder="Last Name" data-testid="lastName-input" />
            </div>
          </div>
          <div class="border-t border-blue-500">
            <label for="email" class="sr-only">Email address</label>
            <input v-model="email" id="email" name="email" type="email" required autocomplete="email"
              :disabled="loading || isSubmitting"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
              placeholder="Email address" data-testid="email-input" />
          </div>
          <div class="border-t border-blue-500">
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" required autocomplete="new-password"
              :disabled="loading || isSubmitting" minlength="8" @input="validatePassword" :class="[
                'appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent',
              ]" placeholder="Password (8+ chars with number)" data-testid="password-input" />
            <p v-if="passwordError" class="mt-1 text-xs text-red-400 px-3 pb-2">
              {{ passwordError }}
            </p>
          </div>
          <div class="border-t border-blue-500">
            <label for="workspace" class="sr-only">Workspace</label>
            <select v-model="workspace" id="workspace" name="workspace" required :disabled="loading || isSubmitting"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border-0 placeholder-gray-500 text-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
              data-testid="workspace-select">
              <option value="" disabled>Select Workspace</option>
              <option v-for="ws in availableWorkspaces" :key="ws.value" :value="ws.value">
                {{ ws.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <router-link to="/login" class="font-medium text-indigo-400 hover:text-indigo-300" data-testid="login-link">
              Already have an account? Sign in
            </router-link>
          </div>
        </div>

        <div>
          <button type="submit" :disabled="loading || !isFormValid || isSubmitting"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="register-submit">
            <span v-if="loading || isSubmitting" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </span>
            {{ (loading || isSubmitting) ? 'Creating account...' : 'Sign up' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { AppIcon } from '@/components/icons';
// import { useRegisterGuard } from '@/composables/useRegisterGuard';
import AuthError from '@/components/common/AuthError.vue';


const router = useRouter();
const authStore = useAuthStore();
// const { startRegisterGuard, stopRegisterGuard } = useRegisterGuard();

// Form data - Split name fields
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const workspace = ref('Acme'); // Set default to Acme
const error = ref('');
const errorSuggestion = ref('');
const passwordError = ref('');
const loading = ref(false);
const isSubmitting = ref(false);

// Computed fullname from firstName and lastName
const fullname = computed(() => {
  const first = firstName.value.trim();
  const last = lastName.value.trim();
  if (first && last) {
    return `${first} ${last}`;
  } else if (first) {
    return first;
  } else if (last) {
    return last;
  }
  return '';
});

// Available workspaces - currently only Acme under Super
const availableWorkspaces = ref([
  { value: 'Acme', label: 'Acme' }
]);

// Password validation
const validatePassword = () => {
  const pwd = password.value;
  if (pwd.length === 0) {
    passwordError.value = '';
  } else if (pwd.length < 8) {
    passwordError.value = 'Password must be at least 8 characters';
  } else if (!/\d/.test(pwd)) {
    passwordError.value = 'Password must contain at least one number';
  } else {
    passwordError.value = '';
  }
};

// Form validation - Updated to use firstName and lastName
const isFormValid = computed(() => {
  return firstName.value.trim().length > 0 &&
    lastName.value.trim().length > 0 &&
    email.value.trim().length > 0 &&
    password.value.length >= 8 &&
    /\d/.test(password.value) &&
    workspace.value.trim().length > 0 &&
    !passwordError.value;
});

// CSRF token handling
const getCsrfToken = () => {
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  return metaToken?.content || null;
};

const setCsrfToken = (token) => {
  // Update meta tag if exists, or create new one
  let metaToken = document.querySelector('meta[name="csrf-token"]');
  if (!metaToken) {
    metaToken = document.createElement('meta');
    metaToken.name = 'csrf-token';
    document.head.appendChild(metaToken);
  }
  metaToken.content = token;
};

const dismissError = () => {
  error.value = '';
  errorSuggestion.value = '';
};

const handleSubmit = async () => {
  // Prevent duplicate submissions
  if (!isFormValid.value || loading.value || isSubmitting.value) {
    return;
  }

  error.value = '';
  errorSuggestion.value = '';
  isSubmitting.value = true;
  loading.value = true;

  // Start navigation guard
  // startRegisterGuard();

  try {
    // Get CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      console.log('CSRF token detected for registration');
    }

    // Use computed fullname for registration
    const success = await authStore.register(
      fullname.value, // Combined first and last name
      email.value.trim(),
      password.value,
      workspace.value.trim()
    );

    if (success) {
      console.log('Registration successful');

      // Handle CSRF token from response if provided
      // This would typically be set by the auth store after successful registration
      if (authStore.csrfToken) {
        setCsrfToken(authStore.csrfToken);
      }

      // Auto-login is handled by the auth store
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to onboarding or home
      await router.push('/onboarding').catch(() => {
        // Fallback to home if onboarding route doesn't exist
        router.push('/');
      });
    } else {
      error.value = authStore.error || 'Registration failed';
      errorSuggestion.value = getErrorSuggestion(error.value);
    }
  } catch (err) {
    console.error('Registration error:', err);
    error.value = err.message || 'Registration failed';
    errorSuggestion.value = getErrorSuggestion(error.value);
  } finally {
    loading.value = false;
    isSubmitting.value = false;
    // stopRegisterGuard();
  }
};

const getErrorSuggestion = (errorMessage) => {
  if (errorMessage.toLowerCase().includes('email')) {
    return 'Please check that the email address is valid and not already in use.';
  } else if (errorMessage.toLowerCase().includes('password')) {
    return 'Ensure your password meets all requirements: 8+ characters with at least one number.';
  } else if (errorMessage.toLowerCase().includes('workspace')) {
    return 'The workspace name may already be taken. Try a different name.';
  }
  return 'Please check your information and try again.';
};

onMounted(() => {
  console.log('Register page mounted');

  // Clear any existing errors
  error.value = '';
  authStore.error = null;
});

onUnmounted(() => {
  // stopRegisterGuard();
  console.log('Register page unmounted');
});
</script>

<style scoped>
/* 📱 移动端姓名字段优化 */
@media (max-width: 768px) {
  /* 📱 移动端姓名字段网格布局 */
  .grid.grid-cols-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  /* 📱 移动端First Name字段 */
  .grid.grid-cols-2 > div:first-child input {
    border-right: 1px solid #dbeafe;
    border-radius: 0.375rem 0 0 0; /* rounded-tl-md */
    /* 📱 确保触摸友好 */
    min-height: 44px;
    font-size: 16px; /* 防止iOS缩放 */
  }

  /* 📱 移动端Last Name字段 */
  .grid.grid-cols-2 > div:last-child input {
    border-radius: 0 0.375rem 0 0; /* rounded-tr-md */
    /* 📱 确保触摸友好 */
    min-height: 44px;
    font-size: 16px; /* 防止iOS缩放 */
  }

  /* 📱 移动端焦点状态优化 */
  .grid.grid-cols-2 input:focus {
    /* 📱 增强焦点边框 */
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    border-color: #6366f1;
    z-index: 20;
  }

  /* 📱 移动端placeholder优化 */
  .grid.grid-cols-2 input::placeholder {
    color: #9ca3af;
    font-size: 14px;
  }
}

/* 📱 超小屏幕适配 (≤480px) */
@media (max-width: 480px) {
  /* 📱 超小屏幕姓名字段 */
  .grid.grid-cols-2 > div input {
    padding: 10px 12px;
    min-height: 42px;
    font-size: 16px; /* 保持防缩放 */
  }

  /* 📱 超小屏幕placeholder */
  .grid.grid-cols-2 input::placeholder {
    font-size: 13px;
  }
}

/* 📱 键盘适配 */
@media (max-width: 768px) {
  /* 📱 键盘弹出时的输入框优化 */
  .grid.grid-cols-2 input:focus {
    /* 📱 确保输入框在键盘上方可见 */
    scroll-margin-top: 100px;
    /* 📱 硬件加速 */
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
}

/* 📱 高对比度模式适配 */
@media (prefers-contrast: high) {
  .grid.grid-cols-2 > div:first-child input {
    border-right: 2px solid #4338ca;
  }

  .grid.grid-cols-2 input:focus {
    border-color: #4338ca;
    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.3);
  }
}

/* 📱 触摸设备优化 */
@media (pointer: coarse) {
  .grid.grid-cols-2 > div input {
    /* 📱 增大触摸目标 */
    min-height: 48px;
    padding: 12px 16px;
  }

  /* 📱 触摸反馈 */
  .grid.grid-cols-2 input:active {
    background-color: rgba(99, 102, 241, 0.05);
    transition: background-color 0.1s ease;
  }
}

/* 📱 横屏模式适配 */
@media (max-width: 768px) and (orientation: landscape) {
  .grid.grid-cols-2 > div input {
    min-height: 40px;
    padding: 8px 12px;
  }
}

/* 📱 无障碍适配：减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .grid.grid-cols-2 input {
    transition: none !important;
  }

  .grid.grid-cols-2 input:active {
    transition: none !important;
  }
}
</style>