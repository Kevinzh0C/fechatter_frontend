<template>
  <!-- 🚫 DISABLED: This component is disabled to use native quick login in Login.vue -->
  <!-- The native quick login system in Login.vue provides better UX and consistency -->
  <div v-if="false" class="test-accounts-panel">
    <!-- Component content hidden -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 🚫 DISABLED: Component completely disabled
const showTestAccounts = ref(false);
const testAccounts = ref([]);

// Log that this component is disabled
onMounted(() => {
  console.log('🚫 [TestAccountQuickLogin] Component disabled - using native Login.vue quick login');
});
</script>

<style scoped>
/* Component styles hidden since component is disabled */
</style>
