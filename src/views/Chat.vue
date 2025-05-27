<template>
  <div class="flex h-screen bg-gray-100">
    <Sidebar
      :workspace-name="workspaceName"
      :channels="channels"
      :direct-messages="directMessages"
      :active-channel-id="activeChannelId"
      @logout="handleLogout"
      @add-channel="handleAddChannel"
      @select-channel="handleSelectChannel"
    />

    <div class="flex-1 flex flex-col">
      <MessageList
        :messages="chatStore.messages"
        :current-user-id="currentUserId"
      />
      
      <MessageInput @send="handleSendMessage" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';
import Sidebar from '../components/chat/Sidebar.vue';
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

const currentUserId = ref(null);
const workspaceName = ref('My Workspace');
const channels = ref([
  { id: '1', name: 'general' },
  { id: '2', name: 'random' }
]);
const directMessages = ref([
  { id: '3', name: 'John Doe' },
  { id: '4', name: 'Jane Smith' }
]);
const activeChannelId = ref(null);

onMounted(async () => {
  if (authStore.token) {
    currentUserId.value = authStore.user?.id;
    await loadChat();
  }
});

watch(() => route.params.id, async (newId) => {
  if (newId && authStore.token) {
    activeChannelId.value = newId;
    await loadChat();
  }
});

async function loadChat() {
  const chatId = route.params.id;
  await chatStore.fetchMessages(chatId);
}

async function handleSendMessage({ content, files }) {
  try {
    let uploadedFiles = [];
    if (files.length > 0) {
      uploadedFiles = await chatStore.uploadFiles(files);
    }
    await chatStore.sendMessage(route.params.id, content, uploadedFiles);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

function handleAddChannel() {
  const newChannel = {
    id: Date.now().toString(),
    name: `channel-${channels.value.length + 1}`
  };
  channels.value.push(newChannel);
}

function handleSelectChannel(channelId) {
  activeChannelId.value = channelId;
  router.push(`/chat/${channelId}`);
}
</script>