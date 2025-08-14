import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, buildMediaUrl, buildApiUrl } from '../../config/api';
import { useTheme } from '../../contexts';

type CattleDetailsFromScanRouteProp = RouteProp<RootStackParamList, 'CattleDetailsFromScan'>;
type CattleDetailsFromScanNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CattleDetailsFromScan'>;

const { width } = Dimensions.get('window');

interface CattleData {
  animal_id: string;
  beneficiary: string;
  seller: string;
  purchase_place: string;
  cost: string;
  insurance_premium: string;
  type: string;
  breed: string;
  milk_yield_per_day: string;
  animal_age: number;
  pregnant: boolean;
  pregnancy_months?: number;
  calf_type?: string;
  tag_no?: string;
  
  // Image URLs
  muzzle1_photo_url?: string;
  muzzle2_photo_url?: string;
  muzzle3_photo_url?: string;
  front_photo_url?: string;
  left_photo_url?: string;
  right_photo_url?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

interface BeneficiaryData {
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
  beneficiary_image_url?: string;
}

interface ImageCarouselItem {
  id: string;
  title: string;
  uri: string;
}

const CattleDetailsFromScanScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<CattleDetailsFromScanRouteProp>();
  const navigation = useNavigation<CattleDetailsFromScanNavigationProp>();
  const { animal_id, score } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);
  
  // State management

  const [loading, setLoading] = useState(true);
  const [_cattleLoading, setCattleLoading] = useState(true);
  const [beneficiaryLoading, setBeneficiaryLoading] = useState(false);
  const [cattle, setCattle] = useState<CattleData | null>(null);
  const [beneficiary, setBeneficiary] = useState<BeneficiaryData | null>(null);
  const [images, setImages] = useState<ImageCarouselItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const formatCurrency = (amount: string): string => {
    const num = parseFloat(amount);
    return isNaN(num) ? 'N/A' : `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const prepareImages = (cattleData: CattleData): ImageCarouselItem[] => {
    const imageList: ImageCarouselItem[] = [];
    
    // Define all possible images with their data
    const imageFields = [
      { field: 'front_photo_url', title: 'Front View', id: 'front' },
      { field: 'muzzle1_photo_url', title: 'Muzzle Pattern 1', id: 'muzzle1' },
      { field: 'muzzle2_photo_url', title: 'Muzzle Pattern 2', id: 'muzzle2' },
      { field: 'muzzle3_photo_url', title: 'Muzzle Pattern 3', id: 'muzzle3' },
      { field: 'left_photo_url', title: 'Left Side View', id: 'left' },
      { field: 'right_photo_url', title: 'Right Side View', id: 'right' },
    ];

    // Add all images that have URLs (even if they might not load)
    imageFields.forEach(({ field, title, id }) => {
      const photoUrl = cattleData[field as keyof CattleData] as string;
      if (photoUrl) {
        imageList.push({
          id,
          title,
          uri: photoUrl // Store the original URL, FastCattleImage will handle the full URL building
        });
      }
    });

    console.log(`📸 Prepared ${imageList.length} images for animal ${cattleData.animal_id}:`);
    imageList.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.title}: ${img.uri}`);
    });
    return imageList;
  };

  const fetchCattleData = async () => {
    const startTime = Date.now();
    setLoading(true);
    setCattleLoading(true);
    setFetchError(null);
    
    try {
      console.log('🐄 Starting cattle data fetch for ID:', animal_id);
      console.log('🔗 Full API URL:', buildApiUrl(`${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`));
      
      // Fast API call using only the working base URL
      const cattleData: CattleData = await apiGet(
        `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`,
        { 
          timeout: API_CONFIG.FAST_TIMEOUT,
          cache: true
        }
      );
      
      console.log('✅ Cattle data received:', cattleData);
      
      // Show cattle data and images
      setCattle(cattleData);
      const imageList = prepareImages(cattleData);
      setImages(imageList);
      setCattleLoading(false);
      
      console.log(`✅ Cattle data loaded in ${Date.now() - startTime}ms`);
      
      // Step 2: Fetch beneficiary data (instead of seller)
      if (cattleData.beneficiary) {
        setBeneficiaryLoading(true);
        try {
          console.log('👤 Fetching beneficiary data for ID:', cattleData.beneficiary);
          
          const beneficiaryData: BeneficiaryData = await apiGet(
            `${API_CONFIG.ENDPOINTS.BENEFICIARIES}${cattleData.beneficiary}/`,
            { 
              timeout: API_CONFIG.FAST_TIMEOUT,
              cache: true
            }
          );
          
          setBeneficiary(beneficiaryData);
          console.log(`✅ Beneficiary data loaded in ${Date.now() - startTime}ms total`);
          
        } catch (error) {
          console.warn('⚠️ Beneficiary fetch failed (non-critical):', error);
          // Don't fail the whole screen if beneficiary fails
        } finally {
          setBeneficiaryLoading(false);
        }
      } else {
        console.log('ℹ️ No beneficiary ID found in cattle data');
      }
      
    } catch (error) {
      console.error('💥 All cattle fetch attempts failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFetchError(errorMessage);
      
      // Show a simple error message
      Alert.alert(
        'Loading Error', 
        'Failed to load cattle details. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: fetchCattleData },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      console.log(`🏁 Total fetch completed in ${Date.now() - startTime}ms`);
    }
  };

  useEffect(() => {
    console.log('🔍 CattleDetailsFromScanScreen mounted with animal_id:', animal_id);
    console.log('🔍 Route params:', route.params);
    
    if (!animal_id) {
      console.error('❌ No animal_id provided in route params');
      setFetchError('No animal ID provided');
      setLoading(false);
      return;
    }
    
    fetchCattleData();
  }, [animal_id]);

  const renderImageCarouselItem = ({ item }: { item: ImageCarouselItem }) => (
    <View style={styles.carouselImageContainer}>
      <Image
        source={{ uri: buildMediaUrl(item.uri) || undefined }}
        style={styles.carouselImage}
        resizeMode="cover"
        onError={() => console.log('Image failed to load:', item.uri)}
      />
      <Text style={styles.imageTitle}>{item.title}</Text>
    </View>
  );

  const renderImageCarousel = () => {
    if (images.length === 0) {
      return (
        <View style={styles.noImagesContainer}>
          <Icon name="image-outline" size={60} color={theme.colors.textSecondary} />
          <Text style={styles.noImagesText}>No images available</Text>
        </View>
      );
    }

    return (
      <View style={styles.imageSection}>
        <FlatList
          data={images}
          renderItem={renderImageCarouselItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(index);
          }}
          style={styles.imageCarousel}
        />
        
        {images.length > 1 && (
          <View style={styles.imageIndicators}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === activeImageIndex && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCattleInfo = () => {
    if (!cattle) return null;

    return (
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Cattle Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Animal ID</Text>
            <Text style={styles.infoValue}>{cattle.animal_id}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{cattle.type || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Breed</Text>
            <Text style={styles.infoValue}>{cattle.breed || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{cattle.animal_age ? `${cattle.animal_age} years` : 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Milk Yield/Day</Text>
            <Text style={styles.infoValue}>{cattle.milk_yield_per_day || 'N/A'} L</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cost</Text>
            <Text style={styles.infoValue}>{formatCurrency(cattle.cost)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Insurance Premium</Text>
            <Text style={styles.infoValue}>{formatCurrency(cattle.insurance_premium)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Purchase Place</Text>
            <Text style={styles.infoValue}>{cattle.purchase_place || 'N/A'}</Text>
          </View>
          
          {cattle.pregnant && (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pregnancy Status</Text>
                <Text style={[styles.infoValue, styles.pregnantText]}>Pregnant</Text>
              </View>
              
              {cattle.pregnancy_months && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pregnancy Months</Text>
                  <Text style={styles.infoValue}>{cattle.pregnancy_months} months</Text>
                </View>
              )}
            </>
          )}
          
          {cattle.tag_no && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tag Number</Text>
              <Text style={styles.infoValue}>{cattle.tag_no}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBeneficiaryInfo = () => {
    if (beneficiaryLoading) {
      return (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Beneficiary Information</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading beneficiary details...</Text>
          </View>
        </View>
      );
    }

    if (!beneficiary) {
      return (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Beneficiary Information</Text>
          <Text style={styles.noDataText}>Beneficiary information not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Beneficiary Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{beneficiary.name}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Father/Husband</Text>
            <Text style={styles.infoValue}>{beneficiary.father_or_husband}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Aadhaar ID</Text>
            <Text style={styles.infoValue}>{beneficiary.aadhaar_id}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{beneficiary.phone_number}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Village</Text>
            <Text style={styles.infoValue}>{beneficiary.village}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mandal</Text>
            <Text style={styles.infoValue}>{beneficiary.mandal}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue}>{beneficiary.district}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>State</Text>
            <Text style={styles.infoValue}>{beneficiary.state}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Animals Sanctioned</Text>
            <Text style={styles.infoValue}>{beneficiary.animals_sanctioned}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderScanInfo = () => {
    return (
      <View style={styles.scanInfoSection}>
        <Text style={styles.sectionTitle}>Scan Results</Text>
        <View style={styles.scanInfoGrid}>
          <View style={styles.scanInfoItem}>
            <Text style={styles.infoLabel}>Confidence Score</Text>
            <Text style={[styles.infoValue, styles.confidenceScore]}>
              {score ? `${(score * 100).toFixed(2)}%` : 'N/A'}
            </Text>
          </View>
          <View style={styles.scanInfoItem}>
            <Text style={styles.infoLabel}>Scan Date</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.visitButton]}
          onPress={() => {
            navigation.navigate('CattleVisit', { 
              animal_id: cattle?.animal_id || animal_id 
            });
          }}
        >
          <Icon name="calendar-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>View Visits</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Back to Scan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading cattle details...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <Icon name="alert-circle-outline" size={60} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load cattle details</Text>
        <Text style={styles.errorSubtext}>{fetchError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCattleData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cattle Details</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}
        {renderScanInfo()}
        {renderCattleInfo()}
        {renderBeneficiaryInfo()}
        {renderActionButtons()}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButtonHeader: {
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
  imageSection: {
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  imageCarousel: {
    height: 300,
  },
  carouselImageContainer: {
    width: width,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  carouselImage: {
    width: width - 40,
    height: 250,
    borderRadius: 10,
  },
  imageTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  activeIndicator: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
  },
  noImagesContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  noImagesText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  scanInfoSection: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 10,
  },
  scanInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  confidenceScore: {
    color: theme.colors.success,
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  pregnantText: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtonsContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  visitButton: {
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 20,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CattleDetailsFromScanScreen;