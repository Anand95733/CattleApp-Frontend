import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../../navigation/types';
import { API_CONFIG, apiGet } from '../../config/api';
import NetInfo from '@react-native-community/netinfo';
import { getAllSellers } from '../../database/repositories/sellerRepo';

type SellerListNavigationProp = StackNavigationProp<RootStackParamList>;

interface Seller {
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

const SellerListScreen = () => {
  const navigation = useNavigation<SellerListNavigationProp>();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);

  // Fetch sellers with offline fallback
  const fetchSellers = async () => {
    try {
      console.log('🔄 Fetching sellers...');

      const net = await NetInfo.fetch();
      const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);

      if (isOnline) {
        const data = await apiGet(API_CONFIG.ENDPOINTS.SELLERS, { 
          cache: true, 
          timeout: API_CONFIG.FAST_TIMEOUT 
        });
        const results = data?.results || data || [];
        setSellers(Array.isArray(results) ? results : []);
        setFilteredSellers(Array.isArray(results) ? results : []);
        console.log(`✅ Loaded ${results.length} sellers (online)`);
      } else {
        const local = await getAllSellers();
        // Map local rows to UI shape (seller_id from server_id or local fallback)
        const mapped = local.map((r) => ({
          seller_id: r.server_id || `local-${r.local_id}`,
          name: r.name,
          father_or_husband: r.father_or_husband || '',
          aadhaar_id: '',
          village: r.village || '',
          mandal: r.mandal || '',
          district: r.district || '',
          state: r.state || '',
          phone_number: Number(r.phone_number || 0),
        }));
        setSellers(mapped as any);
        setFilteredSellers(mapped as any);
        console.log(`✅ Loaded ${mapped.length} sellers (offline)`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch sellers:', error);
      // Offline fallback if API fails
      const local = await getAllSellers();
      const mapped = local.map((r) => ({
        seller_id: r.server_id || `local-${r.local_id}`,
        name: r.name,
        father_or_husband: r.father_or_husband || '',
        aadhaar_id: '',
        village: r.village || '',
        mandal: r.mandal || '',
        district: r.district || '',
        state: r.state || '',
        phone_number: Number(r.phone_number || 0),
      }));
      setSellers(mapped as any);
      setFilteredSellers(mapped as any);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchSellers();
  };

  // Filter sellers based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSellers(sellers);
    } else {
      const filtered = sellers.filter(seller =>
        seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.seller_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.district.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSellers(filtered);
    }
  }, [searchQuery, sellers]);

  // Load sellers on component mount
  useEffect(() => {
    fetchSellers();
  }, []);

  // Navigate to seller profile
  const navigateToProfile = (seller_id: string) => {
    navigation.navigate('SellerProfile', { seller_id });
  };

  // Render seller item
  const renderSellerItem = ({ item }: { item: Seller }) => (
    <TouchableOpacity
      style={styles.sellerCard}
      onPress={() => navigateToProfile(item.seller_id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#6e45e2', '#88d3ce']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
        
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{item.name}</Text>
          <Text style={styles.sellerId}>ID: {item.seller_id}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.location}>{item.village}, {item.district}</Text>
          </View>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={14} color="#666" />
            <Text style={styles.phone}>{item.phone_number}</Text>
          </View>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#6e45e2" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Sellers Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'Add your first seller to get started'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
        <Text style={styles.loadingText}>Loading sellers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6e45e2" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#6e45e2', '#88d3ce']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sellers</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddSeller')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sellers..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Sellers List */}
      <FlatList
        data={filteredSellers}
        renderItem={renderSellerItem}
        keyExtractor={(item) => item.seller_id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6e45e2']}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
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
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    paddingTop: 20,
  },
  sellerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sellerId: {
    fontSize: 12,
    color: '#6e45e2',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phone: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  arrowContainer: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default SellerListScreen;