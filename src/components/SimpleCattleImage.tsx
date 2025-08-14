import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG } from '../config/api';

interface SimpleCattleImageProps {
  photoUrl?: string;
  style?: any;
  placeholder?: string;
  onPress?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const SimpleCattleImage: React.FC<SimpleCattleImageProps> = ({
  photoUrl,
  style,
  placeholder = 'No Image',
  onPress,
  resizeMode = 'cover'
}) => {
  const [imageError, setImageError] = useState(false);

  // Build the full image URL
  const getImageUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    const cleanUrl = url.trim();
    
    // If it's already a full URL, replace localhost with configured IP
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl
        .replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
        .replace('http://localhost:8000', API_CONFIG.BASE_URL);
    }
    
    // If it starts with /media/, combine with base URL
    if (cleanUrl.startsWith('/media/')) {
      return `${API_CONFIG.BASE_URL}${cleanUrl}`;
    }
    
    // Otherwise, assume it's a relative path
    return `${API_CONFIG.BASE_URL}/media/${cleanUrl}`;
  };

  const imageUrl = getImageUrl(photoUrl);

  const handleImageError = () => {
    console.warn(`🖼️ Simple image failed to load: ${imageUrl}`);
    setImageError(true);
  };

  const renderPlaceholder = () => (
    <LinearGradient
      colors={imageError ? ['#fee2e2', '#fecaca'] : ['#f8f9fa', '#e9ecef']}
      style={[styles.placeholder, style]}
    >
      <Ionicons 
        name={imageError ? "alert-circle-outline" : "camera-outline"} 
        size={24} 
        color={imageError ? '#dc2626' : '#6c757d'} 
      />
      <Text style={[styles.placeholderText, { color: imageError ? '#dc2626' : '#6c757d' }]}>
        {imageError ? 'Image Not Found' : placeholder}
      </Text>
      {__DEV__ && imageUrl && (
        <Text style={styles.debugUrl} numberOfLines={2}>
          {imageUrl}
        </Text>
      )}
    </LinearGradient>
  );

  const renderImage = () => (
    <Image
      source={{ uri: imageUrl! }}
      style={[style, styles.image]}
      onError={handleImageError}
      resizeMode={resizeMode}
    />
  );

  const content = (imageUrl && !imageError) ? renderImage() : renderPlaceholder();

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{content}</View>;
};

const styles = StyleSheet.create({
  image: {
    borderRadius: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  debugUrl: {
    marginTop: 4,
    fontSize: 8,
    color: '#dc3545',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default SimpleCattleImage;