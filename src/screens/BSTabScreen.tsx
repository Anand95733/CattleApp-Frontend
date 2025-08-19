import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, buildMediaUrl } from '../config/api';
import NetInfo from '@react-native-community/netinfo';
import { getAllBeneficiaries, clearAllBeneficiaries, deleteBeneficiaryByLocalId } from '../database/repositories/beneficiaryRepo';
import { getAllSellers, clearAllSellers, deleteSellerByLocalId } from '../database/repositories/sellerRepo';
import { useTheme } from '../contexts';
import { getLocalImageUri, imageExists } from '../utils/imageStorage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Person {
  // Identifiers
  local_id?: number; // local sqlite row id
  server_id?: string; // server id if available
  beneficiary_id?: string; // beneficiary id from API or local
  seller_id?: string; // seller id from API or local
  // Basic fields
  name: string;
  phone_number: string;
  // Images
  beneficiary_image_url?: string | null;
  seller_image_url?: string | null;
}

const { width } = Dimensions.get('window');

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 20,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  clearDataHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
  noDataText: {
    textAlign: 'center',
    color: theme.colors.text,
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  noDataSubText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  tabBar: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: 24,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 0,
    shadowOpacity: 0,
  },
  shimmerName: {
    width: 150,
    height: 18,
    borderRadius: 6,
    marginBottom: 8,
  },
  shimmerPhone: {
    width: 100,
    height: 14,
    borderRadius: 6,
  },
  shimmerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

type BSTabNavigationProp = StackNavigationProp<RootStackParamList>;

const BSTabScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<BSTabNavigationProp>();
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const SkeletonItem = () => (
    <View style={styles.listItem}>
      <View style={{ flex: 1 }}>
        <ShimmerPlaceHolder 
          style={styles.shimmerName} 
          autoRun 
          shimmerColors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
        />
        <ShimmerPlaceHolder 
          style={styles.shimmerPhone} 
          autoRun 
          shimmerColors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
        />
      </View>
      <ShimmerPlaceHolder 
        style={styles.shimmerIcon} 
        autoRun 
        shimmerColors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
      />
    </View>
  );

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'beneficiaries', title: 'Beneficiaries' },
    { key: 'sellers', title: 'Sellers' },
  ]);

  const [beneficiaries, setBeneficiaries] = useState<Person[]>([]);
  const [sellers, setSellers] = useState<Person[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [beneficiaryNextPage, setBeneficiaryNextPage] = useState<string | null>(null);
  const [sellerNextPage, setSellerNextPage] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const searchAnim = useState(new Animated.Value(0))[0];

  const fetchData = async () => {
    try {
      console.log('🔄 Loading beneficiaries and sellers...');

      // Check connectivity
      const net = await NetInfo.fetch();
      const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);

      if (isOnline) {
        // Online: load from API with fallback to local data
        try {
          console.log('🌐 Fetching data from server...');
          
          // Fetch server data in parallel
          const [beneficiaryData, sellerData] = await Promise.all([
            apiGet(API_CONFIG.ENDPOINTS.BENEFICIARIES, { timeout: API_CONFIG.TIMEOUT, useFallbacks: true }),
            apiGet(API_CONFIG.ENDPOINTS.SELLERS, { timeout: API_CONFIG.TIMEOUT, useFallbacks: true })
          ]);

          console.log('✅ Server data received:', {
            beneficiaries: beneficiaryData?.results?.length ?? 0,
            sellers: sellerData?.results?.length ?? 0
          });

          // Set server lists directly (no hidden filters for pure-offline delete)
          setBeneficiaries(beneficiaryData?.results ?? []);
          setSellers(sellerData?.results ?? []);
          setBeneficiaryNextPage(beneficiaryData?.next ?? null);
          setSellerNextPage(sellerData?.next ?? null);
        } catch (apiError) {
          console.error('❌ API call failed, falling back to local data:', apiError);
          
          // Fallback to local data when API fails
          const [localBeneficiaries, localSellers] = await Promise.all([
            getAllBeneficiaries(),
            getAllSellers()
          ]);

          console.log('📱 Fallback to local DB:', { 
            beneficiaries: localBeneficiaries.length, 
            sellers: localSellers.length 
          });

          // Map local rows to UI shape (include IDs for instant offline delete)
          const mappedBeneficiaries = await Promise.all(
            localBeneficiaries.map(async (b) => {
              let imageUrl = null;
              if (b.local_image_path) {
                const exists = await imageExists(b.local_image_path);
                if (exists) imageUrl = getLocalImageUri(b.local_image_path);
              }
              return {
                local_id: b.local_id,
                beneficiary_id: b.beneficiary_id || (b.server_id ? String(b.server_id) : String(b.local_id)),
                name: b.name,
                phone_number: b.phone_number || '',
                beneficiary_image_url: imageUrl,
              } as Person;
            })
          );
          setBeneficiaries(mappedBeneficiaries);
          setSellers(localSellers.map(s => ({
            local_id: s.local_id,
            seller_id: s.server_id || String(s.local_id),
            name: s.name,
            phone_number: s.phone_number || '',
            seller_image_url: null,
          }) as Person));

          setBeneficiaryNextPage(null);
          setSellerNextPage(null);
        }
      } else {
        // Offline: load from local SQLite
        const [localBeneficiaries, localSellers] = await Promise.all([
          getAllBeneficiaries(),
          getAllSellers()
        ]);

        console.log('📱 Loaded from local DB:', { 
          beneficiaries: localBeneficiaries.length, 
          sellers: localSellers.length 
        });

        // Map local rows to UI shape (include IDs for robust delete)
        const mappedBeneficiaries = await Promise.all(
          localBeneficiaries.map(async (b) => {
            let imageUrl = null;
            
            console.log(`📸 Checking image for ${b.name}:`, b.local_image_path);
            
            // Check if local image exists
            if (b.local_image_path) {
              const exists = await imageExists(b.local_image_path);
              console.log(`📸 Image exists for ${b.name}:`, exists);
              if (exists) {
                imageUrl = getLocalImageUri(b.local_image_path);
                console.log(`📸 Image URL for ${b.name}:`, imageUrl);
              }
            }
            
            return {
              local_id: b.local_id,
              server_id: b.server_id || undefined,
              beneficiary_id: b.beneficiary_id || (b.server_id ? String(b.server_id) : String(b.local_id)),
              name: b.name,
              phone_number: b.phone_number || '',
              beneficiary_image_url: imageUrl,
            } as Person;
          })
        );
        setBeneficiaries(mappedBeneficiaries);
        setSellers(localSellers.map(s => ({
          local_id: s.local_id,
          server_id: s.server_id || undefined,
          seller_id: s.server_id || String(s.local_id),
          name: s.name,
          phone_number: s.phone_number || '',
          seller_image_url: null,
        }) as Person));

        setBeneficiaryNextPage(null);
        setSellerNextPage(null);
      }

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      // On any error, try a local fallback before showing any alert
      try {
        const [localBeneficiaries, localSellers] = await Promise.all([
          getAllBeneficiaries(),
          getAllSellers()
        ]);
        
        // Map beneficiaries with local images
        const mappedBeneficiaries = await Promise.all(
          localBeneficiaries.map(async (b) => {
            let imageUrl = null;
            
            console.log(`📸 [Fallback] Checking image for ${b.name}:`, b.local_image_path);
            
            // Check if local image exists
            if (b.local_image_path) {
              const exists = await imageExists(b.local_image_path);
              console.log(`📸 [Fallback] Image exists for ${b.name}:`, exists);
              if (exists) {
                imageUrl = getLocalImageUri(b.local_image_path);
                console.log(`📸 [Fallback] Image URL for ${b.name}:`, imageUrl);
              }
            }
            
            return {
              beneficiary_id: b.server_id || b.beneficiary_id || String(b.local_id),
              name: b.name,
              phone_number: b.phone_number || '',
              beneficiary_image_url: imageUrl,
            };
          })
        );
        
        setBeneficiaries(mappedBeneficiaries);
        setSellers(localSellers.map(s => ({
          seller_id: s.server_id || String(s.local_id),
          name: s.name,
          phone_number: s.phone_number || '',
          seller_image_url: null,
        })));
      } catch (_) {
        // If local also fails, then show a gentle message via state instead of alert
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const loadMoreData = async (type: 'beneficiaries' | 'sellers') => {
    const nextPage = type === 'beneficiaries' ? beneficiaryNextPage : sellerNextPage;
    if (!nextPage || loadingMore) return;

    setLoadingMore(true);
    try {
      const endpoint = type === 'beneficiaries' ? API_CONFIG.ENDPOINTS.BENEFICIARIES : API_CONFIG.ENDPOINTS.SELLERS;
      const pageParam = nextPage.split('page=')[1]?.split('&')[0];
      const url = pageParam ? `${endpoint}?page=${pageParam}` : endpoint;

      const response = await apiGet(url, { 
        timeout: API_CONFIG.TIMEOUT 
      });

      if (type === 'beneficiaries') {
        setBeneficiaries(prev => [...prev, ...(response?.results ?? [])]);
        setBeneficiaryNextPage(response?.next ?? null);
      } else {
        setSellers(prev => [...prev, ...(response?.results ?? [])]);
        setSellerNextPage(response?.next ?? null);
      }
    } catch (error) {
      console.error(`❌ Failed to load more ${type}:`, error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    
    if (text.length > 0) {
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Local Data',
      'This will delete all locally stored beneficiaries and sellers. This action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Clearing all local data...');
              await Promise.all([
                clearAllBeneficiaries(),
                clearAllSellers(),
                clearHiddenBeneficiaries(),
                clearHiddenSellers(),
              ]);
              
              // Reset state
              setBeneficiaries([]);
              setSellers([]);
              
              console.log('✅ All local data cleared');
              Alert.alert('Success', 'All local data has been cleared');
            } catch (error) {
              console.error('❌ Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteItem = (item: Person, type: 'beneficiary' | 'seller') => {
    Alert.alert(
      `Delete ${type}`,
      `Are you sure you want to delete "${item.name}" from local storage? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'beneficiary') {
                if (!item.local_id) {
                  Alert.alert('Offline only', 'This item comes from server. Please delete it when online in the backend or sync side.');
                  return;
                }
                await deleteBeneficiaryByLocalId(item.local_id);
                setBeneficiaries(prev => prev.filter(b => b.local_id !== item.local_id));
              } else {
                if (!item.local_id) {
                  Alert.alert('Offline only', 'This item comes from server. Please delete it when online in the backend or sync side.');
                  return;
                }
                await deleteSellerByLocalId(item.local_id);
                setSellers(prev => prev.filter(s => s.local_id !== item.local_id));
              }
              
              console.log(`✅ ${type} "${item.name}" deleted successfully`);
              Alert.alert('Success', `${type} deleted successfully`);
            } catch (error) {
              console.error(`❌ Failed to delete ${type}:`, error);
              Alert.alert('Error', `Failed to delete ${type}: ` + error.message);
            }
          },
        },
      ]
    );
  };

  const filterData = (data: Person[]) => {
    if (!searchText) return data;
    return data.filter(person => 
      person.name.toLowerCase().includes(searchText.toLowerCase()) ||
      person.phone_number.toString().includes(searchText)
    );
  };

  const renderPersonItem = ({ item }: { item: Person }) => {
    const isBeneficiary = 'beneficiary_id' in item;
    const personId = isBeneficiary ? item.beneficiary_id : item.seller_id;
    const imageUrl = isBeneficiary ? item.beneficiary_image_url : item.seller_image_url;
    
    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          if (isBeneficiary) {
            navigation.navigate('BeneficiaryProfile', { beneficiary_id: personId });
          } else {
            navigation.navigate('SellerProfile', { seller_id: personId });
          }
        }}
        onLongPress={() => {
          handleDeleteItem(item, isBeneficiary ? 'beneficiary' : 'seller');
        }}
        delayLongPress={1000}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isBeneficiary ? ['#6e45e2', '#88d3ce'] : ['#f59e0b', '#f97316']}
          style={styles.avatar}
        >
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl.startsWith('file://') ? imageUrl : buildMediaUrl(imageUrl) }} 
              style={styles.avatar}
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </LinearGradient>
        
        <View style={styles.personInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone_number}</Text>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={theme.colors.textSecondary}
          style={styles.arrowIcon}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.noDataText}>No {type} found</Text>
      <Text style={styles.noDataSubText}>
        {searchText ? 'Try adjusting your search' : `No ${type} have been added yet`}
      </Text>
    </View>
  );

  const BeneficiariesRoute = () => (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <FlatList
        data={filterData(beneficiaries)}
        renderItem={renderPersonItem}
        keyExtractor={(item) => item.beneficiary_id!}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => loading ? (
          <FlatList
            data={Array(5).fill({})}
            renderItem={() => <SkeletonItem />}
            keyExtractor={(_, index) => index.toString()}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : renderEmptyState('beneficiaries')}
        onEndReached={() => loadMoreData('beneficiaries')}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        ) : null}
      />
    </Animated.View>
  );

  const SellersRoute = () => (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <FlatList
        data={filterData(sellers)}
        renderItem={renderPersonItem}
        keyExtractor={(item) => item.seller_id!}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => loading ? (
          <FlatList
            data={Array(5).fill({})}
            renderItem={() => <SkeletonItem />}
            keyExtractor={(_, index) => index.toString()}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : renderEmptyState('sellers')}
        onEndReached={() => loadMoreData('sellers')}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingMoreText}>Loading more...</Text>
          </View>
        ) : null}
      />
    </Animated.View>
  );

  const renderScene = SceneMap({
    beneficiaries: BeneficiariesRoute,
    sellers: SellersRoute,
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.headerContainer}
          onLongPress={handleClearData}
          delayLongPress={2000}
        >
          <Text style={styles.header}>Directory</Text>
          <Text style={styles.subHeader}>
            {beneficiaries.length} beneficiaries • {sellers.length} sellers
          </Text>
          <Text style={styles.clearDataHint}>
            Long press to clear local data
          </Text>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        {/* Tab View */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width }}
          renderTabBar={(props) => (
            <TabBar
              {...props}
              style={styles.tabBar}
              indicatorStyle={{ backgroundColor: '#fff', height: 3 }}
              labelStyle={{ 
                color: '#fff', 
                fontWeight: '600', 
                fontSize: 14,
                textTransform: 'none',
              }}
              tabStyle={{ width: 'auto' }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              pressColor="rgba(255,255,255,0.2)"
            />
          )}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BSTabScreen;