<template>
  <button
    @click="toggleTheme"
    class="theme-toggle"
    :title="currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
    :aria-label="currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
  >
    <transition name="theme-icon" mode="out-in">
      <svg
        v-if="currentTheme === 'dark'"
        key="sun"
        class="theme-icon sun-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg
        v-else
        key="moon"
        class="theme-icon moon-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </transition>
  </button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import themeManager from '@/services/ThemeManager.js'

const currentTheme = ref('light')

const toggleTheme = () => {
  const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
  themeManager.setTheme(newTheme)
  currentTheme.value = newTheme
}

let cleanup = null

onMounted(() => {
  currentTheme.value = themeManager.getCurrentTheme()
  
  // Listen for theme changes from other sources
  const handleThemeChange = (event) => {
    currentTheme.value = event.detail.theme
  }
  
  window.addEventListener('theme-changed', handleThemeChange)
  
  // Store cleanup function
  cleanup = () => {
    window.removeEventListener('theme-changed', handleThemeChange)
  }
})

onUnmounted(() => {
  if (cleanup) {
    cleanup()
  }
})
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.theme-toggle:hover {
  background: var(--color-background-muted);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.theme-toggle:active {
  transform: translateY(0);
}

.theme-toggle:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.theme-icon {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.sun-icon {
  color: var(--color-warning);
}

.moon-icon {
  color: var(--color-primary);
}

/* Theme icon transition animations */
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: all 0.3s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}

.theme-icon-enter-to,
.theme-icon-leave-from {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

/* Accessibility: Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  .theme-toggle {
    transition: none;
  }
  
  .theme-icon-enter-active,
  .theme-icon-leave-active {
    transition: none;
  }
  
  .theme-icon-enter-from,
  .theme-icon-leave-to {
    transform: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .theme-toggle {
    border: 2px solid var(--color-border);
  }
  
  .theme-toggle:hover {
    border-color: var(--color-primary);
  }
}
</style>