<template>
  <!-- 🚀 SIMPLIFIED: Home content only, sidebar is now global in App.vue -->
  <div class="home-content">
    <!-- Welcome Content -->
    <div class="welcome-container">
      <WelcomeContent 
        @create-channel="showCreateChannelModal = true"
        @create-dm="showCreateDMModal = true"
        @navigate-channel="navigateToChannel"
      />
    </div>

    <!-- Basic Modals -->
    <CreateChannelModal v-if="showCreateChannelModal" @close="showCreateChannelModal = false"
      @created="onChannelCreated" />
    <CreateDMModal v-if="showCreateDMModal" @close="showCreateDMModal = false" @created="onDMCreated" />

  </div>
</template>

<script setup>
import { ref } from 'vue';
import CreateChannelModal from '@/components/modals/CreateChannelModal.vue';
import CreateDMModal from '@/components/modals/CreateDMModal.vue';
import WelcomeContent from '@/components/common/WelcomeContent.vue';
import { useChatStore } from '@/stores/chat';
import { useRouter } from 'vue-router';


// 🚀 SIMPLIFIED: Only keep essential modal-related logic
const router = useRouter();
const chatStore = useChatStore();

// Modal states
const showCreateChannelModal = ref(false);
const showCreateDMModal = ref(false);

// Simple modal event handlers
const onChannelCreated = (channel) => {
  showCreateChannelModal.value = false;
  chatStore.fetchChats(); // Refresh the channel list
  if (channel && channel.id) {
    router.push(`/chat/${channel.id}`);
  }
};

const onDMCreated = (dm) => {
  showCreateDMModal.value = false;
  chatStore.fetchChats(); // Refresh the chat list
  if (dm && dm.id) {
    router.push(`/chat/${dm.id}`);
  }
};

// Navigate to channel when clicked from welcome content
const navigateToChannel = (channelId) => {
  router.push(`/chat/${channelId}`);
};
</script>

<style scoped>
/* 🚀 SIMPLIFIED: Home content only styles */
.home-content {
  width: 100%;
  height: 100vh;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow-y: auto;
}

.welcome-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* Make sure WelcomeContent is properly sized */
.welcome-container :deep(.slack-welcome) {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
</style>