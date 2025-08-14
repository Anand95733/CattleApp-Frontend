import { API_CONFIG } from '../config/api';
import { ImageRecoveryService } from './imageRecoveryService';

export interface DiagnosticReport {
  animalId: string;
  totalImages: number;
  workingImages: number;
  brokenImages: number;
  missingImages: string[];
  workingUrls: string[];
  suggestions: string[];
  serverReachable: boolean;
  mediaFolderAccessible: boolean;
}

export class ImageDiagnostics {
  
  // Run comprehensive diagnostics for a specific animal
  static async diagnoseAnimal(animalId: string, cattleData: any): Promise<DiagnosticReport> {
    console.log(`🔬 Running comprehensive diagnostics for animal: ${animalId}`);
    
    const report: DiagnosticReport = {
      animalId,
      totalImages: 0,
      workingImages: 0,
      brokenImages: 0,
      missingImages: [],
      workingUrls: [],
      suggestions: [],
      serverReachable: false,
      mediaFolderAccessible: false
    };

    // Step 1: Check server connectivity
    try {
      const healthResponse = await fetch(`${API_CONFIG.BASE_URL}/api/healthcheck/`, {
        method: 'GET',
        timeout: 5000
      });
      report.serverReachable = healthResponse.ok;
      console.log(`🌐 Server reachable: ${report.serverReachable}`);
    } catch (error) {
      console.warn('🌐 Server connectivity check failed:', error.message);
    }

    // Step 2: Check media folder accessibility
    try {
      const mediaResponse = await fetch(`${API_CONFIG.BASE_URL}/media/`, {
        method: 'GET',
        timeout: 3000
      });
      report.mediaFolderAccessible = mediaResponse.status !== 404;
      console.log(`📁 Media folder accessible: ${report.mediaFolderAccessible}`);
    } catch (error) {
      console.warn('📁 Media folder check failed:', error.message);
    }

    // Step 3: Test all image URLs for this animal
    const imageFields = [
      'front_photo_url',
      'left_photo_url',
      'right_photo_url', 
      'muzzle1_photo_url',
      'muzzle2_photo_url',
      'muzzle3_photo_url'
    ];

    for (const field of imageFields) {
      const imageUrl = cattleData[field];
      if (imageUrl) {
        report.totalImages++;
        const fullUrl = this.buildFullImageUrl(imageUrl);
        
        if (fullUrl) {
          const exists = await this.testImageUrl(fullUrl);
          if (exists) {
            report.workingImages++;
            report.workingUrls.push(fullUrl);
            console.log(`✅ ${field}: Working`);
          } else {
            report.brokenImages++;
            report.missingImages.push(fullUrl);
            console.warn(`❌ ${field}: Missing - ${fullUrl}`);
          }
        }
      }
    }

    // Step 4: Generate specific suggestions
    report.suggestions = this.generateSuggestions(report, animalId);

    console.log(`🔬 Diagnostics complete for ${animalId}:`);
    console.log(`   📊 ${report.workingImages}/${report.totalImages} images working`);
    console.log(`   🚨 ${report.brokenImages} images missing`);

    return report;
  }

  // Test if a specific image URL exists
  private static async testImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 3000 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Build full image URL
  private static buildFullImageUrl(url: string): string | null {
    if (!url || url.trim() === '') return null;
    
    const cleanUrl = url.trim();
    
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl
        .replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
        .replace('http://localhost:8000', API_CONFIG.BASE_URL);
    }
    
    if (cleanUrl.startsWith('/media/')) {
      return `${API_CONFIG.BASE_URL}${cleanUrl}`;
    }
    
    if (cleanUrl.startsWith('media/')) {
      return `${API_CONFIG.BASE_URL}/${cleanUrl}`;
    }
    
