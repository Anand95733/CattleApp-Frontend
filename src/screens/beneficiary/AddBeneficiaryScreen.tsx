import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts';
import NetInfo from '@react-native-community/netinfo';
import { insertBeneficiaryLocal } from '../../database/repositories/beneficiaryRepo';
import OfflineSyncService from '../../services/OfflineSyncService';
import { API_CONFIG, apiPost } from '../../config/api';

type AddBeneficiaryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddBeneficiary'
>;

const AddBeneficiaryScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<AddBeneficiaryScreenNavigationProp>();
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const [form, setForm] = useState({
    beneficiary_id: '',
    name: '',
    village: '',
    mandal: '',
    district: '',
    state: '',
    phone_number: '',
    num_of_items: '0',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const validateForm = () => {
    const requiredFields = [
      'beneficiary_id',
      'name',
      'village',
      'mandal',
      'district',
      'state',
      'phone_number',
    ];

    for (const field of requiredFields) {
      if (!form[field as keyof typeof form]) {
        Alert.alert('Validation Error', `Please fill in ${field.replace(/_/g, ' ')}`);
        return false;
      }
    }

    if (!/^\d{10}$/.test(form.phone_number)) {
      Alert.alert('Validation Error', 'Phone number must be 10 digits');
      return false;
    }

    if (isNaN(Number(form.num_of_items))) {
      Alert.alert('Validation Error', 'Number of items must be a number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const state = await NetInfo.fetch();
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (isOnline) {
        const result = await apiPost(API_CONFIG.ENDPOINTS.BENEFICIARIES, {
          beneficiary_id: form.beneficiary_id,
          name: form.name,
          village: form.village,
          mandal: form.mandal,
          district: form.district,
          state: form.state,
          phone_number: form.phone_number,
          num_of_items: parseInt(form.num_of_items, 10),
        }, { timeout: API_CONFIG.TIMEOUT });
        Alert.alert('Success', 'Beneficiary added successfully');
        navigation.navigate('BeneficiaryProfile', { beneficiary_id: result.beneficiary_id });
      } else {
        await insertBeneficiaryLocal({
          server_id: null,
          beneficiary_id: form.beneficiary_id,
          name: form.name,
          village: form.village,
          mandal: form.mandal,
          district: form.district,
          state: form.state,
          phone_number: form.phone_number,
          num_of_items: Number(form.num_of_items) || 0,
        });
        Alert.alert('Saved Offline', 'Beneficiary will sync automatically when online.');
        OfflineSyncService.getInstance().manualSync().catch(() => {});
      }

      // Reset form
      setForm({
        beneficiary_id: '',
        name: '',
        village: '',
        mandal: '',
        district: '',
        state: '',
        phone_number: '',
        num_of_items: '0',
      });
    } catch (error: any) {
      console.error('❌ Error adding beneficiary:', error);
      await insertBeneficiaryLocal({
        server_id: null,
        beneficiary_id: form.beneficiary_id,
        name: form.name,
        village: form.village,
        mandal: form.mandal,
        district: form.district,
        state: form.state,
        phone_number: form.phone_number,
        num_of_items: Number(form.num_of_items) || 0,
      });
      Alert.alert('Saved Offline', 'Network issue. Beneficiary saved locally and will sync later.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (field: string) => {
    switch (field) {
      case 'beneficiary_id': return 'id-card-outline';
      case 'name': return 'person-outline';
      case 'village': return 'home-outline';
      case 'mandal': return 'map-outline';
      case 'district': return 'business-outline';
      case 'state': return 'flag-outline';
      case 'phone_number': return 'call-outline';
      case 'num_of_items': return 'cube-outline';
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
          <Text style={styles.headerTitle}>Add Beneficiary</Text>
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
                {field !== 'num_of_items' && <Text style={styles.required}> *</Text>}
              </View>
            </View>
            <TextInput
              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
              placeholderTextColor="#999"
              value={form[field as keyof typeof form]}
              onChangeText={(value) => handleChange(field, value)}
              style={styles.input}
              keyboardType={
                field === 'phone_number' || field === 'num_of_items' 
                  ? 'numeric' 
                  : 'default'
              }
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
            <Text style={styles.submitButtonText}>Submit</Text>
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

export default AddBeneficiaryScreen;