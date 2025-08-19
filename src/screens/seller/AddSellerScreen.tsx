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
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts';
import NetInfo from '@react-native-community/netinfo';
import { insertSellerLocal } from '../../database/repositories/sellerRepo';
import OfflineSyncService from '../../services/OfflineSyncService';
import { API_CONFIG, apiPost } from '../../config/api';

const AddSellerScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const [form, setForm] = useState({
    name: '',
    father_or_husband: '',
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

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Decide online/offline
      const state = await NetInfo.fetch();
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (isOnline) {
        // Online: post to server, but still keep local consistency by inserting synced row later if required
        const result = await apiPost(API_CONFIG.ENDPOINTS.SELLERS, { ...form }, { timeout: API_CONFIG.TIMEOUT });
        Alert.alert('Success', 'Seller added successfully');
      } else {
        // Offline: insert locally as pending
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
        // Trigger background sync attempt (no-op if still offline)
        OfflineSyncService.getInstance().manualSync().catch(() => {});
      }

      // Reset form
      setForm({
        name: '',
        father_or_husband: '',
        village: '',
        mandal: '',
        district: '',
        state: '',
        phone_number: '',
      });
    } catch (error: any) {
      console.error('❌ Error adding seller:', error);
      // Fallback: store offline if posting failed due to network
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
      Alert.alert('Saved Offline', 'Network issue. Seller saved locally and will sync later.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (field: string) => {
    switch (field) {
      case 'name': return 'person-outline';
      case 'father_or_husband': return 'man-outline';
      case 'village': return 'home-outline';
      case 'mandal': return 'map-outline';
      case 'district': return 'business-outline';
      case 'state': return 'flag-outline';
      case 'phone_number': return 'call-outline';
      default: return 'information-circle-outline';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={theme.colors.gradient}
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
          <View style={{ width: 24 }} /> {/* Spacer for balance */}
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Fields */}
        {Object.keys(form).map((field, index) => (
          <View key={index} style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Ionicons 
                name={getIcon(field)} 
                size={18} 
                color="#6e45e2" 
                style={styles.fieldIcon} 
              />
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.label}>
                  {field.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.required}> *</Text>
              </View>
            </View>
            <TextInput
              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
              placeholderTextColor="#999"
              value={form[field as keyof typeof form]}
              onChangeText={(value) => handleChange(field, value)}
              style={styles.input}
              keyboardType={field === 'phone_number' ? 'numeric' : 'default'}
              returnKeyType={index === Object.keys(form).length - 1 ? 'done' : 'next'}
            />
          </View>
        ))}

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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: theme.colors.shadowColor,
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

export default AddSellerScreen;