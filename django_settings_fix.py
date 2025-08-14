# Updated settings.py - Media files section
# Replace your existing media configuration with this:

# Media files (uploads) - Updated for better compatibility
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Use os.path.join instead of BASE_DIR / 'media'

# Also make sure you have this import at the top
import os