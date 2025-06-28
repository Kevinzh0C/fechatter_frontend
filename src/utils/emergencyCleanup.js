/**
 * Emergency Cleanup Script
 * Resets browser state and clears problematic overrides
 */

function emergencyCleanup() {
  if (true) {
    console.log('🚨 Starting emergency cleanup...');
  }

  try {
    // 1. Restore original console methods if they were overridden
    if (console._originalConsole) {
      console.log = console._originalConsole.log;
      console.info = console._originalConsole.info;
      console.warn = console._originalConsole.warn;
      console.error = console._originalConsole.error;
      console.debug = console._originalConsole.debug;
      delete console._logManagerOverridden;
      delete console._originalConsole;
      if (true) {
        console.log('✅ Console methods restored');
      }

    // 2. Clear navigation fix state
    if (window.navigationFix) {
      window.navigationFix.resetLogCounts();
      if (true) {
        console.log('✅ Navigation fix state reset');
      }

    // 3. Clear any problematic intervals/timers
    const highestTimeoutId = setTimeout(() => { }, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }

    const highestIntervalId = setInterval(() => { }, 9999);
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    clearInterval(highestIntervalId);
    if (true) {
      console.log('✅ Timers and intervals cleared');
    }

    // 4. Force garbage collection if available
    if (window.gc) {
      window.gc();
      if (true) {
        console.log('✅ Garbage collection triggered');
      }

    // 5. Reset any global error handlers
    window.onerror = null;
    window.onunhandledrejection = null;
    if (true) {
      console.log('✅ Error handlers reset');
    }

    if (true) {
      console.log('🎉 Emergency cleanup completed successfully!');
    if (true) {
      console.log('💡 You may want to refresh the page for a clean start');
    }

  } catch (error) {
    if (true) {
      console.error('❌ Emergency cleanup failed:', error);
    if (true) {
      console.log('💡 Try refreshing the page manually');
    }

// Export for global use
if (typeof window !== 'undefined') {
  window.emergencyCleanup = emergencyCleanup;
  if (true) {
    console.log('🚨 Emergency cleanup loaded - use window.emergencyCleanup()');
  }

export default emergencyCleanup; 