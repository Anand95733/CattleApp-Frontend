import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet, buildMediaUrl } from '../../config/api';
import NetInfo from '@react-native-community/netinfo';
import { getAllBeneficiaries } from '../../database/repositories/beneficiaryRepo';

type BeneficiaryListNavigationProp = StackNavigationProp<RootStackParamList>;

interface Beneficiary {
  beneficiary_id: string;
  name: string;
  phone_number: string;
  village: string;
  district: string;
  beneficiary_image_url?: string | null;
}

const BeneficiaryListScreen = () => {
  const navigation = useNavigation<BeneficiaryListNavigationProp>();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchInitialBeneficiaries = async () => {
      try {
        const net = await NetInfo.fetch();
        const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);
        if (isOnline) {
          console.log('🔄 Fetching beneficiaries (online)...');
          const data = await apiGet(API_CONFIG.ENDPOINTS.BENEFICIARIES, { 
            cache: true, 
            timeout: API_CONFIG.FAST_TIMEOUT 
          });
          const results = data?.results || data || [];
          const next = data?.next || null;
          setBeneficiaries(Array.isArray(results) ? results : []);
          setNextPage(next);
          console.log(`📊 Loaded ${results.length} beneficiaries`);
        } else {
          console.log('📴 Fetching beneficiaries (offline)...');
          const local = await getAllBeneficiaries();
          const mapped = local.map((r) => ({
            beneficiary_id: r.server_id || r.beneficiary_id || `local-${r.local_id}`,
            name: r.name,
            phone_number: String(r.phone_number || ''),
            village: r.village || '',
            district: r.district || '',
            beneficiary_image_url: null,
          }));
          setBeneficiaries(mapped as any);
          setNextPage(null);
        }
      } catch (error) {
        console.error('❌ Failed to fetch beneficiaries:', error);
        const local = await getAllBeneficiaries();
        const mapped = local.map((r) => ({
          beneficiary_id: r.server_id || r.beneficiary_id || `local-${r.local_id}`,
          name: r.name,
          phone_number: String(r.phone_number || ''),
          village: r.village || '',
          district: r.district || '',
          beneficiary_image_url: null,
        }));
        setBeneficiaries(mapped as any);
        setNextPage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBeneficiaries();
  }, []);

  // Function to load more beneficiaries
  const loadMoreBeneficiaries = async () => {
    if (!nextPage || loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      console.log('🔄 Loading more beneficiaries...');
      
      // Extract endpoint from nextPage URL
      const url = new URL(nextPage.replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
                                  .replace('http://localhost:8000', API_CONFIG.BASE_URL));
      const endpoint = url.pathname + url.search;
      
      const data = await apiGet(endpoint, { 
        cache: false, 
        timeout: API_CONFIG.FAST_TIMEOUT 
      });
      
      const newResults = data?.results || [];
      const next = data?.next || null;
      
      setBeneficiaries(prev => [...prev, ...newResults]);
      setNextPage(next);
      
      console.log(`✅ Loaded ${newResults.length} more beneficiaries`);
    } catch (error) {
      console.error('❌ Error loading more beneficiaries:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredBeneficiaries = beneficiaries.filter((item) =>
    item.phone_number?.toString().toLowerCase().includes(searchText.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderBeneficiaryItem = ({ item }: { item: Beneficiary }) => (
    <TouchableOpacity
      style={styles.listItem}
      activeOpacity={0.7}
      onPress={() => {
        navigation.navigate('BeneficiaryProfile', {
          beneficiary_id: item.beneficiary_id,
        });
      }}
    >
      <View style={styles.avatarContainer}>
        {(() => {
          const imageUrl = buildMediaUrl(item.beneficiary_image_url);
          console.log('Beneficiary list image URL:', imageUrl);
          console.log('Raw beneficiary_image_url:', item.beneficiary_image_url);
          
          return imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.avatarImage}
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
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          );
        })()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone_number}</Text>
        <Text style={styles.location}>{item.village}, {item.district}</Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color="#888" 
        style={styles.arrowIcon}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Beneficiaries</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddBeneficiary')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search beneficiaries..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </LinearGradient>

      {/* List */}
      {filteredBeneficiaries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name={beneficiaries.length === 0 ? "people-outline" : "search-outline"} 
            size={48} 
            color="#bbb" 
          />
          <Text style={styles.noDataText}>
            {beneficiaries.length === 0 
              ? 'No beneficiaries found'
              : 'No matching results found'
            }
          </Text>
          <Text style={styles.noDataSubText}>
            {beneficiaries.length === 0 
              ? 'Add some beneficiaries to see them here'
              : 'Try a different search term'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBeneficiaries}
          keyExtractor={(item) => item.beneficiary_id}
          renderItem={renderBeneficiaryItem}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => {
            // Only load more if we're not searching (showing all data)
            if (!searchText.trim()) {
              loadMoreBeneficiaries();
            }
          }}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() => {
            if (loadingMore && nextPage && !searchText.trim()) {
              return (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#6e45e2" />
                  <Text style={styles.loadingMoreText}>Loading more beneficiaries...</Text>
                </View>
              );
            }
            return null;
          }}
        />
      )}
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
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#6e45e2',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#888',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noDataText: {
    textAlign: 'center',
    color: '#555',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  noDataSubText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 4,
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
    color: '#666',
  },
});

export default BeneficiaryListScreen;