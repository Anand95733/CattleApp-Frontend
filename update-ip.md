# Quick IP Update Guide

## Step 1: Find Your Computer's IP
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

## Step 2: Update API Configuration
Edit `src/config/api.ts` and change:
```typescript
BASE_URL: 'http://YOUR_IP_HERE:8000',
MEDIA_URL: 'http://YOUR_IP_HERE:8000/media/',
```

## Step 3: Test Connection
1. Open app
2. Go to Settings → Developer Tools → Network Test
3. Click "Run Network Test"

## Common IPs:
- **Android Emulator:** `10.0.2.2:8000`
- **iOS Simulator:** `127.0.0.1:8000`
- **Physical Device:** Your computer's actual IP (from ipconfig)

## Troubleshooting:
1. Make sure Django server is running: `python manage.py runserver 0.0.0.0:8000`
2. Make sure your device/emulator is on the same network
3. Check firewall settings if using physical device
4. Try accessing the API in browser: `http://YOUR_IP:8000/api/beneficiaries/`