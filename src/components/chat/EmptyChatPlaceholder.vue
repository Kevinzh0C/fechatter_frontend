<template>
  <div class="empty-chat-placeholder">
    <div class="placeholder-content">
      <div v-if="chatType === 'PublicChannel' || chatType === 'PrivateChannel'" class="visual-element channel">#</div>
      <div v-else-if="chatType === 'Single' && otherUser" class="visual-element dm">
        <img :src="otherUser.avatar_url || '/default-avatar.svg'" :alt="otherUser.username" class="user-avatar" @error="onAvatarError" />
      </div>

      <h2 class="heading">
        <template v-if="chatType === 'PublicChannel' || chatType === 'PrivateChannel'">
          Welcome to #{{ chatName }}!
        </template>
        <template v-else-if="chatType === 'Single' && otherUser">
          {{ otherUser.username }}
        </template>
        <template v-else>
          This chat is empty
        </template>
      </h2>

      <p class="description">
        <template v-if="chatType === 'PublicChannel'">
          This is the start of the <strong>#{{ chatName }}</strong> channel. Messages and files sent here will be visible to everyone in the channel.
        </template>
        <template v-else-if="chatType === 'PrivateChannel'">
          This is the beginning of the private <strong>#{{ chatName }}</strong> channel. Only invited members can see its history.
        </template>
        <template v-else-if="chatType === 'Single' && otherUser">
          This is the beginning of your direct message history with <strong>@{{ otherUser.username }}</strong>. Messages and files sent here are private to just the two of you.
        </template>
        <template v-else>
          There are no messages here yet.
        </template>
      </p>

      <p class="call-to-action">
        <template v-if="chatType === 'PublicChannel' || chatType === 'PrivateChannel'">
          Be the first to break the ice!
        </template>
        <template v-else-if="chatType === 'Single'">
          Go on, say hello!
        </template>
        <template v-else>
          Start the conversation.
        </template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  chatId: {
    type: [Number, String],
    required: true
  }
});

const chatStore = useChatStore();
const userStore = useUserStore();

const currentChat = computed(() => chatStore.getChatById(props.chatId));
const chatType = computed(() => currentChat.value?.chat_type);
const chatName = computed(() => currentChat.value?.name || 'channel');

const otherUser = computed(() => {
  if (chatType.value !== 'Single' || !currentChat.value?.members) {
    return null;
  }
  const otherMember = currentChat.value.members.find(id => id !== userStore.currentUser?.id);
  return otherMember ? userStore.getUserById(otherMember) : null;
});

const onAvatarError = (event) => {
  event.target.src = '/default-avatar.svg';
};
</script>

<style scoped>
.empty-chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px;
  user-select: none;
  background-color: var(--color-background);
}

.placeholder-content {
  max-width: 480px;
}

.visual-element {
  margin-bottom: 24px;
}

.visual-element.channel {
  font-size: 5rem;
  font-weight: bold;
  color: var(--color-text-muted);
  line-height: 1;
}

.visual-element.dm .user-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  margin: 0 auto;
  opacity: 0.6;
  border: 4px solid var(--color-border);
}

.heading {
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.description {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 auto 16px auto;
  max-width: 440px;
}

.description strong {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.call-to-action {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--color-text-muted);
}
</style>
