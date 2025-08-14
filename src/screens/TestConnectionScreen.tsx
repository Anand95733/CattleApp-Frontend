import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { API_CONFIG, apiGet } from '../config/api';

const TestConnectionScreen = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setTesting(true);
    setResults([]);
    
    addResult('🔄 Starting connection test...');
    
    try {
      // Test 1: Beneficiaries list
      addResult('📋 Testing beneficiaries list...');
      const beneficiaries = await apiGet('/api/beneficiaries/', {
        timeout: 10000,
        cache: false
      });
      addResult(`✅ Beneficiaries: Found ${beneficiaries.count} items`);
      
      // Test 2: Individual beneficiary
      if (beneficiaries.results && beneficiaries.results.length > 0) {
        const firstBeneficiary = beneficiaries.results[0];
        addResult(`👤 Testing individual beneficiary: ${firstBeneficiary.beneficiary_id}`);
        
        const beneficiaryDetail = await apiGet(`/api/beneficiaries/${firstBeneficiary.beneficiary_id}/`, {
          timeout: 10000,
          cache: false
        });
        addResult(`✅ Beneficiary detail: ${beneficiaryDetail.name}`);
      }
      
      // Test 3: Sellers list
      addResult('🏪 Testing sellers list...');
      const sellers = await apiGet('/api/sellers/', {
        timeout: 10000,
        cache: false
      });
      addResult(`✅ Sellers: Found ${sellers.count} items`);
      
      addResult('🎉 All tests passed! Connection is working.');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error.message}`);
      console.error('Connection test error:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Test</Text>
      <Text style={styles.subtitle}>Test API connection to Django server</Text>
      
      <TouchableOpacity
        style={[styles.testButton, testing && styles.testButtonDisabled]}
        onPress={testConnection}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.testButtonText}>Run Connection Test</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.configInfo}>
        <Text style={styles.configTitle}>Current Configuration:</Text>
        <Text style={styles.configText}>Base URL: {API_CONFIG.BASE_URL}</Text>
        <Text style={styles.configText}>Fallback URLs:</Text>
        {API_CONFIG.FALLBACK_URLS.map((url, index) => (
          <Text key={index} style={styles.configText}>  • {url}</Text>
        ))}
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  testButton: {
    backgroundColor: '#6e45e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  configInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  configText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default TestConnectionScreen;