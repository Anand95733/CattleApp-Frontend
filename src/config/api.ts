// API Configuration - Optimized for single working URL
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.6:8000',  // Primary working URL (updated)
  MEDIA_URL: 'http://192.168.1.6:8000/media/',
  ENDPOINTS: {
    BENEFICIARIES: '/api/beneficiaries/',
    SELLERS: '/api/sellers/',
    CATTLE: '/api/cattle/',
    MILCH_ANIMALS: '/api/milch-animals/',
    SC_VISITS: '/api/sc-visits/',
    HEALTHCHECK: '/api/healthcheck/',
  },
  TIMEOUT: 6000, // Optimized timeout
  FAST_TIMEOUT: 3000, // For quick requests
  SLOW_TIMEOUT: 12000, // For image uploads
  
  // Emergency fallback URLs (only used if primary fails)
  FALLBACK_URLS: [
    'http://192.168.29.21:8000',  // Primary (current WiFi IP)
    'http://127.0.0.1:8000',      // Localhost (ADB forwarding)
    'http://10.0.2.2:8000',       // Android emulator
    'http://192.168.1.11:8000',   // Previous IP (backup)
  ]
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build media URL
export const buildMediaUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath || imagePath.trim() === '') {
    console.log('🖼️ buildMediaUrl: No image path provided');
    return null;
  }
  
  const cleanPath = imagePath.trim();
  let finalUrl: string;
  
  // If it's already a full URL, replace localhost/127.0.0.1 with our configured IP
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    finalUrl = cleanPath
      .replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
      .replace('http://localhost:8000', API_CONFIG.BASE_URL)
      .replace('https://127.0.0.1:8000', API_CONFIG.BASE_URL)
      .replace('https://localhost:8000', API_CONFIG.BASE_URL);
  }
  // If it starts with /media/, combine with base URL
  else if (cleanPath.startsWith('/media/')) {
    finalUrl = `${API_CONFIG.BASE_URL}${cleanPath}`;
  }
  // If it starts with media/, add the base URL
  else if (cleanPath.startsWith('media/')) {
    finalUrl = `${API_CONFIG.BASE_URL}/${cleanPath}`;
  }
  // Otherwise, assume it's a relative path and add to media URL
  else {
    finalUrl = `${API_CONFIG.MEDIA_URL}${cleanPath}`;
  }
  
  console.log(`🖼️ buildMediaUrl: ${imagePath} → ${finalUrl}`);
  return finalUrl;
};

// Helper function to validate image URL exists
export const validateImageUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(imageUrl, { 
      method: 'HEAD', // Only get headers, not the full image
      timeout: 3000 
    });
    const exists = response.ok;
    console.log(`🖼️ Image validation: ${imageUrl} → ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    return exists;
  } catch (error) {
    console.warn(`🖼️ Image validation failed: ${imageUrl} → ${error.message}`);
    return false;
  }
};

// Helper function to try multiple URLs and find working one
export const findWorkingUrl = async (endpoint: string): Promise<{ url: string; data: any }> => {
  const urls = API_CONFIG.FALLBACK_URLS.map(baseUrl => `${baseUrl}${endpoint}`);
  
  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 5000, // Quick timeout for testing
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success with: ${url}`);
        
        // Update the main BASE_URL and MEDIA_URL to use the working URL
        const workingBaseUrl = url.replace(endpoint, '');
        API_CONFIG.BASE_URL = workingBaseUrl;
        API_CONFIG.MEDIA_URL = `${workingBaseUrl}/media/`;
        
        return { url: workingBaseUrl, data };
      }
    } catch (error) {
      console.log(`❌ Failed: ${url} - ${error.message}`);
    }
  }
  
  throw new Error('No working URL found. Make sure Django server is running.');
};

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds
const CACHE_TTL = {
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  FAST: 2 * 60 * 1000,    // 2 minutes
  LONG: 15 * 60 * 1000,   // 15 minutes
};

// Helper function to create fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit, timeout: number) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    )
  ]);
};

