# Media Files 404 Error - Complete Solution Guide

## Problem Analysis

Based on your Django server logs, the issue is clear:
- ✅ **API calls work** (200 responses for `/api/milch-animals/` and `/api/beneficiaries/`)
- ❌ **Media files missing** (404 responses for `/media/animal_photos/`)

The React Native app is correctly requesting images, but Django can't find them.

## Root Causes

1. **Missing Media Files**: Images weren't uploaded to the correct directory
2. **Django Configuration**: MEDIA_URL/MEDIA_ROOT not properly configured
3. **URL Routing**: Media URLs not included in Django's URL patterns
4. **File Permissions**: Media directory not accessible
5. **Database vs File System Mismatch**: Database has URLs but files don't exist

## Solutions

### Solution 1: Check Django Media Configuration

Ensure your Django `settings.py` has:

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Static files configuration (if needed)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
```

### Solution 2: Update Django URLs

In your main `urls.py` file:

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('your_app.urls')),
    # ... other URL patterns
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Solution 3: Check Media Directory Structure

Your Django project should have this structure:

```
your_django_project/
├── manage.py
├── media/
│   └── animal_photos/
│       ├── e630a0e3-8580-49c6-afab-817bbe0e68d1/
│       │   ├── front.jpg
│       │   ├── muzzle1.jpg
│       │   ├── muzzle2.jpg
│       │   ├── muzzle3.jpg
│       │   ├── left.jpg
│       │   └── right.jpg
│       ├── 480aa572-496d-4489-8202-7e87cf0e1bf3/
│       │   └── front.jpg
│       └── 060c41c6-e589-4046-8173-092df3e58df7/
│           ├── muzzle1.jpg
│           └── muzzle2.jpg
└── your_project/
    ├── settings.py
    └── urls.py
```

### Solution 4: Create Missing Directories

Run these commands in your Django project root:

```bash
# Create media directories
mkdir -p media/animal_photos

# Set proper permissions (Linux/Mac)
chmod 755 media
chmod 755 media/animal_photos

# For Windows, ensure the web server has read access
```

### Solution 5: Database Cleanup (if needed)

If your database has incorrect URLs, you might need to update them:

```python
# Django management command or shell
from your_app.models import MilchAnimal

# Check current URLs
animals = MilchAnimal.objects.all()
for animal in animals:
    print(f"Animal {animal.animal_id}:")
    print(f"  front_photo_url: {animal.front_photo_url}")
    print(f"  muzzle1_photo_url: {animal.muzzle1_photo_url}")
    # ... check other photo fields

# Update URLs if they're incorrect (example)
# animals.update(front_photo_url='animal_photos/{animal_id}/front.jpg')
```

### Solution 6: Test Media Access

Create a simple test view in Django:

```python
# views.py
from django.http import JsonResponse
from django.conf import settings
import os

def test_media(request):
    media_root = settings.MEDIA_ROOT
    animal_photos_dir = os.path.join(media_root, 'animal_photos')
    
    result = {
        'media_root': media_root,
        'media_root_exists': os.path.exists(media_root),
        'animal_photos_dir': animal_photos_dir,
        'animal_photos_exists': os.path.exists(animal_photos_dir),
        'animal_directories': []
    }
    
    if os.path.exists(animal_photos_dir):
        result['animal_directories'] = os.listdir(animal_photos_dir)
    
    return JsonResponse(result)

# urls.py
urlpatterns = [
    # ... other patterns
    path('api/test-media/', test_media, name='test_media'),
]
```

Then test: `http://127.0.0.1:8000/api/test-media/`

## React Native Improvements

The updated React Native code now includes:

1. **Enhanced Error Handling**: Better logging of image load failures
2. **CattleImage Component**: Graceful fallback for missing images
3. **Media Debugger**: Automatic testing of media URLs in development
4. **Debug Information**: Shows actual URLs being requested

## Testing Steps

1. **Start Django Server**: `python manage.py runserver`
2. **Test Media Configuration**: Visit `http://127.0.0.1:8000/api/test-media/`
3. **Check Media Directory**: Ensure `media/animal_photos/` exists
4. **Test Direct Access**: Try accessing a media URL directly in browser
5. **Run React Native App**: Check console for detailed error messages

## Quick Fix Commands

```bash
# In your Django project directory
mkdir -p media/animal_photos

# Create test directories for your animals
mkdir -p media/animal_photos/e630a0e3-8580-49c6-afab-817bbe0e68d1
mkdir -p media/animal_photos/480aa572-496d-4489-8202-7e87cf0e1bf3
mkdir -p media/animal_photos/060c41c6-e589-4046-8173-092df3e58df7

# Add placeholder images (optional)
# You can add actual images or create placeholder files for testing
```

## Expected Results

After implementing these solutions:
- ✅ Media URLs should return 200 instead of 404
- ✅ Images should load in the React Native app
- ✅ Console should show successful image loads
- ✅ Fallback placeholders for truly missing images

## Need Help?

If you're still getting 404 errors after trying these solutions:

1. Share your Django `settings.py` media configuration
2. Show the output of the test-media endpoint
3. Confirm the directory structure exists
4. Check Django server logs for any other errors

The React Native app is working correctly - the issue is entirely on the Django backend side with media file serving.