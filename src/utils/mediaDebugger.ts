import { API_CONFIG } from '../config/api';

interface MediaDebugInfo {
  originalUrl: string;
  fullUrl: string;
  isAccessible: boolean;
  error?: string;
  alternativeUrls?: string[];
}

class MediaDebugger {
  private static instance: MediaDebugger;
  private debugCache = new Map<string, MediaDebugInfo>();

  static getInstance(): MediaDebugger {
    if (!MediaDebugger.instance) {
      MediaDebugger.instance = new MediaDebugger();
    }
    return MediaDebugger.instance;
  }

  async checkMediaUrl(photoUrl: string): Promise<MediaDebugInfo> {
    if (this.debugCache.has(photoUrl)) {
      return this.debugCache.get(photoUrl)!;
    }

    const debugInfo: MediaDebugInfo = {
      originalUrl: photoUrl,
      fullUrl: this.buildFullUrl(photoUrl),
      isAccessible: false,
      alternativeUrls: []
    };

    try {
      // Test the primary URL
      const response = await fetch(debugInfo.fullUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        debugInfo.isAccessible = true;
        console.log(`✅ Media accessible: ${debugInfo.fullUrl}`);
      } else {
        debugInfo.error = `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`❌ Media not accessible: ${debugInfo.fullUrl} - ${debugInfo.error}`);
        
        // Try alternative URLs
        debugInfo.alternativeUrls = await this.generateAlternativeUrls(photoUrl);
      }
    } catch (error) {
      debugInfo.error = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`❌ Media check failed: ${debugInfo.fullUrl} - ${debugInfo.error}`);
      
      // Try alternative URLs
      debugInfo.alternativeUrls = await this.generateAlternativeUrls(photoUrl);
    }

    this.debugCache.set(photoUrl, debugInfo);
    return debugInfo;
  }

  private buildFullUrl(photoUrl: string): string {
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    
    if (photoUrl.startsWith('/media/')) {
      return `${API_CONFIG.BASE_URL}${photoUrl}`;
    }
    
    if (photoUrl.startsWith('media/')) {
      return `${API_CONFIG.BASE_URL}/${photoUrl}`;
    }
    
    return `${API_CONFIG.MEDIA_URL}${photoUrl}`;
  }

  private async generateAlternativeUrls(photoUrl: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Extract the relative path
    let relativePath = photoUrl;
    if (photoUrl.startsWith('http')) {
      const url = new URL(photoUrl);
      relativePath = url.pathname;
    }
    
    // Remove leading slash if present
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    
    // Try different base URLs
    const baseUrls = [
      'http://127.0.0.1:8000',
      'http://192.168.29.21:8000',
      'http://192.168.1.11:8000',
      'http://10.0.2.2:8000',
    ];
    
    for (const baseUrl of baseUrls) {
      if (baseUrl !== API_CONFIG.BASE_URL) {
        alternatives.push(`${baseUrl}/${relativePath}`);
        alternatives.push(`${baseUrl}/media/${relativePath}`);
      }
    }
    
    return alternatives;
  }

  async testAllMediaUrls(animalData: any): Promise<void> {
    console.log('🔍 Testing all media URLs for animal:', animalData.animal_id);
    
    const photoFields = [
      'front_photo_url',
      'muzzle1_photo_url', 
      'muzzle2_photo_url',
      'muzzle3_photo_url',
      'left_photo_url',
      'right_photo_url'
    ];
    
    for (const field of photoFields) {
      const photoUrl = animalData[field];
      if (photoUrl) {
        const debugInfo = await this.checkMediaUrl(photoUrl);
        console.log(`📸 ${field}:`, {
          url: debugInfo.fullUrl,
          accessible: debugInfo.isAccessible,
          error: debugInfo.error
        });
      } else {
        console.log(`📸 ${field}: null`);
      }
    }
  }

  getDebugReport(): string {
    const report = Array.from(this.debugCache.entries())
      .map(([url, info]) => {
        return `${info.isAccessible ? '✅' : '❌'} ${url} -> ${info.fullUrl}${info.error ? ` (${info.error})` : ''}`;
      })
      .join('\n');
    
    return `Media Debug Report:\n${report}`;
  }

  clearCache(): void {
    this.debugCache.clear();
    console.log('🗑️ Media debug cache cleared');
  }
}

export default MediaDebugger;