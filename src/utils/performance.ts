// Performance monitoring utilities
import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private isEnabled = __DEV__; // Only in development

  start(name: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata
    });
    
    console.log(`🏁 Starting: ${name}`);
  }

  end(name: string) {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ No metric found for: ${name}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log with color coding based on duration
    const emoji = duration < 1000 ? '🟢' : duration < 3000 ? '🟡' : '🔴';
    console.log(`${emoji} Completed: ${name} - ${duration}ms`);

    // Log slow operations
    if (duration > 2000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration}ms`);
    }

    return duration;
  }

  measure(name: string, fn: () => Promise<any>) {
    return async (...args: any[]) => {
      this.start(name);
      try {
        const result = await fn.apply(this, args);
        this.end(name);
        return result;
      } catch (error) {
        this.end(name);
        throw error;
      }
    };
  }

  getMetrics() {
    return Array.from(this.metrics.values())
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  clear() {
    this.metrics.clear();
  }

  report() {
    if (!this.isEnabled) return;
    
    const completedMetrics = this.getMetrics();
    
    if (completedMetrics.length === 0) {
      console.log('📊 No performance metrics available');
      return;
    }

    console.log('\n📊 Performance Report:');
    console.log('====================');
    
    completedMetrics.forEach((metric, index) => {
      const rank = index + 1;
      const emoji = (metric.duration || 0) < 1000 ? '🟢' : (metric.duration || 0) < 3000 ? '🟡' : '🔴';
      console.log(`${rank}. ${emoji} ${metric.name}: ${metric.duration}ms`);
    });

    const totalTime = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const avgTime = totalTime / completedMetrics.length;
    
    console.log(`\n📈 Total: ${totalTime}ms | Average: ${Math.round(avgTime)}ms`);
    console.log('====================\n');
  }
}

// Global performance monitor instance
export const perf = new PerformanceMonitor();

// Utility functions
export const measureApiCall = (name: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      perf.start(`API-${name}`);
      try {
        const result = await originalMethod.apply(this, args);
        perf.end(`API-${name}`);
        return result;
      } catch (error) {
        perf.end(`API-${name}`);
        throw error;
      }
    };
    
    return descriptor;
  };
};

// React Hook for component render time (safe implementation)

export const usePerformanceTracker = (componentName: string) => {
  useEffect(() => {
    if (__DEV__) {
      perf.start(`Render-${componentName}`);
      return () => {
        perf.end(`Render-${componentName}`);
      };
    }
  }, [componentName]);
};

// Network speed detector
export const detectNetworkSpeed = async (): Promise<'fast' | 'medium' | 'slow'> => {
  const startTime = Date.now();
  const testUrl = 'https://httpbin.org/get'; // Small test endpoint
  
  try {
    await fetch(testUrl, { cache: 'no-cache' });
    const duration = Date.now() - startTime;
    
    if (duration < 500) return 'fast';
    if (duration < 1500) return 'medium';
    return 'slow';
  } catch {
    return 'slow';
  }
};

// Memory usage tracker (for debugging)
export const logMemoryUsage = () => {
  if (__DEV__ && console.memory) {
    const memory = console.memory;
    console.log(`💾 Memory: Used ${Math.round(memory.usedJSHeapSize / 1048576)}MB / Limit ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`);
  }
};

export default perf;