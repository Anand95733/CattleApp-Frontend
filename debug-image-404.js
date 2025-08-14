/**
 * Image 404 Diagnostic Script
 * 
 * This script helps diagnose and fix the specific 404 errors for cattle images,
 * particularly the issue with animal db2c211e-f6bd-43cf-8c19-10f26add9cc1
 */

const API_BASE_URL = 'http://192.168.29.21:8000';

// Test if a URL exists
async function testUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      url,
      exists: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      url,
      exists: false,
      status: 0,
      statusText: error.message
    };
  }
}

// Test multiple URLs
async function testUrls(urls) {
  console.log(`🔍 Testing ${urls.length} URLs...`);
  const results = [];
  
  for (const url of urls) {
    const result = await testUrl(url);
    results.push(result);
    
    if (result.exists) {
      console.log(`✅ ${result.status} - ${url}`);
    } else {
      console.log(`❌ ${result.status} - ${url} (${result.statusText})`);
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Main diagnostic function
async function diagnoseImageIssues() {
  console.log('🔬 Starting Image 404 Diagnostics');
  console.log('=====================================');
  
  // Step 1: Test server connectivity
  console.log('\n1. Testing server connectivity...');
  const serverTest = await testUrl(`${API_BASE_URL}/api/healthcheck/`);
  if (!serverTest.exists) {
    console.error('🚨 CRITICAL: Django server is not reachable!');
    console.error('   → Check if Django development server is running');
    console.error('   → Verify the IP address is correct');
    return;
  }
  console.log('✅ Django server is reachable');
  
  // Step 2: Test media folder accessibility
  console.log('\n2. Testing media folder...');
  const mediaTest = await testUrl(`${API_BASE_URL}/media/`);
  if (!mediaTest.exists) {
    console.error('🚨 CRITICAL: Media folder is not accessible!');
    console.error('   → Add media URL configuration to Django urls.py');
    console.error('   → Ensure MEDIA_URL and MEDIA_ROOT are set in settings.py');
    return;
  }
  console.log('✅ Media folder is accessible');
  
  // Step 3: Test the specific problematic animal
  console.log('\n3. Testing problematic animal: db2c211e-f6bd-43cf-8c19-10f26add9cc1');
  const animalId = 'db2c211e-f6bd-43cf-8c19-10f26add9cc1';
  const animalUrls = [
    `${API_BASE_URL}/media/animal_photos/${animalId}/front.jpg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/front.jpeg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/front.png`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/left.jpg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/right.jpg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/muzzle1.jpg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/muzzle2.jpg`,
    `${API_BASE_URL}/media/animal_photos/${animalId}/muzzle3.jpg`,
  ];
  
  const animalResults = await testUrls(animalUrls);
  const workingImages = animalResults.filter(r => r.exists);
  const brokenImages = animalResults.filter(r => !r.exists);
  
  console.log(`\n📊 Results for animal ${animalId}:`);
  console.log(`   ✅ Working images: ${workingImages.length}`);
  console.log(`   ❌ Missing images: ${brokenImages.length}`);
  
  if (workingImages.length > 0) {
    console.log('\n✅ Working images:');
    workingImages.forEach(img => console.log(`   ${img.url}`));
  }
  
  if (brokenImages.length > 0) {
    console.log('\n❌ Missing images:');
    brokenImages.forEach(img => console.log(`   ${img.url}`));
  }
  
  // Step 4: Test animal folder existence
  console.log('\n4. Testing animal folder...');
  const folderTest = await testUrl(`${API_BASE_URL}/media/animal_photos/${animalId}/`);
  if (!folderTest.exists) {
    console.error(`🚨 Animal folder does not exist: /media/animal_photos/${animalId}/`);
  } else {
    console.log(`✅ Animal folder exists: /media/animal_photos/${animalId}/`);
  }
  
  // Step 5: Generate fix suggestions
  console.log('\n🔧 FIX SUGGESTIONS:');
  console.log('==================');
  
  if (brokenImages.length > 0) {
    console.log('\n1. Check Django media folder on server:');
    console.log(`   cd /path/to/your/django/project`);
    console.log(`   ls -la media/animal_photos/${animalId}/`);
    
    console.log('\n2. If folder is missing, create it:');
    console.log(`   mkdir -p media/animal_photos/${animalId}`);
    console.log(`   chmod 755 media/animal_photos/${animalId}`);
    
    console.log('\n3. If images are missing, check database:');
    console.log(`   python manage.py shell`);
    console.log(`   >>> from your_app.models import Animal`);
    console.log(`   >>> animal = Animal.objects.get(animal_id='${animalId}')`);
    console.log(`   >>> print(f'Front photo: {animal.front_photo_url}')`);
    console.log(`   >>> print(f'All photos: {[animal.front_photo_url, animal.left_photo_url, animal.right_photo_url]}')`);
    
    console.log('\n4. If database paths are wrong, update them:');
    console.log(`   >>> animal.front_photo_url = 'animal_photos/${animalId}/front.jpg'`);
    console.log(`   >>> animal.save()`);
    
    console.log('\n5. If images were never uploaded, re-upload them through the app');
    
    console.log('\n6. Django settings check:');
    console.log(`   # In settings.py, ensure you have:`);
    console.log(`   MEDIA_URL = '/media/'`);
    console.log(`   MEDIA_ROOT = os.path.join(BASE_DIR, 'media')`);
    console.log(`   `);
    console.log(`   # In main urls.py, ensure you have:`);
    console.log(`   from django.conf import settings`);
    console.log(`   from django.conf.urls.static import static`);
    console.log(`   `);
    console.log(`   if settings.DEBUG:`);
    console.log(`       urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`);
  }
  
  if (workingImages.length > 0 && brokenImages.length > 0) {
    console.log('\n✅ GOOD NEWS: Some images work, so Django media serving is configured correctly!');
    console.log('   The issue is just missing image files, not configuration.');
  }
  
  if (workingImages.length === 0 && brokenImages.length > 0) {
    console.log('\n🚨 BAD NEWS: No images work, indicating a systematic configuration issue.');
    console.log('   Focus on Django media serving configuration first.');
  }
  
  console.log('\n🏁 Diagnostics complete!');
}

// Run the diagnostics
diagnoseImageIssues().catch(error => {
  console.error('Diagnostics failed:', error);
});