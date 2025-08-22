import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG } from '../config/api';

interface FastCattleImageProps {
  photoUrl?: string;
  style?: any;
  placeholder?: string;
  onPress?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const FastCattleImage: React.FC<FastCattleImageProps> = ({
  photoUrl,
  style,
  placeholder = 'No Image',
  onPress,
  resizeMode = 'cover'
}) => {
  const [imageError, setImageError] = useState(false);

  // Build image URI for both server and local files
  const getImageUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;

    const cleanUrl = url.trim();

    // Local file or content URIs
    if (
      cleanUrl.startsWith('file://') ||
      cleanUrl.startsWith('content://') ||
      cleanUrl.startsWith('/') // absolute filesystem path on Android
    ) {
      return cleanUrl.startsWith('file://') ? cleanUrl : `file://${cleanUrl}`;
    }

    // Remote URLs: normalize base host
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl
        .replace('http://127.0.0.1:8000', API_CONFIG.BASE_URL)
        .replace('http://localhost:8000', API_CONFIG.BASE_URL);
    }

    // Django media relative paths
    if (cleanUrl.startsWith('/media/')) {
      return `${API_CONFIG.BASE_URL}${cleanUrl}`;
    }

    // Fallback: treat as media path segment
    return `${API_CONFIG.BASE_URL}/media/${cleanUrl}`;
  };

  const imageUrl = getImageUrl(photoUrl);

  const handleImageError = () => {
    console.warn(`🖼️ Image failed to load: ${imageUrl}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
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
    </LinearGradient>
  );

  const renderImage = () => (
    <Image
      source={{ uri: imageUrl! }}
      style={[style, styles.image]}
      onError={handleImageError}
      onLoad={handleImageLoad}
      resizeMode={resizeMode}
    />
  );

  // Simple logic: show image if we have URL and no error, otherwise show placeholder
  const hasValidImageUrl = Boolean(imageUrl && imageUrl.trim());
  const content = (hasValidImageUrl && !imageError) ? renderImage() : renderPlaceholder();

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
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default FastCattleImage;