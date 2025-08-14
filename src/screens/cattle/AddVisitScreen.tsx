import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
// Picker removed - using TouchableOpacity with Alert for selection
// DatePicker removed - using simple text input for date
import ImagePicker from 'react-native-image-crop-picker';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiPost, apiGet } from '../../config/api';
import { useTheme } from '../../contexts';

type AddVisitRouteProp = RouteProp<RootStackParamList, 'AddVisit'>;
type AddVisitNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddVisit'>;

interface VisitFormData {
  visit_number: number;
  visit_date: string;
  animal_photo: string;
  health_status: string;
  line_of_treatment: string;
  vaccinations_given: string;
  pregnancy_period?: number;
  calf_age?: number;
  calf_gender: string;
  milk_yield: number;
  animal_performance: string;
  beneficiary_issues: string;
  animal: string;
}

const AddVisitScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<AddVisitRouteProp>();
  const navigation = useNavigation<AddVisitNavigationProp>();
  const { animal_id } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);

  // Form state
  const [formData, setFormData] = useState<Partial<VisitFormData>>({
    visit_number: 1,
    visit_date: new Date().toISOString().split('T')[0],
    animal_photo: '',
    health_status: '',
    line_of_treatment: '',
    vaccinations_given: '',
    pregnancy_period: undefined,
    calf_age: undefined,
    calf_gender: 'Male',
    milk_yield: 0,
    animal_performance: '',
    beneficiary_issues: '',
    animal: animal_id,
  });

  const [loading, setLoading] = useState(false);
  const [cattleData, setCattleData] = useState<any>(null);
  const [fetchingCattle, setFetchingCattle] = useState(true);

  const updateFormData = (field: keyof VisitFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch cattle data to get the correct integer ID
  const fetchNextVisitNumber = async () => {
    try {
      console.log('🔢 Fetching existing visits to determine next visit number...');
      
      // Try the new dedicated endpoint first
      let response;
      try {
        response = await apiGet(`${API_CONFIG.ENDPOINTS.SC_VISITS}by-animal/${animal_id}/`, {
          timeout: API_CONFIG.FAST_TIMEOUT,
          cache: false
        });
      } catch (error) {
        console.log('⚠️ Dedicated endpoint failed, trying search fallback for visit count...');
        response = await apiGet(`${API_CONFIG.ENDPOINTS.SC_VISITS}?search=${animal_id}`, {
          timeout: API_CONFIG.FAST_TIMEOUT,
          cache: false
        });
      }
      
      let visitCount = 0;
      if (response && response.success && response.visits) {
        visitCount = response.visits.length;
      } else if (response && response.results) {
        visitCount = response.results.length;
      } else if (response && response.count) {
        visitCount = response.count;
      }
      
      const nextVisitNumber = visitCount + 1;
      console.log(`🔢 Found ${visitCount} existing visits, setting next visit number to: ${nextVisitNumber}`);
      
      updateFormData('visit_number', nextVisitNumber);
      
    } catch (error) {
      console.error('💥 Failed to fetch visit count:', error);
      console.log('🔢 Using default visit number: 1');
      updateFormData('visit_number', 1);
    }
  };

  const fetchCattleData = async () => {
    try {
      setFetchingCattle(true);
      console.log('🐄 Fetching cattle data for visit form:', animal_id);
      
      // Try different API endpoints to find the cattle data
      let data;
      const endpoints = [
        `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`,
        `${API_CONFIG.ENDPOINTS.CATTLE}${animal_id}/`,
        `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}?search=${animal_id}`,
        `${API_CONFIG.ENDPOINTS.CATTLE}?search=${animal_id}`
      ];

      for (let i = 0; i < endpoints.length; i++) {
        try {
          console.log(`🔍 Trying endpoint ${i + 1}/${endpoints.length}: ${endpoints[i]}`);
          const result = await apiGet(endpoints[i], {
            timeout: API_CONFIG.FAST_TIMEOUT,
            cache: false // Don't cache during debugging
          });
          
          // Handle search results (paginated)
          if (result && result.results && Array.isArray(result.results)) {
            if (result.results.length > 0) {
              data = result.results[0];
              console.log('✅ Found cattle data in search results');
              break;
            }
          } 
          // Handle direct object result
          else if (result && (result.animal_id || result.id)) {
            data = result;
            console.log('✅ Found cattle data directly');
            break;
          }
        } catch (error) {
          console.log(`❌ Endpoint ${i + 1} failed:`, error.message);
          if (i === endpoints.length - 1) {
            throw new Error(`All endpoints failed. Last error: ${error.message}`);
          }
        }
      }

      if (!data) {
        throw new Error('No cattle data found in any endpoint');
      }
      
      console.log('✅ Cattle data received:', data);
      setCattleData(data);
      
      // Log the complete cattle data structure for debugging
      console.log('🔍 Complete cattle data structure:', JSON.stringify(data, null, 2));
      
      // Since the backend is now fixed to handle UUID strings, we can use the animal_id directly
      console.log('🔢 Using animal_id (UUID) for animal reference:', animal_id);
      updateFormData('animal', animal_id);
      
      // Fetch existing visits to determine the next visit number
      await fetchNextVisitNumber();
      
    } catch (error) {
      console.error('💥 Failed to fetch cattle data:', error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
      console.error('💥 Animal ID being searched:', animal_id);
      
      // Don't show error alert - just proceed without cattle data
      // The form can still work without fetching cattle details
      console.log('⚠️ Proceeding without cattle data - form will still work');
      
      // Set a default animal reference using the UUID
      updateFormData('animal', animal_id);
    } finally {
      setFetchingCattle(false);
    }
  };

  useEffect(() => {
    fetchCattleData();
  }, [animal_id]);

  const openCamera = async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 600,
        cropping: true,
        mediaType: 'photo',
        includeBase64: false,
        compressImageQuality: 0.8,
      });

      if (image && image.path) {
        console.log('📸 Camera image selected:', image.path);
        updateFormData('animal_photo', image.path);
      }
    } catch (error) {
      console.log('📸 Camera cancelled or error:', error);
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not open camera. Please try again.');
      }
    }
  };

  const openGallery = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 800,
        height: 600,
        cropping: true,
        mediaType: 'photo',
        includeBase64: false,
        compressImageQuality: 0.8,
      });

      if (image && image.path) {
        console.log('🖼️ Gallery image selected:', image.path);
        updateFormData('animal_photo', image.path);
      }
    } catch (error) {
      console.log('🖼️ Gallery cancelled or error:', error);
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not open gallery. Please try again.');
      }
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo',
      [
        {
          text: 'Camera',
          onPress: openCamera
        },
        {
          text: 'Gallery',
          onPress: openGallery
        },
        {
          text: 'Enter URL',
          onPress: () => {
            Alert.prompt(
              'Photo URL',
              'Enter the photo URL or path:',
              (text) => {
                if (text) {
                  updateFormData('animal_photo', text);
                }
              }
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'visit_number',
      'visit_date',
      'health_status',
      'line_of_treatment',
      'vaccinations_given',
      'calf_gender',
      'milk_yield',
      'animal_performance',
      'beneficiary_issues'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof VisitFormData] && formData[field as keyof VisitFormData] !== 0) {
        Alert.alert('Validation Error', `Please fill in the ${field.replace('_', ' ')} field.`);
        return false;
      }
    }

    if (formData.milk_yield && formData.milk_yield < 0) {
      Alert.alert('Validation Error', 'Milk yield must be a positive number.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('📝 Submitting visit data:', formData);

      // Prepare the data for API
      const visitData = {
        ...formData,
        milk_yield: parseFloat(formData.milk_yield?.toString() || '0'),
        visit_number: parseInt(formData.visit_number?.toString() || '1'),
        pregnancy_period: formData.pregnancy_period ? parseInt(formData.pregnancy_period.toString()) : null,
        calf_age: formData.calf_age ? parseInt(formData.calf_age.toString()) : null,
        animal_photo: formData.animal_photo || 'No photo provided', // Provide default value
      };

      console.log('📝 Prepared visit data:', visitData);
      console.log('📝 Animal reference type:', typeof visitData.animal);
      console.log('📝 Animal reference value:', visitData.animal);
      console.log('📝 Full API endpoint:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SC_VISITS}`);

      const response = await apiPost(API_CONFIG.ENDPOINTS.SC_VISITS, visitData, {
        timeout: API_CONFIG.TIMEOUT
      });

      console.log('✅ Visit created successfully:', response);

      // Create the visit object to pass back to the list screen for instant update
      const newVisit = {
        visit_id: response.visit_id || Date.now(), // Use response ID or timestamp as fallback
        visit_number: visitData.visit_number,
        visit_date: visitData.visit_date,
        animal_photo: visitData.animal_photo,
        health_status: visitData.health_status,
        line_of_treatment: visitData.line_of_treatment,
        vaccinations_given: visitData.vaccinations_given,
        pregnancy_period: visitData.pregnancy_period,
        calf_age: visitData.calf_age,
        calf_gender: visitData.calf_gender,
        milk_yield: visitData.milk_yield.toString(),
        animal_performance: visitData.animal_performance,
        beneficiary_issues: visitData.beneficiary_issues,
        animal: visitData.animal,
        animal_info: cattleData ? {
          animal_id: cattleData.animal_id || animal_id,
          tag_no: cattleData.tag_no || 'Unknown',
          type: cattleData.type || 'Unknown',
          breed: cattleData.breed || 'Unknown'
        } : undefined
      };

      Alert.alert(
        'Success',
        'Visit has been added successfully!',
        [
          {
            text: 'Add Another',
            onPress: () => {
              // Reset form for another visit with incremented visit number
              const nextVisitNumber = parseInt(formData.visit_number?.toString() || '1') + 1;
              setFormData({
                visit_number: nextVisitNumber,
                visit_date: new Date().toISOString().split('T')[0],
                animal_photo: '',
                health_status: '',
                line_of_treatment: '',
                vaccinations_given: '',
                pregnancy_period: undefined,
                calf_age: undefined,
                calf_gender: 'Male',
                milk_yield: 0,
                animal_performance: '',
                beneficiary_issues: '',
                animal: animal_id,
              });
            }
          },
          {
            text: 'Done',
            onPress: () => {
              // Navigate back and pass the new visit data for instant update
              navigation.navigate('CattleVisit', { 
                animal_id, 
                newVisit: newVisit 
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('💥 Failed to create visit:', error);
      
      let errorMessage = 'Failed to add visit. Please try again.';
      
      if (error instanceof Error) {
        console.log('🔍 Full error details:', error);
        
        if (error.message.includes('500')) {
          errorMessage = 'Server Error (500): There is a database configuration issue. The visits table expects an integer animal ID, but the system is sending a UUID string.\n\nThis needs to be fixed on the backend. Please contact your system administrator.';
        } else if (error.message.includes('DatatypeMismatch') || error.message.includes('uuid')) {
          errorMessage = 'Database Schema Issue: The visits table animal_id column is configured as integer but should be UUID to match the animal records.\n\nPlease apply the Django fix provided in DJANGO_FIX_FOR_VISITS.py';
        } else if (error.message.includes('milk_yield')) {
          errorMessage = 'Please enter a valid milk yield amount.';
        } else if (error.message.includes('animal')) {
          errorMessage = 'Could not find the animal record. Please try again.';
        } else {
          errorMessage = `Error: ${error.message}\n\nIf this is a 500 error, it's likely the database schema issue mentioned above.`;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (
    label: string,
    value: any,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric' | 'email-address';
      multiline?: boolean;
      numberOfLines?: number;
    }
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, options?.multiline && styles.multilineInput]}
        value={value?.toString() || ''}
        onChangeText={onChangeText}
        placeholder={options?.placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType={options?.keyboardType || 'default'}
        multiline={options?.multiline}
        numberOfLines={options?.numberOfLines}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Visit</Text>
          <Text style={styles.headerSubtitle}>
            Animal ID: {animal_id}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          
          {fetchingCattle && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading cattle information...</Text>
            </View>
          )}
          
          {/* Visit Number */}
          {renderFormField(
            'Visit Number *',
            formData.visit_number,
            (text) => updateFormData('visit_number', parseInt(text) || 1),
            { keyboardType: 'numeric', placeholder: 'Enter visit number' }
          )}

          {/* Visit Date */}
          {renderFormField(
            'Visit Date (YYYY-MM-DD) *',
            formData.visit_date,
            (text) => updateFormData('visit_date', text),
            { placeholder: 'Enter date (YYYY-MM-DD)' }
          )}

          {/* Animal Photo */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Animal Photo</Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleImagePicker}
            >
              <Icon name="camera-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.photoButtonText}>
                {formData.animal_photo ? 'Photo Added' : 'Add Photo (Camera/Gallery)'}
              </Text>
            </TouchableOpacity>
            {formData.animal_photo && (
              <Text style={styles.photoPath} numberOfLines={1}>
                {formData.animal_photo}
              </Text>
            )}
          </View>

          {/* Health Status */}
          {renderFormField(
            'Health Status *',
            formData.health_status,
            (text) => updateFormData('health_status', text),
            { placeholder: 'Enter health status' }
          )}

          {/* Line of Treatment */}
          {renderFormField(
            'Line of Treatment *',
            formData.line_of_treatment,
            (text) => updateFormData('line_of_treatment', text),
            { 
              placeholder: 'Enter treatment details',
              multiline: true,
              numberOfLines: 3
            }
          )}

          {/* Vaccinations Given */}
          {renderFormField(
            'Vaccinations Given *',
            formData.vaccinations_given,
            (text) => updateFormData('vaccinations_given', text),
            { placeholder: 'Enter vaccinations given' }
          )}

          {/* Pregnancy Period */}
          {renderFormField(
            'Pregnancy Period (months)',
            formData.pregnancy_period,
            (text) => updateFormData('pregnancy_period', parseInt(text) || undefined),
            { keyboardType: 'numeric', placeholder: 'Enter pregnancy period' }
          )}

          {/* Calf Age */}
          {renderFormField(
            'Calf Age (months)',
            formData.calf_age,
            (text) => updateFormData('calf_age', parseInt(text) || undefined),
            { keyboardType: 'numeric', placeholder: 'Enter calf age' }
          )}

          {/* Calf Gender */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Calf Gender *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                Alert.alert(
                  'Select Calf Gender',
                  'Choose the gender of the calf',
                  [
                    { text: 'Male', onPress: () => updateFormData('calf_gender', 'Male') },
                    { text: 'Female', onPress: () => updateFormData('calf_gender', 'Female') },
                    { text: 'Unknown', onPress: () => updateFormData('calf_gender', 'Unknown') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={styles.pickerButtonText}>
                {formData.calf_gender || 'Select Gender'}
              </Text>
              <Icon name="chevron-down-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Milk Yield */}
          {renderFormField(
            'Milk Yield (liters) *',
            formData.milk_yield,
            (text) => updateFormData('milk_yield', parseFloat(text) || 0),
            { keyboardType: 'numeric', placeholder: 'Enter milk yield' }
          )}

          {/* Animal Performance */}
          {renderFormField(
            'Animal Performance *',
            formData.animal_performance,
            (text) => updateFormData('animal_performance', text),
            { 
              placeholder: 'Enter animal performance details',
              multiline: true,
              numberOfLines: 3
            }
          )}

          {/* Beneficiary Issues */}
          {renderFormField(
            'Beneficiary Issues *',
            formData.beneficiary_issues,
            (text) => updateFormData('beneficiary_issues', text),
            { 
              placeholder: 'Enter any beneficiary issues',
              multiline: true,
              numberOfLines: 3
            }
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="checkmark-outline" size={20} color="white" />
                <Text style={styles.submitButtonText}>Add Visit</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>


    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 10,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },


  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  pickerButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  photoButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 10,
  },
  photoPath: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
});

export default AddVisitScreen;