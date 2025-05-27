<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">FEChatter</h1>
          </div>
          <div class="flex items-center">
            <button @click="authStore.logoutAll" 
              class="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              Logout All Sessions
            </button>
            <button @click="authStore.logout" 
              class="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-900">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">Your Chats</h2>
          <button @click="openNewChatModal"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            New Chat
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="chatStore.loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="chatStore.error" class="bg-red-50 p-4 rounded-md">
          <p class="text-red-700">{{ chatStore.error }}</p>
        </div>

        <!-- Chat List -->
        <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" class="divide-y divide-gray-200">
            <li v-for="chat in chatStore.chats" :key="chat.id">
              <router-link :to="'/chat/' + chat.id"
                class="block hover:bg-gray-50">
                <div class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {{ chat.name }}
                      </p>
                      <p class="ml-2 text-sm text-gray-500">
                        {{ chat.chat_type }}
                      </p>
                    </div>
                    <div class="ml-2 flex-shrink-0 flex">
                      <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {{ chat.members?.length || 0 }} members
                      </p>
                    </div>
                  </div>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      {{ chat.description || 'No description' }}
                    </p>
                  </div>
                </div>
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- New Chat Modal -->
    <div v-if="showNewChatModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form @submit.prevent="createNewChat">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Create New Chat
                  </h3>
                  <div class="mt-4 space-y-4">
                    <div>
                      <label for="chatName" class="block text-sm font-medium text-gray-700">Chat Name</label>
                      <input type="text" id="chatName" v-model="newChatName"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Enter chat name" required />
                    </div>
                    <div>
                      <label for="chatDescription" class="block text-sm font-medium text-gray-700">Description</label>
                      <textarea id="chatDescription" v-model="newChatDescription"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows="3" placeholder="Enter chat description"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                Create
              </button>
              <button type="button" @click="showNewChatModal = false"
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

const showNewChatModal = ref(false);
const newChatName = ref('');
const newChatDescription = ref('');

onMounted(async () => {
  await chatStore.fetchChats();
});

function openNewChatModal() {
  showNewChatModal.value = true;
}

async function createNewChat() {
  const chat = await chatStore.createChat(
    newChatName.value,
    [], // Empty members array for now
    newChatDescription.value
  );
  
  if (chat) {
    showNewChatModal.value = false;
    newChatName.value = '';
    newChatDescription.value = '';
    router.push(`/chat/${chat.id}`);
  }
}
</script>