import React, { useState, useEffect } from 'react';
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
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../../contexts';
import ImagePicker from 'react-native-image-crop-picker';
import { API_CONFIG, apiPost } from '../../config/api';
import NetInfo from '@react-native-community/netinfo';
import { insertBeneficiaryLocal } from '../../database/repositories/beneficiaryRepo';
import { saveImageLocally } from '../../utils/imageStorage';
import { getDB, forceMigration, resetDatabase } from '../../database/sqlite';

type AddBeneficiaryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddBeneficiary'
>;

const AddBeneficiaryScreenFixed = () => {
  const navigation = useNavigation<AddBeneficiaryScreenNavigationProp>();

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
  const [beneficiaryImage, setBeneficiaryImage] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Location context and local selection state
  const { 
    locationState,
    getAllDistricts,
    getMandalsByDistrict,
    getVillagesByMandal,
    getVillagesByDistrict,
    getDistrictName,
    getMandalName,
    getVillageName,
    setSelectedDistrict,
    setSelectedMandal,
    setSelectedVillage,
  } = useLocation();

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(locationState.selectedDistrict || '');
  const [selectedMandalId, setSelectedMandalId] = useState<string>(locationState.selectedMandal || '');
  const [selectedVillageId, setSelectedVillageId] = useState<string>(locationState.selectedVillage || '');

  useEffect(() => {
    // Initialize and keep form display values synced with Home selection
    setSelectedDistrictId(locationState.selectedDistrict || '');
    setSelectedMandalId(locationState.selectedMandal || '');
    setSelectedVillageId(locationState.selectedVillage || '');
    if (locationState.selectedDistrict) {
      setForm(prev => ({
        ...prev,
        district: getDistrictName(locationState.selectedDistrict),
        mandal: locationState.selectedMandal ? getMandalName(locationState.selectedMandal) : '',
        village: locationState.selectedVillage ? getVillageName(locationState.selectedVillage) : '',
        state: 'Telangana',
      }));
    }
  }, [locationState.selectedDistrict, locationState.selectedMandal, locationState.selectedVillage]);

  // Check camera permission on mount
  useEffect(() => {
    const checkCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'App needs access to your camera to take beneficiary photo',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
          setPermissionDenied(granted === PermissionsAndroid.RESULTS.DENIED);
        } catch (err) {
          console.warn(err);
          setHasCameraPermission(false);
        }
      } else {
        setHasCameraPermission(true);
      }
    };
    checkCameraPermission();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  // Handle image capture
  const captureImage = async () => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true, // Circular crop for profile image
        mediaType: 'photo',
        includeBase64: true,
        compressImageQuality: 0.8,
      });

      if (image) {
        setBeneficiaryImage(image.path);
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not capture image');
        console.error(error);
      }
    }
  };

  // Handle image selection from gallery
  const selectFromGallery = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        mediaType: 'photo',
        includeBase64: true,
        compressImageQuality: 0.8,
      });

      if (image) {
        setBeneficiaryImage(image.path);
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not select image');
        console.error(error);
      }
    }
  };

  // Show image picker options
  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add beneficiary photo',
      [
        { text: 'Camera', onPress: captureImage },
        { text: 'Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
      'num_of_items',
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

    if (form.num_of_items && parseInt(form.num_of_items, 10) < 0) {
      Alert.alert('Validation Error', 'Number of items cannot be negative');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Decide online/offline first
      const state = await NetInfo.fetch();
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!isOnline) {
        // Save offline to SQLite
        try {
          // Ensure database schema is up to date
          try {
            await forceMigration();
          } catch (migrationError) {
            console.error('⚠️ Migration failed, trying database reset:', migrationError);
            // If migration fails, try resetting the database (for development)
            try {
              await resetDatabase();
              console.log('✅ Database reset successful');
            } catch (resetError) {
              console.error('❌ Database reset also failed:', resetError);
              Alert.alert('Database Error', 'Failed to update database schema. Please restart the app.');
              return;
            }
          }
          
          let localImagePath: string | null = null;
          
          // Save image locally if provided
          if (beneficiaryImage) {
            try {
              localImagePath = await saveImageLocally(beneficiaryImage, form.beneficiary_id);
              console.log('📸 Image saved locally:', localImagePath);
            } catch (imageError) {
              console.error('⚠️ Failed to save image locally:', imageError);
              // Continue without image - don't fail the entire save
            }
          }
          
          await insertBeneficiaryLocal({
            server_id: null,
            beneficiary_id: form.beneficiary_id,
            name: form.name,
            village: form.village,
            mandal: form.mandal,
            district: form.district,
            state: form.state,
            phone_number: form.phone_number,
            num_of_items: Number(form.num_of_items || '0'),
            local_image_path: localImagePath,
          });
          Alert.alert('Saved Offline', 'Beneficiary will sync automatically when online.');
          
          // Reset form after successful save
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
          setBeneficiaryImage('');
          return; // Exit early for offline save
        } catch (offlineError) {
          console.error('Offline save failed:', offlineError);
          Alert.alert('Error', 'Failed to save offline: ' + (offlineError?.message || 'Unknown error'));
          return;
        }
      } else {
        // Online: Send JSON as per new API spec (no image upload supported)
        const payload = {
          beneficiary_id: form.beneficiary_id.trim(),
          name: form.name.trim(),
          village: form.village.trim(),
          mandal: form.mandal.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          phone_number: form.phone_number.trim(),
          num_of_items: parseInt(form.num_of_items || '0', 10),
        };

        console.log('Submitting JSON payload (new API):', payload);

        const result = await apiPost(API_CONFIG.ENDPOINTS.BENEFICIARIES, payload, {
          timeout: API_CONFIG.TIMEOUT,
        });

        console.log('API Response:', result);
        console.log('Navigating to profile with ID:', result.beneficiary_id);
        
        Alert.alert('Success', 'Beneficiary added successfully');
        navigation.navigate('BeneficiaryProfile', {
          beneficiary_id: result.beneficiary_id,
        });
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
      case 'beneficiary_id': return 'id-card-outline';
      case 'name': return 'person-outline';

      case 'village': return 'home-outline';
      case 'mandal': return 'map-outline';
      case 'district': return 'business-outline';
      case 'state': return 'flag-outline';
      case 'phone_number': return 'call-outline';
      case 'num_of_items': return 'list-outline';
      default: return 'information-circle-outline';
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      'beneficiary_id': 'Beneficiary ID',
      'name': 'Full Name',

      'village': 'Village',
      'mandal': 'Mandal',
      'district': 'District',
      'state': 'State',
      'phone_number': 'Phone Number',
      'num_of_items': 'Number of Items',
    };
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPlaceholder = (field: string): string => {
    const placeholders: { [key: string]: string } = {
      'beneficiary_id': 'Enter unique beneficiary ID',
      'name': 'Enter full name',
      'father_or_husband': 'Enter father or husband name',
      'aadhaar_id': 'Enter 12-digit Aadhaar number',
      'village': 'Enter village name',
      'mandal': 'Enter mandal name',
      'district': 'Enter district name',
      'state': 'Enter state name',
      'phone_number': 'Enter 10-digit phone number',
      'num_of_items': 'Enter number of items',
    };
    return placeholders[field] || `Enter ${getFieldLabel(field)}`;
  };

  const getMaxLength = (field: string): number => {
    const maxLengths: { [key: string]: number } = {
      'beneficiary_id': 100,
      'name': 100,
      'father_or_husband': 100,
      'aadhaar_id': 12,
      'village': 100,
      'mandal': 100,
      'district': 100,
      'state': 100,
      'phone_number': 10,
      'num_of_items': 10, // Reasonable limit for number input
    };
    return maxLengths[field] || 100;
  };

  const renderFormField = (field: string, index: number) => {
    const isRequired = true; // All fields are required now
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
            {isRequired && <Text style={styles.required}> *</Text>}
          </View>
        </View>
        <TextInput
          placeholder={getPlaceholder(field)}
          placeholderTextColor="#999"
          value={fieldValue}
          onChangeText={(value) => handleChange(field, value)}
          style={styles.input}
          keyboardType={
            field === 'phone_number' || field === 'num_of_items'
              ? 'numeric'
              : 'default'
          }
          maxLength={getMaxLength(field)}
          returnKeyType={index === Object.keys(form).length - 1 ? 'done' : 'next'}
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
          <Text style={styles.headerTitle}>Add Beneficiary</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Beneficiary Image Section */}
        <View style={styles.imageSection}>
          <Text style={styles.imageSectionTitle}>Beneficiary Photo</Text>
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={showImagePicker}
            activeOpacity={0.7}
          >
            {beneficiaryImage ? (
              <Image source={{ uri: beneficiaryImage }} style={styles.beneficiaryImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <LinearGradient
                  colors={['#6e45e2', '#88d3ce']}
                  style={styles.imagePlaceholderGradient}
                >
                  <Ionicons name="camera" size={40} color="#fff" />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </LinearGradient>
              </View>
            )}
            {beneficiaryImage && (
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.imageHint}>
            {beneficiaryImage ? 'Tap to change photo' : 'Tap to add beneficiary photo'}
          </Text>
        </View>

        {/* Form Fields */}
        {(
          [
            'beneficiary_id',
            'name',
            'village',
            'mandal',
            'district',
            'state',
            'phone_number',
            'num_of_items',
          ] as const
        ).map((field, index) => {
          if (field === 'district' || field === 'mandal' || field === 'village') return null;
          return renderFormField(field, index);
        })}

        {/* Location Pickers */}
        <View style={{ marginTop: 8 }}>
          {/* District */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Ionicons name="business-outline" size={18} color="#6e45e2" style={styles.fieldIcon} />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>District</Text>
                <Text style={styles.required}> *</Text>
              </View>
            </View>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}>
              <Picker
                selectedValue={selectedDistrictId}
                onValueChange={(value) => {
                  const next = String(value);
                  setSelectedDistrictId(next);
                  setSelectedDistrict(next);
                  // Clear dependent selections; don't auto-select
                  setSelectedMandalId('');
                  setSelectedVillageId('');
                  setSelectedMandal('');
                  setSelectedVillage('');
                  setForm(prev => ({
                    ...prev,
                    district: getDistrictName(next),
                    mandal: '',
                    village: '',
                    state: 'Telangana',
                  }));
                }}
                dropdownIconColor="#6e45e2"
                mode="dropdown"
                style={{ color: '#6e45e2' }}
              >
                {getAllDistricts().map((d) => (
                  <Picker.Item key={d.id} label={d.name} value={d.id} style={{ color: '#6e45e2' }} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Mandal */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Ionicons name="map-outline" size={18} color="#6e45e2" style={styles.fieldIcon} />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Mandal</Text>
                <Text style={styles.required}> *</Text>
              </View>
            </View>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}>
              <Picker
                selectedValue={selectedMandalId}
                onValueChange={(value) => {
                  const next = String(value);
                  setSelectedMandalId(next);
                  setSelectedMandal(next);
                  // Clear village; don't auto-select
                  setSelectedVillageId('');
                  setSelectedVillage('');
                  setForm(prev => ({
                    ...prev,
                    mandal: getMandalName(next),
                    village: '',
                  }));
                }}
                dropdownIconColor="#6e45e2"
                mode="dropdown"
                style={{ color: '#6e45e2' }}
              >
                {getMandalsByDistrict(selectedDistrictId).map((m) => (
                  <Picker.Item key={m.id} label={m.name} value={m.id} style={{ color: '#6e45e2' }} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Village */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Ionicons name="home-outline" size={18} color="#6e45e2" style={styles.fieldIcon} />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Village</Text>
                <Text style={styles.required}> *</Text>
              </View>
            </View>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}>
              <Picker
                selectedValue={selectedVillageId}
                onValueChange={(value) => {
                  const next = String(value);
                  setSelectedVillageId(next);
                  setSelectedVillage(next);
                  setForm(prev => ({
                    ...prev,
                    village: getVillageName(next),
                  }));
                }}
                dropdownIconColor="#6e45e2"
                mode="dropdown"
                style={{ color: '#6e45e2' }}
              >
                {(() => {
                  const villagesList = selectedMandalId
                    ? getVillagesByMandal(selectedMandalId)
                    : getVillagesByDistrict(selectedDistrictId);
                  if (!villagesList || villagesList.length === 0) {
                    return (
                      <Picker.Item
                        label="No villages configured. Select a mandal or update villages.ts"
                        value=""
                        style={{ color: '#6e45e2' }}
                      />
                    );
                  }
                  return villagesList.map(v => (
                    <Picker.Item key={v.id} label={v.name} value={v.id} style={{ color: '#6e45e2' }} />
                  ));
                })()}
              </Picker>
            </View>
          </View>
        </View>

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
            <Text style={styles.submitButtonText}>Add Beneficiary</Text>
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  imageSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  beneficiaryImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#6e45e2',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  imagePlaceholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6e45e2',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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

export default AddBeneficiaryScreenFixed;