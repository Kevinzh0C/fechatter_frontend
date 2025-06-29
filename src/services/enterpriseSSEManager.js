/**
 * Enterprise SSE Manager
 * 
 * Manages SSE connections for 1000+ users with:
 * - Connection pooling and load balancing
 * - Automatic reconnection and failover
 * - Resource optimization and monitoring
 * - Integration with existing SSE infrastructure
 */

import { ref, reactive } from 'vue'
import { useEnterpriseStore } from '@/stores/enterpriseStore'
import minimalSSE from './sse-minimal'

class EnterpriseSSEManager {
  constructor() {
    // Connection pools organized by load balancing
    this.connectionPools = new Map() // Map<poolId, ConnectionPool>
    this.activeConnections = new Map() // Map<userId, Connection>
    this.connectionQueue = new Set() // Pending connections
    this.failedConnections = new Set() // Failed connections for retry
    
    // Load balancing configuration
    this.maxConnectionsPerPool = 100
    this.maxTotalConnections = 1000
    this.connectionTimeout = 30000 // 30 seconds
    this.reconnectDelay = 5000 // 5 seconds
    this.maxReconnectAttempts = 5
    
    // Performance monitoring
    this.metrics = reactive({
      totalConnections: 0,
      activePools: 0,
      connectionLatency: new Map(),
      throughput: {
        messagesPerSecond: 0,
        eventsPerSecond: 0
      },
      errorRate: 0,
      lastHealthCheck: null
    })
    
    // Health monitoring
    this.healthCheckInterval = null
    this.isInitialized = false
    
    console.log('🏢 [EnterpriseSSE] Enterprise SSE Manager initialized')
  }
  
  /**
   * Initialize enterprise SSE management
   */
  async initialize() {
    if (this.isInitialized) return
    
    try {
      // Create initial connection pools
      await this.createInitialPools()
      
      // Start health monitoring
      this.startHealthMonitoring()
      
      // Setup event listeners for existing SSE infrastructure
      this.setupSSEIntegration()
      
      this.isInitialized = true
      console.log('✅ [EnterpriseSSE] Enterprise SSE Manager ready')
      
    } catch (error) {
      console.error('❌ [EnterpriseSSE] Failed to initialize:', error)
      throw error
    }
  }
  
  /**
   * Create initial connection pools for load balancing
   */
  async createInitialPools() {
    const initialPoolCount = 5 // Start with 5 pools
    
    for (let i = 0; i < initialPoolCount; i++) {
      const poolId = `pool_${i}`
      const pool = new ConnectionPool(poolId, this.maxConnectionsPerPool)
      this.connectionPools.set(poolId, pool)
    }
    
    this.metrics.activePools = this.connectionPools.size
    console.log(`🏢 [EnterpriseSSE] Created ${initialPoolCount} connection pools`)
  }
  
  /**
   * Get optimal connection pool for new connection
   */
  getOptimalPool() {
    let optimalPool = null
    let minLoad = Infinity
    
    for (const [poolId, pool] of this.connectionPools) {
      const load = pool.getLoadPercentage()
      if (load < minLoad && !pool.isAtCapacity()) {
        minLoad = load
        optimalPool = pool
      }
    }
    
    // Create new pool if all are at capacity
    if (!optimalPool && this.connectionPools.size < 20) { // Max 20 pools
      const newPoolId = `pool_${this.connectionPools.size}`
      optimalPool = new ConnectionPool(newPoolId, this.maxConnectionsPerPool)
      this.connectionPools.set(newPoolId, optimalPool)
      this.metrics.activePools = this.connectionPools.size
      
      console.log(`🏢 [EnterpriseSSE] Created new pool: ${newPoolId}`)
    }
    
    return optimalPool
  }
  
