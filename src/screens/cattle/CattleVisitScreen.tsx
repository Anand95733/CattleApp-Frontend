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
  FlatList,
  RefreshControl,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../navigation/types';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG, apiGet } from '../../config/api';
import { useTheme } from '../../contexts';

type CattleVisitRouteProp = RouteProp<RootStackParamList, 'CattleVisit'>;
type CattleVisitNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CattleVisit'>;

interface Visit {
  visit_id: number;
  visit_number: number;
  visit_date: string;
  animal_photo: string;
  health_status: string;
  line_of_treatment: string;
  vaccinations_given: string;
  pregnancy_period?: number;
  calf_age?: number;
  calf_gender: string;
  milk_yield: string;
  animal_performance: string;
  beneficiary_issues: string;
  animal: string;
  animal_info?: {
    animal_id: string;
    tag_no: string;
    type: string;
    breed: string;
  };
}

interface VisitListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Visit[];
  // New API format
  success?: boolean;
  visits?: Visit[];
  animal_info?: {
    animal_id: string;
    tag_no: string;
    type: string;
    breed: string;
    beneficiary_id: string;
    beneficiary_name: string;
    milk_yield_per_day: string;
    age: number;
    pregnant: boolean;
    created_at: string;
  };
}

const CattleVisitScreen = () => {
  const { theme } = useTheme();
  const route = useRoute<CattleVisitRouteProp>();
  const navigation = useNavigation<CattleVisitNavigationProp>();
  const { animal_id, newVisit } = route.params;
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const fetchVisits = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(null);
    
    try {
      console.log('🔍 Fetching visits for animal:', animal_id);
      
      // Try the new dedicated endpoint first, then fallback to search
      let response: VisitListResponse;
      try {
        response = await apiGet(
          `${API_CONFIG.ENDPOINTS.SC_VISITS}by-animal/${animal_id}/`,
          {
            timeout: API_CONFIG.FAST_TIMEOUT,
            cache: !isRefresh
          }
        );
        console.log('✅ Using dedicated visits endpoint');
      } catch (error) {
        console.log('⚠️ Dedicated endpoint failed, using search fallback...');
        response = await apiGet(
          `${API_CONFIG.ENDPOINTS.SC_VISITS || '/api/sc-visits/'}?search=${animal_id}`,
          {
            timeout: API_CONFIG.FAST_TIMEOUT,
            cache: !isRefresh
          }
        );
      }
      
      console.log('✅ Visits data received:', response);
      
      // Handle the new API response format
      let fetchedVisits = [];
      if (response.success && response.visits) {
        // New API format with success flag and visits array
        fetchedVisits = response.visits;
        setTotalVisits(response.count || 0);
        console.log(`📋 Found ${response.count} visits using new API format`);
      } else if (response.results) {
        // Fallback to old format
        fetchedVisits = response.results;
        setTotalVisits(response.count || 0);
        console.log(`📋 Found ${response.results.length} visits using fallback format`);
      } else {
        // No visits found
        fetchedVisits = [];
        setTotalVisits(0);
        console.log('📋 No visits found');
      }

      // If we have a newVisit from instant update, merge it with fetched visits
      if (newVisit) {
        console.log('🔄 Merging instant visit with fetched visits...');
        // Remove any duplicate based on visit_id or visit_number
        const filteredVisits = fetchedVisits.filter(visit => 
          visit.visit_id !== newVisit.visit_id && 
          visit.visit_number !== newVisit.visit_number
        );
        // Add the new visit at the beginning (most recent)
        setVisits([newVisit, ...filteredVisits]);
        setTotalVisits(filteredVisits.length + 1);
      } else {
        setVisits(fetchedVisits);
      }
      
    } catch (error) {
      console.error('💥 Failed to fetch visits:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Handle API error responses
      if (error.response && error.response.data) {
        if (error.response.data.success === false) {
          errorMessage = error.response.data.error || error.response.data.message || 'API Error';
        }
      }
      
      setFetchError(errorMessage);
      setVisits([]);
      setTotalVisits(0);
      
      if (!isRefresh) {
        Alert.alert(
          'Loading Error', 
          `Failed to load visit history: ${errorMessage}\n\nPlease check your internet connection and try again.`,
          [
            { text: 'Retry', onPress: () => fetchVisits() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🔍 CattleVisitScreen mounted with animal_id:', animal_id);
    
    if (!animal_id) {
      console.error('❌ No animal_id provided in route params');
      setFetchError('No animal ID provided');
      setLoading(false);
      return;
    }
    
    // If a new visit was passed, add it instantly and then fetch the rest
    if (newVisit) {
      console.log('🚀 Adding new visit instantly:', newVisit);
      setVisits([newVisit]); // Add the new visit immediately
      setTotalVisits(1); // At least 1 visit now
      setLoading(false);
      
      // Then fetch all visits to get the complete list
      setTimeout(() => {
        fetchVisits();
        // Clear the newVisit parameter to prevent re-processing
        navigation.setParams({ newVisit: undefined });
      }, 100); // Small delay to show the instant update first
    } else {
      fetchVisits();
    }
  }, [animal_id, newVisit]);

  // Refresh visits when screen comes into focus (but not if we just added a visit)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (animal_id && !newVisit) {
        console.log('🔄 Screen focused, refreshing visits...');
        fetchVisits();
      }
    });
    return unsubscribe;
  }, [navigation, animal_id, newVisit]);

  const onRefresh = () => {
    fetchVisits(true);
  };

  const renderVisitItem = ({ item }: { item: Visit }) => (
    <TouchableOpacity 
      style={styles.visitItem}
      onPress={() => {
        // Navigate to visit details or show more info
        Alert.alert(
          'Visit Details',
          `Visit #${item.visit_number}\nDate: ${formatDate(item.visit_date)}\nHealth: ${item.health_status}\nMilk Yield: ${item.milk_yield}L\nTreatment: ${item.line_of_treatment}`,
          [{ text: 'OK' }]
        );
      }}
    >
      <View style={styles.visitHeader}>
        <View style={styles.visitNumberContainer}>
          <Text style={styles.visitNumber}>#{item.visit_number}</Text>
        </View>
        <View style={styles.visitDateContainer}>
          <Text style={styles.visitDate}>{formatDate(item.visit_date)}</Text>
        </View>
      </View>
      
      <View style={styles.visitContent}>
        <View style={styles.visitRow}>
          <Icon name="heart-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.visitLabel}>Health Status:</Text>
          <Text style={styles.visitValue}>{item.health_status}</Text>
        </View>
        
        <View style={styles.visitRow}>
          <Icon name="water-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.visitLabel}>Milk Yield:</Text>
          <Text style={styles.visitValue}>{item.milk_yield} L</Text>
        </View>
        
        <View style={styles.visitRow}>
          <Icon name="medical-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.visitLabel}>Treatment:</Text>
          <Text style={[styles.visitValue, styles.treatmentText]} numberOfLines={2}>
            {item.line_of_treatment}
          </Text>
        </View>
        
        {item.vaccinations_given && (
          <View style={styles.visitRow}>
            <Icon name="shield-checkmark-outline" size={16} color={theme.colors.success} />
            <Text style={styles.visitLabel}>Vaccinations:</Text>
            <Text style={[styles.visitValue, styles.vaccinationText]} numberOfLines={1}>
              {item.vaccinations_given}
            </Text>
          </View>
        )}
        
        <View style={styles.visitRow}>
          <Icon name="trending-up-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.visitLabel}>Performance:</Text>
          <Text style={styles.visitValue} numberOfLines={1}>
            {item.animal_performance}
          </Text>
        </View>
        
        {item.beneficiary_issues && (
          <View style={styles.visitRow}>
            <Icon name="alert-circle-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.visitLabel}>Issues:</Text>
            <Text style={[styles.visitValue, styles.issuesText]} numberOfLines={2}>
              {item.beneficiary_issues}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-outline" size={80} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Visits Found</Text>
      <Text style={styles.emptySubtitle}>
        No visit history available for this cattle yet.
      </Text>
      <TouchableOpacity 
        style={styles.addVisitButton}
        onPress={() => {
          navigation.navigate('AddVisit', { animal_id });
        }}
      >
        <Icon name="add-outline" size={20} color="white" />
        <Text style={styles.addVisitButtonText}>Add First Visit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <Text style={styles.headerInfoTitle}>Visit History</Text>
      <Text style={styles.headerInfoSubtitle}>
        {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'} recorded
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading visit history...</Text>
      </View>
    );
  }

  if (fetchError && visits.length === 0) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <Icon name="alert-circle-outline" size={60} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load visit history</Text>
        <Text style={styles.errorSubtext}>{fetchError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchVisits()}>
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cattle Visits</Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate('AddVisit', { animal_id });
          }}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={visits}
        renderItem={renderVisitItem}
        keyExtractor={(item) => item.visit_id.toString()}
        ListHeaderComponent={visits.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={visits.length === 0 ? styles.emptyListContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  addButton: {
    marginLeft: 15,
  },
  headerInfo: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 10,
  },
  headerInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerInfoSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
  },
  visitItem: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  visitNumberContainer: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  visitDateContainer: {
    alignItems: 'flex-end',
  },
  visitDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  visitContent: {
    gap: 8,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  visitLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    minWidth: 80,
  },
  visitValue: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  treatmentText: {
    fontStyle: 'italic',
  },
  vaccinationText: {
    color: theme.colors.success,
    fontWeight: '500',
  },
  issuesText: {
    color: theme.colors.warning,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addVisitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 10,
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

export default CattleVisitScreen;