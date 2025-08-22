import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  ToastAndroid
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import ViewShot from 'react-native-view-shot';
import RNGetLocation from 'react-native-get-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { API_CONFIG, buildApiUrl, apiGet, apiUpload } from '../../config/api';
import MuzzleDetectionService, { MuzzleImageAnalysis } from '../../services/MuzzleDetectionService';
import { useTheme } from '../../contexts';
import NetInfo from '@react-native-community/netinfo';
import { insertCattleLocal } from '../../database/repositories/cattleRepo';
import OfflineSyncService from '../../services/OfflineSyncService';
import { saveCattleImageLocally } from '../../utils/imageStorage';

type AddCattleRouteProp = RouteProp<RootStackParamList, 'AddCattle'>;

interface FormData {
  // Required fields matching Django model
  beneficiary: string;           // UUID of beneficiary
  seller: string;               // UUID of seller
  purchase_place: string;
  cost: string;
  insurance_premium: string;
  type: string;                 // Buffalo/Cow
  breed: string;                // Murrah/Mehsana/etc.
  milk_yield_per_day: string;
  animal_age: string;
  
  // Optional fields
  pregnant: boolean;
  pregnancy_months: string;
  calf_type: string;           // Male/Female
  tag_no: string;
  
  // Image fields - individual muzzle images
  muzzle1_photo: string;
  muzzle2_photo: string;
  muzzle3_photo: string;
  front_photo: string;
  left_photo: string;
  right_photo: string;
  
  // Legacy fields for backward compatibility
  beneficiary_id: string;      // Will map to beneficiary
  state: string;
  district: string;
  mandal: string;
  village: string;
  muzzle_images: string[];     // Will split into individual muzzle photos
}

interface ApiResponse {
  animal_id: string;
  beneficiary: string;
  seller: string;
  purchase_place: string;
  cost: string;
  insurance_premium: string;
  type: string;
  breed: string;
  pregnant: boolean;
  pregnancy_months?: number;
  calf_type?: string;
  milk_yield_per_day: string;
  tag_no?: string;
  animal_age: number;
  
  // Image URLs returned by Django
  muzzle1_photo_url?: string;
  muzzle2_photo_url?: string;
  muzzle3_photo_url?: string;
  front_photo_url?: string;
  left_photo_url?: string;
  right_photo_url?: string;
  tag_photo_url?: string;
  health_cert_url?: string;
  valuation_cert_url?: string;
}

const indianStates = [
  { id: 'TS', name: 'Telangana' },
  { id: 'AP', name: 'Andhra Pradesh' },
  { id: 'KA', name: 'Karnataka' },
  { id: 'TN', name: 'Tamil Nadu' },
  { id: 'MH', name: 'Maharashtra' },
];

const districtsByState = {
  'TS': [
    { id: 'HY', name: 'Hyderabad' },
    { id: 'RN', name: 'Rangareddy' },
    { id: 'KM', name: 'Khammam' },
    { id: 'WU', name: 'Warangal Urban' },
    { id: 'KH', name: 'Karimnagar' },
    { id: 'NZ', name: 'Nizamabad' },
    { id: 'NI', name: 'Nalgonda' },
    { id: 'MD', name: 'Medak' },
    { id: 'MB', name: 'Mahabubnagar' },
    { id: 'AD', name: 'Adilabad' }
  ],
  'AP': [
    { id: 'VZ', name: 'Visakhapatnam' },
    { id: 'VJ', name: 'Vijayawada' },
    { id: 'GT', name: 'Guntur' },
    { id: 'TI', name: 'Tirupati' },
    { id: 'KR', name: 'Kurnool' },
    { id: 'AN', name: 'Anantapur' }
  ],
  'KA': [
    { id: 'BG', name: 'Bengaluru' },
    { id: 'MY', name: 'Mysuru' },
    { id: 'HB', name: 'Hubballi' },
    { id: 'MN', name: 'Mangaluru' },
    { id: 'BL', name: 'Belagavi' }
  ],
  'TN': [
    { id: 'CH', name: 'Chennai' },
    { id: 'CB', name: 'Coimbatore' },
    { id: 'MD', name: 'Madurai' },
    { id: 'TC', name: 'Tiruchirappalli' },
    { id: 'SL', name: 'Salem' }
  ],
  'MH': [
    { id: 'MU', name: 'Mumbai' },
    { id: 'PU', name: 'Pune' },
    { id: 'NG', name: 'Nagpur' },
    { id: 'NS', name: 'Nashik' },
    { id: 'AU', name: 'Aurangabad' }
  ]
};

const animalTypes = [
  { id: 'Buffalo', name: 'Buffalo' },
  { id: 'Cow', name: 'Cow' }
];

const breedTypes = [
  { id: 'Murrah', name: 'Murrah' },
  { id: 'Mehsana', name: 'Mehsana' },
  { id: 'Shahiwal', name: 'Shahiwal' },
  { id: 'Deoni', name: 'Deoni' },
  { id: 'HF', name: 'HF' },
  { id: 'Jersey', name: 'Jersey' },
  { id: 'Gir', name: 'Gir' },
  { id: 'Other', name: 'Other' }
];

const calfTypes = [
  { id: 'Male', name: 'Male' },
  { id: 'Female', name: 'Female' }
];

