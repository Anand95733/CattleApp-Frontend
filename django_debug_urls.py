"""
URL configuration for CattleApp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, FileResponse, Http404
import os

# Debug view to check media configuration
def debug_media(request):
    media_root = settings.MEDIA_ROOT
    test_file = os.path.join(media_root, 'animal_photos', 'edb411aa-8db2-48b8-8ed0-93d2e5b6509e', 'front.jpg')
    
    # List all files in the animal directory
    animal_dir = os.path.join(media_root, 'animal_photos', 'edb411aa-8db2-48b8-8ed0-93d2e5b6509e')
    files_in_dir = []
    if os.path.exists(animal_dir):
        files_in_dir = os.listdir(animal_dir)
    
    return JsonResponse({
        'MEDIA_ROOT': str(media_root),
        'MEDIA_URL': settings.MEDIA_URL,
        'DEBUG': settings.DEBUG,
        'test_file_exists': os.path.exists(test_file),
        'test_file_path': test_file,
        'animal_dir_exists': os.path.exists(animal_dir),
        'files_in_animal_dir': files_in_dir,
        'media_root_exists': os.path.exists(media_root)
    })

# Manual media serving view for testing
def serve_media_manual(request, path):
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    print(f"🔍 Trying to serve: {file_path}")
    print(f"🔍 File exists: {os.path.exists(file_path)}")
    
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'))
    else:
        raise Http404(f"File not found: {file_path}")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.urls')),
    path('debug-media/', debug_media),  # Debug endpoint
    path('manual-media/<path:path>', serve_media_manual),  # Manual media serving
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    print(f"🔧 Media serving configured: {settings.MEDIA_URL} -> {settings.MEDIA_ROOT}")
else:
    print("⚠️ DEBUG is False - media files won't be served automatically")