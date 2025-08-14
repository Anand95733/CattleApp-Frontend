"""
Configuration file for different environments
"""
import os

# Environment configuration - CHANGED FROM 'staging' TO 'development'
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')  # development, staging, production


# Development configuration
DEVELOPMENT_CONFIG = {
    'BASE_URL': 'http://192.168.29.21:8000',  # Updated to match your current IP
    'LOCAL_IP': '192.168.29.21',              # Updated to match your current IP
    'DB_HOST': 'localhost',
    'DB_PASSWORD': 'anand123',
    'DEBUG': True,
    'CORS_ALLOW_ALL_ORIGINS': True,
}

# Staging configuration
STAGING_CONFIG = {
    'BASE_URL': 'http://staging.cattleapp.com',
    'LOCAL_IP': '192.168.29.21',
    'DB_HOST': 'localhost',
    'DB_PASSWORD': 'anand123',
    'DEBUG': False,
    'CORS_ALLOW_ALL_ORIGINS': False,
}

# Production configuration
PRODUCTION_CONFIG = {
    'BASE_URL': 'https://cattleapp.com',
    'LOCAL_IP': '192.168.29.21',
    'DB_HOST': 'production-db-host',
    'DB_PASSWORD': 'production_password',
    'DEBUG': False,
    'CORS_ALLOW_ALL_ORIGINS': False,
}

# Configuration mapping
CONFIG_MAP = {
    'development': DEVELOPMENT_CONFIG,
    'staging': STAGING_CONFIG,
    'production': PRODUCTION_CONFIG,
}

def get_config():
    """Get configuration based on current environment"""
    return CONFIG_MAP.get(ENVIRONMENT, DEVELOPMENT_CONFIG)

def get_setting(key, default=None):
    """Get a specific setting from the current environment configuration"""
    config = get_config()
    return os.environ.get(key, config.get(key, default))