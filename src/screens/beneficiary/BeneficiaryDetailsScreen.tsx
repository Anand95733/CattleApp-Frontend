import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  ToastAndroid,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, apiPatch, buildMediaUrl } from '../../config/api';

type DetailsRouteProp = RouteProp<RootStackParamList, 'BeneficiaryDetails'>;
type DetailsNavigationProp = StackNavigationProp<RootStackParamList, 'BeneficiaryDetails'>;

interface Beneficiary {
  beneficiary_id: string;
  name: string;
  father_or_husband: string;
  aadhaar_id: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  phone_number: number;
  animals_sanctioned: number;
  beneficiary_image_url?: string | null;
}

const BeneficiaryDetailsScreen = () => {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<DetailsNavigationProp>();
  const { beneficiary_id } = route.params;

  const [loading, setLoading] = useState(true);
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Beneficiary | null>(null);

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
      setEditForm(beneficiary);
      setIsEditing(false);
    } else {
      // Start editing - initialize form with current data
      setEditForm(beneficiary);
      setIsEditing(true);
    }
  };

  // Handle form field changes
  const handleFormChange = (field: keyof Beneficiary, value: string) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        [field]: field === 'phone_number' || field === 'animals_sanctioned' 
          ? parseInt(value) || 0 
          : value
      });
    }
  };

  // Handle save changes
  const handleSave = async () => {
    Alert.alert('Not supported', 'Editing beneficiaries is not available in the current API.');
    return;
  };

  // Render editable field
  const renderEditableField = (
    field: keyof Beneficiary, 
    label: string, 
    icon: string,
    keyboardType: 'default' | 'numeric' = 'default'
  ) => {
    const value = isEditing ? editForm?.[field] : beneficiary?.[field];
    
    return (
      <View style={styles.detailItem}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={16} color="#6e45e2" style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.valueRow}>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={String(value || '')}
              onChangeText={(text) => handleFormChange(field, text)}
              keyboardType={keyboardType}
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{safeString(value)}</Text>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    const fetchBeneficiary = async () => {
      try {
        console.log('🔄 Fetching beneficiary details...');
        
        const data = await apiGet(`${API_CONFIG.ENDPOINTS.BENEFICIARIES}${beneficiary_id}`, {
          cache: true,
          timeout: API_CONFIG.FAST_TIMEOUT
        });
        
        console.log('✅ Beneficiary data loaded successfully');
        setBeneficiary(data);
      } catch (error) {
        console.error('❌ Failed to fetch beneficiary:', error);
        Alert.alert('Network Error', 'Cannot connect to server. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiary();
  }, [beneficiary_id]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
      </View>
    );
  }

  if (!beneficiary || typeof beneficiary !== 'object') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Beneficiary not found.</Text>
          <Text style={styles.errorSubText}>
            ID: {safeString(beneficiary_id)}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setBeneficiary(null);
              // Retry fetch using optimized API call
              const fetchBeneficiary = async () => {
                try {
                  console.log('🔄 Retrying beneficiary fetch...');
                  
                  const data = await apiGet(`${API_CONFIG.ENDPOINTS.BENEFICIARIES}${beneficiary_id}/`, {
                    cache: false, // Don't use cache on retry
                    timeout: API_CONFIG.TIMEOUT,
                    useFallbacks: true // Try fallback URLs on retry
                  });
                  
                  console.log('✅ Retry successful');
                  setBeneficiary(data);
                } catch (error) {
                  console.error('❌ Retry failed:', error);
                  Alert.alert('Connection Error', 'Still cannot connect to server. Please check your network connection.');
                } finally {
                  setLoading(false);
                }
              };
              fetchBeneficiary();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6e45e2" barStyle="light-content" />
      
      {/* Gradient Header */}
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
          <Text style={styles.headerTitle}>Beneficiary Details</Text>
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
            {(() => {
              const imageUrl = buildMediaUrl(beneficiary.beneficiary_image_url);
              console.log('Beneficiary image URL:', imageUrl);
              console.log('Raw beneficiary_image:', beneficiary?.beneficiary_image_url);

              return imageUrl ? (
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('Failed to load beneficiary image:', error);
                    console.log('Attempted URL:', imageUrl);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded beneficiary image:', imageUrl);
                  }}
                />
              ) : (
                <LinearGradient
                  colors={['#6e45e2', '#88d3ce']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {safeString(beneficiary?.name).charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              );
            })()}
            <Text style={styles.profileName}>
              {safeString(beneficiary?.name)}
            </Text>
            <Text style={styles.profileLocation}>
              {safeString(beneficiary?.village)}, {safeString(beneficiary?.district)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.editButton,
                loading && { opacity: 0.7 }
              ]}
              onPress={isEditing ? handleSave : handleEditToggle}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={isEditing ? "checkmark" : "create"} 
                    size={20} 
                    color="#fff" 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={styles.editButtonText}>
                    {isEditing ? "Save" : "Edit"}
                  </Text>
                </>
              )}
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
            
            {/* Beneficiary ID */}
            <View style={styles.detailItem}>
              <View style={styles.labelRow}>
                <Ionicons name="card-outline" size={16} color="#6e45e2" style={styles.icon} />
                <Text style={styles.label}>Beneficiary ID</Text>
              </View>
              <View style={styles.valueRow}>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={String(editForm?.beneficiary_id || '')}
                    onChangeText={(text) => handleFormChange('beneficiary_id', text)}
                    placeholder="Enter Beneficiary ID"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <>
                    <Text style={styles.value}>{safeString(beneficiary?.beneficiary_id)}</Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(safeString(beneficiary?.beneficiary_id), 'Beneficiary ID')}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={16} color="#6e45e2" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Name */}
            {renderEditableField('name', 'Full Name', 'person-outline')}

            {/* Father/Husband */}
            {renderEditableField('father_or_husband', 'Father/Husband', 'people-outline')}

            {/* Phone Number */}
            <View style={styles.detailItem}>
              <View style={styles.labelRow}>
                <Ionicons name="call-outline" size={16} color="#6e45e2" style={styles.icon} />
                <Text style={styles.label}>Phone Number</Text>
              </View>
              <View style={styles.valueRow}>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={String(editForm?.phone_number || '')}
                    onChangeText={(text) => handleFormChange('phone_number', text)}
                    keyboardType="numeric"
                    placeholder="Enter Phone Number"
                    placeholderTextColor="#999"
                    maxLength={10}
                  />
                ) : (
                  <>
                    <Text style={styles.value}>{safeString(beneficiary?.phone_number)}</Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(safeString(beneficiary?.phone_number), 'Phone Number')}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={16} color="#6e45e2" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Aadhaar ID */}
            <View style={styles.detailItem}>
              <View style={styles.labelRow}>
                <Ionicons name="id-card-outline" size={16} color="#6e45e2" style={styles.icon} />
                <Text style={styles.label}>Aadhaar Number</Text>
              </View>
              <View style={styles.valueRow}>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={String(editForm?.aadhaar_id || '')}
                    onChangeText={(text) => handleFormChange('aadhaar_id', text)}
                    keyboardType="numeric"
                    placeholder="Enter Aadhaar ID"
                    placeholderTextColor="#999"
                    maxLength={12}
                  />
                ) : (
                  <>
                    <Text style={styles.value}>{safeString(beneficiary?.aadhaar_id)}</Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(safeString(beneficiary?.aadhaar_id), 'Aadhaar Number')}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={16} color="#6e45e2" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

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

            {/* Livestock Information */}
            <Text style={styles.sectionTitle}>Livestock Information</Text>

            {/* Animals Sanctioned */}
            {renderEditableField('animals_sanctioned', 'Animals Sanctioned', 'paw-outline', 'numeric')}
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#6e45e2',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    textAlignVertical: 'center',
  },
  detailsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontWeight: '500',
    color: '#555',
    fontSize: 13,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  value: {
    fontSize: 15,
    color: '#222',
    flex: 1,
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6e45e2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default BeneficiaryDetailsScreen;