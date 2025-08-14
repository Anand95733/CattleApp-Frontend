import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  LogBox,
  TextInput,
  ToastAndroid,
  Dimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, apiPut } from '../../config/api';

LogBox.ignoreAllLogs(true); // Ignore all log notifications
type ProfileRouteProp = RouteProp<RootStackParamList, 'SellerProfile'>;
type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'SellerProfile'>;

interface Seller {
  seller_id: string;
  name: string;
  father_or_husband: string;
  aadhaar_id: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  phone_number: number;
  seller_image?: string | null;
}

const { width } = Dimensions.get('window');

const SellerProfileScreen = () => {
  const route = useRoute<ProfileRouteProp>();
  const navigation = useNavigation<ProfileNavigationProp>();
  const { seller_id } = route.params;

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Seller | null>(null);

  // Helper function to safely convert values to strings
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    return String(value);
  };

  // Helper function to copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    ToastAndroid.show(`${label} copied!`, ToastAndroid.SHORT);
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditForm(seller);
      setIsEditing(false);
    } else {
      // Start editing - initialize form
      setEditForm(seller);
      setIsEditing(true);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof Seller, value: string) => {
    if (editForm) {
      let processedValue: any = value;
      
      if (field === 'phone_number') {
        // Only allow numeric input and convert to number
        const numericValue = value.replace(/[^0-9]/g, '');
        processedValue = numericValue ? parseInt(numericValue, 10) : 0;
      }
      
      setEditForm({
        ...editForm,
        [field]: processedValue,
      });
    }
  };

  // Validate form data
  const validateForm = () => {
    if (!editForm) return false;

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
      if (!editForm[field as keyof Seller]) {
        Alert.alert('Validation Error', `Please enter ${field.replace(/_/g, ' ')}`);
        return false;
      }
    }

    // Validate phone number
    if (!/^\d{10}$/.test(String(editForm.phone_number))) {
      Alert.alert('Validation Error', 'Phone number must be 10 digits');
      return false;
    }

    // Validate Aadhaar ID
    if (!/^\d{12}$/.test(editForm.aadhaar_id)) {
      Alert.alert('Validation Error', 'Aadhaar ID must be 12 digits');
      return false;
    }

    return true;
  };

  // Handle save changes
  const handleSave = async () => {
    if (!editForm) return;
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const payload = {
        name: editForm.name,
        father_or_husband: editForm.father_or_husband,
        aadhaar_id: editForm.aadhaar_id,
        village: editForm.village,
        mandal: editForm.mandal,
        district: editForm.district,
        state: editForm.state,
        phone_number: editForm.phone_number,
      };

      console.log('🔄 Updating seller...');
      console.log('Update payload:', payload);

      const updatedSeller = await apiPut(`/api/sellers/${seller_id}/`, payload, {
        timeout: API_CONFIG.TIMEOUT
      });

      console.log('✅ Seller updated successfully');
      setSeller(updatedSeller);
      setIsEditing(false);
      ToastAndroid.show('Seller updated successfully!', ToastAndroid.SHORT);
      
    } catch (error) {
      console.error('❌ Error updating seller:', error);
      
      // Handle validation errors from Django
      if (error.message.includes('status: 4')) {
        Alert.alert('Validation Error', 'Please check your input data and try again.');
      } else {
        Alert.alert('Network Error', 'Cannot connect to server. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch seller data
  useEffect(() => {
    const fetchSeller = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching seller profile...');
        
        const data = await apiGet(`/api/sellers/${seller_id}/`, {
          cache: true,
          timeout: API_CONFIG.FAST_TIMEOUT
        });
        
        console.log('✅ Seller profile loaded successfully');
        setSeller(data);
        setEditForm(data);
      } catch (error) {
        console.error('❌ Failed to fetch seller:', error);
        Alert.alert('Network Error', 'Cannot connect to server. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [seller_id]);

  // Render editable field
  const renderEditableField = (
    field: keyof Seller,
    label: string,
    icon: string,
    keyboardType: 'default' | 'numeric' = 'default',
    editable: boolean = true
  ) => {
    const value = seller ? safeString(seller[field]) : 'N/A';
    const editValue = editForm ? String(editForm[field] || '') : '';

    return (
      <View style={styles.detailItem}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={16} color="#6e45e2" style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.valueRow}>
          {isEditing && editable ? (
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={(text) => handleFieldChange(field, text)}
              keyboardType={keyboardType}
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor="#999"
            />
          ) : (
            <>
              <Text style={styles.value}>{value}</Text>
              {(field === 'aadhaar_id' || field === 'seller_id') && (
                <TouchableOpacity 
                  onPress={() => copyToClipboard(value, label)}
                  style={styles.copyButton}
                >
                  <Ionicons name="copy-outline" size={16} color="#6e45e2" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading seller profile...</Text>
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Seller not found</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#6e45e2', '#88d3ce']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {safeString(seller?.name).charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={styles.profileName}>
              {safeString(seller?.name)}
            </Text>
            <Text style={styles.profileLocation}>
              {safeString(seller?.village)}, {safeString(seller?.district)}
            </Text>
          </View>

          {/* Action Buttons - Only Edit/Save/Cancel (No Add Cattle) */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.editButton,
                isEditing && { backgroundColor: '#10b981' }
              ]}
              onPress={isEditing ? handleSave : handleEditToggle}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "create"} 
                size={20} 
                color="#fff" 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.editButtonText}>
                {isEditing ? 'Save' : 'Edit'}
              </Text>
            </TouchableOpacity>
            
            {isEditing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleEditToggle}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* Seller ID - NOT EDITABLE */}
            {renderEditableField('seller_id', 'Seller ID', 'card-outline', 'default', false)}

            {/* Name */}
            {renderEditableField('name', 'Full Name', 'person-outline')}

            {/* Father/Husband */}
            {renderEditableField('father_or_husband', 'Father/Husband Name', 'man-outline')}

            {/* Aadhaar ID */}
            {renderEditableField('aadhaar_id', 'Aadhaar Number', 'card-outline', 'numeric')}

            {/* Phone Number */}
            {renderEditableField('phone_number', 'Phone Number', 'call-outline', 'numeric')}

            {/* Address Section */}
            <Text style={styles.sectionTitle}>Address Information</Text>

            {/* Village */}
            {renderEditableField('village', 'Village', 'home-outline')}

            {/* Mandal */}
            {renderEditableField('mandal', 'Mandal', 'business-outline')}

            {/* District */}
            {renderEditableField('district', 'District', 'location-outline')}

            {/* State */}
            {renderEditableField('state', 'State', 'map-outline')}

          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 69, 226, 0.08)',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6e45e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  profileLocation: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 16,
  },
  editButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 60,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 60,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 16,
    marginTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#6e45e2',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailItem: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6e45e2',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 10,
  },
  label: {
    fontWeight: '600',
    color: '#4a5568',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  value: {
    fontSize: 16,
    color: '#1a202c',
    flex: 1,
    marginRight: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(110, 69, 226, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 69, 226, 0.2)',
  },
});

export default SellerProfileScreen;