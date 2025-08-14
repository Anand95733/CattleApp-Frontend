// Simple network test script for debugging
// Run this in your browser console or Node.js to test the API

const API_BASE_URL = 'http://192.168.1.11:8000';

async function testNetworkConnection() {
  console.log('🔍 Testing network connection to Django server...');
  console.log('📡 Base URL:', API_BASE_URL);
  
  // Test 1: Basic connectivity
  try {
    console.log('\n1️⃣ Testing basic connectivity...');
    const response = await fetch(`${API_BASE_URL}/api/healthcheck/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    console.log('✅ Basic connectivity:', response.status, response.statusText);
  } catch (error) {
    console.error('❌ Basic connectivity failed:', error.message);
  }
  
  // Test 2: List all animals
  try {
    console.log('\n2️⃣ Testing animals list endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/milch-animals/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Animals list:', data);
      
      // Test 3: Get first animal details
      if (data.results && data.results.length > 0) {
        const firstAnimal = data.results[0];
        console.log('\n3️⃣ Testing specific animal details...');
        console.log('🐄 Testing with animal ID:', firstAnimal.animal_id);
        
        const detailResponse = await fetch(`${API_BASE_URL}/api/milch-animals/${firstAnimal.animal_id}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          console.log('✅ Animal details:', detailData);
        } else {
          console.error('❌ Animal details failed:', detailResponse.status, detailResponse.statusText);
        }
      }
    } else {
      console.error('❌ Animals list failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Animals list error:', error.message);
  }
}

// Run the test
testNetworkConnection();

// Instructions:
console.log(`
🔧 DEBUGGING INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Make sure your Django server is running:
   python manage.py runserver 0.0.0.0:8000

2. Check if you can access the API in your browser:
   ${API_BASE_URL}/api/milch-animals/

3. Make sure your phone and computer are on the same network

4. Check your computer's IP address:
   - Windows: ipconfig
   - Mac/Linux: ifconfig
   
5. Update the IP address in API_CONFIG if needed

6. Check Django server logs for any errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);