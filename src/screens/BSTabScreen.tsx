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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, apiCallParallel, buildMediaUrl } from '../config/api';
import { useTheme } from '../contexts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Person {
  beneficiary_id?: string;
  seller_id?: string;
  name: string;
  phone_number: string;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Loading beneficiaries and sellers...');
        
        // Use parallel API calls for better performance
        const { beneficiaries: beneficiaryData, sellers: sellerData } = await apiCallParallel({
          beneficiaries: { 
            endpoint: API_CONFIG.ENDPOINTS.BENEFICIARIES,
            options: { timeout: API_CONFIG.FAST_TIMEOUT }
          },
          sellers: { 
            endpoint: API_CONFIG.ENDPOINTS.SELLERS,
            options: { timeout: API_CONFIG.FAST_TIMEOUT }
          }
        });

        console.log('✅ Data loaded successfully');
        setBeneficiaries(beneficiaryData.results || []);
        setSellers(sellerData.results || []);
        setBeneficiaryNextPage(beneficiaryData.next);
        setSellerNextPage(sellerData.next);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
      } catch (error) {
        console.error('❌ Failed to load data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const loadMoreData = async (type: 'beneficiaries' | 'sellers') => {
    const nextPage = type === 'beneficiaries' ? beneficiaryNextPage : sellerNextPage;
    if (!nextPage || loadingMore) return;

    setLoadingMore(true);
    try {
      const endpoint = type === 'beneficiaries' ? API_CONFIG.ENDPOINTS.BENEFICIARIES : API_CONFIG.ENDPOINTS.SELLERS;
      const response = await apiGet(endpoint, { 
        params: { page: nextPage.split('page=')[1]?.split('&')[0] },
        timeout: API_CONFIG.FAST_TIMEOUT 
      });

      if (type === 'beneficiaries') {
        setBeneficiaries(prev => [...prev, ...response.results]);
        setBeneficiaryNextPage(response.next);
      } else {
        setSellers(prev => [...prev, ...response.results]);
        setSellerNextPage(response.next);
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
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isBeneficiary ? ['#6e45e2', '#88d3ce'] : ['#f59e0b', '#f97316']}
          style={styles.avatar}
        >
          {imageUrl ? (
            <Image 
              source={{ uri: buildMediaUrl(imageUrl) }} 
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
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Directory</Text>
          <Text style={styles.subHeader}>
            {beneficiaries.length} beneficiaries • {sellers.length} sellers
          </Text>
        </View>

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