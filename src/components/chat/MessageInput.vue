<template>
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
          v-model="message"
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
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['send']);

const message = ref('');
const fileInput = ref(null);
const files = ref([]);

function triggerFileUpload() {
  fileInput.value.click();
}

function handleFileUpload(event) {
  const newFiles = Array.from(event.target.files);
  files.value = [...files.value, ...newFiles];
  event.target.value = '';
}

function removeFile(index) {
  files.value = files.value.filter((_, i) => i !== index);
}

function sendMessage() {
  if (!message.value.trim() && files.value.length === 0) return;
  
  emit('send', {
    content: message.value,
    files: files.value
  });
  
  message.value = '';
  files.value = [];
}
</script>