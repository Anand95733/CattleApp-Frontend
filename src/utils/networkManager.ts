interface NetworkConfig {
  networkId: string;
  workingUrl: string;
  lastUsed: number;
}

class NetworkManager {
  private static instance: NetworkManager;
  private currentNetwork: string | null = null;
  private networkConfigs: Map<string, NetworkConfig> = new Map();
  private isInitialized = false;
  private lastWorkingUrl: string | null = null;

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Simple initialization without external dependencies
      this.currentNetwork = 'default_network';
      this.isInitialized = true;
      console.log('📡 NetworkManager initialized (simplified mode)');
    } catch (error) {
      console.error('❌ NetworkManager initialization failed:', error);
    }
  }

  // Simplified network detection based on successful API calls
  private detectNetworkFromUrl(workingUrl: string): string {
    if (workingUrl.includes('127.0.0.1') || workingUrl.includes('localhost')) {
      return 'localhost_network';
    } else if (workingUrl.includes('192.168.29')) {
      return 'home_wifi_29';
    } else if (workingUrl.includes('192.168.1')) {
      return 'home_wifi_1';
    } else if (workingUrl.includes('192.168.0')) {
      return 'home_wifi_0';
    } else if (workingUrl.includes('10.0.2.2')) {
      return 'android_emulator';
    }
    return 'unknown_network';
  }

  async findWorkingUrlForCurrentNetwork(testEndpoint: string = '/api/healthcheck/'): Promise<string> {
    // If we have a recently working URL, try it first
    if (this.lastWorkingUrl) {
      try {
        console.log(`🔄 Testing last working URL: ${this.lastWorkingUrl}`);
        const response = await fetch(`${this.lastWorkingUrl}${testEndpoint}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 3000,
        });

        if (response.ok) {
          console.log(`✅ Last working URL still works: ${this.lastWorkingUrl}`);
          return this.lastWorkingUrl;
        }
      } catch (error) {
        console.log(`❌ Last working URL failed: ${error.message}`);
      }
    }

    console.log(`🔍 Discovering new working URL...`);
    
    // Test URLs in smart order
    const urlsToTest = this.getSmartUrlOrder();
    
    for (const baseUrl of urlsToTest) {
      try {
        console.log(`🔄 Testing: ${baseUrl}`);
        const response = await fetch(`${baseUrl}${testEndpoint}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 3000,
        });

        if (response.ok) {
          console.log(`✅ Found working URL: ${baseUrl}`);
          
          // Save this as the working URL
          this.lastWorkingUrl = baseUrl;
          const networkId = this.detectNetworkFromUrl(baseUrl);
          this.currentNetwork = networkId;
          this.updateApiConfig(baseUrl);
          
          return baseUrl;
        }
      } catch (error) {
        console.log(`❌ Failed: ${baseUrl} - ${error.message}`);
      }
    }

    throw new Error(`No working URL found`);
  }

  private getSmartUrlOrder(): string[] {
    // Smart ordering - try most likely working URLs first
    return [
      'http://192.168.29.21:8000',  // Your current IP (most likely)
      'http://127.0.0.1:8000',      // Localhost (ADB forwarding)
      'http://192.168.1.11:8000',   // Previous IP
      'http://10.0.2.2:8000',       // Android emulator
      'http://192.168.0.100:8000',  // Common router IP range
      'http://192.168.1.100:8000',  // Another common range
    ];
  }

  private updateApiConfig(workingUrl: string) {
    // Import API_CONFIG dynamically to avoid circular imports
    const { API_CONFIG } = require('../config/api');
    
    if (API_CONFIG.BASE_URL !== workingUrl) {
      console.log(`🔄 Updating API config: ${API_CONFIG.BASE_URL} → ${workingUrl}`);
      API_CONFIG.BASE_URL = workingUrl;
      API_CONFIG.MEDIA_URL = `${workingUrl}/media/`;
    }
  }

  getCurrentNetwork(): string | null {
    return this.currentNetwork;
  }

  getWorkingUrlForCurrentNetwork(): string | null {
    return this.lastWorkingUrl;
  }

  // Force refresh network detection
  async refreshNetwork() {
    console.log('🔄 Refreshing network detection...');
    this.lastWorkingUrl = null;
    this.currentNetwork = null;
  }

  // Clear saved configurations (for debugging)
  async clearSavedConfigs() {
    this.networkConfigs.clear();
    this.lastWorkingUrl = null;
    this.currentNetwork = null;
    console.log('🗑️ Cleared all network configurations');
  }

  // Set working URL manually
  setWorkingUrl(url: string) {
    this.lastWorkingUrl = url;
    const networkId = this.detectNetworkFromUrl(url);
    this.currentNetwork = networkId;
    this.updateApiConfig(url);
    console.log(`✅ Manually set working URL: ${url} (network: ${networkId})`);
  }
}

export default NetworkManager;