    return `${API_CONFIG.BASE_URL}/media/${cleanUrl}`;
  }

  // Generate specific suggestions based on diagnostic results
  private static generateSuggestions(report: DiagnosticReport, animalId: string): string[] {
    const suggestions: string[] = [];

    if (!report.serverReachable) {
      suggestions.push('🚨 CRITICAL: Django server is not reachable');
      suggestions.push('   → Check if Django development server is running');
      suggestions.push('   → Verify the IP address in API_CONFIG.BASE_URL');
      suggestions.push('   → Check network connectivity');
      return suggestions;
    }

    if (!report.mediaFolderAccessible) {
      suggestions.push('🚨 CRITICAL: Media folder is not accessible');
      suggestions.push('   → Add media URL configuration to Django urls.py');
      suggestions.push('   → Ensure MEDIA_URL and MEDIA_ROOT are set in settings.py');
      suggestions.push('   → Check if media folder exists and has proper permissions');
    }

    if (report.brokenImages > 0) {
      suggestions.push(`🔧 ${report.brokenImages} images are missing for animal ${animalId}`);
      
      // Specific suggestions for the problematic animal
      if (animalId === 'db2c211e-f6bd-43cf-8c19-10f26add9cc1') {
        suggestions.push('🎯 SPECIFIC FIX for animal db2c211e-f6bd-43cf-8c19-10f26add9cc1:');
        suggestions.push('   → Check Django media folder: media/animal_photos/db2c211e-f6bd-43cf-8c19-10f26add9cc1/');
        suggestions.push('   → Look for front.jpg in that folder');
        suggestions.push('   → If missing, re-upload the image or update database to point to existing file');
        suggestions.push('   → Django command: ls -la media/animal_photos/db2c211e-f6bd-43cf-8c19-10f26add9cc1/');
      }

      suggestions.push('   → Check if images were uploaded successfully during cattle registration');
      suggestions.push('   → Verify database paths match actual file locations');
      suggestions.push('   → Check folder permissions (should be 755)');
    }

    if (report.workingImages === 0 && report.totalImages > 0) {
      suggestions.push('🚨 NO images are working - this indicates a systematic issue');
      suggestions.push('   → Check Django media serving configuration');
      suggestions.push('   → Verify MEDIA_ROOT path in Django settings');
      suggestions.push('   → Check if media files exist on disk');
    }

    if (report.workingImages > 0 && report.brokenImages > 0) {
      suggestions.push('✅ Some images work, others don\'t - likely missing files');
      suggestions.push('   → Focus on re-uploading or fixing the missing image files');
      suggestions.push('   → Database paths are probably correct');
    }

    return suggestions;
  }

  // Generate Django commands to fix common issues
  static generateDjangoFixCommands(animalId: string): string[] {
    return [
      '# Django commands to diagnose and fix image issues:',
      '',
      '# 1. Check if media folder exists and has correct permissions',
      'ls -la media/',
      'ls -la media/animal_photos/',
      `ls -la media/animal_photos/${animalId}/`,
      '',
      '# 2. Check Django settings',
      'python manage.py shell -c "from django.conf import settings; print(f\'MEDIA_ROOT: {settings.MEDIA_ROOT}\'); print(f\'MEDIA_URL: {settings.MEDIA_URL}\')"',
      '',
      '# 3. Create missing directories if needed',
      'mkdir -p media/animal_photos',
      `mkdir -p media/animal_photos/${animalId}`,
      'chmod 755 media/',
      'chmod 755 media/animal_photos/',
      `chmod 755 media/animal_photos/${animalId}/`,
      '',
      '# 4. Check database for this animal',
      `python manage.py shell -c "from your_app.models import Animal; animal = Animal.objects.get(animal_id='${animalId}'); print(f'Front photo: {animal.front_photo_url}'); print(f'Left photo: {animal.left_photo_url}')"`,
      '',
      '# 5. Test media serving',
      'python manage.py runserver 0.0.0.0:8000',
      '# Then test: curl -I http://192.168.29.21:8000/media/',
      `# Then test: curl -I http://192.168.29.21:8000/media/animal_photos/${animalId}/front.jpg`
    ];
  }

  // Run diagnostics for multiple animals
  static async diagnoseBatch(animals: any[]): Promise<DiagnosticReport[]> {
    console.log(`🔬 Running batch diagnostics for ${animals.length} animals`);
    
    const reports: DiagnosticReport[] = [];
    
    for (const animal of animals) {
      try {
        const report = await this.diagnoseAnimal(animal.animal_id, animal);
        reports.push(report);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to diagnose animal ${animal.animal_id}:`, error);
      }
    }

    // Generate summary
    const totalAnimals = reports.length;
    const animalsWithIssues = reports.filter(r => r.brokenImages > 0).length;
    const totalMissingImages = reports.reduce((sum, r) => sum + r.brokenImages, 0);

    console.log(`📊 Batch diagnostics summary:`);
    console.log(`   🐄 Animals tested: ${totalAnimals}`);
    console.log(`   ⚠️ Animals with issues: ${animalsWithIssues}`);
    console.log(`   🖼️ Total missing images: ${totalMissingImages}`);

    return reports;
  }
}

// Export convenience functions
export const diagnoseAnimal = ImageDiagnostics.diagnoseAnimal.bind(ImageDiagnostics);
export const diagnoseBatch = ImageDiagnostics.diagnoseBatch.bind(ImageDiagnostics);
export const generateDjangoFixCommands = ImageDiagnostics.generateDjangoFixCommands.bind(ImageDiagnostics);