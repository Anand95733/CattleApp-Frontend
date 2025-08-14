import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SafeIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// List of known valid Ionicons names to prevent invalid icon errors
const VALID_ICON_NAMES = [
  'arrow-back', 'share-outline', 'camera-outline', 'calendar-outline',
  'location-outline', 'cash-outline', 'shield-checkmark-outline',
  'water-outline', 'pricetag-outline', 'heart', 'time-outline',
  'male-female-outline', 'add-circle-outline', 'create-outline',
  'person-outline', 'chevron-forward', 'copy-outline', 'alert-circle-outline',
  'paw-outline', 'medical-outline', 'ribbon-outline', 'bookmark-outline',
  'person', 'add', 'chevron-forward-outline', 'help-outline'
];

const SafeIcon: React.FC<SafeIconProps> = ({ 
  name, 
  size = 24, 
  color = '#000', 
  style 
}) => {
  // Validate and sanitize props
  const safeName = VALID_ICON_NAMES.includes(name) ? name : 'help-outline';
  const safeSize = Math.max(8, Math.min(100, Math.round(size || 24))); // Ensure size is between 8-100 and rounded
  const safeColor = color || '#000';

  // Additional validation to prevent NaN or invalid values
  if (isNaN(safeSize) || !isFinite(safeSize)) {
    console.warn(`SafeIcon: Invalid size provided (${size}), using default 24`);
    return <Ionicons name={safeName} size={24} color={safeColor} style={style} />;
  }

  return (
    <Ionicons 
      name={safeName} 
      size={safeSize} 
      color={safeColor} 
      style={style} 
    />
  );
};

export default SafeIcon;