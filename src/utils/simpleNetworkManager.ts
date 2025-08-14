import { API_CONFIG } from '../config/api';

class SimpleNetworkManager {
  private static instance: SimpleNetworkManager;
  private lastWorkingUrl: string | null = null;
  private isDiscovering = false;

  static getInstance(): SimpleNetworkManager {
    if (!SimpleNetworkManager.instance) {
      SimpleNetworkManager.instance = new SimpleNetworkManager();
    }
    return SimpleNetworkManager.instance;
  }

  // Get the last working URL, or null if none found yet
  getLastWorkingUrl(): string | null {
    return this.lastWorkingUrl;
  }

  // Set a working URL manually
  setWorkingUrl(url: string) {
    this.lastWorkingUrl = url;
    this.updateApiConfig(url);
    console.log(`✅ Set working URL: ${url}`);
  }

  // Try to find a working URL (only if we don't have one)
  async findWorkingUrl(): Promise<string> {
    if (this.isDiscovering) {
      throw new Error('Already discovering URL');
    }

    this.isDiscovering = true;
    
    try {
      // If we have a last working URL, try it first
      if (this.lastWorkingUrl) {
        try {
          const response = await this.testUrl(this.lastWorkingUrl);
          if (response.ok) {
            console.log(`✅ Last working URL still works: ${this.lastWorkingUrl}`);
            return this.lastWorkingUrl;
          }
        } catch (error) {
          console.log(`❌ Last working URL failed: ${error.message}`);
        }
      }

      // Try URLs in smart order (primary first)
      const urlsToTest = API_CONFIG.FALLBACK_URLS;

      for (const baseUrl of urlsToTest) {
        try {
          console.log(`🔄 Testing: ${baseUrl}`);
          const response = await this.testUrl(baseUrl);
          
          if (response.ok) {
            console.log(`✅ Found working URL: ${baseUrl}`);
            this.setWorkingUrl(baseUrl);
            return baseUrl;
          }
        } catch (error) {
          console.log(`❌ Failed: ${baseUrl} - ${error.message}`);
        }
      }

      throw new Error('No working URL found');
    } finally {
      this.isDiscovering = false;
    }
  }

  private async testUrl(baseUrl: string): Promise<Response> {
    return fetch(`${baseUrl}${API_CONFIG.ENDPOINTS.HEALTHCHECK}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 2000, // Faster timeout for testing
    });
  }

  private updateApiConfig(workingUrl: string) {
    if (API_CONFIG.BASE_URL !== workingUrl) {
      console.log(`🔄 Updating API config: ${API_CONFIG.BASE_URL} → ${workingUrl}`);
      API_CONFIG.BASE_URL = workingUrl;
      API_CONFIG.MEDIA_URL = `${workingUrl}/media/`;
    }
  }

  // Clear the cached URL (for debugging)
  clearCache() {
    this.lastWorkingUrl = null;
    console.log('🗑️ Cleared URL cache');
  }

  // Get current status
  getStatus() {
    return {
      lastWorkingUrl: this.lastWorkingUrl,
      currentApiUrl: API_CONFIG.BASE_URL,
      isDiscovering: this.isDiscovering,
    };
  }
}

export default SimpleNetworkManager;