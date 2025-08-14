import { API_CONFIG } from '../config/api';

export interface ImageRecoveryResult {
  success: boolean;
  workingUrl?: string;
  attemptedUrls: string[];
  error?: string;
}

export class ImageRecoveryService {
  private static cache = new Map<string, ImageRecoveryResult>();
  
  // Try to find a working image URL for a cattle animal
  static async findWorkingImageUrl(
    animalId: string,
    imageUrls: (string | null | undefined)[]
  ): Promise<ImageRecoveryResult> {
    const cacheKey = `${animalId}-${imageUrls.join(',')}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`📦 Using cached image result for ${animalId}`);
      return cached;
    }

    const result: ImageRecoveryResult = {
      success: false,
      attemptedUrls: [],
    };

    // Filter and build full URLs
    const validUrls = imageUrls
      .filter(Boolean)
      .map(url => this.buildFullImageUrl(url!))
      .filter(Boolean) as string[];

    console.log(`🔍 Searching for working image for animal ${animalId}`);
    console.log(`🔍 Trying ${validUrls.length} URLs:`, validUrls);

    // Try each URL
    for (const url of validUrls) {
      result.attemptedUrls.push(url);
      
      try {
        console.log(`🔄 Testing: ${url}`);
        const response = await fetch(url, { 
          method: 'HEAD',
          timeout: 3000 
        });

        if (response.ok) {
          console.log(`✅ Found working image: ${url}`);
          result.success = true;
          result.workingUrl = url;
          break;
        } else {
          console.warn(`❌ Failed (${response.status}): ${url}`);
        }
      } catch (error) {
        console.warn(`❌ Error testing ${url}:`, error.message);
      }
    }

    if (!result.success) {
      result.error = `No working image found for animal ${animalId}`;
      console.warn(`❌ ${result.error}`);
      console.warn(`❌ Attempted URLs:`, result.attemptedUrls);
    }

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  // Build full image URL with proper formatting
  private static buildFullImageUrl(url: string): string | null {
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

  // Generate alternative image paths for a specific animal
  static generateAlternativeImagePaths(animalId: string, originalPath?: string): string[] {
    const alternatives: string[] = [];
    
    if (!animalId) return alternatives;

    // Extract the base path if we have an original path
    let basePath = `animal_photos/${animalId}`;
    if (originalPath) {
      const match = originalPath.match(/animal_photos\/[^\/]+/);
      if (match) {
        basePath = match[0];
      }
    }

    // Common image filenames to try
    const imageNames = [
      'front.jpg',
      'front.jpeg',
      'front.png',
      'left.jpg',
      'left.jpeg', 
      'right.jpg',
      'right.jpeg',
      'muzzle1.jpg',
      'muzzle1.jpeg',
      'muzzle2.jpg',
      'muzzle3.jpg',
      'profile.jpg',
      'main.jpg',
      'image.jpg'
    ];

    // Generate full paths
    imageNames.forEach(name => {
      alternatives.push(`/media/${basePath}/${name}`);
    });

    return alternatives;
  }

  // Check if a specific image file exists on the server
  static async checkImageExists(imageUrl: string): Promise<boolean> {
    try {
      const fullUrl = this.buildFullImageUrl(imageUrl);
      if (!fullUrl) return false;

      const response = await fetch(fullUrl, { 
        method: 'HEAD',
        timeout: 3000 
      });
      
      const exists = response.ok;
      console.log(`🔍 Image check: ${fullUrl} → ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      return exists;
    } catch (error) {
      console.warn(`🔍 Image check failed: ${imageUrl} → ${error.message}`);
      return false;
    }
  }

  // Clear the cache
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Image recovery cache cleared');
  }

  // Get cache statistics
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // Preload and validate images for a cattle object
  static async prevalidateCattleImages(cattleData: any): Promise<{
    validImages: string[];
    invalidImages: string[];
    recommendations: string[];
  }> {
    const imageFields = [
      'front_photo_url',
      'left_photo_url', 
      'right_photo_url',
      'muzzle1_photo_url',
      'muzzle2_photo_url',
      'muzzle3_photo_url'
    ];

    const validImages: string[] = [];
    const invalidImages: string[] = [];
    const recommendations: string[] = [];

    console.log(`🔍 Prevalidating images for cattle: ${cattleData.animal_id}`);

    for (const field of imageFields) {
      const imageUrl = cattleData[field];
      if (imageUrl) {
        const exists = await this.checkImageExists(imageUrl);
        if (exists) {
          validImages.push(imageUrl);
        } else {
          invalidImages.push(imageUrl);
          
          // Generate specific recommendations
          if (field === 'front_photo_url') {
            recommendations.push(`Missing front image for ${cattleData.animal_id} - this is the primary display image`);
          }
        }
      }
    }

    // Generate alternative paths if no images are working
    if (validImages.length === 0) {
      const alternatives = this.generateAlternativeImagePaths(cattleData.animal_id);
      recommendations.push(`No images found for ${cattleData.animal_id}. Try these paths:`);
      alternatives.slice(0, 5).forEach(alt => {
        recommendations.push(`  - ${alt}`);
      });
    }

    console.log(`✅ Image validation complete for ${cattleData.animal_id}:`);
    console.log(`   Valid: ${validImages.length}, Invalid: ${invalidImages.length}`);

    return { validImages, invalidImages, recommendations };
  }
}

// Export convenience functions
export const findWorkingImageUrl = ImageRecoveryService.findWorkingImageUrl.bind(ImageRecoveryService);
export const checkImageExists = ImageRecoveryService.checkImageExists.bind(ImageRecoveryService);
export const prevalidateCattleImages = ImageRecoveryService.prevalidateCattleImages.bind(ImageRecoveryService);
export const generateAlternativeImagePaths = ImageRecoveryService.generateAlternativeImagePaths.bind(ImageRecoveryService);