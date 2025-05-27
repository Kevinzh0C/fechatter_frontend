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
      <!-- Chat header -->
      <div class="bg-white border-b p-4">
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-semibold text-gray-900">{{ chatStore.currentChat?.title }}</h1>
          <button @click="showAddMemberModal = true"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Add Member
          </button>
        </div>
      </div>

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

    <!-- Add Member Modal -->
    <div v-if="showAddMemberModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form @submit.prevent="addMember">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">
                    Add Member
                  </h3>
                  <div class="mt-2">
                    <input type="email" v-model="newMemberEmail"
                      class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter email address" required />
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                Add
              </button>
              <button type="button" @click="showAddMemberModal = false"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '../stores/chat';

const route = useRoute();
const chatStore = useChatStore();

const newMessage = ref('');
const members = ref([]);
const showAddMemberModal = ref(false);
const newMemberEmail = ref('');
const messagesContainer = ref(null);
const currentUserId = ref(null); // TODO: Get from auth store

onMounted(async () => {
  await loadChat();
});

watch(() => route.params.id, loadChat);

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

async function addMember() {
  // TODO: Implement add member functionality
  showAddMemberModal.value = false;
  newMemberEmail.value = '';
}
</script>