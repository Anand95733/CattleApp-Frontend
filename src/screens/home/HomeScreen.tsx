import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
// Using centralized LocationContext data now
// import { TELANGANA_DATA } from '../../constants/locationData';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, useLocation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { locationState, setSelectedDistrict, setSelectedMandal, setSelectedVillage, getAllDistricts, getMandalsByDistrict, getVillagesByMandal } = useLocation();

  const [selectedDistrict, _setSelectedDistrict] = useState(locationState.selectedDistrict);
  const [selectedMandal, _setSelectedMandal] = useState(locationState.selectedMandal);
  const [selectedVillage, _setSelectedVillage] = useState(locationState.selectedVillage);
  const [mandals, setMandals] = useState<{id: string; name: string}[]>(locationState.mandals);
  const [villages, setVillages] = useState<{id: string; name: string}[]>(locationState.villages);

  const districtList = getAllDistricts();
  
  // Create dynamic styles
  const styles = createStyles(theme);

  // Keep local selections in sync with global context (e.g., when changed in other tabs)
  useEffect(() => {
    _setSelectedDistrict(locationState.selectedDistrict);
    _setSelectedMandal(locationState.selectedMandal);
    setMandals(locationState.selectedDistrict ? getMandalsByDistrict(locationState.selectedDistrict) : []);
    setVillages(locationState.selectedMandal ? getVillagesByMandal(locationState.selectedMandal) : []);
  }, [locationState.selectedDistrict, locationState.selectedMandal]);

  useEffect(() => {
    // Initialize from context values on mount
    if (locationState.selectedDistrict) {
      setMandals(getMandalsByDistrict(locationState.selectedDistrict));
      if (locationState.selectedMandal) {
        setVillages(getVillagesByMandal(locationState.selectedMandal));
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      const list = getMandalsByDistrict(selectedDistrict);
      setMandals(list);
      // Do not auto-select a mandal; let user pick
      _setSelectedMandal('');
      setSelectedDistrict(selectedDistrict);
    } else {
      setMandals([]);
      _setSelectedMandal('');
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedMandal) {
      const list = getVillagesByMandal(selectedMandal);
      setVillages(list);
      // Do not auto-select village on Home; leave it optional
      setSelectedMandal(selectedMandal);
    } else {
      setVillages([]);
    }
  }, [selectedMandal]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>User</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Analytics Section */}
        <Text style={styles.sectionTitle}>Your Analytics</Text>
        <View style={styles.analyticsContainer}>
          {/* First Row */}
          <View style={styles.analyticsRow}>
            <View style={[styles.card, styles.farmersCard]}>
              <Text style={styles.cardTitle}>👥 Total Farmers</Text>
              <Text style={styles.cardNumber}>0</Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetail}>Beneficiaries: 0</Text>
                <Text style={styles.cardDetail}>Sellers: 0</Text>
                <Text style={styles.cardDetail}>Cattles: 0</Text>
              </View>
            </View>
            
            <View style={[styles.card, styles.cattleCard]}>
              <Text style={styles.cardTitle}>🐄 Total Cattle</Text>
              <Text style={styles.cardNumber}>0</Text>
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetail}>Cows: 0</Text>
                <Text style={styles.cardDetail}>Buffaloes: 0</Text>
              </View>
            </View>
          </View>
          
          {/* Second Row */}
          <View style={[styles.card, styles.genderCard]}>
            <Text style={styles.cardTitle}>⚥ Gender Distribution</Text>
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetail}>Male: 0</Text>
              <Text style={styles.cardDetail}>Female: 0</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addBeneficiaryButton]}
            onPress={() => navigation.navigate('AddBeneficiary')}
          >
            <Ionicons name="person-add" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Add Beneficiary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.addSellerButton]}
            onPress={() => navigation.navigate('AddSeller')}
          >
            <Ionicons name="business" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Add Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Location Picker */}
        <Text style={styles.sectionTitle}>Current Location</Text>
        <View style={styles.locationCard}>
          <View style={styles.pickerGroup}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>State</Text>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerText}>Telangana</Text>
                <Ionicons name="chevron-down" size={18} color="#6e45e2" />
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>District</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={(value) => {
                    const next = String(value);
                    _setSelectedDistrict(next);
                    setSelectedDistrict(next);
                    // Clear dependent selection
                    _setSelectedMandal('');
                  }}
                  dropdownIconColor="#6e45e2"
                  style={styles.picker}
                  mode="dropdown"
                >
                  {districtList.map((d) => (
                    <Picker.Item 
                      key={d.id} 
                      label={d.name} 
                      value={d.id} 
                      style={styles.pickerItem}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Mandal</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedMandal}
                  onValueChange={(value) => {
                    const next = String(value);
                    _setSelectedMandal(next);
                    setSelectedMandal(next);
                  }}
                  dropdownIconColor="#6e45e2"
                  style={styles.picker}
                  mode="dropdown"
                >
                  {mandals.map((m) => (
                    <Picker.Item 
                      key={m.id} 
                      label={m.name} 
                      value={m.id} 
                      style={styles.pickerItem}
                    />
                  ))}
                </Picker>
              </View>
            </View>
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
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 6,
  },
  onlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 16,
  },
  analyticsContainer: {
    marginBottom: 20,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  farmersCard: {
    marginRight: 6,
    backgroundColor: theme.dark ? theme.colors.surface : '#f0fdf4',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cattleCard: {
    marginLeft: 6,
    backgroundColor: theme.dark ? theme.colors.surface : '#ecfdf5',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  genderCard: {
    backgroundColor: theme.dark ? theme.colors.surface : '#f7fee7',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDetails: {
    marginTop: 8,
  },
  cardDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 4,
  },
  addBeneficiaryButton: {
    backgroundColor: theme.colors.primary,
  },
  addSellerButton: {
    backgroundColor: theme.colors.secondary,
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerGroup: {
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
    color: theme.colors.text,

  },
  pickerText: {
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  pickerItem: {
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.inputBackground,
  },
});

export default HomeScreen;