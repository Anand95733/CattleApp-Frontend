// Debug script to test media URL accessibility
const fetch = require('node-fetch');

const BASE_URLS = [
  'http://127.0.0.1:8000',
  'http://192.168.29.21:8000',
  'http://192.168.1.11:8000',
  'http://10.0.2.2:8000',
];

// Sample animal IDs from your logs
const SAMPLE_ANIMAL_IDS = [
  'e630a0e3-8580-49c6-afab-817bbe0e68d1',
  '480aa572-496d-4489-8202-7e87cf0e1bf3',
  '060c41c6-e589-4046-8173-092df3e58df7'
];

const PHOTO_TYPES = ['front.jpg', 'muzzle1.jpg', 'muzzle2.jpg', 'muzzle3.jpg', 'left.jpg', 'right.jpg'];

async function testMediaUrls() {
  console.log('🔍 Testing media URL accessibility...\n');
  
  for (const baseUrl of BASE_URLS) {
    console.log(`\n📡 Testing base URL: ${baseUrl}`);
    
    // Test if server is reachable
    try {
      const healthResponse = await fetch(`${baseUrl}/api/healthcheck/`, { timeout: 3000 });
      if (healthResponse.ok) {
        console.log(`✅ Server is reachable at ${baseUrl}`);
        
        // Test media directory access
        try {
          const mediaResponse = await fetch(`${baseUrl}/media/`, { timeout: 3000 });
          console.log(`📁 Media directory status: ${mediaResponse.status} ${mediaResponse.statusText}`);
        } catch (error) {
          console.log(`❌ Media directory test failed: ${error.message}`);
        }
        
        // Test specific animal photo URLs
        for (const animalId of SAMPLE_ANIMAL_IDS.slice(0, 1)) { // Test only first animal to avoid spam
          console.log(`\n🐄 Testing animal ${animalId}:`);
          
          for (const photoType of PHOTO_TYPES) {
            const mediaUrl = `${baseUrl}/media/animal_photos/${animalId}/${photoType}`;
            try {
              const response = await fetch(mediaUrl, { 
                method: 'HEAD', // Use HEAD to avoid downloading the image
                timeout: 2000 
              });
              
              if (response.ok) {
                console.log(`  ✅ ${photoType}: Available (${response.status})`);
              } else {
                console.log(`  ❌ ${photoType}: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.log(`  ❌ ${photoType}: ${error.message}`);
            }
          }
        }
        
        // Test API endpoint for animal data
        try {
          const animalResponse = await fetch(`${baseUrl}/api/milch-animals/${SAMPLE_ANIMAL_IDS[0]}/`, { timeout: 3000 });
          if (animalResponse.ok) {
            const animalData = await animalResponse.json();
            console.log(`\n📊 Animal data structure:`);
            console.log(`  - front_photo_url: ${animalData.front_photo_url || 'null'}`);
            console.log(`  - muzzle1_photo_url: ${animalData.muzzle1_photo_url || 'null'}`);
            console.log(`  - muzzle2_photo_url: ${animalData.muzzle2_photo_url || 'null'}`);
            console.log(`  - muzzle3_photo_url: ${animalData.muzzle3_photo_url || 'null'}`);
            console.log(`  - left_photo_url: ${animalData.left_photo_url || 'null'}`);
            console.log(`  - right_photo_url: ${animalData.right_photo_url || 'null'}`);
          } else {
            console.log(`❌ Animal API test failed: ${animalResponse.status}`);
          }
        } catch (error) {
          console.log(`❌ Animal API test error: ${error.message}`);
        }
        
        break; // Stop after first working server
      }
    } catch (error) {
      console.log(`❌ Server unreachable: ${error.message}`);
    }
  }
}

async function testDjangoMediaConfiguration() {
  console.log('\n🔧 Django Media Configuration Test');
  console.log('=====================================');
  
  const testUrls = [
    '/media/',
    '/media/animal_photos/',
    '/static/',
    '/admin/',
  ];
  
  for (const baseUrl of BASE_URLS) {
    try {
      const healthResponse = await fetch(`${baseUrl}/api/healthcheck/`, { timeout: 3000 });
      if (healthResponse.ok) {
        console.log(`\n📡 Testing Django configuration at ${baseUrl}:`);
        
        for (const testPath of testUrls) {
          try {
            const response = await fetch(`${baseUrl}${testPath}`, { timeout: 2000 });
            console.log(`  ${testPath}: ${response.status} ${response.statusText}`);
          } catch (error) {
            console.log(`  ${testPath}: Error - ${error.message}`);
          }
        }
        break;
      }
    } catch (error) {
      continue;
    }
  }
}

// Run the tests
async function runAllTests() {
  await testMediaUrls();
  await testDjangoMediaConfiguration();
  
  console.log('\n💡 Debugging Tips:');
  console.log('==================');
  console.log('1. Check if Django MEDIA_ROOT is configured correctly');
  console.log('2. Verify that animal_photos directory exists in MEDIA_ROOT');
  console.log('3. Ensure Django urls.py includes media URL patterns');
  console.log('4. Check file permissions on media directory');
  console.log('5. Verify that images were actually uploaded to the correct paths');
  console.log('\nExample Django settings.py configuration:');
  console.log('MEDIA_URL = "/media/"');
  console.log('MEDIA_ROOT = os.path.join(BASE_DIR, "media")');
  console.log('\nExample Django urls.py:');
  console.log('from django.conf import settings');
  console.log('from django.conf.urls.static import static');
  console.log('urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)');
}

runAllTests().catch(console.error);