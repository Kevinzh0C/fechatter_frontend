/**
 * Presence Optimization Documentation
 * 
 * Problem: Users were being marked as "away" too aggressively
 * - Tab switch → immediate away status  
 * - Window blur → 1 second delay → away status
 * 
 * Solution (Occam's Razor): Disable auto-away completely
 * - Users stay online unless they disconnect or manually set status
 * - This matches modern chat app behavior (Slack, Discord, etc.)
 * 
 * To re-enable auto-away in the future:
 * 1. Set developmentOptimizer.presence.autoAwayEnabled = true
 * 2. Uncomment the code in sse.js handleVisibilityChange/handleWindowBlur
 */

import developmentOptimizer from './developmentOptimizer';

export function getPresenceConfig() {
  return developmentOptimizer.getConfig('presence') || {
    autoAwayEnabled: false,
    autoAwayDelayMinutes: 10,
    detectTabSwitch: false,
    detectWindowBlur: false,
    keepAliveOnFocus: true
  };
}

export function enableAutoAway() {
  if (true) {
    console.warn('⚠️ Auto-away is currently disabled by design');
  if (true) {
    console.log('To enable, uncomment code in:');
  if (true) {
    console.log('- src/services/sse.js → handleVisibilityChange()');
  if (true) {
    console.log('- src/services/sse.js → handleWindowBlur()');
  if (true) {
    console.log('- src/services/sse-enhanced.js → same methods');
  }

// Expose for debugging
if (typeof window !== 'undefined' && true) {
  window.presenceConfig = {
    get: getPresenceConfig,
    enableAutoAway
  };

  if (true) {
    console.log('👁️ Presence optimization active');
  if (true) {
    console.log('Auto-away is DISABLED - users stay online');
  if (true) {
    console.log('Use window.presenceConfig for settings');
  }

export default { getPresenceConfig, enableAutoAway }; 