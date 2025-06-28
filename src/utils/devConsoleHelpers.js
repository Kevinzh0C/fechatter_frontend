/**
 * Developer Console Helpers
 * 
 * Quick utilities for managing the cleaned-up logging system during development
 * Access via window.devHelpers in browser console
 */

class DevConsoleHelpers {
  constructor() {
    // Simplified logging without complex production manager
    this.enabled = true;
  }

  /**
   * Quick log level presets
   */
  quiet() {
    this.enabled = false;
    console.log('🔇 Quiet mode: Logs disabled');
    return this;
  }

  normal() {
    this.enabled = true;
    console.log('📢 Normal mode: Logs enabled');
    return this;
  }

  verbose() {
    this.enabled = true;
    console.log('📣 Verbose mode: All logs enabled');
    return this;
  }

  /**
   * Category management shortcuts
   */
  hideMessageLogs() {
    console.log('🙈 Message-related logs would be hidden (simplified mode)');
    return this;
  }

  showMessageLogs() {
    console.log('👁️ Message-related logs would be enabled (simplified mode)');
    return this;
  }

  hideNavigationLogs() {
    console.log('🙈 Navigation logs would be hidden (simplified mode)');
    return this;
  }

  showNavigationLogs() {
    console.log('👁️ Navigation logs would be enabled (simplified mode)');
    return this;
  }

  /**
   * Quick debugging presets
   */
  debugCleanConsole() {
    console.clear();
    this.enabled = true;
    this.hideMessageLogs();
    console.log('🧹 Clean console mode: Core functionality only');
    return this;
  }

  debugMessageSystem() {
    console.clear();
    this.enabled = true;
    this.showMessageLogs();
    console.log('🛡️ Message system debug mode');
    return this;
  }

  debugPerformance() {
    console.clear();
    this.enabled = true;
    console.log('⚡ Performance mode: Simplified logging');
    return this;
  }

  /**
   * Show current status
   */
  status() {
    console.group('📊 Current Logging Status');
    console.log('Log Level: Simplified');
    console.log('Enabled:', this.enabled);
    console.groupEnd();
    return this;
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.enabled = true;
    console.log('🔄 Reset to default logging state');
    return this;
  }

  /**
   * Show help
   */
  help() {
    console.group('💡 Dev Console Helper Commands (Simplified)');
    console.log('Quick Presets:');
    console.log('  devHelpers.quiet()        - Disable logs');
    console.log('  devHelpers.normal()       - Enable logs');
    console.log('  devHelpers.verbose()      - Enable all logs');
    console.log('');
    console.log('Category Controls:');
    console.log('  devHelpers.hideMessageLogs()    - Hide message system logs');
    console.log('  devHelpers.showMessageLogs()    - Show message system logs');
    console.log('  devHelpers.hideNavigationLogs() - Hide navigation logs');
    console.log('  devHelpers.showNavigationLogs() - Show navigation logs');
    console.log('');
    console.log('Debug Presets:');
    console.log('  devHelpers.debugCleanConsole()  - Clean console mode');
    console.log('  devHelpers.debugMessageSystem() - Focus on message system');
    console.log('  devHelpers.debugPerformance()   - Performance mode');
    console.log('');
    console.log('Utilities:');
    console.log('  devHelpers.status()      - Show current status');
    console.log('  devHelpers.reset()       - Reset to defaults');
    console.log('  devHelpers.help()        - Show this help');
    console.groupEnd();
    return this;
  }
}

export const devConsoleHelpers = new DevConsoleHelpers();

// Make available globally - always enabled, no environment check
window.devHelpers = devConsoleHelpers;

// Auto-show help on first load
setTimeout(() => {
  console.log('💡 Use devHelpers.help() to see available console commands for managing logs');
}, 1000); 