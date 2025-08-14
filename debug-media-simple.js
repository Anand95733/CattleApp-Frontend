// Simple debug script using built-in fetch (Node.js 18+)
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

async function testMediaUrls() {
  console.log('🔍 Testing media URL accessibility...\n');
  
  for (const baseUrl of BASE_URLS) {
    console.log(`📡 Testing base URL: ${baseUrl}`);
    
    try {
      // Test if server is reachable
      const healthResponse = await fetch(`${baseUrl}/api/healthcheck/`, { 
        signal: AbortSignal.timeout(3000) 
      });
      
      if (healthResponse.ok) {
        console.log(`✅ Server is reachable at ${baseUrl}`);
        
        // Test one animal's API data
        const animalId = SAMPLE_ANIMAL_IDS[0];
        try {
          const animalResponse = await fetch(`${baseUrl}/api/milch-animals/${animalId}/`, { 
            signal: AbortSignal.timeout(3000) 
          });
          
          if (animalResponse.ok) {
            const animalData = await animalResponse.json();
            console.log(`\n📊 Animal data for ${animalId}:`);
            console.log(`  - front_photo_url: ${animalData.front_photo_url || 'null'}`);
            console.log(`  - muzzle1_photo_url: ${animalData.muzzle1_photo_url || 'null'}`);
            console.log(`  - muzzle2_photo_url: ${animalData.muzzle2_photo_url || 'null'}`);
            console.log(`  - muzzle3_photo_url: ${animalData.muzzle3_photo_url || 'null'}`);
            console.log(`  - left_photo_url: ${animalData.left_photo_url || 'null'}`);
            console.log(`  - right_photo_url: ${animalData.right_photo_url || 'null'}`);
            
            // Test if the media URLs actually work
            const photoUrls = [
              animalData.front_photo_url,
              animalData.muzzle1_photo_url,
              animalData.muzzle2_photo_url,
              animalData.muzzle3_photo_url,
              animalData.left_photo_url,
              animalData.right_photo_url
            ].filter(Boolean);
            
            console.log(`\n🖼️ Testing ${photoUrls.length} photo URLs:`);
            for (const photoUrl of photoUrls) {
              try {
                const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`;
                const response = await fetch(fullUrl, { 
                  method: 'HEAD',
                  signal: AbortSignal.timeout(2000) 
                });
                
                if (response.ok) {
                  console.log(`  ✅ ${photoUrl}: Available`);
                } else {
                  console.log(`  ❌ ${photoUrl}: ${response.status} ${response.statusText}`);
                }
              } catch (error) {
                console.log(`  ❌ ${photoUrl}: ${error.message}`);
              }
            }
          } else {
            console.log(`❌ Animal API failed: ${animalResponse.status}`);
          }
        } catch (error) {
          console.log(`❌ Animal API error: ${error.message}`);
        }
        
        break; // Stop after first working server
      }
    } catch (error) {
      console.log(`❌ Server unreachable: ${error.message}`);
    }
  }
  
  console.log('\n💡 Common Solutions:');
  console.log('====================');
  console.log('1. Check if media files exist in Django MEDIA_ROOT directory');
  console.log('2. Verify Django settings.py has correct MEDIA_URL and MEDIA_ROOT');
  console.log('3. Ensure Django urls.py includes media URL patterns');
  console.log('4. Check file permissions on media directory');
  console.log('5. Verify images were uploaded to correct animal_photos subdirectories');
}

testMediaUrls().catch(console.error);