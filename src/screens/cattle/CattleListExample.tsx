import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../navigation/types';
import { buildMediaUrl } from '../../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CattleListItem {
  animal_id: string;
  type: string;
  breed: string;
  animal_age: number;
  front_photo_url?: string;
  beneficiary_name: string;
  created_at: string;
}

// Example cattle data - replace with your API data
const EXAMPLE_CATTLE: CattleListItem[] = [
  {
    animal_id: 'CATTLE_001',
    type: 'Cow',
    breed: 'Gir',
    animal_age: 3,
    front_photo_url: 'cattle_images/front_001.jpg',
    beneficiary_name: 'John Doe',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    animal_id: 'CATTLE_002',
    type: 'Buffalo',
    breed: 'Murrah',
    animal_age: 4,
    front_photo_url: 'cattle_images/front_002.jpg',
    beneficiary_name: 'Jane Smith',
    created_at: '2024-01-10T14:20:00Z',
  },
  // Add more cattle items...
];

const CattleListExample = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleCattlePress = (animal_id: string) => {
    // Navigate to CattleDetailsScreen
    navigation.navigate('CattleDetails', { animal_id });
  };

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

  const renderCattleItem = ({ item }: { item: CattleListItem }) => (
    <TouchableOpacity 
      style={styles.cattleItem}
      onPress={() => handleCattlePress(item.animal_id)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {item.front_photo_url ? (
          <Image
            source={{ uri: buildMediaUrl(item.front_photo_url)! }}
            style={styles.cattleImage}
            defaultSource={require('../../assets/placeholder-cattle.png')} // Add a placeholder image
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="camera-outline" size={32} color="#ccc" />
          </View>
        )}
      </View>

      <View style={styles.cattleInfo}>
        <View style={styles.cattleHeader}>
          <Text style={styles.cattleType}>{item.type}</Text>
          <Text style={styles.cattleAge}>{item.animal_age} years</Text>
        </View>
        
        <Text style={styles.cattleBreed}>{item.breed}</Text>
        
        <View style={styles.cattleDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={12} color="#666" />
            <Text style={styles.beneficiaryName}>{item.beneficiary_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={12} color="#666" />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={EXAMPLE_CATTLE}
        renderItem={renderCattleItem}
        keyExtractor={(item) => item.animal_id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
  },
  cattleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 16,
  },
  cattleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cattleInfo: {
    flex: 1,
  },
  cattleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cattleType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cattleAge: {
    fontSize: 14,
    color: '#6e45e2',
    fontWeight: '600',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cattleBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cattleDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  beneficiaryName: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  actionContainer: {
    marginLeft: 12,
  },
});

export default CattleListExample;