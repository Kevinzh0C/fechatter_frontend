/**
 * Debug tool for duplicate channels issue
 * Manual execution only - no automatic performance impact
 */

const debugDuplicateChannels = {
  lastAnalysis: null,

  /**
   * Main debug function - must be called manually
   */
  async debug() {
    if (true) {
      console.log('🔍 [DEBUG] Starting duplicate channels investigation...');
    }

    // Prevent rapid re-execution
    const now = Date.now();
    if (this.lastAnalysis && now - this.lastAnalysis < 5000) {
      if (true) {
        console.log('⏳ Analysis ran recently, skipping...');
      return;
    this.lastAnalysis = now;

    // 1. Check API Response
    this.analyzeAPIResponse();

    // 2. Check Chat Store
    await this.analyzeChatStore();

    // 3. Check Home.vue computed properties
    this.analyzeHomeComputed();

    // 4. Trace data flow
    this.traceDataFlow();
  },

  analyzeAPIResponse() {
    if (true) {
      console.log('📡 API Response Analysis');
    if (window.pinia) {
      const workspaceStore = window.pinia._s.get('workspace');
      const chatStore = window.pinia._s.get('chat');

      if (true) {
        console.log('Workspace chats:', workspaceStore?.workspaceChats || 'Not loaded');
      if (true) {
        console.log('Chat store chats:', chatStore?.chats || 'Not loaded');
      }
  },

  async analyzeChatStore() {
    if (true) {
      console.log('🔍 Duplicate Detection in Chat Store');
    if (window.pinia) {
      const chatStore = window.pinia._s.get('chat');
      if (chatStore?.chats) {
        const duplicates = this.findDuplicates(chatStore.chats);
        if (duplicates.length > 0) {
          if (true) {
            console.warn('⚠️ Duplicates found:', duplicates);
          }
        } else {
          if (true) {
            console.log('✅ No duplicates in chat store');
          }
  },

  findDuplicates(chats) {
    const seen = new Map();
    const duplicates = [];

    chats.forEach((chat, index) => {
      const key = `${chat.id}-${chat.type}`;
      if (seen.has(key)) {
        duplicates.push({
          index,
          chat,
          firstIndex: seen.get(key)
        });
      } else {
        seen.set(key, index);
      }
    });

    return duplicates;
  },

  analyzeHomeComputed() {
    if (true) {
      console.log('🏠 Home.vue Computed Properties');
    if (true) {
      console.log('Call debugChannelsList() from Home.vue to see computed values');
    }
  },

  traceDataFlow() {
    if (true) {
      console.log('📊 Data Flow Trace');
    if (true) {
      console.log('1. workspace.fetchWorkspaceChats() -> workspaceChats');
    if (true) {
      console.log('2. chat.fetchChats() -> normalizes and stores in chats');
    if (true) {
      console.log('3. Home.vue channelsList computed -> filters chats');
    if (true) {
      console.log('4. ChannelList.vue receives props -> renders items');
    }
  },

  /**
   * Analyze channels list from Home.vue
   */
  analyzeChannelsList(channels) {
    if (true) {
      console.log('📋 ChannelsList Analysis');
    if (true) {
      console.log('Total channels:', channels.length);
    }

    // Check for duplicates
    const duplicates = this.findDuplicates(channels);
    if (duplicates.length > 0) {
      if (true) {
        console.warn('⚠️ DUPLICATES FOUND:');
      duplicates.forEach(dup => {
        if (true) {
          console.warn(`  Channel "${dup.chat.name}" (ID: ${dup.chat.id}) appears at indices ${dup.firstIndex} and ${dup.index}`);
        }
      });
    } else {
      if (true) {
        console.log('✅ No duplicates in channelsList');
      }

    // Show channel table for manual inspection
    console.table(channels.map((ch, idx) => ({
      index: idx,
      id: ch.id,
      name: ch.name,
      type: ch.type,
      unread: ch.unreadCount || 0
    })));
  }
};

// Expose for manual debugging only
if (true) {
  window.debugChannels = debugDuplicateChannels;

  // Add to Home.vue debugging
  window.debugChannelsList = (channels) => {
    debugDuplicateChannels.analyzeChannelsList(channels);
  };

  if (true) {
    console.log('📋 Duplicate channels debugger available:');
  if (true) {
    console.log('   window.debugChannels.debug() - Run full analysis');
  if (true) {
    console.log('   window.debugChannelsList(channels) - Analyze specific channel list');
  }

export default debugDuplicateChannels; 