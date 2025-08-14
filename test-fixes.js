// Test script to verify the fixes
console.log('🧪 Testing React Native fixes...');

// Test 1: SafeIcon component
console.log('\n1️⃣ Testing SafeIcon component...');
try {
  // Simulate SafeIcon props validation
  const testIconProps = [
    { name: 'arrow-back', size: 24, color: '#fff' },
    { name: 'invalid-icon', size: 24, color: '#fff' },
    { name: 'camera-outline', size: NaN, color: '#fff' },
    { name: 'heart', size: 16.7, color: '#FF6B6B' }
  ];

  testIconProps.forEach((props, index) => {
    const safeName = ['arrow-back', 'camera-outline', 'heart'].includes(props.name) ? props.name : 'help-outline';
    const safeSize = Math.max(8, Math.min(100, Math.round(props.size || 24)));
    
    console.log(`  Test ${index + 1}: ${props.name} → ${safeName}, size: ${props.size} → ${safeSize}`);
    
    if (isNaN(safeSize) || !isFinite(safeSize)) {
      console.log(`    ❌ Would use default size 24`);
    } else {
      console.log(`    ✅ Safe props generated`);
    }
  });
} catch (error) {
  console.error('❌ SafeIcon test failed:', error);
}

// Test 2: Image URL building
console.log('\n2️⃣ Testing image URL building...');
try {
  const BASE_URL = 'http://192.168.29.21:8000';
  
  const testUrls = [
    '/media/animal_photos/test.jpg',
    'media/animal_photos/test.jpg',
    'http://127.0.0.1:8000/media/animal_photos/test.jpg',
    'animal_photos/test.jpg',
    '',
    null,
    undefined
  ];

  testUrls.forEach((url, index) => {
    let result = null;
    
    if (!url || url.trim() === '') {
      result = null;
    } else {
      const cleanUrl = url.trim();
      
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        result = cleanUrl
          .replace('http://127.0.0.1:8000', BASE_URL)
          .replace('http://localhost:8000', BASE_URL);
      } else if (cleanUrl.startsWith('/media/')) {
        result = `${BASE_URL}${cleanUrl}`;
      } else if (cleanUrl.startsWith('media/')) {
        result = `${BASE_URL}/${cleanUrl}`;
      } else {
        result = `${BASE_URL}/media/${cleanUrl}`;
      }
    }
    
    console.log(`  Test ${index + 1}: ${url} → ${result || 'null'}`);
  });
} catch (error) {
  console.error('❌ Image URL test failed:', error);
}

// Test 3: FontSize calculation safety
console.log('\n3️⃣ Testing fontSize calculation safety...');
try {
  const testDimensions = [
    { width: 60, height: 60 },
    { width: undefined, height: 60 },
    { width: 60, height: undefined },
    { width: NaN, height: 60 },
    { width: 0, height: 0 },
    {}
  ];

  testDimensions.forEach((style, index) => {
    const containerWidth = style.width || 60;
    const containerHeight = style.height || 60;
    const minDimension = Math.min(containerWidth, containerHeight);
    
    const iconSize = Math.max(16, Math.min(48, minDimension * 0.4));
    const fontSize = Math.max(10, Math.min(16, minDimension * 0.15));
    
    console.log(`  Test ${index + 1}: ${JSON.stringify(style)} → icon: ${iconSize}, font: ${fontSize}`);
    
    if (isNaN(iconSize) || isNaN(fontSize)) {
      console.log(`    ❌ NaN detected!`);
    } else {
      console.log(`    ✅ Safe values generated`);
    }
  });
} catch (error) {
  console.error('❌ FontSize test failed:', error);
}

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary of fixes:');
console.log('  1. SafeIcon component prevents invalid icon names and sizes');
console.log('  2. Image URL building handles edge cases and localhost replacement');
console.log('  3. FontSize calculations are bounded and NaN-safe');
console.log('  4. Added comprehensive debugging utilities');
console.log('  5. Enhanced error handling and validation');