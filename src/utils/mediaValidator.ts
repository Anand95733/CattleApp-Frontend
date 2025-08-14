import { API_CONFIG } from '../config/api';

export interface MediaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class MediaValidator {
  
  // Test Django media configuration
  static async validateMediaConfiguration(): Promise<MediaValidationResult> {
    const result: MediaValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    console.log('🔍 Validating Django media configuration...');

    try {
      // Test 1: Check if Django server is responding
      const healthResponse = await fetch(`${API_CONFIG.BASE_URL}/api/healthcheck/`, {
        method: 'GET',
        timeout: 5000
      });

      if (!healthResponse.ok) {
        result.errors.push(`Django server not responding (${healthResponse.status})`);
        result.isValid = false;
      } else {
        console.log('✅ Django server is responding');
      }

      // Test 2: Check if media URL is accessible
      const mediaTestUrl = `${API_CONFIG.BASE_URL}/media/`;
      try {
        const mediaResponse = await fetch(mediaTestUrl, {
          method: 'GET',
          timeout: 3000
        });

        if (mediaResponse.status === 404) {
          result.errors.push('Media URL returns 404 - Django not configured to serve media files');
          result.suggestions.push('Add media URL configuration to Django urls.py');
          result.suggestions.push('Ensure MEDIA_URL and MEDIA_ROOT are set in Django settings');
          result.isValid = false;
        } else if (mediaResponse.status === 403) {
          result.warnings.push('Media URL returns 403 - Permission issues');
          result.suggestions.push('Check folder permissions for MEDIA_ROOT');
        } else {
          console.log('✅ Media URL is accessible');
        }
      } catch (error) {
        result.warnings.push(`Media URL test failed: ${error.message}`);
      }

      // Test 3: Check common image paths
      const testPaths = [
        '/media/animal_photos/',
        '/media/beneficiary_photos/',
        '/media/test.jpg' // This should return 404 but not 403
      ];

      for (const path of testPaths) {
        try {
          const testUrl = `${API_CONFIG.BASE_URL}${path}`;
          const response = await fetch(testUrl, { method: 'HEAD', timeout: 2000 });
          
          if (response.status === 403) {
            result.warnings.push(`Permission denied for ${path}`);
            result.suggestions.push('Check Django media serving configuration');
          }
        } catch (error) {
          // Expected for non-existent files
        }
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  // Validate image URL format
  static validateImageUrl(imageUrl: string): MediaValidationResult {
    const result: MediaValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!imageUrl || imageUrl.trim() === '') {
      result.errors.push('Image URL is empty');
      result.isValid = false;
      return result;
    }

    const cleanUrl = imageUrl.trim();

    // Check for common issues
    if (cleanUrl.includes('undefined') || cleanUrl.includes('null')) {
      result.errors.push('URL contains undefined/null values');
      result.suggestions.push('Check API response data integrity');
      result.isValid = false;
    }

    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
      result.warnings.push('URL uses localhost - may not work on device');
      result.suggestions.push('Ensure API returns proper IP addresses');
    }

    if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('/media/') && !cleanUrl.startsWith('media/')) {
      result.warnings.push('URL format may be incorrect');
      result.suggestions.push('Ensure URL starts with http:// or /media/');
    }

    // Check for special characters that might cause issues
    const problematicChars = ['<', '>', '"', "'", '&', ' '];
    const foundChars = problematicChars.filter(char => cleanUrl.includes(char));
    if (foundChars.length > 0) {
      result.warnings.push(`URL contains problematic characters: ${foundChars.join(', ')}`);
      result.suggestions.push('URL encode special characters');
    }

    return result;
  }

  // Generate Django media configuration suggestions
  static getDjangoConfigSuggestions(): string[] {
    return [
      '# Add to Django settings.py:',
      'import os',
      'MEDIA_URL = "/media/"',
      'MEDIA_ROOT = os.path.join(BASE_DIR, "media")',
      '',
      '# Add to main urls.py:',
      'from django.conf import settings',
      'from django.conf.urls.static import static',
      '',
      'urlpatterns = [',
      '    # your existing patterns',
      ']',
      '',
      'if settings.DEBUG:',
      '    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)',
      '',
      '# Create media directory structure:',
      'mkdir -p media/animal_photos',
      'mkdir -p media/beneficiary_photos',
      'chmod 755 media/',
      'chmod 755 media/animal_photos/',
      'chmod 755 media/beneficiary_photos/'
    ];
  }

  // Check if image file exists on server
  static async checkImageExists(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        timeout: 3000 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get file extension from URL
  static getFileExtension(url: string): string | null {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : null;
  }

  // Validate file extension
  static isValidImageExtension(url: string): boolean {
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = MediaValidator.getFileExtension(url);
    return extension ? validExtensions.includes(extension) : false;
  }
}

// Export convenience functions
export const validateMediaConfiguration = MediaValidator.validateMediaConfiguration.bind(MediaValidator);
export const validateImageUrl = MediaValidator.validateImageUrl.bind(MediaValidator);
export const getDjangoConfigSuggestions = MediaValidator.getDjangoConfigSuggestions.bind(MediaValidator);