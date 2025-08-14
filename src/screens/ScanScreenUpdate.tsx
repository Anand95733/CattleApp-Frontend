import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PermissionsAndroid,
  Platform,
  Alert,
  Modal,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ImagePicker from 'react-native-image-crop-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLocation, useTheme } from '../contexts';

// Ionicons for status indicators
const SuccessIcon = () => <Icon name="checkmark-circle" size={30} color="#4CAF50" />;
const WarningIcon = () => <Icon name="warning" size={30} color="#FFC107" />;
const ErrorIcon = () => <Icon name="close-circle" size={30} color="#F44336" />;
const CameraIcon = () => <Icon name="camera" size={24} color="white" />;
const LocationIcon = () => <Icon name="location" size={24} color="#6e45e2" />;
const PermissionErrorIcon = () => <Icon name="alert-circle" size={24} color="white" />;



const ScanScreen = ({ navigation }) => {
  // Get contexts
  const {
    locationState,
    setSelectedDistrict,
    setSelectedMandal,
    getAllDistricts,
    getMandalsByDistrict,
    getDistrictName,
    getMandalName
  } = useLocation();
  
  const { theme } = useTheme();

  // State management
  const [verifying, setVerifying] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [image, setImage] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  
  // Animation refs
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Create dynamic styles
  const styles = createStyles(theme);

  // Reset state when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      resetScanState();
    });
    return unsubscribe;
  }, [navigation]);

  const resetScanState = () => {
    setVerifying(false);
    setImage(null);
    setScanResult(null);
    setShowLocationModal(true);
    setApiError(null);
    setNetworkError(false);
  };



  // Animation for rotating and pulsing logo during verification
  useEffect(() => {
    if (verifying) {
      // Spin animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
      
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [verifying]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const pulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2]
  });

  // Check camera permission on component mount
  useEffect(() => {
    const checkCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'App needs access to your camera for scanning',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
          setPermissionDenied(granted === PermissionsAndroid.RESULTS.DENIED);
        } catch (err) {
          console.error('Permission error:', err);
          setHasCameraPermission(false);
        }
      } else {
        setHasCameraPermission(true);
      }
    };
    checkCameraPermission();
  }, []);

  const captureImage = useCallback(async () => {
    try {
      const capturedImage = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: false,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
        includeBase64: true,
        compressImageQuality: 0.8,
      });

      if (capturedImage) {
        setImage(capturedImage.path);
        setScanResult(null);
        setApiError(null);
        setNetworkError(false);
        verifyImage(capturedImage.path);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not capture image. Please try again.');
        console.error('Image capture error:', error);
      }
      setShowLocationModal(true);
    }
  }, [locationState.selectedDistrict, locationState.selectedMandal]);

  const verifyImage = async (imagePath) => {
    if (!imagePath) return;

    setVerifying(true);
    try {
      const formData = new FormData();
      
      formData.append('image', {
        uri: imagePath,
        name: 'muzzle.jpg',
        type: 'image/jpeg',
      });

      formData.append('state', locationState.selectedState);
      formData.append('district', locationState.selectedDistrict);
      formData.append('mandal', locationState.selectedMandal);

      const response = await fetch('http://107.210.222.39:8001/search/', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 3000000 // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.results?.length > 0) {
        setScanResult({
          exists: true,
          data: result.results[0],
          message: 'Cattle identified successfully!'
        });
      } else {
        setScanResult({
          exists: false,
          message: 'This cattle is not registered in our system',
          suggestion: 'Please check the muzzle image quality or register this cattle.'
        });
      }
    } catch (error) {
      console.error('Verification Error:', error);
      if (error.message.includes('Network request failed')) {
        setNetworkError(true);
        setApiError('Network error. Please check your internet connection.');
      } else {
        setApiError('Verification failed. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleLocationSubmit = () => {
    if (!locationState.selectedDistrict || !locationState.selectedMandal) {
      Alert.alert('Required', 'Please select both district and mandal');
      return;
    }
    setShowLocationModal(false);
    captureImage();
  };

  const renderScanResult = () => {
    if (!scanResult) return null;

    return (
      <View style={styles.resultContainer}>
        {scanResult.exists ? (
          <>
            <View style={styles.successHeader}>
              <SuccessIcon />
              <Text style={styles.resultTitle}>Verification Successful</Text>
            </View>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Cattle ID:</Text>
                <Text style={styles.resultValue}>{scanResult.data.cattle_id || 'N/A'}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Confidence Score:</Text>
                <Text style={[
                  styles.resultValue,
                  styles.confidenceValue,
                  scanResult.data.score > 0.9 ? styles.highConfidence : 
                  scanResult.data.score > 0.7 ? styles.mediumConfidence : 
                  styles.lowConfidence
                ]}>
                  {scanResult.data.score ? `${(scanResult.data.score * 100).toFixed(2)}%` : 'N/A'}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Location:</Text>
                <Text style={styles.resultValue}>
                  {getDistrictName(locationState.selectedDistrict)}, {' '}
                  {getMandalName(locationState.selectedMandal)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.errorHeader}>
              <WarningIcon />
              <Text style={styles.resultTitle}>Verification Result</Text>
            </View>
            
            <View style={styles.resultCard}>
              <Text style={styles.notFoundText}>{scanResult.message}</Text>
              {scanResult.suggestion && (
                <Text style={styles.suggestionText}>{scanResult.suggestion}</Text>
              )}
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.notFoundImage} 
                resizeMode="contain"
              />
            </View>
          </>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetScanState}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Scan Another</Text>
          </TouchableOpacity>

          {scanResult.exists && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                navigation.navigate('CattleDetails', { 
                  cattleId: scanResult.data.cattle_id,
                  score: scanResult.data.score 
                });
              }}
            >
              <Text style={styles.buttonText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderLocationModal = () => (
    <Modal
      visible={showLocationModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLocationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <LocationIcon />
            <Text style={styles.modalTitle}>Select Location</Text>
          </View>
          
          <View style={styles.pickerGroup}>
            <Text style={styles.label}>State</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={locationState.selectedState}
                enabled={false}
                style={styles.picker}
                dropdownIconColor="#6e45e2"
              >
                <Picker.Item label="Telangana" value="TS" />
              </Picker>
            </View>
          </View>

          <View style={styles.pickerGroup}>
            <Text style={styles.label}>District *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={locationState.selectedDistrict}
                onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                style={styles.picker}
                dropdownIconColor="#6e45e2"
              >
                <Picker.Item label="Select District" value="" />
                {getAllDistricts().map(district => (
                  <Picker.Item 
                    key={district.id} 
                    label={district.name} 
                    value={district.id} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.pickerGroup}>
            <Text style={styles.label}>Mandal *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={locationState.selectedMandal}
                onValueChange={(itemValue) => setSelectedMandal(itemValue)}
                enabled={!!locationState.selectedDistrict && locationState.mandals.length > 0}
                style={styles.picker}
                dropdownIconColor="#6e45e2"
              >
                <Picker.Item label="Select Mandal" value="" />
                {locationState.mandals.map(mandal => (
                  <Picker.Item 
                    key={mandal.id} 
                    label={mandal.name} 
                    value={mandal.id} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton, 
              (!locationState.selectedDistrict || !locationState.selectedMandal) && styles.disabledButton
            ]}
            onPress={handleLocationSubmit}
            disabled={!locationState.selectedDistrict || !locationState.selectedMandal}
          >
            <CameraIcon />
            <Text style={styles.buttonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (hasCameraPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.Image 
          source={require('../assets/logo.png')} 
          style={[styles.logo, { 
            transform: [{ rotate: spin }, { scale: pulse }] 
          }]} 
        />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permissionDenied && (
        <View style={styles.permissionBanner}>
          <PermissionErrorIcon />
          <Text style={styles.permissionBannerText}>
            Camera permission is required for scanning. Please enable it in device settings.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              if (Platform.OS === 'android') {
                PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {renderLocationModal()}
      
      {!showLocationModal && (
        <>
          {verifying ? (
            <View style={styles.verificationContainer}>
              <Animated.Image 
                source={require('../assets/logo.png')} 
                style={[styles.logo, { 
                  transform: [{ rotate: spin }, { scale: pulse }] 
                }]} 
              />
              <Text style={styles.verifyingText}>Verifying muzzle pattern...</Text>
              <Text style={styles.verifyingSubtext}>This may take a few seconds</Text>
            </View>
          ) : (
            <>
              {apiError ? (
                <View style={styles.errorContainer}>
                  {networkError ? <ErrorIcon /> : <WarningIcon />}
                  <Text style={styles.errorText}>{apiError}</Text>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={resetScanState}
                  >
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                scanResult && renderScanResult()
              )}
            </>
          )}
        </>
      )}
    </View>
  );
};

const { width, height } = Dimensions.get('window');
const modalWidth = Math.min(width * 0.9, 400);
const modalHeight = height * 0.7;

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 20,
    color: theme.colors.primary,
    fontSize: 16,
  },
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 50,
  },
  verifyingText: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  verifyingSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: modalWidth,
    maxHeight: modalHeight,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 10,
  },
  pickerGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 5,
  },
  pickerContainer: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
    color: theme.colors.text,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#6e45e2',
    shadowColor: '#6e45e2',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    shadowColor: '#b8b8b8',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: '#b8b8b8',
    shadowColor: '#b8b8b8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    gap: 10,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f8f9fa',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  resultValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    paddingLeft: 10,
  },
  confidenceValue: {
    fontWeight: 'bold',
  },
  highConfidence: {
    color: theme.colors.success,
  },
  mediumConfidence: {
    color: theme.colors.warning,
  },
  lowConfidence: {
    color: theme.colors.error,
  },
  notFoundText: {
    fontSize: 18,
    color: theme.colors.error,
    textAlign: 'center',
    fontWeight: '500',
    paddingVertical: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  notFoundImage: {
    width: '100%',
    height: 150,
    marginTop: 10,
  },
  permissionBanner: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 8,
    margin: 15,
    alignItems: 'center',
    gap: 10,
  },
  permissionBannerText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  permissionButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    width: '60%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ScanScreen;