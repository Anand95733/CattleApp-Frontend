import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface OptimizedImageProps {
  uri: string;
  style?: any;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  preload?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  uri,
  style,
  placeholder,
  fallback,
  preload = false,
  resizeMode = 'cover',
  onLoad,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (preload && uri) {
      // Preload image in background
      Image.prefetch(uri)
        .then(() => {
          console.log(`✅ Preloaded image: ${uri.slice(-20)}`);
          setImageLoaded(true);
        })
        .catch((err) => {
          console.warn(`❌ Preload failed: ${uri.slice(-20)}`, err);
          setError(true);
        });
    }
  }, [uri, preload]);

  const handleLoad = () => {
    setLoading(false);
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = (errorEvent: any) => {
    console.warn(`Image load error for URL: ${uri}`, errorEvent);
    console.warn(`Error details:`, errorEvent.nativeEvent);
    setLoading(false);
    setError(true);
    onError?.();
  };

  const renderPlaceholder = () => {
    if (placeholder) return placeholder;
    
    return (
      <View style={[styles.placeholderContainer, style]}>
        <ActivityIndicator size="large" color="#6e45e2" />
        <Text style={styles.placeholderText}>Loading...</Text>
      </View>
    );
  };

  const renderFallback = () => {
    if (fallback) return fallback;
    
    return (
      <View style={[styles.fallbackContainer, style]}>
        <LinearGradient
          colors={['#f0f0f0', '#e0e0e0']}
          style={styles.fallbackGradient}
        >
          <Ionicons name="image-outline" size={40} color="#999" />
          <Text style={styles.fallbackText}>Image unavailable</Text>
        </LinearGradient>
      </View>
    );
  };

  if (error) {
    return renderFallback();
  }

  return (
    <View style={style}>
      {loading && renderPlaceholder()}
      
      <Image
        source={{ uri }}
        style={[style, loading && { opacity: 0 }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        // Performance optimizations
        fadeDuration={0} // Disable fade for faster rendering
        progressiveRenderingEnabled={true}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    zIndex: 1,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default OptimizedImage;