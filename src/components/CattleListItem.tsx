import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastCattleImage from './FastCattleImage';
import { useTheme } from '../contexts';

interface Animal {
  animal_id: string;
  type: string;
  breed: string;
  tag_no?: string;
  front_photo_url?: string;
  left_photo_url?: string;
  right_photo_url?: string;
  muzzle1_photo_url?: string;
}

interface CattleListItemProps {
  animal: Animal;
  onPress: (animalId: string) => void;
}

const CattleListItem: React.FC<CattleListItemProps> = ({ 
  animal, 
  onPress 
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const handlePress = () => {
    console.log('Cattle item pressed:', animal.animal_id);
    onPress(animal.animal_id);
  };

  const shortId = animal.animal_id.substring(0, 8) + '...';

  return (
    <TouchableOpacity 
      style={styles.cattleItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cattleImageContainer}>
        <FastCattleImage
          photoUrl={animal.front_photo_url}
          fallbackUrls={[
            // Try other image types as fallbacks if front image is missing
            animal.left_photo_url,
            animal.right_photo_url,
            animal.muzzle1_photo_url
          ].filter(Boolean)}
          style={styles.cattleImage}
          placeholder="No Photo"
          resizeMode="cover"
          showDebugUrl={__DEV__}
          disableFallbacks={true}
        />
      </View>
      
      <View style={styles.cattleDetails}>
        <View style={styles.cattleDetailRow}>
          <Ionicons name="paw-outline" size={14} color="#6e45e2" />
          <Text style={styles.cattleDetailLabel}>ID:</Text>
          <Text style={styles.cattleDetailValue} numberOfLines={1}>
            {shortId}
          </Text>
        </View>
        
        <View style={styles.cattleDetailRow}>
          <Ionicons name="medical-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.cattleDetailLabel}>Type:</Text>
          <Text style={styles.cattleDetailValue}>{animal.type}</Text>
        </View>
        
        <View style={styles.cattleDetailRow}>
          <Ionicons name="ribbon-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.cattleDetailLabel}>Breed:</Text>
          <Text style={styles.cattleDetailValue}>{animal.breed}</Text>
        </View>
        
        {animal.tag_no && (
          <View style={styles.cattleDetailRow}>
            <Ionicons name="bookmark-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.cattleDetailLabel}>Tag:</Text>
            <Text style={styles.cattleDetailValue}>{animal.tag_no}</Text>
          </View>
        )}
      </View>
      
      {/* Visual indicator that item is clickable */}
      <View style={styles.cattleItemIndicator}>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  cattleItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  cattleImageContainer: {
    marginRight: 12,
  },
  cattleImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
    fontWeight: '500',
    minWidth: 40,
  },
  cattleDetailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  cattleItemIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
});

export default CattleListItem;