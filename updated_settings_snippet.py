# Updated ALLOWED_HOSTS section for settings.py

# Base URL Configuration
BASE_URL = get_setting('BASE_URL')
LOCAL_IP = get_setting('LOCAL_IP')
LOCAL_HOST = 'localhost'
LOCAL_IP_127 = '127.0.0.1'

# Allowed hosts derived from base configuration - EXPANDED FOR DEVELOPMENT
ALLOWED_HOSTS = [
    LOCAL_IP_127,           # 127.0.0.1
    LOCAL_HOST,             # localhost
    LOCAL_IP,               # Current IP from config (192.168.29.21)
    '192.168.1.11',         # Previous IP (in case you switch back)
    '192.168.29.21',        # Current IP (explicit)
    '0.0.0.0',              # Allow all IPs in development
    '*',                    # Allow all hosts in development (use with caution)
]

# Alternative: For development only, you can use this simpler approach
if get_setting('DEBUG', False):
    ALLOWED_HOSTS = ['*']  # Allow all hosts in development mode