// Optimized API call - uses primary URL first, fallbacks only in emergency
export const apiCall = async (
  endpoint: string, 
  options?: RequestInit & { 
    cache?: boolean;
    cacheTTL?: number;
    timeout?: number;
    retries?: number;
    useFallbacks?: boolean;
  }
) => {
  const { cache = true, cacheTTL = CACHE_TTL.DEFAULT, timeout = API_CONFIG.FAST_TIMEOUT, retries = 1, useFallbacks = false, ...fetchOptions } = options || {};
  
  // Check cache first
  const cacheKey = `${endpoint}:${JSON.stringify(fetchOptions)}`;
  if (cache && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < cached.ttl) {
      console.log(`📦 Cache hit: ${endpoint}`);
      return cached.data;
    } else {
      apiCache.delete(cacheKey);
    }
  }

  let lastError: Error;
  
  // Always try primary URL first (optimized approach)
  const primaryUrl = buildApiUrl(endpoint);
  console.log(`🚀 API call: ${endpoint} → ${primaryUrl}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetchWithTimeout(primaryUrl, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...fetchOptions?.headers,
      },
    }, timeout);

    const duration = Date.now() - startTime;
    console.log(`✅ API success: ${endpoint} (${duration}ms)`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful responses
    if (cache) {
      apiCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
    }

    return data;
    
  } catch (error) {
    lastError = error as Error;
    console.warn(`❌ Primary URL failed for ${endpoint}: ${error.message}`);
    
    // Only try fallbacks if explicitly requested or if it's a network error (not 4xx)
    if (useFallbacks && !error.message.includes('status: 4')) {
      console.log('🔄 Trying fallback URLs...');
      
      for (const baseUrl of API_CONFIG.FALLBACK_URLS.slice(1)) { // Skip first (primary) URL
        try {
          const fallbackUrl = `${baseUrl}${endpoint}`;
          console.log(`🔄 Trying fallback: ${fallbackUrl}`);
          
          const response = await fetchWithTimeout(fallbackUrl, {
            ...fetchOptions,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...fetchOptions?.headers,
            },
          }, timeout);

          if (response.ok) {
            const data = await response.json();
            
            // Update config to use working URL
            console.log(`✅ Fallback success: ${baseUrl}`);
            API_CONFIG.BASE_URL = baseUrl;
            API_CONFIG.MEDIA_URL = `${baseUrl}/media/`;
            
            // Cache successful responses
            if (cache) {
              apiCache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl: cacheTTL
              });
            }
            
            return data;
          }
        } catch (fallbackError) {
          console.warn(`❌ Fallback failed: ${baseUrl} - ${fallbackError.message}`);
        }
      }
    }
  }
  
  console.error(`💥 All API attempts failed for ${endpoint}:`, lastError);
  throw lastError;
};

// Simple API call functions for common operations
export const apiGet = async (endpoint: string, options?: { cache?: boolean; timeout?: number }) => {
  return apiCall(endpoint, { method: 'GET', ...options });
};

export const apiPost = async (endpoint: string, data: any, options?: { timeout?: number }) => {
  return apiCall(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data),
    cache: false,
    ...options 
  });
};

export const apiPut = async (endpoint: string, data: any, options?: { timeout?: number }) => {
  return apiCall(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data),
    cache: false,
    ...options 
  });
};

export const apiPatch = async (endpoint: string, data: any, options?: { timeout?: number }) => {
  return apiCall(endpoint, { 
    method: 'PATCH', 
    body: JSON.stringify(data),
    cache: false,
    ...options 
  });
};

export const apiDelete = async (endpoint: string, options?: { timeout?: number }) => {
  return apiCall(endpoint, { 
    method: 'DELETE',
    cache: false,
    ...options 
  });
};

// Concurrent API calls utility
export const apiCallParallel = async <T extends Record<string, any>>(
  calls: { [K in keyof T]: { endpoint: string; options?: Parameters<typeof apiCall>[1] } }
): Promise<T> => {
  const startTime = Date.now();
  console.log(`🔄 Starting ${Object.keys(calls).length} parallel API calls`);
  
  const promises = Object.entries(calls).map(async ([key, { endpoint, options }]) => {
    try {
      const data = await apiCall(endpoint, options);
      return { key, data, success: true };
    } catch (error) {
      console.warn(`Failed parallel call for ${key}:`, error);
      return { key, data: null, success: false, error };
    }
  });

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Parallel calls completed: ${successCount}/${results.length} successful (${duration}ms)`);
  
  const response = {} as T;
  results.forEach(({ key, data }) => {
    response[key as keyof T] = data;
  });
  
  return response;
};

