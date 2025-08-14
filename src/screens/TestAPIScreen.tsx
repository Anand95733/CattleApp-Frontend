import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { API_CONFIG, apiGet, apiCallParallel } from '../config/api';

const TestAPIScreen = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const testSingleAPI = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const startTime = Date.now();
      const data = await apiGet(API_CONFIG.ENDPOINTS.BENEFICIARIES, { 
        cache: false,
        timeout: API_CONFIG.FAST_TIMEOUT 
      });
      const duration = Date.now() - startTime;
      
      setResults([{
        test: 'Single API Call',
        status: 'SUCCESS',
        duration: `${duration}ms`,
        count: data?.results?.length || 0,
        url: API_CONFIG.BASE_URL
      }]);
    } catch (error) {
      setResults([{
        test: 'Single API Call',
        status: 'FAILED',
        error: error.message,
        url: API_CONFIG.BASE_URL
      }]);
    } finally {
      setLoading(false);
    }
  };

  const testParallelAPI = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const startTime = Date.now();
      const data = await apiCallParallel({
        beneficiaries: { 
          endpoint: API_CONFIG.ENDPOINTS.BENEFICIARIES,
          options: { cache: false, timeout: API_CONFIG.FAST_TIMEOUT }
        },
        sellers: { 
          endpoint: API_CONFIG.ENDPOINTS.SELLERS,
          options: { cache: false, timeout: API_CONFIG.FAST_TIMEOUT }
        }
      });
      const duration = Date.now() - startTime;
      
      setResults([{
        test: 'Parallel API Calls',
        status: 'SUCCESS',
        duration: `${duration}ms`,
        beneficiaries: data.beneficiaries?.results?.length || 0,
        sellers: data.sellers?.results?.length || 0,
        url: API_CONFIG.BASE_URL
      }]);
    } catch (error) {
      setResults([{
        test: 'Parallel API Calls',
        status: 'FAILED',
        error: error.message,
        url: API_CONFIG.BASE_URL
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Performance Test</Text>
      <Text style={styles.subtitle}>Current Server: {API_CONFIG.BASE_URL}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={testSingleAPI}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Single API Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testParallelAPI}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Parallel API Calls</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6e45e2" />
          <Text style={styles.loadingText}>Testing API performance...</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <Text style={styles.resultTitle}>{result.test}</Text>
            <Text style={[styles.resultStatus, 
              result.status === 'SUCCESS' ? styles.success : styles.error
            ]}>
              {result.status}
            </Text>
            {result.duration && <Text style={styles.resultText}>Duration: {result.duration}</Text>}
            {result.count !== undefined && <Text style={styles.resultText}>Records: {result.count}</Text>}
            {result.beneficiaries !== undefined && <Text style={styles.resultText}>Beneficiaries: {result.beneficiaries}</Text>}
            {result.sellers !== undefined && <Text style={styles.resultText}>Sellers: {result.sellers}</Text>}
            {result.error && <Text style={styles.errorText}>Error: {result.error}</Text>}
            <Text style={styles.urlText}>URL: {result.url}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6e45e2',
  },
  secondaryButton: {
    backgroundColor: '#88d3ce',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 5,
  },
  urlText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default TestAPIScreen;