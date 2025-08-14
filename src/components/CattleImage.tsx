import React, { useState, useEffect } from 'react';
import { Image, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { buildMediaUrl } from '../config/api';

interface CattleImageProps {
  photoUrl?: string;
  style?: any;
  placeholder?: string;
  onPress?: () => void;
  showDebugInfo?: boolean;
}

const CattleImage: React.FC<CattleImageProps> = ({
  photoUrl,
  style,
  placeholder = 'No Image',
  onPress,
  showDebugInfo = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset error state when photoUrl changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [photoUrl]);

  const fullImageUrl = photoUrl ? buildMediaUrl(photoUrl) : null;

  const handleImageError = (error: any) => {
    console.warn(`🖼️ Image failed to load: ${fullImageUrl}`);
    console.warn(`Error details:`, error.nativeEvent);
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${fullImageUrl}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const renderPlaceholder = () => (
    <LinearGradient
      colors={['#f0f0f0', '#e0e0e0']}
      style={[styles.placeholder, style]}
    >
      <Ionicons name="camera-outline" size={24} color="#999" />
      <Text style={styles.placeholderText}>{placeholder}</Text>
      {showDebugInfo && fullImageUrl && (
        <Text style={styles.debugText} numberOfLines={2}>
          {fullImageUrl}
        </Text>
      )}
    </LinearGradient>
  );

  const renderImage = () => (
    <View style={style}>
      <Image
        source={{ uri: fullImageUrl! }}
        style={[style, styles.image]}
        onError={handleImageError}
        onLoad={handleImageLoad}
        resizeMode="cover"
      />
      {showDebugInfo && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugOverlayText}>
            {imageLoaded ? '✅' : '⏳'}
          </Text>
        </View>
      )}
    </View>
  );

  const content = (!fullImageUrl || imageError) ? renderPlaceholder() : renderImage();

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
    borderColor: '#e1e5e9',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  debugText: {
    marginTop: 4,
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  debugOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugOverlayText: {
    color: 'white',
    fontSize: 10,
  },
});

export default CattleImage;