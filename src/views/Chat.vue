<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Chat sidebar -->
    <div class="w-64 bg-white border-r">
      <div class="p-4">
        <h2 class="text-lg font-semibold text-gray-700">Members</h2>
        <ul class="mt-4 space-y-2">
          <li v-for="member in members" :key="member.id"
            class="flex items-center space-x-2 text-gray-700">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{{ member.email }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Chat main area -->
    <div class="flex-1 flex flex-col">
      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
        <div v-for="message in chatStore.messages" :key="message.id"
          :class="['flex', message.user_id === currentUserId ? 'justify-end' : 'justify-start']">
          <div
            :class="['max-w-xs lg:max-w-md px-4 py-2 rounded-lg', message.user_id === currentUserId ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900']">
            <p class="text-sm">{{ message.content }}</p>
            <p class="text-xs mt-1 opacity-75">{{ new Date(message.created_at).toLocaleTimeString() }}</p>
          </div>
        </div>
      </div>

      <!-- Message input -->
      <div class="bg-white border-t p-4">
        <form @submit.prevent="sendMessage" class="flex space-x-4">
          <input v-model="newMessage" type="text"
            class="flex-1 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type your message..." />
          <button type="submit"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const chatStore = useChatStore();
const authStore = useAuthStore();

const newMessage = ref('');
const members = ref([]);
const messagesContainer = ref(null);
const currentUserId = ref(null);

onMounted(async () => {
  if (authStore.token) {
    currentUserId.value = authStore.user?.id;
    await loadChat();
  }
});

watch(() => route.params.id, async (newId) => {
  if (newId && authStore.token) {
    await loadChat();
  }
});

async function loadChat() {
  const chatId = route.params.id;
  await chatStore.fetchMessages(chatId);
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  
  await chatStore.sendMessage(route.params.id, newMessage.value);
  newMessage.value = '';
  scrollToBottom();
}
</script>