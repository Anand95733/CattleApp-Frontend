import { API_CONFIG } from '../config/api';
import NetworkManager from './networkManager';

/**
 * Quick utility to update your current IP address
 * Call this when you know your server IP has changed
 */
export const updateCurrentIP = async (newIP: string): Promise<boolean> => {
  try {
    const newBaseUrl = `http://${newIP}:8000`;
    
    // Test if the new IP works
    const testResponse = await fetch(`${newBaseUrl}/api/healthcheck/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 5000,
    });

    if (testResponse.ok) {
      // Update API config
      API_CONFIG.BASE_URL = newBaseUrl;
      API_CONFIG.MEDIA_URL = `${newBaseUrl}/media/`;
      
      // Update network manager
      const networkManager = NetworkManager.getInstance();
      await networkManager.initialize();
      
      console.log(`✅ Successfully updated IP to: ${newIP}`);
      return true;
    } else {
      console.error(`❌ New IP ${newIP} is not responding`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to update IP to ${newIP}:`, error);
    return false;
  }
};

/**
 * Get your current computer's local IP addresses
 * This is a helper function - you'll need to check your actual IP
 */
export const getCurrentIPSuggestions = (): string[] => {
  // Common IP ranges for local networks
  return [
    '192.168.1.100',   // Common router range
    '192.168.0.100',   // Another common range
    '192.168.29.21',   // Your current IP
    '10.0.0.100',      // Some routers use this
    '172.16.0.100',    // Corporate networks
  ];
};

/**
 * Quick test to see which IPs are currently working
 */
export const testMultipleIPs = async (ips: string[]): Promise<string[]> => {
  const workingIPs: string[] = [];
  
  const testPromises = ips.map(async (ip) => {
    try {
      const response = await fetch(`http://${ip}:8000/api/healthcheck/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 3000,
      });
      
      if (response.ok) {
        workingIPs.push(ip);
        console.log(`✅ IP ${ip} is working`);
      }
    } catch (error) {
      console.log(`❌ IP ${ip} failed: ${error.message}`);
    }
  });
  
  await Promise.all(testPromises);
  return workingIPs;
};