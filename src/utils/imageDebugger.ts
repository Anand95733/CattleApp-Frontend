import { API_CONFIG } from '../config/api';

export interface ImageDebugInfo {
  originalUrl: string;
  finalUrl: string;
  exists: boolean;
  error?: string;
  statusCode?: number;
}

export class ImageDebugger {
  private static debugLog: ImageDebugInfo[] = [];

  // Test if an image URL exists
  static async testImageUrl(originalUrl: string): Promise<ImageDebugInfo> {
    const finalUrl = ImageDebugger.buildImageUrl(originalUrl);
    
    const debugInfo: ImageDebugInfo = {
      originalUrl,
      finalUrl,
      exists: false
    };

    if (!finalUrl) {
      debugInfo.error = 'No URL provided';
      ImageDebugger.debugLog.push(debugInfo);
      return debugInfo;
    }

    try {
      console.log(`🔍 Testing image URL: ${finalUrl}`);
      
      const response = await fetch(finalUrl, { 
        method: 'HEAD', // Only get headers, not the full image
        timeout: 5000 
      });
      
      debugInfo.statusCode = response.status;
      debugInfo.exists = response.ok;
      
      if (!response.ok) {
        debugInfo.error = `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`❌ Image not found: ${finalUrl} (${response.status})`);
      } else {
        console.log(`✅ Image exists: ${finalUrl}`);
      }
      
    } catch (error) {
      debugInfo.error = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`❌ Image test failed: ${finalUrl} - ${debugInfo.error}`);
    }

    ImageDebugger.debugLog.push(debugInfo);
    return debugInfo;
  }

  // Build image URL using the same logic as FastCattleImage
  static buildImageUrl(url: string | undefined): string | null {
    if (!url || url.trim() === '') return null;
    
    const cleanUrl = url.trim();
    
    // If it's already a full URL, replace localhost/127.0.0.1 with configured IP
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl
        .replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
        .replace('http://localhost:8000', API_CONFIG.BASE_URL)
        .replace('https://127.0.0.1:8000', API_CONFIG.BASE_URL)
        .replace('https://localhost:8000', API_CONFIG.BASE_URL);
    }
    
    // If it starts with /media/, combine with base URL
    if (cleanUrl.startsWith('/media/')) {
      return `${API_CONFIG.BASE_URL}${cleanUrl}`;
    }
    
    // If it starts with media/, add base URL with slash
    if (cleanUrl.startsWith('media/')) {
      return `${API_CONFIG.BASE_URL}/${cleanUrl}`;
    }
    
    // Otherwise, assume it's a relative path and add to media URL
    return `${API_CONFIG.BASE_URL}/media/${cleanUrl}`;
  }

  // Test all images for a cattle object
  static async testCattleImages(cattleData: any): Promise<ImageDebugInfo[]> {
    const imageFields = [
      'front_photo_url',
      'muzzle1_photo_url', 
      'muzzle2_photo_url',
      'muzzle3_photo_url',
      'left_photo_url',
      'right_photo_url'
    ];

    console.log(`🔍 Testing images for cattle: ${cattleData.animal_id}`);
    
    const results: ImageDebugInfo[] = [];
    
    for (const field of imageFields) {
      const imageUrl = cattleData[field];
      if (imageUrl) {
        console.log(`🔍 Testing ${field}: ${imageUrl}`);
        const result = await ImageDebugger.testImageUrl(imageUrl);
        result.originalUrl = `${field}: ${result.originalUrl}`;
        results.push(result);
      } else {
        console.log(`ℹ️ No URL for ${field}`);
      }
    }

    return results;
  }

  // Get debug report
  static getDebugReport(): string {
    const totalTests = ImageDebugger.debugLog.length;
    const successfulTests = ImageDebugger.debugLog.filter(log => log.exists).length;
    const failedTests = totalTests - successfulTests;

    let report = `\n📊 IMAGE DEBUG REPORT\n`;
    report += `======================\n`;
    report += `Total URLs tested: ${totalTests}\n`;
    report += `✅ Successful: ${successfulTests}\n`;
    report += `❌ Failed: ${failedTests}\n`;
    report += `Success rate: ${totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0}%\n\n`;

    if (failedTests > 0) {
      report += `FAILED IMAGES:\n`;
      report += `--------------\n`;
      ImageDebugger.debugLog
        .filter(log => !log.exists)
        .forEach((log, index) => {
          report += `${index + 1}. ${log.originalUrl}\n`;
          report += `   Final URL: ${log.finalUrl}\n`;
          report += `   Error: ${log.error || 'Unknown'}\n`;
          if (log.statusCode) {
            report += `   Status: ${log.statusCode}\n`;
          }
          report += `\n`;
        });
    }

    return report;
  }

  // Clear debug log
  static clearDebugLog(): void {
    ImageDebugger.debugLog = [];
  }

  // Get common 404 solutions
  static get404Solutions(): string[] {
    return [
      '1. Check if the image file exists in Django MEDIA_ROOT directory',
      '2. Verify the database has correct image paths (not outdated)',
      '3. Ensure Django MEDIA_URL is configured correctly',
      '4. Check if the image was uploaded successfully during cattle registration',
      '5. Verify folder permissions in MEDIA_ROOT',
      '6. Check if the image filename contains special characters that need encoding',
      '7. Ensure Django is serving media files correctly in development/production'
    ];
  }

  // Suggest fixes based on common patterns
  static suggestFixes(debugInfo: ImageDebugInfo): string[] {
    const suggestions: string[] = [];
    
    if (debugInfo.statusCode === 404) {
      suggestions.push('File not found - check if image exists in Django media folder');
      suggestions.push('Verify the database path matches the actual file location');
    }
    
    if (debugInfo.statusCode === 403) {
      suggestions.push('Permission denied - check folder permissions');
      suggestions.push('Ensure Django is configured to serve media files');
    }
    
    if (debugInfo.error?.includes('timeout')) {
      suggestions.push('Network timeout - check server connectivity');
      suggestions.push('Server might be overloaded or slow');
    }
    
    if (debugInfo.finalUrl?.includes('undefined') || debugInfo.finalUrl?.includes('null')) {
      suggestions.push('URL contains undefined/null - check data from API');
      suggestions.push('Database might have incomplete image paths');
    }

    return suggestions;
  }
}

// Export convenience functions
export const testImageUrl = ImageDebugger.testImageUrl.bind(ImageDebugger);
export const testCattleImages = ImageDebugger.testCattleImages.bind(ImageDebugger);
export const getImageDebugReport = ImageDebugger.getDebugReport.bind(ImageDebugger);
export const clearImageDebugLog = ImageDebugger.clearDebugLog.bind(ImageDebugger);