  /**
   * Acquire SSE connection for user
   */
  async acquireConnection(userId, options = {}) {
    try {
      // Check if user already has a connection
      if (this.activeConnections.has(userId)) {
        const existingConnection = this.activeConnections.get(userId)
        if (existingConnection.isHealthy()) {
          return existingConnection
        } else {
          // Close unhealthy connection
          await this.releaseConnection(userId)
        }
      }
      
      // Check global connection limit
      if (this.activeConnections.size >= this.maxTotalConnections) {
        throw new Error('Global connection limit reached')
      }
      
      // Add to queue
      this.connectionQueue.add(userId)
      
      // Get optimal pool
      const pool = this.getOptimalPool()
      if (!pool) {
        throw new Error('No available connection pools')
      }
      
      // Create connection
      const connection = await this.createConnection(userId, pool, options)
      
      // Register connection
      this.activeConnections.set(userId, connection)
      pool.addConnection(connection)
      this.connectionQueue.delete(userId)
      this.failedConnections.delete(userId)
      
      // Update metrics
      this.metrics.totalConnections = this.activeConnections.size
      
      console.log(`🔗 [EnterpriseSSE] Connection acquired for user ${userId} in ${pool.id}`)
      
      return connection
      
    } catch (error) {
      this.connectionQueue.delete(userId)
      this.failedConnections.add(userId)
      console.error(`❌ [EnterpriseSSE] Failed to acquire connection for user ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Create individual SSE connection
   */
  async createConnection(userId, pool, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      // Create connection using existing SSE infrastructure
      const connection = new EnterpriseSSEConnection(userId, pool.id, {
        url: options.url || `/events?user_id=${userId}`,
        timeout: this.connectionTimeout,
        ...options
      })
      
      // Setup connection event handlers
      connection.onOpen = () => {
        const latency = Date.now() - startTime
        this.metrics.connectionLatency.set(userId, latency)
        
        console.log(`✅ [EnterpriseSSE] Connection opened for user ${userId} (${latency}ms)`)
        resolve(connection)
      }
      
      connection.onError = (error) => {
        console.error(`❌ [EnterpriseSSE] Connection error for user ${userId}:`, error)
        reject(error)
      }
      
      connection.onMessage = (data) => {
        this.handleMessage(userId, data, connection)
      }
      
      // Start connection
      connection.connect()
      
      // Timeout handling
      setTimeout(() => {
        if (!connection.isConnected()) {
          connection.close()
          reject(new Error('Connection timeout'))
        }
      }, this.connectionTimeout)
    })
  }
  
  /**
   * Release connection for user
   */
  async releaseConnection(userId) {
    const connection = this.activeConnections.get(userId)
    if (!connection) return
    
    try {
      // Remove from pool
      const pool = this.connectionPools.get(connection.poolId)
      if (pool) {
        pool.removeConnection(connection)
      }
      
      // Close connection
      await connection.close()
      
      // Remove from active connections
      this.activeConnections.delete(userId)
      this.metrics.connectionLatency.delete(userId)
      
      // Update metrics
      this.metrics.totalConnections = this.activeConnections.size
      
      console.log(`🔗 [EnterpriseSSE] Connection released for user ${userId}`)
      
    } catch (error) {
      console.error(`❌ [EnterpriseSSE] Failed to release connection for user ${userId}:`, error)
    }
  }
  
  /**
   * Handle incoming SSE message
   */
  handleMessage(userId, data, connection) {
    try {
      // Update connection activity
      connection.updateActivity()
      
      // Forward to existing SSE infrastructure
      minimalSSE.emit('message', {
        ...data,
        userId,
        poolId: connection.poolId,
        timestamp: Date.now()
      })
      
      // Update throughput metrics
      this.updateThroughputMetrics()
      
    } catch (error) {
      console.error(`❌ [EnterpriseSSE] Failed to handle message for user ${userId}:`, error)
      this.metrics.errorRate++
    }
  }
  
  /**
   * Setup integration with existing SSE infrastructure
   */
  setupSSEIntegration() {
    // Enhance existing minimalSSE with enterprise features
    const originalConnect = minimalSSE.connect.bind(minimalSSE)
    const originalDisconnect = minimalSSE.disconnect.bind(minimalSSE)
    
    // Override connect method
    minimalSSE.connect = async (options = {}) => {
      const userId = options.userId || this.getCurrentUserId()
      if (userId) {
        try {
          await this.acquireConnection(userId, options)
          return true
        } catch (error) {
          console.warn('🔗 [EnterpriseSSE] Falling back to original SSE connection')
          return originalConnect(options)
        }
      } else {
        return originalConnect(options)
      }
    }
    
    // Override disconnect method
    minimalSSE.disconnect = async () => {
      const userId = this.getCurrentUserId()
      if (userId && this.activeConnections.has(userId)) {
        await this.releaseConnection(userId)
      } else {
        return originalDisconnect()
      }
    }
    
    console.log('🔗 [EnterpriseSSE] SSE integration setup complete')
  }
  
  /**
   * Start health monitoring for all connections
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // Every 30 seconds
    
    console.log('🏥 [EnterpriseSSE] Health monitoring started')
  }
  
  /**
   * Perform health check on all connections
   */
  async performHealthCheck() {
    const startTime = Date.now()
    let healthyConnections = 0
    let unhealthyConnections = 0
    
    // Check each active connection
    for (const [userId, connection] of this.activeConnections) {
      if (connection.isHealthy()) {
        healthyConnections++
      } else {
        unhealthyConnections++
        
        // Schedule reconnection for unhealthy connections
        this.scheduleReconnection(userId)
      }
    }
    
    // Update metrics
    this.metrics.lastHealthCheck = Date.now()
    this.metrics.totalConnections = this.activeConnections.size
    
    // Clean up empty pools
    this.cleanupEmptyPools()
    
    const checkDuration = Date.now() - startTime
    console.log(`🏥 [EnterpriseSSE] Health check completed in ${checkDuration}ms: ${healthyConnections} healthy, ${unhealthyConnections} unhealthy`)
    
    // Auto-scaling recommendations
    if (unhealthyConnections > healthyConnections * 0.1) { // More than 10% unhealthy
      console.warn('⚠️ [EnterpriseSSE] High number of unhealthy connections detected')
    }
  }
  
  /**
   * Schedule reconnection for failed connection
   */
  async scheduleReconnection(userId) {
    if (this.failedConnections.has(userId)) return // Already scheduled
    
    this.failedConnections.add(userId)
    
    setTimeout(async () => {
      try {
        if (this.activeConnections.has(userId)) {
          await this.releaseConnection(userId)
        }
        
        await this.acquireConnection(userId)
        console.log(`🔄 [EnterpriseSSE] Successfully reconnected user ${userId}`)
        
      } catch (error) {
        console.error(`❌ [EnterpriseSSE] Reconnection failed for user ${userId}:`, error)
      }
    }, this.reconnectDelay)
  }
  
  /**
   * Clean up empty connection pools
   */
  cleanupEmptyPools() {
    for (const [poolId, pool] of this.connectionPools) {
      if (pool.isEmpty() && this.connectionPools.size > 2) { // Keep minimum 2 pools
        this.connectionPools.delete(poolId)
        console.log(`🧹 [EnterpriseSSE] Cleaned up empty pool: ${poolId}`)
      }
    }
    
    this.metrics.activePools = this.connectionPools.size
  }
  
  /**
   * Update throughput metrics
   */
  updateThroughputMetrics() {
    // Simple throughput calculation (can be enhanced)
    this.metrics.throughput.eventsPerSecond++
    
    // Reset counters every minute
    setTimeout(() => {
      this.metrics.throughput.eventsPerSecond = Math.max(0, this.metrics.throughput.eventsPerSecond - 1)
    }, 60000)
  }
  
  /**
   * Get current user ID (integrate with auth system)
   */
  getCurrentUserId() {
    try {
      // Integration with existing auth system
      const authStore = window.__pinia_stores__?.auth?.()
      return authStore?.user?.id || null
    } catch (error) {
      return null
    }
  }
  
  /**
   * Get enterprise SSE statistics
   */
  getStatistics() {
    return {
      connections: {
        total: this.metrics.totalConnections,
        queued: this.connectionQueue.size,
        failed: this.failedConnections.size,
        maxCapacity: this.maxTotalConnections
      },
      pools: {
        active: this.metrics.activePools,
        distribution: Array.from(this.connectionPools.values()).map(pool => ({
          id: pool.id,
          connections: pool.getConnectionCount(),
          load: pool.getLoadPercentage(),
          capacity: pool.maxConnections
        }))
      },
      performance: {
        averageLatency: this.getAverageLatency(),
        throughput: this.metrics.throughput,
        errorRate: this.metrics.errorRate,
        lastHealthCheck: this.metrics.lastHealthCheck
      }
    }
  }
  
  /**
   * Calculate average connection latency
   */
  getAverageLatency() {
    if (this.metrics.connectionLatency.size === 0) return 0
    
    const latencies = Array.from(this.metrics.connectionLatency.values())
    return latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
  }
  
  /**
   * Shutdown enterprise SSE manager
   */
  async shutdown() {
    console.log('🏢 [EnterpriseSSE] Shutting down...')
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Close all connections
    const closePromises = Array.from(this.activeConnections.keys()).map(userId =>
      this.releaseConnection(userId)
    )
    
    await Promise.all(closePromises)
    
    // Clear all data structures
    this.connectionPools.clear()
    this.activeConnections.clear()
    this.connectionQueue.clear()
    this.failedConnections.clear()
    
    this.isInitialized = false
    console.log('✅ [EnterpriseSSE] Shutdown complete')
  }
}

/**
 * Connection Pool Class
 */
class ConnectionPool {
  constructor(id, maxConnections) {
    this.id = id
    this.maxConnections = maxConnections
    this.connections = new Map() // Map<userId, connection>
    this.createdAt = Date.now()
    this.lastActivity = Date.now()
  }
  
  addConnection(connection) {
    this.connections.set(connection.userId, connection)
    this.lastActivity = Date.now()
  }
  
  removeConnection(connection) {
    this.connections.delete(connection.userId)
    this.lastActivity = Date.now()
  }
  
  getConnectionCount() {
    return this.connections.size
  }
  
  getLoadPercentage() {
    return (this.connections.size / this.maxConnections) * 100
  }
  
  isAtCapacity() {
    return this.connections.size >= this.maxConnections
  }
  
  isEmpty() {
    return this.connections.size === 0
  }
  
  getHealthyConnectionCount() {
    return Array.from(this.connections.values())
      .filter(conn => conn.isHealthy()).length
  }
}

/**
 * Enterprise SSE Connection Class
 */
class EnterpriseSSEConnection {
  constructor(userId, poolId, options = {}) {
    this.userId = userId
    this.poolId = poolId
    this.url = options.url
    this.timeout = options.timeout || 30000
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    
    this.eventSource = null
    this.isConnected = false
    this.lastActivity = Date.now()
    this.createdAt = Date.now()
    
    // Event handlers
    this.onOpen = null
    this.onMessage = null
    this.onError = null
    this.onClose = null
  }
  
  connect() {
    try {
      this.eventSource = new EventSource(this.url)
      
      this.eventSource.onopen = (event) => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.updateActivity()
        
        if (this.onOpen) {
          this.onOpen(event)
        }
      }
      
      this.eventSource.onmessage = (event) => {
        this.updateActivity()
        
        if (this.onMessage) {
          try {
            const data = JSON.parse(event.data)
            this.onMessage(data)
          } catch (error) {
            console.error('Failed to parse SSE message:', error)
          }
        }
      }
      
      this.eventSource.onerror = (event) => {
        this.isConnected = false
        
        if (this.onError) {
          this.onError(event)
        }
      }
      
    } catch (error) {
      if (this.onError) {
        this.onError(error)
      }
    }
  }
  
  close() {
    return new Promise((resolve) => {
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      
      this.isConnected = false
      
      if (this.onClose) {
        this.onClose()
      }
      
      resolve()
    })
  }
  
  isHealthy() {
    const now = Date.now()
    const timeSinceActivity = now - this.lastActivity
    const maxInactivity = 5 * 60 * 1000 // 5 minutes
    
    return this.isConnected && timeSinceActivity < maxInactivity
  }
  
  updateActivity() {
    this.lastActivity = Date.now()
  }
  
  getConnectionInfo() {
    return {
      userId: this.userId,
      poolId: this.poolId,
      isConnected: this.isConnected,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.createdAt,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Create and export singleton instance
const enterpriseSSEManager = new EnterpriseSSEManager()

export default enterpriseSSEManager 