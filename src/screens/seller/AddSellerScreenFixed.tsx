import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, buildApiUrl } from '../../config/api';
import NetInfo from '@react-native-community/netinfo';
import { insertSellerLocal } from '../../database/repositories/sellerRepo';

type AddSellerNavigationProp = StackNavigationProp<RootStackParamList, 'AddSeller'>;

const AddSellerScreenFixed = () => {
  const navigation = useNavigation<AddSellerNavigationProp>();

  const [form, setForm] = useState({
    name: '',
    father_or_husband: '',
    aadhaar_id: '',
    village: '',
    mandal: '',
    district: '',
    state: '',
    phone_number: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields = [
      'name',
      'father_or_husband',
      'aadhaar_id',
      'village',
      'mandal',
      'district',
      'state',
      'phone_number',
    ];

    for (const field of requiredFields) {
      if (!form[field as keyof typeof form]) {
        Alert.alert('Validation Error', `Please enter ${field.replace(/_/g, ' ')}`);
        return false;
      }
    }

    if (!/^\d{10}$/.test(form.phone_number)) {
      Alert.alert('Validation Error', 'Phone number must be 10 digits');
      return false;
    }

    if (!/^\d{12}$/.test(form.aadhaar_id)) {
      Alert.alert('Validation Error', 'Aadhaar number must be 12 digits');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const payload = {
      ...form,
      phone_number: parseInt(form.phone_number, 10), // Convert to integer as required by API
    };

    try {
      // Decide online/offline first
      const state = await NetInfo.fetch();
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!isOnline) {
        // Save offline to SQLite
        try {
          await insertSellerLocal({
            server_id: null,
            name: form.name,
            father_or_husband: form.father_or_husband,
            village: form.village,
            mandal: form.mandal,
            district: form.district,
            state: form.state,
            phone_number: form.phone_number,
          });
          Alert.alert('Saved Offline', 'Seller will sync automatically when online.');
          
          // Reset form after successful save
          setForm({
            name: '',
            father_or_husband: '',
            aadhaar_id: '',
            village: '',
            mandal: '',
            district: '',
            state: '',
            phone_number: '',
          });
          return; // Exit early for offline save
        } catch (offlineError) {
          console.error('Offline save failed:', offlineError);
          Alert.alert('Error', 'Failed to save offline: ' + (offlineError?.message || 'Unknown error'));
          return;
        }
      } else {
        // Online: post to server
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.SELLERS), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (response.ok) {
          Alert.alert('Success', 'Seller added successfully');
          navigation.navigate('SellerProfile', { seller_id: result.seller_id });
        } else {
          Alert.alert('Error', result.detail || 'Something went wrong');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (field: string): string => {
    switch (field) {
      case 'name': return 'person-outline';
      case 'father_or_husband': return 'man-outline';
      case 'aadhaar_id': return 'id-card-outline';
      case 'village': return 'home-outline';
      case 'mandal': return 'map-outline';
      case 'district': return 'business-outline';
      case 'state': return 'flag-outline';
      case 'phone_number': return 'call-outline';
      default: return 'information-circle-outline';
    }
  };

  const getFieldLabel = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderFormField = (field: string, index: number) => {
    const fieldValue = form[field as keyof typeof form];
    
    return (
      <View key={field} style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Ionicons 
            name={getIcon(field)} 
            size={18} 
            color="#6e45e2" 
            style={styles.fieldIcon} 
          />
          <View style={styles.labelContainer}>
            <Text style={styles.label}>
              {getFieldLabel(field)}
            </Text>
            <Text style={styles.required}> *</Text>
          </View>
        </View>
        <TextInput
          placeholder={`Enter ${getFieldLabel(field)}`}
          placeholderTextColor="#999"
          value={fieldValue}
          onChangeText={(value) => {
            // Restrict input length based on field type
            if (field === 'phone_number' && value.length <= 10) {
              handleChange(field, value);
            } else if (field === 'aadhaar_id' && value.length <= 12) {
              handleChange(field, value);
            } else if (field !== 'phone_number' && field !== 'aadhaar_id') {
              handleChange(field, value);
            }
          }}
          style={styles.input}
          keyboardType={field === 'phone_number' || field === 'aadhaar_id' ? 'numeric' : 'default'}
          returnKeyType={index === Object.keys(form).length - 1 ? 'done' : 'next'}
          maxLength={field === 'phone_number' ? 10 : field === 'aadhaar_id' ? 12 : undefined}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6e45e2" barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6e45e2', '#88d3ce']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Seller</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Fields */}
        {Object.keys(form).map((field, index) => renderFormField(field, index))}

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Add Seller</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    textAlignVertical: 'center',
  },
  submitButton: {
    backgroundColor: '#6e45e2',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#6e45e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddSellerScreenFixed;