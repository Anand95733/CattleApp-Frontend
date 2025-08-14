import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import SimpleNetworkManager from '../utils/simpleNetworkManager';
import { API_CONFIG } from '../config/api';

const NetworkDebugPanel: React.FC = () => {
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      const networkManager = SimpleNetworkManager.getInstance();
      const status = networkManager.getStatus();
      setCurrentNetwork(status.lastWorkingUrl ? 'Connected' : 'Unknown');
      setWorkingUrl(status.lastWorkingUrl);
    };

    updateNetworkInfo();
    const interval = setInterval(updateNetworkInfo, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefreshNetwork = async () => {
    setIsRefreshing(true);
    try {
      const networkManager = SimpleNetworkManager.getInstance();
      networkManager.clearCache();
      
      setCurrentNetwork('Unknown');
      setWorkingUrl(null);
      
      Alert.alert('Success', 'Network cache cleared - will rediscover on next API call');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh network information');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDiscoverUrl = async () => {
    setIsRefreshing(true);
    try {
      const networkManager = SimpleNetworkManager.getInstance();
      const discoveredUrl = await networkManager.findWorkingUrl();
      
      setWorkingUrl(discoveredUrl);
      setCurrentNetwork('Connected');
      Alert.alert('Success', `Discovered working URL: ${discoveredUrl}`);
    } catch (error) {
      Alert.alert('Error', `Failed to discover working URL: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearConfigs = async () => {
    Alert.alert(
      'Clear Network Cache',
      'This will clear the cached working URL. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const networkManager = SimpleNetworkManager.getInstance();
              networkManager.clearCache();
              setWorkingUrl(null);
              setCurrentNetwork('Unknown');
              Alert.alert('Success', 'Network cache cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌐 Network Debug Panel</Text>
      
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <Text style={styles.infoText}>Network: {currentNetwork || 'Unknown'}</Text>
        <Text style={styles.infoText}>Working URL: {workingUrl || 'Not set'}</Text>
        <Text style={styles.infoText}>Current BASE_URL: {API_CONFIG.BASE_URL}</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleRefreshNetwork}
          disabled={isRefreshing}
        >
          <Text style={styles.buttonText}>
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh Network'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleDiscoverUrl}
          disabled={isRefreshing}
        >
          <Text style={styles.buttonText}>
            {isRefreshing ? 'Discovering...' : '🔍 Discover Working URL'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearConfigs}
          disabled={isRefreshing}
        >
          <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpSection}>
        <Text style={styles.sectionTitle}>How it works:</Text>
        <Text style={styles.helpText}>
          • The app automatically detects when you switch networks{'\n'}
          • It remembers the working URL for each network{'\n'}
          • No more trying multiple IPs every time!{'\n'}
          • Use "Discover Working URL" if having connection issues
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonSection: {
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NetworkDebugPanel;