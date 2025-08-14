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
import { TELANGANA_DATA } from '../../constants/locationData';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, useLocation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { locationState } = useLocation();

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandal, setSelectedMandal] = useState('');
  const [mandals, setMandals] = useState<string[]>([]);

  const districtList = Object.keys(TELANGANA_DATA.districts);
  
  // Create dynamic styles
  const styles = createStyles(theme);

  useEffect(() => {
    if (districtList.length > 0) {
      const defaultDistrict = districtList[0];
      setSelectedDistrict(defaultDistrict);
      setMandals(TELANGANA_DATA.districts[defaultDistrict]);
      setSelectedMandal(TELANGANA_DATA.districts[defaultDistrict][0]);
    }
  }, []);

  useEffect(() => {
    if (selectedDistrict && TELANGANA_DATA.districts[selectedDistrict]) {
      const mandalsInDistrict = TELANGANA_DATA.districts[selectedDistrict];
      setMandals(mandalsInDistrict);
      setSelectedMandal(mandalsInDistrict[0]);
    }
  }, [selectedDistrict]);

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
        {/* Location Picker */}
        <Text style={styles.sectionTitle}>Default Location</Text>
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
                  onValueChange={(value) => setSelectedDistrict(value)}
                  dropdownIconColor="#6e45e2"
                  style={styles.picker}
                  mode="dropdown"
                >
                  {districtList.map((district) => (
                    <Picker.Item 
                      key={district} 
                      label={district} 
                      value={district} 
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
                  onValueChange={(value) => setSelectedMandal(value)}
                  dropdownIconColor="#6e45e2"
                  style={styles.picker}
                  mode="dropdown"
                >
                  {mandals.map((mandal) => (
                    <Picker.Item 
                      key={mandal} 
                      label={mandal} 
                      value={mandal} 
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