// Network-aware API configuration
export const getNetworkAwareTimeout = async () => {
  try {
    const startTime = Date.now();
    const testUrl = `${API_CONFIG.BASE_URL}/api/healthcheck/`;
    
    await fetch(testUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    
    const latency = Date.now() - startTime;
    
    // Adjust timeouts based on network speed
    if (latency < 200) {
      return { timeout: API_CONFIG.FAST_TIMEOUT, quality: 'fast' };
    } else if (latency < 1000) {
      return { timeout: API_CONFIG.TIMEOUT, quality: 'medium' };
    } else {
      return { timeout: API_CONFIG.SLOW_TIMEOUT, quality: 'slow' };
    }
  } catch {
    return { timeout: API_CONFIG.SLOW_TIMEOUT, quality: 'slow' };
  }
};

// Batch API calls for better performance
export const batchApiCalls = async <T>(
  calls: Array<{ key: string; endpoint: string; options?: any }>,
  batchSize = 3
): Promise<Record<string, T>> => {
  const results: Record<string, T> = {};
  
  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ key, endpoint, options }) => {
      try {
        const data = await apiCall(endpoint, options);
        return { key, data, success: true };
      } catch (error) {
        console.warn(`Batch call failed for ${key}:`, error);
        return { key, data: null, success: false };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ key, data }) => {
      if (data) results[key] = data;
    });
    
    // Small delay between batches to prevent server overload
    if (i + batchSize < calls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

// Preload critical data
export const preloadCriticalData = async () => {
  const criticalEndpoints = [
    '/api/beneficiaries/',
    '/api/milch-animals/',
  ];
  
  console.log('🔄 Preloading critical data...');
  
  const preloadPromises = criticalEndpoints.map(endpoint => 
    apiCall(endpoint + '?page_size=1', { 
      cache: true, 
      cacheTTL: 10 * 60 * 1000 // 10 minutes
    }).catch(() => null) // Don't fail if preload fails
  );
  
  await Promise.all(preloadPromises);
  console.log('✅ Critical data preloaded');
};

// FormData upload with fallback URLs (for file uploads)
export const apiUpload = async (
  endpoint: string,
  formData: FormData,
  options?: {
    timeout?: number;
    signal?: AbortSignal;
  }
): Promise<any> => {
  const { timeout = API_CONFIG.SLOW_TIMEOUT, signal } = options || {};
  
  let lastError: Error;
  const urlsToTry = API_CONFIG.FALLBACK_URLS.map(baseUrl => `${baseUrl}${endpoint}`);
  
  for (const url of urlsToTry) {
    try {
      console.log(`🔄 Trying upload URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal,
        headers: { 
          'Accept': 'application/json',
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
      });
      
      if (response.ok) {
        console.log(`✅ Upload successful with: ${url}`);
        
        // Update the working base URL for future requests
        const workingBaseUrl = url.replace(endpoint, '');
        if (workingBaseUrl !== API_CONFIG.BASE_URL) {
          console.log(`🔄 Updating BASE_URL to working URL: ${workingBaseUrl}`);
          API_CONFIG.BASE_URL = workingBaseUrl;
          API_CONFIG.MEDIA_URL = `${workingBaseUrl}/media/`;
        }
        
        return await response.json();
      } else {
        const errorData = await response.json().catch(() => null);
        if (errorData && typeof errorData === 'object') {
          // Handle Django validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`Validation errors:\n${errorMessages}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Upload failed for ${url}: ${error.message}`);
    }
  }
  
  console.error(`💥 All upload attempts failed for ${endpoint}:`, lastError);
  throw lastError;
};

// Clear cache utility
export const clearApiCache = () => {
  apiCache.clear();
  console.log('🗑️ API cache cleared');
};