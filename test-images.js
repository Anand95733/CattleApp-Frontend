// Quick test to check image URLs
const API_CONFIG = {
  BASE_URL: 'http://127.0.0.1:8000',
  MEDIA_URL: 'http://127.0.0.1:8000/media/',
};

// Sample data from your logs
const sampleAnimal = {
  animal_id: 'e630a0e3-8580-49c6-afab-817bbe0e68d1',
  front_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/front.jpg',
  muzzle1_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle1.jpg',
  muzzle2_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle2.jpg',
  muzzle3_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle3.jpg',
  left_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/left.jpg',
  right_photo_url: 'animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/right.jpg',
};

function buildMediaUrl(imagePath) {
  if (!imagePath) return null;
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/media/')) {
    return `${API_CONFIG.BASE_URL}${imagePath}`;
  }
  
  if (imagePath.startsWith('media/')) {
    return `${API_CONFIG.BASE_URL}/${imagePath}`;
  }
  
  return `${API_CONFIG.BASE_URL}/media/${imagePath}`;
}

console.log('🔍 Testing image URL generation:');
console.log('================================');

Object.entries(sampleAnimal).forEach(([key, value]) => {
  if (key.includes('photo_url')) {
    const fullUrl = buildMediaUrl(value);
    console.log(`${key}: ${fullUrl}`);
  }
});

console.log('\n📋 Expected URLs in Django logs:');
console.log('=================================');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/front.jpg');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle1.jpg');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle2.jpg');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/muzzle3.jpg');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/left.jpg');
console.log('GET /media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1/right.jpg');