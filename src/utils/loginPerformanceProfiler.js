/**
 * Login Performance Profiler
 * Comprehensive performance measurement for login to home page flow
 */

export class LoginPerformanceProfiler {
  constructor() {
    this.metrics = {};
    this.stages = {};
    this.isActive = false;
    this.startTime = null;
    this.thresholds = {
      apiCall: 2000,
      authStore: 100,
      tokenSync: 50,
      routerGuard: 20,
      navigation: 100,
      homeMount: 200,
      dataLoad: 3000,
      total: 5000
    };
  }

  startLogin() {
    this.isActive = true;
    this.startTime = performance.now();
    this.metrics = {
      startTime: this.startTime,
      timestamp: Date.now(),
      stages: {}
    };
    
    this.markStage('login_start', 'Login process initiated');
    console.log('🚀 [LoginProfiler] Performance measurement started');
  }

  markStage(stageName, description = '') {
    if (!this.isActive) return;
    
    const now = performance.now();
    const elapsed = now - this.startTime;
    
    this.metrics.stages[stageName] = {
      timestamp: Date.now(),
      elapsed: Math.round(elapsed),
      description
    };
    
    console.log(`📊 [LoginProfiler] ${stageName}: ${Math.round(elapsed)}ms - ${description}`);
  }

  startApiCall() {
    this.markStage('api_start', 'Starting API authentication call');
  }

  completeApiCall() {
    this.markStage('api_complete', 'API authentication call completed');
  }

  startAuthStoreUpdate() {
    this.markStage('auth_store_start', 'Starting auth store update');
  }

  completeAuthStoreUpdate() {
    this.markStage('auth_store_complete', 'Auth store update completed');
  }

  startTokenSync() {
    this.markStage('token_sync_start', 'Starting token synchronization');
  }

  completeTokenSync() {
    this.markStage('token_sync_complete', 'Token synchronization completed');
  }

  startRouterGuard() {
    this.markStage('router_guard_start', 'Router guard execution started');
  }

  completeRouterGuard() {
    this.markStage('router_guard_complete', 'Router guard execution completed');
  }

  startNavigation() {
    this.markStage('navigation_start', 'Navigation to home page started');
  }

  completeNavigation() {
    this.markStage('navigation_complete', 'Navigation to home page completed');
  }

  startHomeMount() {
    this.markStage('home_mount_start', 'Home component mounting started');
  }

  completeHomeMount() {
    this.markStage('home_mount_complete', 'Home component mounting completed');
  }

  startDataLoad() {
    this.markStage('data_load_start', 'Home page data loading started');
  }

  completeDataLoad() {
    this.markStage('data_load_complete', 'Home page data loading completed');
  }

  completeLogin() {
    if (!this.isActive) return;
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - this.startTime);
    
    this.markStage('login_complete', 'Complete login flow finished');
    this.metrics.totalDuration = totalDuration;
    this.isActive = false;
    
    const report = this.generateReport();
    
    console.log('✅ [LoginProfiler] Login flow completed');
    console.log(`📊 [LoginProfiler] Total duration: ${totalDuration}ms`);
    
    if (totalDuration > this.thresholds.total) {
      console.warn(`⚠️ [LoginProfiler] Slow total login flow: ${totalDuration}ms`);
    }
    
    return report;
  }

  generateReport() {
    const stages = this.metrics.stages;
    const durations = {};
    
    // Calculate stage durations
    if (stages.api_start && stages.api_complete) {
      durations.apiCall = stages.api_complete.elapsed - stages.api_start.elapsed;
    }
    if (stages.auth_store_start && stages.auth_store_complete) {
      durations.authStore = stages.auth_store_complete.elapsed - stages.auth_store_start.elapsed;
    }
    if (stages.token_sync_start && stages.token_sync_complete) {
      durations.tokenSync = stages.token_sync_complete.elapsed - stages.token_sync_start.elapsed;
    }
    if (stages.router_guard_start && stages.router_guard_complete) {
      durations.routerGuard = stages.router_guard_complete.elapsed - stages.router_guard_start.elapsed;
    }
    if (stages.navigation_start && stages.navigation_complete) {
      durations.navigation = stages.navigation_complete.elapsed - stages.navigation_start.elapsed;
    }
    if (stages.home_mount_start && stages.home_mount_complete) {
      durations.homeMount = stages.home_mount_complete.elapsed - stages.home_mount_start.elapsed;
    }
    if (stages.data_load_start && stages.data_load_complete) {
      durations.dataLoad = stages.data_load_complete.elapsed - stages.data_load_start.elapsed;
    }

    return {
      summary: {
        totalDuration: this.metrics.totalDuration,
        startTime: new Date(this.metrics.timestamp).toISOString()
      },
      stages: this.metrics.stages,
      durations,
      thresholds: this.thresholds,
      performanceIssues: this.identifyPerformanceIssues(durations)
    };
  }

  identifyPerformanceIssues(durations) {
    const issues = [];
    
    Object.entries(durations).forEach(([stage, duration]) => {
      const threshold = this.thresholds[stage];
      if (threshold && duration > threshold) {
        issues.push({
          stage,
          duration,
          threshold,
          severity: duration > threshold * 2 ? 'high' : 'medium'
        });
      }
    });
    
    return issues;
  }
}

// Global instance
let globalProfiler = null;

export function getLoginProfiler() {
  if (!globalProfiler) {
    globalProfiler = new LoginPerformanceProfiler();
  }
  return globalProfiler;
}

export function startLoginProfiling() {
  const profiler = getLoginProfiler();
  profiler.startLogin();
  return profiler;
}

export function completeLoginProfiling() {
  if (globalProfiler && globalProfiler.isActive) {
    return globalProfiler.completeLogin();
  }
  return null;
}

export default LoginPerformanceProfiler;
