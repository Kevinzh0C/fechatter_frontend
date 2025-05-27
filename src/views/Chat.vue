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
            <div v-if="message.files && message.files.length > 0" class="mt-2 grid grid-cols-2 gap-2">
              <img v-for="file in message.files" :key="file" :src="file" class="rounded-lg w-full h-32 object-cover" />
            </div>
            <p class="text-xs mt-1 opacity-75">{{ new Date(message.created_at).toLocaleTimeString() }}</p>
          </div>
        </div>
      </div>

      <!-- Message input -->
      <div class="bg-white border-t p-4">
        <div class="flex flex-col bg-gray-100 border-t border-gray-200 relative">
          <div class="flex items-center">
            <button @click="triggerFileUpload" class="p-2 mr-2 text-gray-600 hover:text-blue-600 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              type="file"
              ref="fileInput"
              @change="handleFileUpload"
              multiple
              accept="image/*"
              class="hidden"
            />
          </div>

          <div class="flex items-end space-x-2">
            <textarea
              v-model="newMessage"
              @keyup.enter.prevent="sendMessage"
              placeholder="Type a message..."
              class="flex-1 px-4 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows="1"
            ></textarea>
            <button 
              @click="sendMessage"
              class="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none"
            >
              Send
            </button>
          </div>

          <div v-if="files.length > 0" class="flex flex-wrap p-2 mt-2">
            <div v-for="(file, index) in files" :key="index" class="relative mr-2 mb-2">
              <img
                :src="URL.createObjectURL(file)"
                class="h-20 w-20 object-cover rounded"
                alt="Upload preview"
              />
              <button
                @click="removeFile(index)"
                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
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
const fileInput = ref(null);
const files = ref([]);

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
  if (!newMessage.value.trim() && files.value.length === 0) return;

  try {
    let uploadedFiles = [];
    if (files.value.length > 0) {
      uploadedFiles = await chatStore.uploadFiles(files.value);
    }

    await chatStore.sendMessage(route.params.id, newMessage.value, uploadedFiles);
    newMessage.value = '';
    files.value = [];
    scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

function triggerFileUpload() {
  fileInput.value.click();
}

function handleFileUpload(event) {
  const newFiles = Array.from(event.target.files);
  files.value = [...files.value, ...newFiles];
  event.target.value = ''; // Reset input
}

function removeFile(index) {
  files.value = files.value.filter((_, i) => i !== index);
}
</script>