const mandalVillageData = {
  // Telangana - Hyderabad
  'HY': {
    mandals: [
      { id: 'HY01', name: 'Secunderabad' },
      { id: 'HY02', name: 'Kukatpally' },
      { id: 'HY03', name: 'LB Nagar' }
    ],
    villages: {
      'HY01': [
        { id: 'HY0101', name: 'Secunderabad Cantonment' },
        { id: 'HY0102', name: 'Trimulgherry' },
        { id: 'HY0103', name: 'Alwal' }
      ],
      'HY02': [
        { id: 'HY0201', name: 'Kukatpally' },
        { id: 'HY0202', name: 'Bachupally' },
        { id: 'HY0203', name: 'Pragathi Nagar' }
      ],
      'HY03': [
        { id: 'HY0301', name: 'LB Nagar' },
        { id: 'HY0302', name: 'Vanasthalipuram' },
        { id: 'HY0303', name: 'Hayathnagar' }
      ]
    }
  },
  
  // Telangana - Rangareddy
  'RN': {
    mandals: [
      { id: 'RN01', name: 'Shamshabad' },
      { id: 'RN02', name: 'Chevella' },
      { id: 'RN03', name: 'Maheshwaram' }
    ],
    villages: {
      'RN01': [
        { id: 'RN0101', name: 'Shamshabad' },
        { id: 'RN0102', name: 'Rajiv Gandhi International Airport' },
        { id: 'RN0103', name: 'Kothur' }
      ],
      'RN02': [
        { id: 'RN0201', name: 'Chevella' },
        { id: 'RN0202', name: 'Moinabad' },
        { id: 'RN0203', name: 'Shankarpally' }
      ],
      'RN03': [
        { id: 'RN0301', name: 'Maheshwaram' },
        { id: 'RN0302', name: 'Kandukur' },
        { id: 'RN0303', name: 'Ibrahimpatnam' }
      ]
    }
  },
  
  // Telangana - Khammam
  'KM': {
    mandals: [
      { id: 'KM01', name: 'Khammam Urban' },
      { id: 'KM02', name: 'Khammam Rural' },
      { id: 'KM03', name: 'Sathupalli' }
    ],
    villages: {
      'KM01': [
        { id: 'KM0101', name: 'Khammam (Urban)' },
        { id: 'KM0102', name: 'Kothagudem' },
        { id: 'KM0103', name: 'Bommakal' }
      ],
      'KM02': [
        { id: 'KM0201', name: 'Nelakondapalli' },
        { id: 'KM0202', name: 'Mudigonda' },
        { id: 'KM0203', name: 'Chintakani' }
      ],
      'KM03': [
        { id: 'KM0301', name: 'Sathupalli' },
        { id: 'KM0302', name: 'Penuballi' },
        { id: 'KM0303', name: 'Kalluru' }
      ]
    }
  },
  
  // Andhra Pradesh - Visakhapatnam
  'VZ': {
    mandals: [
      { id: 'VZ01', name: 'Visakhapatnam Urban' },
      { id: 'VZ02', name: 'Anakapalle' },
      { id: 'VZ03', name: 'Narsipatnam' }
    ],
    villages: {
      'VZ01': [
        { id: 'VZ0101', name: 'MVP Colony' },
        { id: 'VZ0102', name: 'Gajuwaka' },
        { id: 'VZ0103', name: 'Madhurawada' }
      ],
      'VZ02': [
        { id: 'VZ0201', name: 'Anakapalle' },
        { id: 'VZ0202', name: 'Chodavaram' },
        { id: 'VZ0203', name: 'Madugula' }
      ],
      'VZ03': [
        { id: 'VZ0301', name: 'Narsipatnam' },
        { id: 'VZ0302', name: 'Golugonda' },
        { id: 'VZ0303', name: 'Ravikamatham' }
      ]
    }
  },
  
  // Karnataka - Bengaluru
  'BG': {
    mandals: [
      { id: 'BG01', name: 'Bengaluru North' },
      { id: 'BG02', name: 'Bengaluru South' },
      { id: 'BG03', name: 'Bengaluru East' }
    ],
    villages: {
      'BG01': [
        { id: 'BG0101', name: 'Yelahanka' },
        { id: 'BG0102', name: 'Devanahalli' },
        { id: 'BG0103', name: 'Doddaballapur' }
      ],
      'BG02': [
        { id: 'BG0201', name: 'Banashankari' },
        { id: 'BG0202', name: 'Jayanagar' },
        { id: 'BG0203', name: 'Bommanahalli' }
      ],
      'BG03': [
        { id: 'BG0301', name: 'Whitefield' },
        { id: 'BG0302', name: 'Marathahalli' },
        { id: 'BG0303', name: 'Hoodi' }
      ]
    }
  }
};

const AddCattleScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<AddCattleRouteProp>();
  const navigation = useNavigation();
  const { beneficiary_id } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const [formData, setFormData] = useState<FormData>({
    // Django model fields
    beneficiary: beneficiary_id,
    seller: '',
    purchase_place: '',
    cost: '',
    insurance_premium: '',
    type: '',
    breed: '',
    pregnant: false,
    pregnancy_months: '',
    calf_type: '',
    milk_yield_per_day: '',
    tag_no: '',
    animal_age: '',
    
    // Individual muzzle photos
    muzzle1_photo: '',
    muzzle2_photo: '',
    muzzle3_photo: '',
    front_photo: '',
    left_photo: '',
    right_photo: '',
    
    // Legacy fields for backward compatibility
    beneficiary_id,
    state: '',
    district: '',
    mandal: '',
    village: '',
    muzzle_images: [],
  });

  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Muzzles, 2: Front, 3: Sides, 4: Form
  const [muzzleVerified, setMuzzleVerified] = useState<boolean>(false);
  const [frontImageCaptured, setFrontImageCaptured] = useState<boolean>(false);
  const [sideImagesCaptured, setSideImagesCaptured] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  
  // AI Muzzle Detection State
  const [muzzleImages, setMuzzleImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, message: '' });
  const [muzzleAnalysisResults, setMuzzleAnalysisResults] = useState<{
    bestImage: MuzzleImageAnalysis | null;
    allAnalysis: MuzzleImageAnalysis[];
    summary: any;
  } | null>(null);
  
  // Rapid capture state
  const [isRapidCapture, setIsRapidCapture] = useState<boolean>(false);
  const [rapidCaptureCount, setRapidCaptureCount] = useState<number>(0);
  const [rapidCaptureTimer, setRapidCaptureTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [filteredDistricts, setFilteredDistricts] = useState<{id: string, name: string}[]>([]);
  const [filteredMandal, setFilteredMandal] = useState<{id: string, name: string}[]>([]);
  const [filteredVillage, setFilteredVillage] = useState<{id: string, name: string}[]>([]);
  const [_isMounted, _setIsMounted] = useState<boolean>(true);

  // Check camera permission on mount and cleanup on unmount
  useEffect(() => {
    const checkCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          // Only check first; request later on action
          const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
          setHasCameraPermission(has);
          setPermissionDenied(false);
        } catch (err) {
          console.warn(err);
          setHasCameraPermission(false);
        }
      } else {
        setHasCameraPermission(true);
      }
    };
    checkCameraPermission();

    // Cleanup function
    return () => {
      _setIsMounted(false);
      if (rapidCaptureTimer) {
        clearTimeout(rapidCaptureTimer);
      }
    };
  }, []);

  // Filter districts based on selected state
  useEffect(() => {
    if (formData.state) {
      const districts = districtsByState[formData.state as keyof typeof districtsByState] || [];
      setFilteredDistricts(districts);
      setFormData(prev => ({ ...prev, district: '', mandal: '', village: '' }));
    } else {
      setFilteredDistricts([]);
      setFilteredMandal([]);
      setFilteredVillage([]);
      setFormData(prev => ({ ...prev, district: '', mandal: '', village: '' }));
    }
  }, [formData.state]);

  // Filter mandals based on selected district
  useEffect(() => {
    if (formData.district) {
      const districtData = mandalVillageData[formData.district as keyof typeof mandalVillageData];
      if (districtData) {
        setFilteredMandal(districtData.mandals);
        setFormData(prev => ({ ...prev, mandal: '', village: '' }));
      } else {
        setFilteredMandal([]);
        setFilteredVillage([]);
        setFormData(prev => ({ ...prev, mandal: '', village: '' }));
      }
    } else {
      setFilteredMandal([]);
      setFilteredVillage([]);
      setFormData(prev => ({ ...prev, mandal: '', village: '' }));
    }
  }, [formData.district]);

  // Filter villages based on selected mandal
  useEffect(() => {
    if (formData.mandal && formData.district) {
      const districtData = mandalVillageData[formData.district as keyof typeof mandalVillageData];
      if (districtData) {
        const villages = districtData.villages[formData.mandal as keyof typeof districtData.villages] || [];
        setFilteredVillage(villages);
        setFormData(prev => ({ ...prev, village: '' }));
      } else {
        setFilteredVillage([]);
        setFormData(prev => ({ ...prev, village: '' }));
      }
    } else {
      setFilteredVillage([]);
      setFormData(prev => ({ ...prev, village: '' }));
    }
  }, [formData.mandal, formData.district]);

  const handleInputChange = (key: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Vision Camera + burst state
  const cameraRef = React.useRef<Camera>(null);
  const device = useCameraDevice('back');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturingBurst, setCapturingBurst] = useState(false);
  const [burstProgress, setBurstProgress] = useState(0);
  const [rawMuzzleImages, setRawMuzzleImages] = useState<string[]>([]);

  // Watermark for front image
  const frontImageShotRef = React.useRef<ViewShot>(null);
  const [isWatermarkingFront, setIsWatermarkingFront] = useState(false);
  const [frontImageReady, setFrontImageReady] = useState(false);
  const [captureLocation, setCaptureLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [captureDateTime, setCaptureDateTime] = useState<string>('');

  const startRapidCapture = () => {
    setIsRapidCapture(true);
    setRapidCaptureCount(0);
    setMuzzleImages([]);
    captureMuzzleImageRapid(0, []);
  };

  // Parameterized to avoid stale state between timeouts
  const captureMuzzleImageRapid = async (currentCount: number, currentImages: string[]) => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        setIsRapidCapture(false);
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: false, // Disable cropping for faster capture
        mediaType: 'photo',
        includeBase64: false,
        compressImageQuality: 0.7, // Slightly lower quality for speed
        forceJpg: true, // Force JPEG for consistency
      });

      if (image && image.path) {
        const newCount = currentCount + 1;
        const newImages = [...currentImages, image.path];
        setMuzzleImages(newImages);
        setRapidCaptureCount(newCount);
        
        console.log(`📷 Rapid capture ${newCount}/4: ${image.path}`);
        
        // If we haven't captured all 4 images, continue rapid capture
        if (newCount < 4) {
          // Short delay before next capture (1 second)
          const timer = setTimeout(() => {
            captureMuzzleImageRapid(newCount, newImages);
          }, 1000);
          setRapidCaptureTimer(timer);
        } else {
          // All 4 images captured, stop rapid capture and analyze
          setIsRapidCapture(false);
          setRapidCaptureTimer(null);
          console.log('🎯 All 4 muzzle images captured! Starting AI analysis...');
          analyzeMuzzleImages(newImages);
        }
      }
    } catch (error: any) {
      setIsRapidCapture(false);
      setRapidCaptureTimer(null);
      
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not capture muzzle image. Please try again.');
        console.error('Muzzle capture error:', error);
      } else {
        // User cancelled, reset the process
        setMuzzleImages([]);
        setRapidCaptureCount(0);
      }
    }
  };

  const stopRapidCapture = () => {
    setIsRapidCapture(false);
    if (rapidCaptureTimer) {
      clearTimeout(rapidCaptureTimer);
      setRapidCaptureTimer(null);
    }
  };

  // Open Vision Camera and prepare for burst capture
  const captureMuzzleBurst = async () => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        return;
      }
      setHasCameraPermission(true);
    }
    setShowCamera(true);
    setCameraActive(true);
  };

  // Take 4 snapshots rapidly in a single session
  const takeSnapshot = async () => {
    if (!cameraRef.current) return;

    setCapturingBurst(true);
    const newRawImages: string[] = [];

    try {
      for (let i = 0; i < 4; i++) {
        setBurstProgress(i + 1);

        const snapshot = await cameraRef.current.takeSnapshot({
          quality: 85,
          skipMetadata: true,
        });

        if (snapshot?.path) {
          const uri = snapshot.path.startsWith('file://') ? snapshot.path : `file://${snapshot.path}`;
          newRawImages.push(uri);
        }

        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      setRawMuzzleImages(newRawImages);
      setCapturingBurst(false);
      setBurstProgress(0);
      setCameraActive(false);
      setShowCamera(false);

      // Proceed to crop all images one by one
      cropMuzzleImages(newRawImages);
    } catch (error) {
      console.error('Snapshot error:', error);
      Alert.alert('Error', 'Failed to capture images');
      setCapturingBurst(false);
      setBurstProgress(0);
      setCameraActive(false);
      setShowCamera(false);
    }
  };

  // Crop all muzzle images sequentially, then store to form state
  const cropMuzzleImages = async (images: string[]) => {
    try {
      const croppedImages: string[] = [];

      for (const imageUri of images) {
        const cropped = await ImagePicker.openCropper({
          path: imageUri,
          width: 500,
          height: 500,
          cropping: true,
          cropperCircleOverlay: false,
          freeStyleCropEnabled: true,
          mediaType: 'photo',
          includeBase64: false,
          compressImageQuality: 0.8,
        });
        if (cropped?.path) {
          croppedImages.push(cropped.path);
        }
      }

      if (croppedImages.length > 0) {
        setMuzzleImages(croppedImages);
      }
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not crop images');
        console.error(error);
      }
    }
  };

  // Capture front image, then watermark with location + datetime via ViewShot
  const captureFrontImage = async () => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: false,
        mediaType: 'photo',
        includeBase64: false,
        compressImageQuality: 0.8,
      });

      if (image?.path) {
        // Set raw image first so the ViewShot content can render
        setFormData(prev => ({ ...prev, front_photo: image.path }));

        // Prepare watermark data
        const now = new Date();
        setCaptureDateTime(now.toLocaleString());

        // Ask for location permission if needed and fetch location
        try {
          let locationGranted = true;
          if (Platform.OS === 'android') {
            const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            const coarse = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
            locationGranted = (fine === PermissionsAndroid.RESULTS.GRANTED) || (coarse === PermissionsAndroid.RESULTS.GRANTED);
          }

          if (locationGranted) {
            const loc = await RNGetLocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
            setCaptureLocation({ latitude: loc.latitude, longitude: loc.longitude });
          } else {
            setCaptureLocation(null);
          }
        } catch (e) {
          console.warn('Location fetch failed. Proceeding without location.', e);
          setCaptureLocation(null);
        }

        // Trigger watermarking UI state to render ViewShot overlay once
        setIsWatermarkingFront(true);
        setFrontImageReady(false);

        // Attempt ViewShot capture after small delay to ensure render
        let attempts = 0;
        const tryShot = () => {
          attempts += 1;
          const ref = frontImageShotRef.current;
          if (ref) {
            ref.capture().then(uri => {
              const finalUri = Platform.OS === 'android' && uri && !uri.startsWith('file://') ? `file://${uri}` : uri;
              setFormData(prev => ({ ...prev, front_photo: finalUri }));
            }).catch(err => {
              console.error('ViewShot capture error:', err);
              Alert.alert('Warning', 'Watermark capture failed, using original image.');
            }).finally(() => {
              setIsWatermarkingFront(false); // Hide overlay after capturing once
            });
          } else if (attempts < 5) {
            setTimeout(tryShot, 600);
          } else {
            setIsWatermarkingFront(false);
          }
        };
        setTimeout(tryShot, 800);
      }
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not capture image');
        console.error(error);
      }
    }
  };

  // Legacy single capture method (kept for fallback)
  const captureMuzzleImage = async () => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: false,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
        includeBase64: false,
        compressImageQuality: 0.8,
      });

      if (image && image.path) {
        const newImages = [...muzzleImages, image.path];
        setMuzzleImages(newImages);
        console.log(`📷 Captured muzzle image ${newImages.length}: ${image.path}`);
        
        // If we have all 4 images, automatically analyze them
        if (newImages.length === 4) {
          analyzeMuzzleImages(newImages);
        }
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not capture muzzle image. Please try again.');
        console.error('Muzzle capture error:', error);
      }
    }
  };

  const analyzeMuzzleImages = async (imageUris: string[]) => {
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: imageUris.length, message: '🤖 Starting AI muzzle analysis...' });

    try {
      // Process each image with progress updates
      const allAnalysis: MuzzleImageAnalysis[] = [];
      
      for (let i = 0; i < imageUris.length; i++) {
        setAnalysisProgress({
          current: i + 1,
          total: imageUris.length,
          message: `📸 Analyzing muzzle image ${i + 1} of ${imageUris.length}...`
        });
        
        const analysis = await MuzzleDetectionService.analyzeImage(imageUris[i], i);
        allAnalysis.push(analysis);
      }

      // Find the best result
      const successfulDetections = allAnalysis.filter(analysis => analysis.detection.success);
      
      let bestImage: MuzzleImageAnalysis | null = null;
      if (successfulDetections.length > 0) {
        bestImage = successfulDetections.reduce((best, current) => 
          current.detection.confidence > best.detection.confidence ? current : best
        );
      }

      const summary = {
        totalImages: imageUris.length,
        successfulDetections: successfulDetections.length,
        highQualityCount: successfulDetections.filter(a => a.detection.quality === 'high').length,
        mediumQualityCount: successfulDetections.filter(a => a.detection.quality === 'medium').length,
        lowQualityCount: successfulDetections.filter(a => a.detection.quality === 'low').length,
      };

      setMuzzleAnalysisResults({ bestImage, allAnalysis, summary });
      
      if (bestImage) {
        console.log(`🏆 Best muzzle: Image #${bestImage.imageIndex + 1} with ${(bestImage.detection.confidence * 100).toFixed(1)}% confidence`);
        
        // Update form data with the best images
        setFormData(prev => ({
          ...prev,
          muzzle1_photo: bestImage.imageUri,
          muzzle2_photo: allAnalysis[1]?.imageUri || bestImage.imageUri,
          muzzle3_photo: allAnalysis[2]?.imageUri || bestImage.imageUri,
          muzzle_images: imageUris,
        }));

        // Handle different quality levels
        if (bestImage.detection.quality === 'high') {
          Alert.alert(
            '🎉 High Quality Muzzle Detected!',
            `Perfect! AI detected a high-quality muzzle with ${(bestImage.detection.confidence * 100).toFixed(1)}% confidence.\n\nImage #${bestImage.imageIndex + 1} has been selected as the best.`,
            [{ text: 'Continue', onPress: () => setMuzzleVerified(true) }]
          );
        } else if (bestImage.detection.quality === 'medium') {
          Alert.alert(
            '⚠️ Medium Quality Detected',
            `AI detected a medium-quality muzzle with ${(bestImage.detection.confidence * 100).toFixed(1)}% confidence.\n\nWould you like to take more photos or continue?`,
            [
              {
                text: 'Take More Photos',
                onPress: () => {
                  setMuzzleImages([]);
                  setMuzzleAnalysisResults(null);
                }
              },
              { 
                text: 'Use This Image',
                onPress: () => {
                  setMuzzleVerified(true);
                  setCurrentStep(2);
                }
              }
            ]
          );
        } else {
          Alert.alert(
            '⚠️ Low Quality Detected',
            `AI detected a low-quality muzzle with ${(bestImage.detection.confidence * 100).toFixed(1)}% confidence.\n\nRecommend taking clearer photos for better accuracy.`,
            [
              {
                text: 'Retake Photos',
                onPress: () => {
                  setMuzzleImages([]);
                  setMuzzleAnalysisResults(null);
                }
              },
              { 
                text: 'Use Anyway',
                onPress: () => {
                  setMuzzleVerified(true);
                  setCurrentStep(2);
                },
                style: 'destructive'
              }
            ]
          );
        }
      } else {
        Alert.alert(
          '❌ No Muzzle Detected',
          `AI could not detect cattle muzzles in any of the ${imageUris.length} images.\n\nPlease ensure:\n• Good lighting\n• Clear focus on muzzle\n• Muzzle fills most of the frame`,
          [
            {
              text: 'Retake Photos',
              onPress: () => {
                setMuzzleImages([]);
                setMuzzleAnalysisResults(null);
              }
            },
            { 
              text: 'Continue Anyway',
              onPress: () => {
                // Use images anyway without verification
                setFormData(prev => ({
                  ...prev,
                  muzzle1_photo: imageUris[0] || '',
                  muzzle2_photo: imageUris[1] || '',
                  muzzle3_photo: imageUris[2] || '',
                  muzzle_images: imageUris,
                }));
                setMuzzleVerified(true);
                setCurrentStep(2);
              }
            }
          ]
        );
      }

    } catch (error: any) {
      console.error('Muzzle analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        `Could not analyze muzzle images: ${error.message || 'Unknown error'}`,
        [
          {
            text: 'Retake Photos',
            onPress: () => {
              setMuzzleImages([]);
              setMuzzleAnalysisResults(null);
            }
          },
          { 
            text: 'Continue Anyway',
            onPress: () => {
              setMuzzleVerified(true);
              setCurrentStep(2);
            }
          }
        ]
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({ current: 0, total: 0, message: '' });
    }
  };



  const handleImagePick = async (field: keyof FormData) => {
    if (Platform.OS === 'android' && hasCameraPermission === false) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(true);
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      const options = {
        width: 800,
        height: 800,
        cropping: false,
        mediaType: 'photo' as const,
        includeBase64: true,
        compressImageQuality: 0.8,
      };

      const image = await ImagePicker.openCamera(options);

      if (image) {
        setFormData(prev => ({ ...prev, [field]: image.path }));
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not take picture');
        console.error(error);
      }
    }
  };

  const handleSubmit = async () => {
    const requiredFields = [
      { field: 'beneficiary', name: 'Beneficiary' },
      { field: 'seller', name: 'Seller' },
      { field: 'purchase_place', name: 'Purchase Place' },
      { field: 'cost', name: 'Cost' },
      { field: 'insurance_premium', name: 'Insurance Premium' },
      { field: 'type', name: 'Animal Type' },
      { field: 'breed', name: 'Breed' },
      { field: 'milk_yield_per_day', name: 'Milk Yield Per Day' },
      { field: 'animal_age', name: 'Animal Age' },
      { field: 'front_photo', name: 'Front Photo' },
      { field: 'left_photo', name: 'Left Side Photo' },
      { field: 'right_photo', name: 'Right Side Photo' },
    ];

    const missingFields = requiredFields.filter(
      ({ field }) => !formData[field as keyof FormData]
    );

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Fields',
        `Please fill all required fields: ${missingFields.map(f => f.name).join(', ')}`
      );
      return;
    }

    if (!formData.muzzle1_photo || !formData.muzzle2_photo || !formData.muzzle3_photo) {
      Alert.alert('Missing', 'Please capture all 3 muzzle images');
      return;
    }

    // Normalize and validate numeric inputs safely
    const ageStr = (formData.animal_age || '').toString().trim();
    const ageNum = Number(ageStr);
    if (!Number.isFinite(ageNum) || ageNum <= 0) {
      Alert.alert('Invalid Input', 'Animal age must be a positive number');
      return;
    }

    const costStr = (formData.cost || '').toString().trim();
    const costNum = Number(costStr);
    if (!Number.isFinite(costNum) || costNum <= 0) {
      Alert.alert('Invalid Input', 'Cost must be a positive number');
      return;
    }

    const insuranceStr = (formData.insurance_premium || '').toString().trim();
    const insuranceNum = Number(insuranceStr);
    if (!Number.isFinite(insuranceNum) || insuranceNum <= 0) {
      Alert.alert('Invalid Input', 'Insurance premium must be a positive number');
      return;
    }

    const milkStr = (formData.milk_yield_per_day || '').toString().trim();
    const milkNum = Number(milkStr);
    if (!Number.isFinite(milkNum) || milkNum <= 0) {
      Alert.alert('Invalid Input', 'Milk yield per day must be a positive number');
      return;
    }

    if (formData.pregnant) {
      const pmStr = (formData.pregnancy_months || '').toString().trim();
      if (!pmStr) {
        Alert.alert('Invalid Input', 'Pregnancy months must be between 1 and 9');
        return;
      }
      const pmNum = Number(pmStr);
      if (!Number.isInteger(pmNum) || pmNum < 1 || pmNum > 9) {
        Alert.alert('Invalid Input', 'Pregnancy months must be between 1 and 9');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Check connectivity (treat null as offline to avoid hangs)
      const state = await NetInfo.fetch();
      const isOnline = state.isConnected === true && state.isInternetReachable === true;

      if (isOnline) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Uploading cattle...', ToastAndroid.SHORT);
        }
        const form = new FormData();
        form.append('beneficiary', formData.beneficiary);
        form.append('seller', formData.seller);
        form.append('purchase_place', formData.purchase_place);
        form.append('cost', formData.cost);
        form.append('insurance_premium', formData.insurance_premium);
        form.append('type', formData.type);
        form.append('breed', formData.breed);
        form.append('milk_yield_per_day', formData.milk_yield_per_day);
        form.append('animal_age', formData.animal_age);
        form.append('pregnant', formData.pregnant.toString());
        if (formData.pregnant && formData.pregnancy_months) form.append('pregnancy_months', formData.pregnancy_months);
        if (formData.calf_type) form.append('calf_type', formData.calf_type);
        if (formData.tag_no) form.append('tag_no', formData.tag_no);

        const appendImage = (field: string, uri: string, name: string) => {
          if (uri) {
            form.append(field, { uri, name: `${name}.jpg`, type: 'image/jpeg' } as any);
          }
        };
        appendImage('muzzle1_photo', formData.muzzle1_photo, 'muzzle1');
        appendImage('muzzle2_photo', formData.muzzle2_photo, 'muzzle2');
        appendImage('muzzle3_photo', formData.muzzle3_photo, 'muzzle3');
        appendImage('front_photo', formData.front_photo, 'front');
        appendImage('left_photo', formData.left_photo, 'left');
        appendImage('right_photo', formData.right_photo, 'right');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.SLOW_TIMEOUT);
        // Use native fetch for multipart
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.MILCH_ANIMALS), {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: form,
          signal: controller.signal as any,
        });
        clearTimeout(timeout);
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`HTTP ${response.status}: ${err}`);
        }
        const data: ApiResponse = await response.json();

        // Persist synced row locally
        const { insertCattleSynced } = await import('../../database/repositories/cattleRepo');
        await insertCattleSynced({
          server_id: data.animal_id,
          seller_local_id: null,
          seller_server_id: formData.seller,
          beneficiary_local_id: null,
          beneficiary_server_id: formData.beneficiary,
          purchase_place: formData.purchase_place,
          cost: formData.cost,
          insurance_premium: formData.insurance_premium,
          type: formData.type,
          breed: formData.breed,
          milk_yield_per_day: formData.milk_yield_per_day,
          animal_age: formData.animal_age,
          pregnant: formData.pregnant ? 1 : 0,
          pregnancy_months: formData.pregnancy_months || null,
          calf_type: formData.calf_type || null,
          tag_no: formData.tag_no || null,
          muzzle1_photo: formData.muzzle1_photo,
          muzzle2_photo: formData.muzzle2_photo,
          muzzle3_photo: formData.muzzle3_photo,
          front_photo: formData.front_photo,
          left_photo: formData.left_photo,
          right_photo: formData.right_photo,
        });

        // Inform the user quickly on Android, and show a final Alert
        if (Platform.OS === 'android') {
          ToastAndroid.show('Cattle registered successfully', ToastAndroid.SHORT);
        }
        Alert.alert('Success', `Cattle registered successfully!\\n\\nAnimal ID: ${data.animal_id}`,[{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        // Offline: save locally and trigger sync
        if (Platform.OS === 'android') {
          ToastAndroid.show('Saving offline...', ToastAndroid.SHORT);
        }
        console.log('📴 Offline mode: inserting cattle locally...');
        try {
          // Proactively ensure tables exist before insert
          const { forceMigration } = await import('../../database/sqlite');
          await forceMigration();

          // Simple: store original URIs directly (no file copy) to avoid failures
          const localId = await insertCattleLocal({
            server_id: null,
            seller_local_id: null,
            seller_server_id: formData.seller || null,
            beneficiary_local_id: null,
            beneficiary_server_id: formData.beneficiary || null,
            purchase_place: formData.purchase_place || null,
            cost: formData.cost || null,
            insurance_premium: formData.insurance_premium || null,
            type: formData.type || null,
            breed: formData.breed || null,
            milk_yield_per_day: formData.milk_yield_per_day || null,
            animal_age: formData.animal_age || null,
            pregnant: formData.pregnant ? 1 : 0,
            pregnancy_months: formData.pregnancy_months || null,
            calf_type: formData.calf_type || null,
            tag_no: formData.tag_no || null,
            muzzle1_photo: formData.muzzle1_photo || null,
            muzzle2_photo: formData.muzzle2_photo || null,
            muzzle3_photo: formData.muzzle3_photo || null,
            front_photo: formData.front_photo || null,
            left_photo: formData.left_photo || null,
            right_photo: formData.right_photo || null,
          });

          console.log('✅ Offline insert completed with local_id:', localId);
          OfflineSyncService.getInstance().manualSync().catch(() => {});
          if (Platform.OS === 'android') {
            ToastAndroid.show(`Saved offline (ID: ${localId}). Will sync when online.`, ToastAndroid.SHORT);
          }
          Alert.alert('Saved Offline', 'Cattle saved locally and will sync automatically.');
          navigation.goBack();
        } catch (e:any) {
          console.error('❌ Offline insert failed:', e?.message || e);
          Alert.alert('Save Failed', 'Could not save locally. Please try again.');
        }
      }
    } catch (error: any) {
      // On failure, persist offline as fallback
      console.warn('Upload failed, saving offline:', error?.message || error);
      await insertCattleLocal({
        server_id: null,
        seller_local_id: null,
        seller_server_id: formData.seller || null,
        beneficiary_local_id: null,
        beneficiary_server_id: formData.beneficiary || null,
        purchase_place: formData.purchase_place,
        cost: formData.cost,
        insurance_premium: formData.insurance_premium,
        type: formData.type,
        breed: formData.breed,
        milk_yield_per_day: formData.milk_yield_per_day,
        animal_age: formData.animal_age,
        pregnant: formData.pregnant ? 1 : 0,
        pregnancy_months: formData.pregnancy_months || null,
        calf_type: formData.calf_type || null,
        tag_no: formData.tag_no || null,
        muzzle1_photo: formData.muzzle1_photo,
        muzzle2_photo: formData.muzzle2_photo,
        muzzle3_photo: formData.muzzle3_photo,
        front_photo: formData.front_photo,
        left_photo: formData.left_photo,
        right_photo: formData.right_photo,
      });
      OfflineSyncService.getInstance().manualSync().catch(() => {});
      Alert.alert('Saved Offline', 'Network error. Cattle saved locally and will sync later.');
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  const renderImageBox = (label: string, field: keyof FormData, caption: string) => (
    <View style={styles.imageColumn}>
      <TouchableOpacity
        style={[
          styles.imageBox,
          formData[field] && styles.uploadedImageBox,
          permissionDenied && styles.disabledImageBox,
        ]}
        onPress={() => handleImagePick(field)}
        disabled={permissionDenied || isAnalyzing}
      >
        {permissionDenied ? (
          <View style={styles.permissionDeniedView}>
            <Ionicons name="warning" size={24} color="red" />
            <Text style={styles.permissionDeniedText}>Camera access denied</Text>
          </View>
        ) : formData[field] ? (
          <Image source={{ uri: formData[field] as string }} style={styles.uploadedImage} />
        ) : (
          <>
            <Ionicons
              name="camera"
              size={30}
              color={hasCameraPermission ? '#6e45e2' : 'gray'}
            />
            <Text style={styles.imageText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={styles.caption}>{caption}</Text>
      {formData[field] && (
        <TouchableOpacity
          onPress={() => handleImagePick(field)}
          disabled={isAnalyzing}
        >
          <Text style={styles.retakeText}>
            {isAnalyzing ? 'Analyzing...' : 'Retake'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMuzzleStep = () => (
    <>
      <Text style={styles.sectionTitle}>🤖 AI Muzzle Detection</Text>
      
      {isAnalyzing ? (
        <View style={styles.analysisContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.analysisMessage}>{analysisProgress.message}</Text>
          <Text style={styles.analysisProgress}>
            {analysisProgress.current} / {analysisProgress.total}
          </Text>
          <View style={styles.analysisSteps}>
            <Text style={styles.stepTitle}>AI Process:</Text>
            <Text style={styles.stepText}>• Converting images to AI format</Text>
            <Text style={styles.stepText}>• Detecting muzzle patterns</Text>
            <Text style={styles.stepText}>• Measuring image quality</Text>
            <Text style={styles.stepText}>• Selecting best result</Text>
          </View>
        </View>
      ) : muzzleAnalysisResults?.bestImage ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.successTitle}>🏆 Best Muzzle Selected!</Text>
          
          <View style={styles.bestImageContainer}>
            <Image 
              source={{ uri: muzzleAnalysisResults.bestImage.imageUri }} 
              style={styles.bestMuzzleImage} 
            />
            <View style={styles.bestImageStats}>
              <Text style={styles.bestImageTitle}>
                Image #{muzzleAnalysisResults.bestImage.imageIndex + 1}
              </Text>
              <Text style={[styles.qualityBadge, { color: getQualityColor(muzzleAnalysisResults.bestImage.detection.quality!) }]}>
                {getQualityIcon(muzzleAnalysisResults.bestImage.detection.quality!)} {muzzleAnalysisResults.bestImage.detection.quality!.toUpperCase()} QUALITY
              </Text>
              <Text style={styles.confidenceText}>
                {(muzzleAnalysisResults.bestImage.detection.confidence * 100).toFixed(1)}% Confidence
              </Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>📊 Analysis Summary</Text>
            <Text style={styles.summaryText}>
              {muzzleAnalysisResults.summary.successfulDetections} of {muzzleAnalysisResults.summary.totalImages} images had detectable muzzles
            </Text>
            <Text style={styles.summaryText}>
              🟢 {muzzleAnalysisResults.summary.highQualityCount} High Quality  
              🟡 {muzzleAnalysisResults.summary.mediumQualityCount} Medium Quality  
              🔴 {muzzleAnalysisResults.summary.lowQualityCount} Low Quality
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setMuzzleVerified(true);
              setCurrentStep(2);
            }}
          >
            <Text style={styles.buttonText}>✅ Use Selected Muzzle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setMuzzleImages([]);
              setMuzzleAnalysisResults(null);
            }}
          >
            <Text style={[styles.buttonText, { color: '#6e45e2' }]}>🔄 Take New Photos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {muzzleImages.length > 0 ? (
            <View style={styles.capturedImagesContainer}>
              <Text style={styles.capturedTitle}>Captured Images ({muzzleImages.length}/4):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollContainer}>
                {muzzleImages.map((img, index) => (
                  <View key={index} style={styles.capturedImageWrapper}>
                    <Image 
                      source={{ uri: img }} 
                      style={styles.capturedMuzzleImage} 
                    />
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                ))}
              </ScrollView>
              
              {muzzleImages.length < 4 ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={captureMuzzleImage}
                  disabled={permissionDenied}
                >
                  <Text style={styles.buttonText}>📷 Take Photo ({muzzleImages.length + 1}/4)</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => analyzeMuzzleImages(muzzleImages)}
                  disabled={permissionDenied}
                >
                  <Text style={styles.buttonText}>🔍 Analyze with AI</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setMuzzleImages([])}
              >
                <Text style={styles.resetButtonText}>🗑️ Start Over</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.instructionText}>
                📸 Take 4 clear photos of the cattle muzzle for AI analysis
              </Text>
              <Text style={styles.instructionHint}>
                Tips: Focus on nose pattern • Good lighting • Centered muzzle
              </Text>
              
              {isRapidCapture ? (
                <View style={styles.rapidCaptureContainer}>
                  <Text style={styles.rapidCaptureTitle}>
                    🚀 Rapid Capture Mode
                  </Text>
                  <Text style={styles.rapidCaptureProgress}>
                    Photo {rapidCaptureCount + 1} of 4
                  </Text>
                  <Text style={styles.rapidCaptureHint}>
                    Get ready for the next shot in 1 second...
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.stopCaptureButton}
                    onPress={stopRapidCapture}
                  >
                    <Text style={styles.stopCaptureText}>⏹️ Stop Capture</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.captureOptionsContainer}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={captureMuzzleBurst}
                    disabled={permissionDenied}
                  >
                    <Text style={styles.buttonText}>🚀 Quick Capture (4 photos)</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.orText}>or</Text>
                  
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={captureMuzzleImage}
                    disabled={permissionDenied}
                  >
                    <Text style={[styles.buttonText, { color: '#6e45e2' }]}>📷 Take One by One</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </>
      )}
    </>
  );

  // Helper functions for quality display
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
      default: return '#666';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚫';
    }
  };

  const renderFrontImageStep = () => (
    <>
      <Text style={styles.sectionTitle}>Front Image</Text>
      <Text style={styles.instructionText}>
        Please capture a full body view of the cattle
      </Text>
      
      {formData.front_photo ? (
        <View style={styles.imageColumn}>
          {/* Show plain image normally */}
          {!isWatermarkingFront && (
            <Image source={{ uri: formData.front_photo }} style={styles.largeImage} />
          )}

          {/* Show overlay only during watermarking to avoid duplicate text */}
          {isWatermarkingFront && (
            <ViewShot
              ref={frontImageShotRef}
              options={{ format: 'jpg', quality: 0.9, result: 'tmpfile' }}
              style={{ width: 300, height: 300 }}
            >
              <View style={{ width: 300, height: 300 }}>
                <Image
                  source={{ uri: formData.front_photo }}
                  style={{ width: 300, height: 300, borderRadius: 8, borderWidth: 2, borderColor: '#6e45e2' }}
                  onLoad={() => setFrontImageReady(true)}
                  resizeMode="cover"
                />
                <View style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 6
                }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>
                    {captureDateTime || ''}
                  </Text>
                  {!!captureLocation && (
                    <Text style={{ color: '#fff', fontSize: 12 }}>
                      Lat: {captureLocation.latitude.toFixed(5)}, Long: {captureLocation.longitude.toFixed(5)}
                    </Text>
                  )}
                </View>
              </View>
            </ViewShot>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep(1)}
            >
              <Text style={[styles.buttonText, { color: '#6e45e2' }]}>Back to Muzzles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setFrontImageCaptured(true);
                setCurrentStep(3);
              }}
            >
              <Text style={styles.buttonText}>Continue to Side Views</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={captureFrontImage}
            disabled={permissionDenied}
          >
            <Text style={styles.buttonText}>Capture Front Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={[styles.buttonText, { color: '#6e45e2' }]}>Back to Muzzles</Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const renderSideImagesStep = () => (
    <>
      <Text style={styles.sectionTitle}>Side Views</Text>
      
      <View style={styles.imageRow}>
        {renderImageBox('Right Side', 'right_photo', 'Required')}
        {renderImageBox('Left Side', 'left_photo', 'Required')}
      </View>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep(2)}
      >
        <Text style={[styles.buttonText, { color: '#6e45e2' }]}>Back to Front</Text>
      </TouchableOpacity>
      
      {formData.right_photo && formData.left_photo && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setSideImagesCaptured(true);
            setCurrentStep(4);
          }}
        >
          <Text style={styles.buttonText}>Continue to Details</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // Save locally when offline and trigger sync when online
  const onSubmitCattle = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const required = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
      required(!!formData.seller?.trim(), 'Seller ID is required');
      required(!!formData.purchase_place?.trim(), 'Purchase place is required');
      required(!!formData.cost?.trim(), 'Cost is required');
      required(!!formData.insurance_premium?.trim(), 'Insurance premium is required');
      required(!!formData.type?.trim(), 'Animal type is required');
      required(!!formData.breed?.trim(), 'Breed is required');
      required(!!formData.milk_yield_per_day?.trim(), 'Milk yield per day is required');
      required(!!formData.animal_age?.trim(), 'Animal age is required');
      required(muzzleImages.length >= 3, 'Please capture 3 muzzle images');
      required(!!formData.front_photo, 'Front image is required');
      required(!!formData.left_photo && !!formData.right_photo, 'Left and Right images are required');

      const bId = formData.beneficiary || formData.beneficiary_id || 'unknown';
      const localM1 = await saveCattleImageLocally(muzzleImages[0], bId, 'muzzle1');
      const localM2 = await saveCattleImageLocally(muzzleImages[1], bId, 'muzzle2');
      const localM3 = await saveCattleImageLocally(muzzleImages[2], bId, 'muzzle3');
      const localFront = await saveCattleImageLocally(formData.front_photo, bId, 'front');
      const localLeft = await saveCattleImageLocally(formData.left_photo, bId, 'left');
      const localRight = await saveCattleImageLocally(formData.right_photo, bId, 'right');

      await insertCattleLocal({
        server_id: null,
        seller_local_id: null,
        seller_server_id: formData.seller?.trim() || null,
        beneficiary_local_id: null,
        beneficiary_server_id: formData.beneficiary?.trim() || null,
        purchase_place: formData.purchase_place || null,
        cost: formData.cost || null,
        insurance_premium: formData.insurance_premium || null,
        type: formData.type || null,
        breed: formData.breed || null,
        milk_yield_per_day: formData.milk_yield_per_day || null,
        animal_age: formData.animal_age || null,
        pregnant: formData.pregnant ? 1 : 0,
        pregnancy_months: formData.pregnancy_months || null,
        calf_type: formData.calf_type || null,
        tag_no: formData.tag_no || null,
        muzzle1_photo: localM1,
        muzzle2_photo: localM2,
        muzzle3_photo: localM3,
        front_photo: localFront,
        left_photo: localLeft,
        right_photo: localRight,
      });

      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected && net.isInternetReachable !== false);
      if (online) {
        try { await OfflineSyncService.getInstance().manualSync(); } catch {}
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show('Cattle saved locally for sync', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Cattle saved locally for sync');
      }
      (navigation as any).goBack();
    } catch (e: any) {
      const msg = e?.message || 'Failed to save cattle. Please try again.';
      Alert.alert('Error', msg);
      console.error('Register cattle failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormStep = () => (
    <>
      <Text style={styles.sectionTitle}>Cattle Details</Text>

      <Text style={styles.label}>Seller ID *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter seller UUID"
        value={formData.seller}
        onChangeText={(val) => handleInputChange('seller', val)}
      />

      <Text style={styles.label}>Purchase Place *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter purchase place"
        value={formData.purchase_place}
        onChangeText={(val) => handleInputChange('purchase_place', val)}
      />

      <Text style={styles.label}>Cost *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter cost (e.g., 50000.00)"
        keyboardType="decimal-pad"
        value={formData.cost}
        onChangeText={(val) => handleInputChange('cost', val)}
      />

      <Text style={styles.label}>Insurance Premium *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter insurance premium (e.g., 2500.00)"
        keyboardType="decimal-pad"
        value={formData.insurance_premium}
        onChangeText={(val) => handleInputChange('insurance_premium', val)}
      />

      <Text style={styles.label}>Animal Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.type}
          onValueChange={(value) => handleInputChange('type', value)}
          style={styles.picker}
        >
          <Picker.Item label="Select Animal Type" value="" />
          {animalTypes.map((type) => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Breed *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.breed}
          onValueChange={(value) => handleInputChange('breed', value)}
          style={styles.picker}
        >
          <Picker.Item label="Select Breed" value="" />
          {breedTypes.map((breed) => (
            <Picker.Item key={breed.id} label={breed.name} value={breed.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Pregnant</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.pregnant.toString()}
          onValueChange={(value) => handleInputChange('pregnant', value === 'true')}
          style={styles.picker}
        >
          <Picker.Item label="No" value="false" />
          <Picker.Item label="Yes" value="true" />
        </Picker>
      </View>

      {formData.pregnant && (
        <>
          <Text style={styles.label}>Pregnancy Months</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter pregnancy months (1-9)"
            keyboardType="numeric"
            value={formData.pregnancy_months}
            onChangeText={(val) => handleInputChange('pregnancy_months', val)}
          />
        </>
      )}

      <Text style={styles.label}>Calf Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.calf_type}
          onValueChange={(value) => handleInputChange('calf_type', value)}
          style={styles.picker}
        >
          <Picker.Item label="Select Calf Type (Optional)" value="" />
          {calfTypes.map((calf) => (
            <Picker.Item key={calf.id} label={calf.name} value={calf.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Milk Yield Per Day (Liters) *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter daily milk yield (e.g., 15.50)"
        keyboardType="decimal-pad"
        value={formData.milk_yield_per_day}
        onChangeText={(val) => handleInputChange('milk_yield_per_day', val)}
      />

      <Text style={styles.label}>Tag Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter tag number (optional)"
        value={formData.tag_no}
        onChangeText={(val) => handleInputChange('tag_no', val)}
      />

      <Text style={styles.label}>Animal Age (months) *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter age in months"
        keyboardType="numeric"
        value={formData.animal_age}
        onChangeText={(val) => handleInputChange('animal_age', val)}
      />

      <Text style={styles.label}>State *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.state}
          onValueChange={(value) => handleInputChange('state', value)}
          style={styles.picker}
        >
          <Picker.Item label="Select State" value="" />
          {indianStates.map((state) => (
            <Picker.Item key={state.id} label={state.name} value={state.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>District *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.district}
          onValueChange={(value) => handleInputChange('district', value)}
          style={styles.picker}
          enabled={!!formData.state}
        >
          <Picker.Item label={formData.state ? "Select District" : "First select State"} value="" />
          {filteredDistricts.map((district) => (
            <Picker.Item key={district.id} label={district.name} value={district.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Mandal *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.mandal}
          onValueChange={(value) => handleInputChange('mandal', value)}
          style={styles.picker}
          enabled={!!formData.district}
        >
          <Picker.Item label={formData.district ? "Select Mandal" : "First select District"} value="" />
          {filteredMandal.map((mandal) => (
            <Picker.Item key={mandal.id} label={mandal.name} value={mandal.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Village *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.village}
          onValueChange={(value) => handleInputChange('village', value)}
          style={styles.picker}
          enabled={!!formData.mandal}
        >
          <Picker.Item label={formData.mandal ? "Select Village" : "First select Mandal"} value="" />
          {filteredVillage.map((village) => (
            <Picker.Item key={village.id} label={village.name} value={village.id} />
          ))}
        </Picker>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep(3)}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSubmitCattle}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register Cattle</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Step Progress Indicator Component
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: '4 Muzzles', icon: '👃', completed: muzzleVerified },
      { number: 2, title: 'Front View', icon: '📷', completed: frontImageCaptured },
      { number: 3, title: 'Side Views', icon: '↔️', completed: sideImagesCaptured },
      { number: 4, title: 'Details', icon: '📝', completed: false }
    ];

    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((step, index) => (
          <View key={step.number} style={styles.stepIndicatorWrapper}>
            {/* Step Circle */}
            <View style={[
              styles.stepCircle,
              currentStep === step.number && styles.stepCircleActive,
              step.completed && styles.stepCircleCompleted
            ]}>
              <Text style={[
                styles.stepIcon,
                currentStep === step.number && styles.stepIconActive,
                step.completed && styles.stepIconCompleted
              ]}>
                {step.completed ? '✅' : step.icon}
              </Text>
            </View>
            
            {/* Step Title */}
            <Text style={[
              styles.stepTitle,
              currentStep === step.number && styles.stepTitleActive,
              step.completed && styles.stepTitleCompleted
            ]}>
              {step.title}
            </Text>
            
            {/* Connection Line */}
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                step.completed && styles.stepLineCompleted
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderMuzzleStep();
      case 2:
        return renderFrontImageStep();
      case 3:
        return renderSideImagesStep();
      case 4:
        return renderFormStep();
      default:
        return renderMuzzleStep();
    }
  };

  if (hasCameraPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
      </View>
    );
  }

  return (
    <>
      {/* Fullscreen Vision Camera overlay for burst mode */}
      {showCamera && device ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'black', zIndex: 9999 }}>
          <Camera
            ref={cameraRef}
            style={{ flex: 1 }}
            device={device}
            isActive={cameraActive}
            photo={true}
          />
          <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={takeSnapshot}
              disabled={capturingBurst}
              style={{ backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30 }}
            >
              <Text style={{ color: '#000', fontWeight: 'bold' }}>
                {capturingBurst ? `Capturing ${burstProgress}/4` : 'Take 4 Photos'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowCamera(false); setCameraActive(false); }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Cattle</Text>
        </View>
        {permissionDenied && (
          <View style={styles.permissionBanner}>
            <Ionicons name="warning" size={20} color="white" />
            <Text style={styles.permissionBannerText}>
              Camera permission is required. Please enable it in device settings.
            </Text>
          </View>
        )}
        
        {/* Step Progress Indicator */}
        {renderStepIndicator()}
        
        {/* Current Step Content */}
        {renderCurrentStep()}
      </ScrollView>
    </>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  imageBox: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  disabledImageBox: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  uploadedImageBox: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.surface,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  largeImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6e45e2',
    marginBottom: 16,
  },
  imageText: {
    fontSize: 12,
    color: '#6e45e2',
    marginTop: 8,
    textAlign: 'center',
  },
  caption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  retakeText: {
    fontSize: 12,
    color: '#6e45e2',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#6e45e2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  secondaryButton: {
    backgroundColor: '#ccc',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#000000',
    textAlignVertical: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
    fontSize: 16,
    paddingHorizontal: 12,
  },
  pickerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  permissionBanner: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionBannerText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  permissionDeniedView: {
    alignItems: 'center',
    padding: 8,
  },
  permissionDeniedText: {
    color: 'red',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  burstContainer: {
    alignItems: 'center',
    padding: 20,
    marginVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  burstText: {
    marginTop: 10,
    color: '#333',
    fontWeight: '500',
  },
  burstHint: {
    marginTop: 5,
    color: '#666',
    fontSize: 12,
  },
  muzzlePreviewContainer: {
    marginVertical: 16,
  },
  muzzlePreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  muzzlePreviewWrapper: {
    alignItems: 'center',
    marginRight: 10,
  },
  muzzlePreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  muzzleImageIndex: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // AI Analysis Styles
  analysisContainer: {
    alignItems: 'center',
    padding: 30,
    marginVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  analysisMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '500',
  },
  analysisProgress: {
    fontSize: 14,
    color: '#6e45e2',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  analysisSteps: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  stepText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },

  // Results Styles
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  bestImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bestMuzzleImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 15,
  },
  bestImageStats: {
    alignItems: 'center',
  },
  bestImageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  qualityBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 16,
    color: '#6e45e2',
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },

  // Captured Images Styles
  capturedImagesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  capturedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  imageScrollContainer: {
    marginBottom: 16,
  },
  capturedImageWrapper: {
    alignItems: 'center',
    marginRight: 12,
  },
  capturedMuzzleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Step Indicator Styles
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepIndicatorWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#6e45e2',
    borderColor: '#6e45e2',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepIcon: {
    fontSize: 20,
  },
  stepIconActive: {
    color: '#fff',
  },
  stepIconCompleted: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTitleActive: {
    color: '#6e45e2',
    fontWeight: 'bold',
  },
  stepTitleCompleted: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  stepLine: {
    position: 'absolute',
    top: 25,
    right: -50,
    width: 100,
    height: 2,
    backgroundColor: '#ddd',
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },

  // Rapid Capture Styles
  rapidCaptureContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6e45e2',
  },
  rapidCaptureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6e45e2',
    marginBottom: 8,
  },
  rapidCaptureProgress: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  rapidCaptureHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  stopCaptureButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stopCaptureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  captureOptionsContainer: {
    alignItems: 'center',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 8,
    fontStyle: 'italic',
  },
});

export default AddCattleScreen;