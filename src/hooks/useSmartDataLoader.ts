import { useState, useEffect, useCallback, useRef } from 'react';
import { smartDjangoCall, RequestPriority } from '../utils/djangoOptimizer';
import { perf } from '../utils/performance';

interface LoaderOptions {
  priority?: RequestPriority;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  dedupe?: boolean;
  immediate?: boolean; // Load immediately on mount
}

interface LoaderState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useSmartDataLoader = <T>(
  endpoint: string,
  options: LoaderOptions = {}
) => {
  const {
    priority = RequestPriority.NORMAL,
    timeout = 5000,
    cache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retries = 2,
    dedupe = true,
    immediate = true,
  } = options;

  const [state, setState] = useState<LoaderState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string>('');

  const load = useCallback(async (forceRefresh = false) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const performanceKey = `SmartLoader-${endpoint.replace(/\//g, '-')}`;
    perf.start(performanceKey);

    try {
      const data: T = await smartDjangoCall(
        endpoint,
        priority,
        {
          timeout,
          cache: cache && !forceRefresh,
          cacheTTL,
          dedupe,
          signal: abortControllerRef.current.signal,
        }
      );

      // Check if this response is still relevant (not superseded by newer request)
      if (requestIdRef.current === requestId) {
        setState({
          data,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });

        console.log(`✅ Data loaded successfully: ${endpoint}`);
      }

    } catch (error) {
      // Only update state if this request wasn't aborted and is still current
      if (requestIdRef.current === requestId && !abortControllerRef.current?.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        console.error(`❌ Data loading failed: ${endpoint}`, error);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        const duration = perf.end(performanceKey);
        console.log(`📊 Load completed in ${duration}ms: ${endpoint}`);
      }
    }
  }, [endpoint, priority, timeout, cache, cacheTTL, dedupe]);

  const refresh = useCallback(() => {
    return load(true);
  }, [load]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  // Load data immediately on mount if requested
  useEffect(() => {
    if (immediate && endpoint) {
      load();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [endpoint, immediate, load]);

  return {
    ...state,
    load,
    refresh,
    reset,
    isStale: state.lastUpdated && (Date.now() - state.lastUpdated.getTime()) > cacheTTL,
  };
};

// Specialized hooks for common data types
export const useCattleData = (animalId: string) => {
  return useSmartDataLoader(`/api/milch-animals/${animalId}/`, {
    priority: RequestPriority.CRITICAL,
    timeout: 5000,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    immediate: true,
  });
};

export const useBeneficiaryData = (beneficiaryId: string) => {
  return useSmartDataLoader(`/api/beneficiaries/${beneficiaryId}/`, {
    priority: RequestPriority.CRITICAL,
    timeout: 5000,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    immediate: true,
  });
};

export const useBeneficiaryCattle = (beneficiaryId: string) => {
  return useSmartDataLoader(`/api/milch-animals/by-beneficiary/${beneficiaryId}/`, {
    priority: RequestPriority.NORMAL,
    timeout: 6000,
    cacheTTL: 3 * 60 * 1000, // 3 minutes
    immediate: true,
  });
};

export default useSmartDataLoader;