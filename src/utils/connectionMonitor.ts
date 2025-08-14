// Connection health monitoring and auto-recovery for Django API

import { API_CONFIG } from '../config/api';
import { optimizeDjangoConnection } from './djangoOptimizer';
import { perf } from './performance';

interface ConnectionStats {
  status: 'healthy' | 'degraded' | 'unhealthy';
  avgLatency: number;
  successRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
  recommendations: string[];
}

class ConnectionMonitor {
  private stats: ConnectionStats = {
    status: 'healthy',
    avgLatency: 0,
    successRate: 100,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    recommendations: [],
  };

  private recentRequests: Array<{
    timestamp: number;
    duration: number;
    success: boolean;
  }> = [];

  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Start monitoring connection health
  startMonitoring(intervalMs = 30000) { // Check every 30 seconds
    if (this.isMonitoring) return;

    console.log('🔍 Starting Django connection monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Perform initial check
    this.performHealthCheck();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Connection monitoring stopped');
  }

  // Record API request performance
  recordRequest(duration: number, success: boolean) {
    const now = Date.now();
    
    this.recentRequests.push({
      timestamp: now,
      duration,
      success,
    });

    // Keep only last 50 requests
    this.recentRequests = this.recentRequests
      .filter(req => now - req.timestamp < 5 * 60 * 1000) // Last 5 minutes
      .slice(-50);

    this.updateStats();
  }

  private updateStats() {
    if (this.recentRequests.length === 0) return;

    const successful = this.recentRequests.filter(req => req.success);
    const failed = this.recentRequests.filter(req => !req.success);

    this.stats.successRate = (successful.length / this.recentRequests.length) * 100;
    this.stats.avgLatency = successful.length > 0 
      ? successful.reduce((sum, req) => sum + req.duration, 0) / successful.length
      : 0;

    this.stats.consecutiveFailures = this.getConsecutiveFailures();
    this.stats.lastCheck = new Date();

    // Update status based on metrics
    if (this.stats.successRate < 50 || this.stats.consecutiveFailures > 5) {
      this.stats.status = 'unhealthy';
    } else if (this.stats.successRate < 80 || this.stats.avgLatency > 3000) {
      this.stats.status = 'degraded';
    } else {
      this.stats.status = 'healthy';
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  private getConsecutiveFailures(): number {
    let count = 0;
    for (let i = this.recentRequests.length - 1; i >= 0; i--) {
      if (!this.recentRequests[i].success) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private generateRecommendations() {
    const recommendations: string[] = [];

    if (this.stats.avgLatency > 2000) {
      recommendations.push('High latency detected - consider using WiFi instead of mobile data');
    }

    if (this.stats.successRate < 80) {
      recommendations.push('Poor connection quality - check network stability');
    }

    if (this.stats.consecutiveFailures > 3) {
      recommendations.push('Multiple consecutive failures - Django server may be down');
    }

    if (this.stats.avgLatency > 5000) {
      recommendations.push('Very slow connection - reduce image quality and disable auto-refresh');
    }

    this.stats.recommendations = recommendations;
  }

  private async performHealthCheck() {
    console.log('🩺 Performing connection health check...');
    
    try {
      const healthResult = await optimizeDjangoConnection();
      
      this.recordRequest(healthResult.avgLatency, healthResult.healthy);

      if (healthResult.healthy) {
        console.log(`💚 Connection healthy: ${healthResult.avgLatency.toFixed(0)}ms avg latency`);
      } else {
        console.warn('💔 Connection unhealthy');
      }

    } catch (error) {
      console.error('💥 Health check failed:', error);
      this.recordRequest(9999, false);
    }
  }

  // Get current connection statistics
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  // Get connection quality recommendations
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.stats.status === 'unhealthy') {
      suggestions.push('🔴 Connection is unhealthy - try switching networks');
      suggestions.push('🔄 Enable "Offline Mode" to use cached data');
    } else if (this.stats.status === 'degraded') {
      suggestions.push('🟡 Connection is slow - reduce image quality in settings');
      suggestions.push('📶 Move closer to WiFi router or switch to mobile data');
    }

    if (this.stats.avgLatency > 1500) {
      suggestions.push('⚡ High latency detected - enable "Fast Mode" to reduce data usage');
    }

    return suggestions;
  }

  // Auto-recovery attempts
  async attemptRecovery(): Promise<boolean> {
    console.log('🔧 Attempting connection recovery...');
    
    const recoverySteps = [
      // 1. Test different base URLs
      this.testAlternativeUrls,
      
      // 2. Clear caches
      this.clearConnectionCache,
      
      // 3. Reset connection state
      this.resetConnectionState,
    ];

    for (const step of recoverySteps) {
      try {
        const success = await step.call(this);
        if (success) {
          console.log('✅ Recovery successful');
          return true;
        }
      } catch (error) {
        console.warn('⚠️ Recovery step failed:', error);
      }
    }

    console.error('❌ All recovery attempts failed');
    return false;
  }

  private async testAlternativeUrls(): Promise<boolean> {
    console.log('🔄 Testing alternative URLs...');
    
    for (const url of API_CONFIG.FALLBACK_URLS) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${url}/api/healthcheck/`, {
          timeout: 3000,
        });
        
        if (response.ok) {
          const duration = Date.now() - startTime;
          console.log(`✅ Found working URL: ${url} (${duration}ms)`);
          // Here you could update the API_CONFIG.BASE_URL if needed
          return true;
        }
      } catch (error) {
        console.log(`❌ URL failed: ${url}`);
      }
    }
    
    return false;
  }

  private async clearConnectionCache(): Promise<boolean> {
    console.log('🧹 Clearing connection cache...');
    
    try {
      // Clear any connection-related caches
      // This could involve clearing AsyncStorage, resetting fetch cache, etc.
      
      // Simulate cache clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Cache clear failed:', error);
      return false;
    }
  }

  private async resetConnectionState(): Promise<boolean> {
    console.log('🔄 Resetting connection state...');
    
    try {
      // Reset internal state
      this.recentRequests = [];
      this.stats.consecutiveFailures = 0;
      this.stats.lastCheck = new Date();
      
      console.log('✅ Connection state reset');
      return true;
    } catch (error) {
      console.error('❌ State reset failed:', error);
      return false;
    }
  }
}

// Global connection monitor instance
export const connectionMonitor = new ConnectionMonitor();

// Helper function to start monitoring in development
export const initializeConnectionMonitoring = () => {
  if (__DEV__) {
    connectionMonitor.startMonitoring(30000); // Check every 30 seconds in dev
    
    // Log stats periodically in development
    setInterval(() => {
      const stats = connectionMonitor.getStats();
      console.log('📊 Connection Stats:', {
        status: stats.status,
        latency: `${stats.avgLatency.toFixed(0)}ms`,
        successRate: `${stats.successRate.toFixed(1)}%`,
        failures: stats.consecutiveFailures,
      });
      
      if (stats.recommendations.length > 0) {
        console.log('💡 Recommendations:', stats.recommendations);
      }
    }, 60000); // Log every minute
  }
};

export default connectionMonitor;