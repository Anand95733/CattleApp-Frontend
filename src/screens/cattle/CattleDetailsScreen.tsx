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
import SafeIcon from '../../components/SafeIcon';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, buildMediaUrl, buildApiUrl, apiCallParallel } from '../../config/api';
import { perf, usePerformanceTracker } from '../../utils/performance';
import FastCattleImage from '../../components/FastCattleImage';
import { ImageDebugger, testCattleImages, getImageDebugReport } from '../../utils/imageDebugger';
import { ImageRecoveryService, prevalidateCattleImages } from '../../utils/imageRecoveryService';
import { useTheme } from '../../contexts';
// Temporarily disabled: import { smartDjangoCall, RequestPriority, prefetchCattleData } from '../../utils/djangoOptimizer';

type CattleDetailsRouteProp = RouteProp<RootStackParamList, 'CattleDetails'>;
type CattleDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CattleDetails'>;

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

interface SellerData {
  seller_id: string;
  name: string;
  father_or_husband: string;
  aadhaar_id: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  phone_number: number;
}

interface ImageCarouselItem {
  id: string;
  title: string;
  uri: string;
}

const CattleDetailsScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<CattleDetailsRouteProp>();
  const navigation = useNavigation<CattleDetailsNavigationProp>();
  const { animal_id } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);
  
  // Performance tracking
  usePerformanceTracker('CattleDetailsScreen');

  const [loading, setLoading] = useState(true);
  const [_cattleLoading, setCattleLoading] = useState(true);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [cattle, setCattle] = useState<CattleData | null>(null);
  const [seller, setSeller] = useState<SellerData | null>(null);
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

  // Optimized fetch using apiGet
  const fetchCattleDataSimple = async () => {
    console.log('🔄 Fetching cattle data...');
    setLoading(true);
    setFetchError(null);
    
    try {
      const cattleData = await apiGet(`${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`, {
        cache: true,
        timeout: API_CONFIG.FAST_TIMEOUT
      });
      
      console.log('✅ Cattle data loaded successfully');
      
      setCattle(cattleData);
      const imageList = prepareImages(cattleData);
      setImages(imageList);
      setLoading(false);
      
      // Enhanced image debugging and recovery in development
      if (__DEV__) {
        console.log('🔍 Starting enhanced image debugging and recovery...');
        
        // First, try image recovery service
        prevalidateCattleImages(cattleData).then((validation) => {
          console.log('📊 Image validation results:', validation);
          
          if (validation.invalidImages.length > 0) {
            console.warn(`⚠️ ${validation.invalidImages.length} images failed validation:`);
            validation.invalidImages.forEach(img => console.warn(`❌ ${img}`));
            
            console.log('💡 Recommendations:');
            validation.recommendations.forEach(rec => console.log(`   ${rec}`));
          }
          
          if (validation.validImages.length > 0) {
            console.log(`✅ ${validation.validImages.length} images are working correctly`);
          }
        }).catch(err => {
          console.warn('Image validation failed:', err);
        });

        // Also run the original debugging
        testCattleImages(cattleData).then((results) => {
          console.log(' Detailed image test results:', results);
          const report = getImageDebugReport();
          console.log(report);
          
          // Show failed images with enhanced suggestions
          const failedImages = results.filter(r => !r.exists);
          if (failedImages.length > 0) {
            console.warn(`⚠️ ${failedImages.length} images failed to load:`);
            failedImages.forEach(img => {
              console.warn(`❌ ${img.originalUrl} → ${img.error}`);
              const suggestions = ImageDebugger.suggestFixes(img);
              suggestions.forEach(suggestion => console.warn(`   💡 ${suggestion}`));
              
              // Add specific suggestions for the problematic animal
              if (img.originalUrl.includes('db2c211e-f6bd-43cf-8c19-10f26add9cc1')) {
                console.warn(`   🎯 Specific fix for animal db2c211e-f6bd-43cf-8c19-10f26add9cc1:`);
                console.warn(`   📁 Check if file exists: /media/animal_photos/db2c211e-f6bd-43cf-8c19-10f26add9cc1/front.jpg`);
                console.warn(`   🔧 Django command: ls -la media/animal_photos/db2c211e-f6bd-43cf-8c19-10f26add9cc1/`);
              }
            });
          }
        }).catch(err => {
          console.warn('Image debugging failed:', err);
        });
      }
      
      return cattleData;
    } catch (error) {
      console.error('❌ Failed to fetch cattle data:', error);
      throw error;
    }
  };

  const fetchCattleData = async () => {
    const startTime = Date.now();
    perf.start('CattleDetailsScreen-TotalLoad');
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
      
      // Show cattle data and images (if not already set by simple fetch)
      if (!cattle) {
        setCattle(cattleData);
        const imageList = prepareImages(cattleData);
        setImages(imageList);
      }
      setCattleLoading(false);
      
      console.log(`✅ Cattle data loaded in ${Date.now() - startTime}ms`);
      
      // Step 2: Fetch seller data (supplementary info)
      if (cattleData.seller) {
        setSellerLoading(true);
        try {
          console.log('🏪 Fetching seller data for ID:', cattleData.seller);
          
          const sellerData: SellerData = await apiGet(
            `${API_CONFIG.ENDPOINTS.SELLERS}${cattleData.seller}/`,
            { 
              timeout: API_CONFIG.FAST_TIMEOUT,
              cache: true
            }
          );
          
          setSeller(sellerData);
          console.log(`✅ Seller data loaded in ${Date.now() - startTime}ms total`);
          
        } catch (error) {
          console.warn('⚠️ Seller fetch failed (non-critical):', error);
          // Don't fail the whole screen if seller fails
        } finally {
          setSellerLoading(false);
        }
      } else {
        console.log('ℹ️ No seller ID found in cattle data');
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
      const totalTime = perf.end('CattleDetailsScreen-TotalLoad');
      console.log(`🏁 Total fetch completed in ${totalTime}ms`);
      
      // Show performance report in development
      if (__DEV__) {
        setTimeout(() => perf.report(), 100);
      }
    }
  };

  // Alternative: Truly parallel fetching (if you know seller ID beforehand)
  const fetchDataParallel = async (sellerId?: string) => {
    const startTime = Date.now();
    setLoading(true);
    setFetchError(null);
    
    try {
      console.log('🚀 Starting parallel data fetch...');
      
      const calls = {
        cattle: {
          endpoint: `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`,
          options: { timeout: API_CONFIG.FAST_TIMEOUT, cache: true }
        },
        ...(sellerId && {
          seller: {
            endpoint: `${API_CONFIG.ENDPOINTS.SELLERS}${sellerId}/`,
            options: { timeout: API_CONFIG.FAST_TIMEOUT, cache: true }
          }
        })
      };
      
      const results = await apiCallParallel(calls);
      
      // Process results
      if (results.cattle) {
        setCattle(results.cattle);
        const imageList = prepareImages(results.cattle);
        setImages(imageList);
      }
      
      if (results.seller) {
        setSeller(results.seller);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🏁 Parallel fetch completed in ${totalTime}ms`);
      
    } catch (error) {
      console.error('💥 Parallel fetch error:', error);
      setFetchError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      setCattleLoading(false);
      setSellerLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 CattleDetailsScreen mounted with animal_id:', animal_id);
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
      <FastCattleImage
        photoUrl={item.uri}
        style={styles.carouselImage}
        placeholder={item.title}
        resizeMode="cover"
      />
      <View style={styles.imageOverlay}>
        <Text style={styles.imageTitle}>{item.title}</Text>
      </View>
    </View>
  );

  const renderDetailItem = (icon: string, label: string, value: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.detailItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.detailContent}>
        <View style={styles.labelRow}>
          <SafeIcon name={icon} size={16} color={theme.colors.primary} style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, onPress && styles.clickableValue]}>{value}</Text>
      </View>
      {onPress && <SafeIcon name="chevron-forward" size={16} color={theme.colors.textSecondary} />}
    </TouchableOpacity>
  );

  const renderSellerCard = () => {
    if (!seller) return null;

    return (
      <View style={styles.sellerCard}>
        <Text style={styles.sectionTitle}>🏪 Seller Information</Text>
        <View style={styles.sellerHeader}>
          <View style={styles.sellerAvatarContainer}>
            <LinearGradient
              colors={['#f59e0b', '#f97316']}
              style={styles.sellerAvatarGradient}
            >
              <Text style={styles.sellerAvatarText}>
                {seller.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerLocation}>
              {seller.village}, {seller.district}
            </Text>
            <Text style={styles.sellerId}>ID: {seller.seller_id}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => {
              // Navigate to seller details if you have that screen
              console.log('Seller profile pressed:', seller.seller_id);
            }}
          >
            <SafeIcon name="storefront-outline" size={18} color="#f59e0b" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sellerDetails}>
          <View style={styles.sellerDetailRow}>
            <View style={styles.sellerDetailItem}>
              <Text style={styles.sellerDetailLabel}>Father/Husband</Text>
              <Text style={styles.sellerDetailValue}>{seller.father_or_husband}</Text>
            </View>
            <View style={styles.sellerDetailItem}>
              <Text style={styles.sellerDetailLabel}>Phone</Text>
              <Text style={styles.sellerDetailValue}>{seller.phone_number}</Text>
            </View>
          </View>
          <View style={styles.sellerDetailRow}>
            <View style={styles.sellerDetailItem}>
              <Text style={styles.sellerDetailLabel}>Aadhaar ID</Text>
              <Text style={styles.sellerDetailValue}>{seller.aadhaar_id}</Text>
            </View>
            <View style={styles.sellerDetailItem}>
              <Text style={styles.sellerDetailLabel}>State</Text>
              <Text style={styles.sellerDetailValue}>{seller.state}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Loading skeleton component
  const renderLoadingSkeleton = () => (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={theme.colors.gradient} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <SafeIcon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Skeleton */}
        <View style={styles.carouselContainer}>
          <View style={styles.skeletonImageContainer}>
            <ActivityIndicator size="large" color="#6e45e2" />
            <Text style={styles.skeletonText}>Loading images...</Text>
          </View>
        </View>

        {/* Content Skeleton */}
        <View style={styles.cattleCard}>
          <View style={styles.skeletonRow}>
            <View style={[styles.skeletonBox, { width: '60%', height: 24 }]} />
            <View style={[styles.skeletonBox, { width: '30%', height: 20 }]} />
          </View>
          
          <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>📋 Loading Details...</Text>
          
          {/* Loading rows */}
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.skeletonDetailRow}>
              <View style={[styles.skeletonBox, { width: 20, height: 20 }]} />
              <View style={[styles.skeletonBox, { width: '40%', height: 16 }]} />
              <View style={[styles.skeletonBox, { width: '30%', height: 16 }]} />
            </View>
          ))}
        </View>
        
        {/* Beneficiary Loading */}
        <View style={styles.cattleCard}>
          <Text style={styles.sectionTitle}>👤 Loading Beneficiary...</Text>
          <View style={styles.skeletonRow}>
            <View style={[styles.skeletonBox, styles.skeletonAvatar]} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={[styles.skeletonBox, { width: '70%', height: 18, marginBottom: 8 }]} />
              <View style={[styles.skeletonBox, { width: '50%', height: 14 }]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (loading && !cattle) {
    return renderLoadingSkeleton();
  }

  if (!cattle && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <SafeIcon name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>
            {fetchError ? 'Loading Error' : 'Cattle not found'}
          </Text>
          <Text style={styles.errorSubText}>Animal ID: {animal_id}</Text>
          
          {/* Debug information */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>🔍 Debug Info:</Text>
              <Text style={styles.debugText}>Animal ID: {animal_id}</Text>
              <Text style={styles.debugText}>Base URL: {API_CONFIG.BASE_URL}</Text>
              <Text style={styles.debugText}>
                Endpoint: {buildApiUrl(`${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}${animal_id}/`)}
              </Text>
              {fetchError && (
                <Text style={styles.debugText}>Error: {fetchError}</Text>
              )}
              
              {/* Test buttons */}
              <TouchableOpacity 
                style={[styles.retryButton, { marginTop: 10, backgroundColor: '#007bff' }]}
                onPress={fetchCattleDataSimple}
              >
                <Text style={styles.retryButtonText}>🔧 Test Simple Fetch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.retryButton, { marginTop: 10, backgroundColor: '#28a745' }]}
                onPress={async () => {
                  console.log('🔍 Testing media configuration...');
                  const { validateMediaConfiguration } = await import('../../utils/mediaValidator');
                  const result = await validateMediaConfiguration();
                  
                  console.log('📊 Media validation result:', result);
                  if (!result.isValid) {
                    console.error('❌ Media configuration issues found:');
                    result.errors.forEach(error => console.error(`  - ${error}`));
                  }
                  if (result.warnings.length > 0) {
                    console.warn('⚠️ Media configuration warnings:');
                    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
                  }
                  if (result.suggestions.length > 0) {
                    console.log('💡 Suggestions:');
                    result.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
                  }
                  
                  Alert.alert(
                    'Media Test Complete',
                    `Status: ${result.isValid ? 'PASS' : 'FAIL'}\nErrors: ${result.errors.length}\nWarnings: ${result.warnings.length}\n\nCheck console for details.`
                  );
                }}
              >
                <Text style={styles.retryButtonText}>🖼️ Test Media Config</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchCattleData}
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
      
      {/* Header */}
      <LinearGradient
        colors={['#6e45e2', '#88d3ce']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <SafeIcon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cattle Details</Text>
          <TouchableOpacity style={styles.shareButton}>
            <SafeIcon name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        {images.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              data={images}
              renderItem={renderImageCarouselItem}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(index);
              }}
            />
            
            {/* Image Indicators */}
            <View style={styles.indicatorContainer}>
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
          </View>
        )}

        {/* Cattle Info Card */}
        <View style={styles.cattleCard}>
          <View style={styles.cattleHeader}>
            <View style={styles.cattleTypeContainer}>
              <Text style={styles.cattleType}>{cattle.type}</Text>
              <Text style={styles.cattleBreed}>{cattle.breed}</Text>
              <Text style={styles.cattleAge}>{cattle.animal_age} years old</Text>
            </View>
            <View style={styles.cattleIdContainer}>
              <Text style={styles.cattleIdLabel}>Animal ID</Text>
              <Text style={styles.cattleId}>
                {cattle.animal_id.substring(0, 8)}...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Copy full ID to clipboard
                  // You can implement clipboard functionality here
                }}
                style={styles.copyIdButton}
              >
                <SafeIcon name="copy-outline" size={12} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Basic Information */}
          <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>📋 Basic Information</Text>
          {renderDetailItem('calendar-outline', 'Age', `${cattle.animal_age} years`)}
          {renderDetailItem('location-outline', 'Purchase Place', cattle.purchase_place)}
          {renderDetailItem('cash-outline', 'Cost', formatCurrency(cattle.cost))}
          {renderDetailItem('shield-checkmark-outline', 'Insurance Premium', formatCurrency(cattle.insurance_premium))}
          {renderDetailItem('water-outline', 'Milk Yield/Day', `${cattle.milk_yield_per_day} liters`)}
          {cattle.tag_no && renderDetailItem('pricetag-outline', 'Tag Number', cattle.tag_no)}

          {/* Pregnancy Information */}
          {cattle.pregnant && (
            <>
              <Text style={styles.sectionTitle}>🤰 Pregnancy Information</Text>
              <View style={styles.pregnancyInfo}>
                <SafeIcon name="heart" size={20} color="#FF6B6B" />
                <Text style={styles.pregnancyText}>Currently Pregnant</Text>
              </View>
              {cattle.pregnancy_months && renderDetailItem('time-outline', 'Pregnancy Duration', `${cattle.pregnancy_months} months`)}
              {cattle.calf_type && renderDetailItem('male-female-outline', 'Expected Calf Type', cattle.calf_type)}
            </>
          )}

          {/* Timestamps */}
          <Text style={styles.sectionTitle}>📅 Record Information</Text>
          {renderDetailItem('add-circle-outline', 'Registered On', formatDate(cattle.created_at))}
          {renderDetailItem('create-outline', 'Last Updated', formatDate(cattle.updated_at))}
        </View>

        {/* Seller Information */}
        {sellerLoading ? (
          <View style={styles.cattleCard}>
            <Text style={styles.sectionTitle}>🏪 Loading Seller...</Text>
            <View style={styles.skeletonRow}>
              <View style={[styles.skeletonBox, styles.skeletonAvatar]} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={[styles.skeletonBox, { width: '70%', height: 18, marginBottom: 8 }]} />
                <View style={[styles.skeletonBox, { width: '50%', height: 14 }]} />
              </View>
              <ActivityIndicator size="small" color="#f59e0b" />
            </View>
          </View>
        ) : (
          renderSellerCard()
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Image Carousel Styles
  carouselContainer: {
    height: 300,
    backgroundColor: theme.colors.surface,
  },
  carouselImageContainer: {
    width: width,
    height: 300,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 20,
  },

  // Cattle Card Styles
  cattleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cattleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cattleTypeContainer: {
    flex: 1,
  },
  cattleType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cattleBreed: {
    fontSize: 16,
    color: '#6e45e2',
    fontWeight: '600',
    marginBottom: 4,
  },
  cattleAge: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cattleIdContainer: {
    alignItems: 'flex-end',
  },
  cattleIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  cattleId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  copyIdButton: {
    padding: 4,
    backgroundColor: '#f0f0ff',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  firstSectionTitle: {
    marginTop: 0,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fdfdfd',
    marginBottom: 2,
    borderRadius: 6,
  },
  detailContent: {
    flex: 1,
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
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
    lineHeight: 20,
  },
  clickableValue: {
    color: '#6e45e2',
  },
  pregnancyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pregnancyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },

  // Beneficiary Card Styles
  beneficiaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  beneficiaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  beneficiaryAvatarContainer: {
    marginRight: 16,
  },
  beneficiaryAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  beneficiaryAvatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beneficiaryAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  beneficiaryLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  beneficiaryId: {
    fontSize: 12,
    color: '#999',
  },
  viewProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  beneficiaryDetails: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  beneficiaryDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  beneficiaryDetailItem: {
    flex: 1,
    marginRight: 16,
  },
  beneficiaryDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  beneficiaryDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  // Seller Card Styles
  sellerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerAvatarContainer: {
    marginRight: 16,
  },
  sellerAvatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sellerLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  sellerId: {
    fontSize: 12,
    color: '#999',
  },
  sellerDetails: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sellerDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sellerDetailItem: {
    flex: 1,
    marginRight: 16,
  },
  sellerDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sellerDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  // Skeleton Loading Styles
  skeletonImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonBox: {
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  skeletonDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },

  // Image Loading States
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageErrorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  // Debug styles
  debugContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'stretch',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default CattleDetailsScreen;