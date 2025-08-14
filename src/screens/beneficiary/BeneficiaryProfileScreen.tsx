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
  LogBox,
  Image,
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SafeIcon from '../../components/SafeIcon';
import Clipboard from '@react-native-clipboard/clipboard';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, buildMediaUrl } from '../../config/api';
import FastCattleImage from '../../components/FastCattleImage';
import { perf, usePerformanceTracker } from '../../utils/performance';
import { useTheme } from '../../contexts';
// Temporarily disabled: import CattleListItem from '../../components/CattleListItem';
// Temporarily disabled: import { smartDjangoCall, RequestPriority, prefetchBeneficiaryData } from '../../utils/djangoOptimizer';

LogBox.ignoreAllLogs(true); // Ignore all log notifications
type ProfileRouteProp = RouteProp<RootStackParamList, 'BeneficiaryProfile'>;
type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BeneficiaryProfile'>;

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

interface Animal {
  animal_id: string;
  front_photo_url: string | null;
  left_photo_url?: string | null;
  right_photo_url?: string | null;
  muzzle1_photo_url?: string | null;
  muzzle2_photo_url?: string | null;
  muzzle3_photo_url?: string | null;
  type: string;
  breed: string;
  tag_no: string;
  cost: string;
  milk_yield_per_day: string;
  pregnant: boolean;
  pregnancy_months: number | null;
  animal_age: number;
}

interface CattleResponse {
  beneficiary_id: string;
  beneficiary_name: string;
  total_animals: number;
  animals: Animal[];
}


const BeneficiaryProfileScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<ProfileRouteProp>();
  const navigation = useNavigation<ProfileNavigationProp>();
  const { beneficiary_id } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);
  
  // Performance tracking
  usePerformanceTracker('BeneficiaryProfileScreen');

  const [loading, setLoading] = useState(true);
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [cattleData, setCattleData] = useState<CattleResponse | null>(null);
  const [cattleLoading, setCattleLoading] = useState(false);

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



  // Optimized cattle data fetching
  const fetchCattleData = async () => {
    setCattleLoading(true);
    
    try {
      perf.start(`BeneficiaryProfile-CattleData-${beneficiary_id}`);
      
      const cattleData: CattleResponse = await apiGet(
        `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}by-beneficiary/${beneficiary_id}/`,
        { 
          timeout: API_CONFIG.FAST_TIMEOUT,
          cache: true
        }
      );
      
      setCattleData(cattleData);
      console.log(`✅ Cattle data loaded: ${cattleData.total_animals} animals`);
      
    } catch (error) {
      console.error('⚠️ Cattle fetch failed (non-critical):', error);
      // Don't show alert - cattle data is supplementary
    } finally {
      setCattleLoading(false);
      perf.end(`BeneficiaryProfile-CattleData-${beneficiary_id}`);
    }
  };



  useEffect(() => {
    const fetchCattleDataInternal = async () => {
      setCattleLoading(true);
      
      try {
        perf.start(`BeneficiaryProfile-CattleData-${beneficiary_id}`);
        
        const cattleData: CattleResponse = await apiGet(
          `${API_CONFIG.ENDPOINTS.MILCH_ANIMALS}by-beneficiary/${beneficiary_id}/`,
          { 
            timeout: API_CONFIG.FAST_TIMEOUT,
            cache: true
          }
        );
        
        setCattleData(cattleData);
        console.log(`✅ Cattle data loaded: ${cattleData.total_animals} animals`);
        
      } catch (error) {
        console.error('⚠️ Cattle fetch failed (non-critical):', error);
        // Don't show alert - cattle data is supplementary
      } finally {
        setCattleLoading(false);
        perf.end(`BeneficiaryProfile-CattleData-${beneficiary_id}`);
      }
    };
    
    const fetchAllData = async () => {
      perf.start(`BeneficiaryProfile-TotalLoad-${beneficiary_id}`);
      setLoading(true);
      
      try {
        console.log('🚀 Starting optimized beneficiary profile load...');
        console.log('🔍 Beneficiary ID:', beneficiary_id);
        console.log('🔗 API Endpoint:', `${API_CONFIG.ENDPOINTS.BENEFICIARIES}${beneficiary_id}/`);
        console.log('🌐 Base URL:', API_CONFIG.BASE_URL);
        
        // Step 1: Load beneficiary data first
        const beneficiaryData: Beneficiary = await apiGet(
          `${API_CONFIG.ENDPOINTS.BENEFICIARIES}${beneficiary_id}/`,
          { 
            timeout: API_CONFIG.FAST_TIMEOUT,
            cache: true
          }
        );
        
        setBeneficiary(beneficiaryData);
        console.log('✅ Beneficiary data loaded:', beneficiaryData);
        
        // Step 2: Start cattle data fetch immediately (don't wait)
        fetchCattleDataInternal(); // This runs in background
        
      } catch (error) {
        console.error('💥 Critical beneficiary fetch error:', error);
        console.error('💥 Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert(
          'Network Error', 
          `Failed to load beneficiary profile.\n\nError: ${errorMessage}\n\nPlease check your connection and try again.`,
          [
            { text: 'Retry', onPress: fetchAllData },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } finally {
        setLoading(false);
        const totalTime = perf.end(`BeneficiaryProfile-TotalLoad-${beneficiary_id}`);
        console.log(`🏁 Beneficiary profile load completed in ${totalTime}ms`);
        
        // Show performance report in development
        if (__DEV__) {
          setTimeout(() => perf.report(), 100);
        }
      }
    };

    fetchAllData();
  }, [beneficiary_id]);

  // Refresh cattle data when screen comes into focus (after adding cattle)
  useFocusEffect(
    React.useCallback(() => {
      if (beneficiary) {
        fetchCattleData();
      }
    }, [beneficiary])
  );




  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
                  console.log('🔄 Retrying beneficiary profile fetch...');
                  
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
            <SafeIcon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Beneficiary Profile</Text>
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
              style={styles.infoButton}
              onPress={() => {
                console.log('Info button pressed');
                console.log('Beneficiary:', beneficiary);
                if (beneficiary) {
                  console.log('Navigating to BeneficiaryDetails with beneficiary_id:', safeString(beneficiary.beneficiary_id));
                  navigation.navigate('BeneficiaryDetails', { 
                    beneficiary_id: safeString(beneficiary.beneficiary_id) 
                  });
                } else {
                  console.log('No beneficiary data available');
                }
              }}
              activeOpacity={0.8}
            >
              <SafeIcon name="person" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.infoButtonText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                console.log('Add Cattle button pressed');
                console.log('Beneficiary:', beneficiary);
                if (beneficiary) {
                  console.log('Navigating to AddCattle with beneficiary_id:', safeString(beneficiary.beneficiary_id));
                  navigation.navigate('AddCattle', { 
                    beneficiary_id: safeString(beneficiary.beneficiary_id) 
                  });
                } else {
                  console.log('No beneficiary data available');
                }
              }}
              activeOpacity={0.8}
            >
              <SafeIcon name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.addButtonText}>Add Cattle</Text>
            </TouchableOpacity>
          </View>

          {/* Cattle List Section */}
          <View style={styles.cattleSection}>
            <View style={styles.cattleSectionHeader}>
              <Text style={styles.sectionTitle}>Cattle List</Text>
              <View style={styles.cattleHeaderRight}>
                {cattleLoading && (
                  <ActivityIndicator size="small" color="#6e45e2" style={{ marginRight: 8 }} />
                )}
                {cattleData && (
                  <Text style={styles.cattleCount}>
                    Total Animals: {cattleData.total_animals}
                  </Text>
                )}
              </View>
            </View>
            
            {cattleData && cattleData.animals && cattleData.animals.length > 0 ? (
              <View style={styles.cattleList}>
                {cattleData.animals.map((animal, _index) => {
                  // Debug logging for each animal
                  if (__DEV__) {
                    console.log(`🐄 Rendering cattle ${animal.animal_id}:`, {
                      front_photo_url: animal.front_photo_url,
                      left_photo_url: animal.left_photo_url,
                      right_photo_url: animal.right_photo_url,
                      muzzle1_photo_url: animal.muzzle1_photo_url
                    });
                  }
                  
                  return (
                    <TouchableOpacity 
                      key={animal.animal_id} 
                      style={styles.cattleItem}
                      onPress={() => {
                        console.log('🐄 Cattle item pressed:', animal.animal_id);
                        console.log('🔍 Navigation params being sent:', { animal_id: animal.animal_id });
                        console.log('🔍 Animal object:', JSON.stringify(animal, null, 2));
                      
                      // Validate animal_id before navigation
                      if (!animal.animal_id || animal.animal_id.trim() === '') {
                        console.error('❌ Invalid animal_id for navigation:', animal.animal_id);
                        Alert.alert(
                          'Navigation Error',
                          'Cannot open cattle details. Invalid animal ID.',
                          [{ text: 'OK' }]
                        );
                        return;
                      }

                      try {
                        navigation.navigate('CattleDetails', { 
                          animal_id: animal.animal_id.trim()
                        });
                      } catch (error) {
                        console.error('❌ Navigation error:', error);
                        Alert.alert(
                          'Navigation Error',
                          'Failed to open cattle details. Please try again.',
                          [
                            { text: 'Retry', onPress: () => {
                              navigation.navigate('CattleDetails', { 
                                animal_id: animal.animal_id.trim()
                              });
                            }},
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cattleImageContainer}>
                      <FastCattleImage
                        photoUrl={animal.front_photo_url}
                        style={styles.cattleImage}
                        placeholder="No Image"
                        resizeMode="cover"
                      />
                    </View>
                    
                    <View style={styles.cattleDetails}>
                      <View style={styles.cattleDetailRow}>
                        <SafeIcon name="paw-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.cattleDetailLabel}>ID:</Text>
                        <Text style={styles.cattleDetailValue} numberOfLines={1}>
                          {animal.animal_id.substring(0, 8)}...
                        </Text>
                      </View>
                      
                      <View style={styles.cattleDetailRow}>
                        <SafeIcon name="medical-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.cattleDetailLabel}>Type:</Text>
                        <Text style={styles.cattleDetailValue}>{animal.type}</Text>
                      </View>
                      
                      <View style={styles.cattleDetailRow}>
                        <SafeIcon name="ribbon-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.cattleDetailLabel}>Breed:</Text>
                        <Text style={styles.cattleDetailValue}>{animal.breed}</Text>
                      </View>
                      
                      {animal.tag_no && (
                        <View style={styles.cattleDetailRow}>
                          <SafeIcon name="bookmark-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.cattleDetailLabel}>Tag:</Text>
                          <Text style={styles.cattleDetailValue}>{animal.tag_no}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Add visual indicator that item is clickable */}
                    <View style={styles.cattleItemIndicator}>
                      <SafeIcon name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noCattleContainer}>
                <LinearGradient
                  colors={['#6e45e2', '#88d3ce']}
                  style={styles.noCattleIcon}
                >
                  <SafeIcon name="paw-outline" size={32} color="#fff" />
                </LinearGradient>
                <Text style={styles.noCattleText}>No cattle found</Text>
                <Text style={styles.noCattleSubText}>
                  Add cattle to see them listed here
                </Text>
              </View>
            )}
          </View>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    shadowColor: theme.colors.shadowColor,
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
    borderColor: theme.colors.primary,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  profileLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
    flexWrap: 'wrap',
  },

  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 45,
    borderRadius: 12,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 45,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 0,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  cattleSection: {
    marginTop: 16,
  },
  cattleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cattleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cattleCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  cattleList: {
    gap: 12,
  },
  cattleItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cattleImageContainer: {
    marginRight: 12,
  },
  cattleImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cattleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cattleDetails: {
    flex: 1,
    gap: 4,
  },
  cattleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cattleDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
  },
  cattleDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  cattleItemIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  noCattleContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noCattleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCattleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  noCattleSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default BeneficiaryProfileScreen;