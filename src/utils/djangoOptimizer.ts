// Django-specific API optimizations for faster fetching and rendering

import { API_CONFIG, apiCall } from '../config/api';

// Request priority levels
export enum RequestPriority {
  CRITICAL = 'critical',    // User is waiting (cattle details, beneficiary profile)  
  HIGH = 'high',           // Important but not blocking (images, secondary data)
  NORMAL = 'normal',       // Background requests (preloading, analytics)
  LOW = 'low'             // Nice-to-have (suggestions, cached updates)
}

// Request queue management
class RequestQueue {
  private queues: Map<RequestPriority, Array<() => Promise<any>>> = new Map();
  private processing: Set<RequestPriority> = new Set();
  private maxConcurrent = {
    [RequestPriority.CRITICAL]: 3,
    [RequestPriority.HIGH]: 2, 
    [RequestPriority.NORMAL]: 1,
    [RequestPriority.LOW]: 1
  };

  constructor() {
    Object.values(RequestPriority).forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  async add<T>(
    priority: RequestPriority,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueItem = async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.queues.get(priority)!.push(queueItem);
      this.processQueue(priority);
    });
  }

  private async processQueue(priority: RequestPriority) {
    if (this.processing.has(priority)) return;

    const queue = this.queues.get(priority)!;
    const maxConcurrent = this.maxConcurrent[priority];
    
    if (queue.length === 0) return;

    this.processing.add(priority);

    // Process requests with concurrency limit
    const processingPromises: Promise<any>[] = [];
    
    while (queue.length > 0 && processingPromises.length < maxConcurrent) {
      const requestFn = queue.shift()!;
      processingPromises.push(
        requestFn().finally(() => {
          // Continue processing when request completes
          if (queue.length > 0) {
            setTimeout(() => this.processQueue(priority), 0);
          }
        })
      );
    }

    await Promise.all(processingPromises);
    this.processing.delete(priority);
  }

  getQueueStats() {
    const stats: Record<string, number> = {};
    this.queues.forEach((queue, priority) => {
      stats[priority] = queue.length;
    });
    return stats;
  }
}

// Global request queue instance
const requestQueue = new RequestQueue();

// Django-optimized API call with prioritization
export const djangoApiCall = async <T>(
  endpoint: string,
  priority: RequestPriority = RequestPriority.NORMAL,
  options?: Parameters<typeof apiCall>[1]
): Promise<T> => {
  console.log(`🎯 Queuing ${priority} request: ${endpoint}`);
  
  return requestQueue.add(priority, async () => {
    // Add Django-specific optimizations
    const djangoOptions = {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache', // Force fresh data when needed
        ...options?.headers,
      },
    };

    const result = await apiCall(endpoint, djangoOptions);
    console.log(`✅ Completed ${priority} request: ${endpoint}`);
    return result;
  });
};

// Request deduplication to prevent duplicate API calls
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the same promise
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Start new request
    const promise = requestFn().finally(() => {
      // Clean up after completion
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  getPendingCount() {
    return this.pendingRequests.size;
  }
}

const deduplicator = new RequestDeduplicator();

// Smart Django API caller with deduplication
export const smartDjangoCall = async <T>(
  endpoint: string,
  priority: RequestPriority = RequestPriority.NORMAL,
  options?: Parameters<typeof apiCall>[1] & { dedupe?: boolean }
): Promise<T> => {
  const { dedupe = true, ...apiOptions } = options || {};
  const dedupeKey = `${endpoint}:${JSON.stringify(apiOptions)}`;

  if (dedupe) {
    return deduplicator.dedupe(dedupeKey, () => 
      djangoApiCall(endpoint, priority, apiOptions)
    );
  }

  return djangoApiCall(endpoint, priority, apiOptions);
};

// Django server health check and optimization
export const optimizeDjangoConnection = async () => {
  const startTime = Date.now();
  
  try {
    // Test different endpoints to find fastest
    const testEndpoints = [
      '/api/healthcheck/',
      '/api/beneficiaries/?page_size=1',
      '/api/milch-animals/?page_size=1',
    ];

    console.log('🔧 Testing Django server performance...');
    
    const results = await Promise.allSettled(
      testEndpoints.map(async (endpoint) => {
        const testStart = Date.now();
        try {
          await apiCall(endpoint, { timeout: 3000, cache: false });
          const duration = Date.now() - testStart;
          return { endpoint, duration, success: true };
        } catch (error) {
          return { endpoint, duration: 9999, success: false };
        }
      })
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(result => result.success);

    if (successfulResults.length === 0) {
      console.error('❌ Django server not responding');
      return { healthy: false, avgLatency: 9999 };
    }

    const avgLatency = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const totalTime = Date.now() - startTime;
    
    console.log(`🎯 Django optimization complete: ${avgLatency.toFixed(0)}ms avg latency (${totalTime}ms total)`);
    
    // Adjust API timeouts based on server performance
    if (avgLatency < 500) {
      console.log('🟢 Fast Django server detected - using aggressive timeouts');
      return { healthy: true, avgLatency, recommendation: 'fast' };
    } else if (avgLatency < 1500) {
      console.log('🟡 Medium Django server speed - using standard timeouts');
      return { healthy: true, avgLatency, recommendation: 'medium' };
    } else {
      console.log('🔴 Slow Django server - using conservative timeouts');
      return { healthy: true, avgLatency, recommendation: 'slow' };
    }

  } catch (error) {
    console.error('💥 Django optimization failed:', error);
    return { healthy: false, avgLatency: 9999 };
  }
};

// Prefetch strategy for common data patterns
export const prefetchCattleData = async (animalId: string) => {
  console.log(`🔄 Prefetching cattle data for ${animalId}`);
  
  // Start prefetching in background with low priority
  const prefetchPromises = [
    // Main cattle data
    smartDjangoCall(
      `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animalId}/`,
      RequestPriority.HIGH,
      { cache: true, cacheTTL: 5 * 60 * 1000 }
    ).catch(() => null),
    
    // Related beneficiary (if we can predict the pattern)
    // This could be enhanced with ML prediction later
  ];

  return Promise.allSettled(prefetchPromises);
};

export const prefetchBeneficiaryData = async (beneficiaryId: string) => {
  console.log(`🔄 Prefetching beneficiary data for ${beneficiaryId}`);
  
  const prefetchPromises = [
    // Main beneficiary data
    smartDjangoCall(
      `${API_CONFIG.ENDPOINTS.BENEFICIARIES}${beneficiaryId}/`,
      RequestPriority.HIGH,
      { cache: true, cacheTTL: 10 * 60 * 1000 }
    ).catch(() => null),
    
    // Cattle list for this beneficiary
    smartDjangoCall(
      `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}by-beneficiary/${beneficiaryId}/`,
      RequestPriority.NORMAL,
      { cache: true, cacheTTL: 3 * 60 * 1000 }
    ).catch(() => null),
  ];

  return Promise.allSettled(prefetchPromises);
};

// Django-specific performance monitoring
export const getDjangoPerformanceStats = () => {
  return {
    queueStats: requestQueue.getQueueStats(),
    pendingRequests: deduplicator.getPendingCount(),
    timestamp: new Date().toISOString(),
  };
};

// Export utilities
export default {
  djangoApiCall,
  smartDjangoCall,
  optimizeDjangoConnection,
  prefetchCattleData,
  prefetchBeneficiaryData,
  getDjangoPerformanceStats,
  RequestPriority,
};