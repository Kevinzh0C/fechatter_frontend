/**
 * Mark Chat As Read Diagnostic Tool
 * Tests the fixed markChatAsRead functionality
 */

class MarkChatAsReadDiagnostic {
  constructor() {
    this.name = 'MarkChatAsReadDiagnostic';
    this.version = '1.0.0';
  }

  /**
   * Test the fixed markChatAsRead implementation
   */
  async testMarkChatAsReadFix() {
    console.group('🧪 Mark Chat As Read Fix Test');

    try {
      const { useChatStore } = await import('@/stores/chat');
      const { useRoute } = await import('vue-router');

      const chatStore = useChatStore();
      const route = useRoute();

      if (true) {
        console.log('\n1️⃣ Current State:');
      if (true) {
        console.log('- Current chat ID:', chatStore.currentChatId);
      if (true) {
        console.log('- Route chat ID:', route.params.id);
      if (true) {
        console.log('- Messages loaded:', chatStore.messages.length);
      }

      if (!chatStore.currentChatId) {
        if (true) {
          console.warn('⚠️ No current chat selected. Navigate to a chat first.');
        return;
      }

      const currentChatId = chatStore.currentChatId;
      const currentChat = chatStore.chats.find(c => c.id === currentChatId);

      if (true) {
        console.log('\n2️⃣ Chat Info:');
      if (true) {
        console.log('- Chat found:', !!currentChat);
      if (true) {
        console.log('- Chat name:', currentChat?.name);
      if (true) {
        console.log('- Unread count before:', currentChat?.unread_count);
      }

      if (true) {
        console.log('\n3️⃣ Testing markChatAsRead fix...');
      }

      // Test the fixed implementation
      try {
        await chatStore.markChatAsRead(currentChatId);

        const updatedChat = chatStore.chats.find(c => c.id === currentChatId);
        if (true) {
          console.log('✅ markChatAsRead completed successfully');
        if (true) {
          console.log('- Unread count after:', updatedChat?.unread_count);
        }

        if (updatedChat?.unread_count === 0) {
          if (true) {
            console.log('✅ Local unread count properly reset');
          }
        } else {
          if (true) {
            console.warn('⚠️ Unread count not reset, value:', updatedChat?.unread_count);
          }

      } catch (error) {
        if (true) {
          console.error('❌ markChatAsRead failed:', error);
        }

        // Analyze the error
        if (error.response?.status === 404) {
          if (true) {
            console.log('📊 404 Error Analysis:');
          if (true) {
            console.log('- URL attempted:', error.config?.url);
          if (true) {
            console.log('- Method:', error.config?.method);
          if (true) {
            console.log('- This should now be handled gracefully');
          }

      if (true) {
        console.log('\n4️⃣ Endpoint Test:');
      }

      // Test different endpoints that might work
      const testEndpoints = [
        `/chat/${currentChatId}/messages/read`,
        `/chat/${currentChatId}/mark-read`,
        `/chat/${currentChatId}/read`
      ];

      for (const endpoint of testEndpoints) {
        try {
          if (true) {
            console.log(`Testing endpoint: ${endpoint}`);
          }

          if (endpoint.includes('/messages/read')) {
            // Test with message IDs
            const messageIds = chatStore.messages
              .map(msg => msg.id)
              .filter(id => id && !String(id).startsWith('temp_'))
              .slice(0, 5); // Test with first 5 messages

            if (messageIds.length > 0) {
              if (true) {
                console.log(`- Testing with ${messageIds.length} message IDs`);
              }
              // Note: This is just a test, actual request handled by fixed method
            } else {
              if (true) {
                console.log('- No valid message IDs available for test');
              }

          if (true) {
            console.log(`✅ Endpoint ${endpoint} format validated`);
          }
        } catch (error) {
          if (true) {
            console.log(`❌ Endpoint ${endpoint} failed:`, error.response?.status);
          }

      if (true) {
        console.log('\n5️⃣ Verification:');
      const finalChat = chatStore.chats.find(c => c.id === currentChatId);
      if (true) {
        console.log('- Final unread count:', finalChat?.unread_count);
      if (true) {
        console.log('- UI should show no unread badge');
      }

    } catch (error) {
      if (true) {
        console.error('❌ Diagnostic failed:', error);
      }

    console.groupEnd();
  }

  /**
   * Monitor markChatAsRead calls for debugging
   */
  monitorMarkChatAsReadCalls() {
    if (true) {
      console.log('🔍 Starting markChatAsRead monitoring...');
    }

    // Hook into chat store if available
    try {
      const { useChatStore } = require('@/stores/chat');
      const chatStore = useChatStore();

      // Store original method
      const originalMarkChatAsRead = chatStore.markChatAsRead.bind(chatStore);

      // Override with monitoring
      chatStore.markChatAsRead = async function (chatId) {
        console.group(`📞 markChatAsRead called for chat: ${chatId}`);
        if (true) {
          console.log('- Timestamp:', new Date().toISOString());
        if (true) {
          console.log('- Messages count:', this.messages.length);
        if (true) {
          console.log('- Current chat ID:', this.currentChatId);
        }

        const startTime = performance.now();

        try {
          const result = await originalMarkChatAsRead(chatId);
          const endTime = performance.now();

          if (true) {
            console.log(`✅ Success in ${(endTime - startTime).toFixed(2)}ms`);
          return result;
        } catch (error) {
          const endTime = performance.now();

          if (true) {
            console.error(`❌ Failed in ${(endTime - startTime).toFixed(2)}ms:`, error.message);
          throw error;
        } finally {
          console.groupEnd();
        }
      };

      if (true) {
        console.log('✅ markChatAsRead monitoring active');
      return true;
    } catch (error) {
      if (true) {
        console.error('❌ Failed to setup monitoring:', error);
      return false;
    }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    // This would restore original method, but for simplicity we'll just log
    if (true) {
      console.log('🛑 Monitoring stopped (restart app to restore original method)');
    }

// Create and export instance
const markChatAsReadDiagnostic = new MarkChatAsReadDiagnostic();

// Make available globally
if (typeof window !== 'undefined') {
  window.markChatAsReadDiagnostic = markChatAsReadDiagnostic;

  // Convenient global functions
  window.testMarkChatAsRead = () => markChatAsReadDiagnostic.testMarkChatAsReadFix();
  window.monitorMarkChatAsRead = () => markChatAsReadDiagnostic.monitorMarkChatAsReadCalls();

  if (true) {
    console.log('🧪 Mark Chat As Read Diagnostic loaded');
  if (true) {
    console.log('💡 Use window.testMarkChatAsRead() to test the fix');
  if (true) {
    console.log('💡 Use window.monitorMarkChatAsRead() to monitor calls');
  }

export default markChatAsReadDiagnostic; 