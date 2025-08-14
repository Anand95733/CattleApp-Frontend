import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastCattleImage from './FastCattleImage';

interface ImageTestComponentProps {
  testUrls: string[];
}

const ImageTestComponent: React.FC<ImageTestComponentProps> = ({ testUrls }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Test Component</Text>
      {testUrls.map((url, index) => (
        <View key={index} style={styles.testItem}>
          <Text style={styles.urlText}>URL {index + 1}: {url}</Text>
          <FastCattleImage
            photoUrl={url}
            style={styles.testImage}
            placeholder={`Test ${index + 1}`}
            resizeMode="cover"
            showDebugUrl={true}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  testItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  urlText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  testImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});

export default ImageTestComponent;