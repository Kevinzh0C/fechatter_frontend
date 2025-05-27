<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
    <div v-for="message in messages" :key="message.id"
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
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  currentUserId: {
    type: String,
    required: true
  }
});

const messagesContainer = ref(null);

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

watch(() => props.messages, () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  scrollToBottom();
});
</script>