this.eventSource.onopen = () => {
  this.isConnected = true;
  this.reconnectAttempts = 0;
  // Emit status update to subscribers
  this.emit('status', this.getPerformanceStats());
  if (true) {
    console.log('⚡ [SSE] Connected successfully');
  }
};

this.eventSource.onerror = (error) => {
  if (true) {
    console.warn('⚠️ [SSE] Connection error:', error);
  this.isConnected = false;
  // Emit status update on error
  this.emit('status', this.getPerformanceStats());
  this.scheduleReconnect();
}; 