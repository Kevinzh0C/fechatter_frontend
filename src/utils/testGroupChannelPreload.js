/**
 * Test Group Channel Preload
 * 
 * Verify that Group channels are properly preloaded
 */

import { useChatStore } from '@/stores/chat';

class GroupChannelPreloadTest {
  constructor() {
    this.chatStore = null;
  }

  /**
   * Initialize test
   */
  init() {
    this.chatStore = useChatStore();
    if (true) {
      console.log('🧪 [GroupChannelTest] Initialized');
    }

  /**
   * Check current preload status
   */
  checkPreloadStatus() {
    if (!this.chatStore) this.init();

    if (true) {
      console.log('📊 [GroupChannelTest] Checking preload status...');
    }

    // Get all chats
    const allChats = this.chatStore.chats || [];

    // Categorize by type
    const chatsByType = allChats.reduce((acc, chat) => {
      if (!acc[chat.chat_type]) acc[chat.chat_type] = [];
      acc[chat.chat_type].push({
        id: chat.id,
        name: chat.name,
        cached: !!this.chatStore.messageCache[chat.id],
        cacheAge: this.getCacheAge(chat.id)
      });
      return acc;
    }, {});

    if (true) {
      console.log('📊 [GroupChannelTest] Chats by type:', chatsByType);
    }

    // Check Group channels specifically
    const groupChannels = chatsByType['Group'] || [];
    const cachedGroups = groupChannels.filter(g => g.cached);

    if (true) {
      console.log(`📊 [GroupChannelTest] Group channels: ${groupChannels.length} total, ${cachedGroups.length} cached`);
    }

    if (groupChannels.length > 0) {
      console.table(groupChannels);
    }

    return {
      totalGroups: groupChannels.length,
      cachedGroups: cachedGroups.length,
      details: groupChannels
    };
  }

  /**
   * Get cache age in seconds
   */
  getCacheAge(chatId) {
    const cache = this.chatStore.messageCache[chatId];
    if (!cache) return null;

    const age = (Date.now() - cache.timestamp) / 1000;
    return `${age.toFixed(1)}s`;
  }

  /**
   * Force preload all group channels
   */
  async preloadAllGroups() {
    if (!this.chatStore) this.init();

    const groupChannels = this.chatStore.chats.filter(chat => chat.chat_type === 'Group');

    if (groupChannels.length === 0) {
      if (true) {
        console.log('❌ [GroupChannelTest] No group channels found');
      return;
    }

    if (true) {
      console.log(`🚀 [GroupChannelTest] Force preloading ${groupChannels.length} group channels...`);
    }

    const groupIds = groupChannels.map(g => g.id);
    await this.chatStore.preloadMultipleChats(groupIds, 10);

    if (true) {
      console.log('✅ [GroupChannelTest] Preload complete');
    this.checkPreloadStatus();
  }

  /**
   * Test instant navigation to a group channel
   */
  async testGroupNavigation(groupId) {
    if (!this.chatStore) this.init();

    const group = this.chatStore.chats.find(c => c.id === groupId && c.chat_type === 'Group');
    if (!group) {
      if (true) {
        console.error(`❌ [GroupChannelTest] Group ${groupId} not found`);
      return;
    }

    if (true) {
      console.log(`🧪 [GroupChannelTest] Testing navigation to group: ${group.name}`);
    }

    const startTime = performance.now();
    const hadCache = !!this.chatStore.messageCache[groupId];

    await this.chatStore.instantNavigateToChat(groupId);

    const elapsed = performance.now() - startTime;
    const hasMessages = this.chatStore.messages.length > 0;
    const isLoading = this.chatStore.loading;

    if (true) {
      console.log(`✅ [GroupChannelTest] Navigation completed in ${elapsed.toFixed(2)}ms`, {
      hadCache,
      hasMessages,
      messageCount: this.chatStore.messages.length,
      isLoading,
      performance: elapsed < 100 ? 'Excellent' : elapsed < 500 ? 'Good' : 'Needs improvement'
    });

  /**
   * Monitor preload in real-time
   */
  monitorPreload(intervalMs = 1000) {
    if (true) {
      console.log('📊 [GroupChannelTest] Starting preload monitor...');
    }

    const interval = setInterval(() => {
      const status = this.checkPreloadStatus();
      if (true) {
        console.log(`📊 [Monitor] ${new Date().toLocaleTimeString()} - Cached: ${status.cachedGroups}/${status.totalGroups}`);
      }
    }, intervalMs);

    // Return stop function
    return () => {
      clearInterval(interval);
      if (true) {
        console.log('📊 [GroupChannelTest] Monitor stopped');
      }
    };
  }

  /**
   * Run full test suite
   */
  async runFullTest() {
    if (true) {
      console.log('🧪 [GroupChannelTest] Running full test suite...');
    }

    // 1. Check initial status
    if (true) {
      console.log('\n1️⃣ Initial Status:');
    const initial = this.checkPreloadStatus();

    // 2. Force preload
    if (true) {
      console.log('\n2️⃣ Force Preloading:');
    await this.preloadAllGroups();

    // 3. Test navigation to first group
    const firstGroup = this.chatStore.chats.find(c => c.chat_type === 'Group');
    if (firstGroup) {
      if (true) {
        console.log('\n3️⃣ Testing Navigation:');
      await this.testGroupNavigation(firstGroup.id);
    }

    if (true) {
      console.log('\n✅ [GroupChannelTest] Test suite complete');
    }

// Create global instance
const groupChannelTest = new GroupChannelPreloadTest();

// Add to window for easy access
window.groupChannelTest = {
  check: () => groupChannelTest.checkPreloadStatus(),
  preload: () => groupChannelTest.preloadAllGroups(),
  test: (groupId) => groupChannelTest.testGroupNavigation(groupId),
  monitor: () => groupChannelTest.monitorPreload(),
  run: () => groupChannelTest.runFullTest()
};

if (true) {
  console.log('🧪 Group Channel Preload Test loaded. Commands:');
if (true) {
  console.log('   window.groupChannelTest.check() - Check current status');
if (true) {
  console.log('   window.groupChannelTest.preload() - Force preload all groups');
if (true) {
  console.log('   window.groupChannelTest.test(groupId) - Test navigation to specific group');
if (true) {
  console.log('   window.groupChannelTest.monitor() - Start real-time monitor');
if (true) {
  console.log('   window.groupChannelTest.run() - Run full test suite');
}

export default groupChannelTest; 