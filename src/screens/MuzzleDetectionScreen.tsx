import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import MuzzleDetectionService, { MuzzleImageAnalysis } from '../services/MuzzleDetectionService';
import { useTheme } from '../contexts';

const { width } = Dimensions.get('window');

const MuzzleDetectionScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    bestImage: MuzzleImageAnalysis | null;
    allAnalysis: MuzzleImageAnalysis[];
    summary: any;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<'capture' | 'analyze' | 'results'>('capture');
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, message: '' });

  const captureImage = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri!;
        setCapturedImages(prev => [...prev, imageUri]);
        
        if (capturedImages.length + 1 === 4) {
          Alert.alert(
            'All Images Captured!',
            'You have taken all 4 muzzle images. Ready to analyze and find the best one?',
            [
              { text: 'Take More', style: 'cancel' },
              { text: 'Analyze Now', onPress: () => startAnalysis([...capturedImages, imageUri]) }
            ]
          );
        }
      }
    });
  };

  const startAnalysis = async (imageUris: string[]) => {
    setIsAnalyzing(true);
    setCurrentStep('analyze');
    setAnalysisProgress({ current: 0, total: imageUris.length, message: 'Starting muzzle detection...' });

    try {
      // Create a custom analysis with progress updates
      const allAnalysis: MuzzleImageAnalysis[] = [];
      
      for (let i = 0; i < imageUris.length; i++) {
        setAnalysisProgress({
          current: i + 1,
          total: imageUris.length,
          message: `Analyzing muzzle image ${i + 1} of ${imageUris.length}...`
        });
        
        const analysis = await MuzzleDetectionService.analyzeImage(imageUris[i], i);
        allAnalysis.push(analysis);
      }

      // Find the best result
      const successfulDetections = allAnalysis.filter(analysis => analysis.detection.success);
      
      let bestImage: MuzzleImageAnalysis | null = null;
      if (successfulDetections.length > 0) {
        bestImage = successfulDetections.reduce((best, current) => 
          current.detection.confidence > best.detection.confidence ? current : best
        );
      }

      const summary = {
        totalImages: imageUris.length,
        successfulDetections: successfulDetections.length,
        highQualityCount: successfulDetections.filter(a => a.detection.quality === 'high').length,
        mediumQualityCount: successfulDetections.filter(a => a.detection.quality === 'medium').length,
        lowQualityCount: successfulDetections.filter(a => a.detection.quality === 'low').length,
      };

      setAnalysisResults({ bestImage, allAnalysis, summary });
      setCurrentStep('results');

    } catch (error) {
      Alert.alert('Analysis Failed', `Error during muzzle detection: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProcess = () => {
    setCapturedImages([]);
    setAnalysisResults(null);
    setCurrentStep('capture');
    setAnalysisProgress({ current: 0, total: 0, message: '' });
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
      default: return '#666';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚫';
    }
  };

  const renderCaptureScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Muzzle Image Capture</Text>
        <Text style={styles.subtitle}>Take 4 clear photos of the cattle muzzle</Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          Images Captured: {capturedImages.length} / 4
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(capturedImages.length / 4) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.imageGrid}>
        {capturedImages.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.capturedImage} />
            <Text style={styles.imageLabel}>Image {index + 1}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.captureButton} 
          onPress={captureImage}
        >
          <Text style={styles.captureButtonText}>
            📷 Take Photo ({capturedImages.length + 1}/4)
          </Text>
        </TouchableOpacity>

        {capturedImages.length >= 2 && (
          <TouchableOpacity 
            style={styles.analyzeButton} 
            onPress={() => startAnalysis(capturedImages)}
          >
            <Text style={styles.analyzeButtonText}>
              🔍 Analyze Images ({capturedImages.length})
            </Text>
          </TouchableOpacity>
        )}

        {capturedImages.length > 0 && (
          <TouchableOpacity style={styles.resetButton} onPress={resetProcess}>
            <Text style={styles.resetButtonText}>🗑️ Start Over</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAnalysisScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analyzing Muzzle Images</Text>
        <Text style={styles.subtitle}>AI is finding the best muzzle image</Text>
      </View>

      <View style={styles.analysisContainer}>
        <ActivityIndicator size="large" color="#6e45e2" />
        <Text style={styles.analysisMessage}>{analysisProgress.message}</Text>
        <Text style={styles.analysisProgress}>
          {analysisProgress.current} / {analysisProgress.total}
        </Text>
      </View>

      <View style={styles.analysisSteps}>
        <Text style={styles.stepTitle}>🤖 AI Detection Process:</Text>
        <Text style={styles.stepText}>• Converting images to AI format</Text>
        <Text style={styles.stepText}>• Detecting muzzle patterns</Text>
        <Text style={styles.stepText}>• Measuring image quality</Text>
        <Text style={styles.stepText}>• Selecting best result</Text>
      </View>
    </View>
  );

  const renderResultsScreen = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analysis Complete!</Text>
        <Text style={styles.subtitle}>Best muzzle image selected</Text>
      </View>

      {analysisResults?.bestImage ? (
        <View style={styles.bestImageSection}>
          <Text style={styles.sectionTitle}>🏆 Best Muzzle Image</Text>
          <Image 
            source={{ uri: analysisResults.bestImage.imageUri }} 
            style={styles.bestImage} 
          />
          <View style={styles.bestImageStats}>
            <Text style={styles.bestImageTitle}>
              Image #{analysisResults.bestImage.imageIndex + 1}
            </Text>
            <Text style={[styles.qualityBadge, { color: getQualityColor(analysisResults.bestImage.detection.quality!) }]}>
              {getQualityIcon(analysisResults.bestImage.detection.quality!)} {analysisResults.bestImage.detection.quality!.toUpperCase()} QUALITY
            </Text>
            <Text style={styles.confidenceText}>
              Confidence: {(analysisResults.bestImage.detection.confidence * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noResultSection}>
          <Text style={styles.noResultText}>❌ No suitable muzzle images found</Text>
          <Text style={styles.noResultSubtext}>Try taking clearer photos with better lighting</Text>
        </View>
      )}

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>📊 Analysis Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{analysisResults?.summary.totalImages}</Text>
            <Text style={styles.summaryLabel}>Images Analyzed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{analysisResults?.summary.successfulDetections}</Text>
            <Text style={styles.summaryLabel}>Muzzles Detected</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>
              {analysisResults?.summary.highQualityCount}
            </Text>
            <Text style={styles.summaryLabel}>High Quality</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#FF9800' }]}>
              {analysisResults?.summary.mediumQualityCount}
            </Text>
            <Text style={styles.summaryLabel}>Medium Quality</Text>
          </View>
        </View>
      </View>

      <View style={styles.allImagesSection}>
        <Text style={styles.sectionTitle}>📸 All Images Analysis</Text>
        {analysisResults?.allAnalysis.map((analysis, index) => (
          <View key={index} style={styles.imageAnalysisItem}>
            <Image source={{ uri: analysis.imageUri }} style={styles.thumbnailImage} />
            <View style={styles.analysisInfo}>
              <Text style={styles.imageNumber}>Image #{index + 1}</Text>
              {analysis.detection.success ? (
                <>
                  <Text style={[styles.qualityText, { color: getQualityColor(analysis.detection.quality!) }]}>
                    {getQualityIcon(analysis.detection.quality!)} {analysis.detection.quality!} quality
                  </Text>
                  <Text style={styles.confidenceSmall}>
                    {(analysis.detection.confidence * 100).toFixed(1)}% confidence
                  </Text>
                </>
              ) : (
                <Text style={styles.errorText}>❌ {analysis.detection.reason}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.useImageButton}>
          <Text style={styles.useImageButtonText}>
            ✅ Use Selected Image
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryButton} onPress={resetProcess}>
          <Text style={styles.retryButtonText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (currentStep === 'analyze') {
    return renderAnalysisScreen();
  } else if (currentStep === 'results') {
    return renderResultsScreen();
  } else {
    return renderCaptureScreen();
  }
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  progressSection: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  imageGrid: {
    flex: 1,
    padding: 15,
  },
  imageContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  capturedImage: {
    width: width - 60,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  imageLabel: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
  },
  captureButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  analysisMessage: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  analysisProgress: {
    fontSize: 16,
    color: '#6e45e2',
    fontWeight: 'bold',
  },
  analysisSteps: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bestImageSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bestImage: {
    width: width - 70,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  bestImageStats: {
    alignItems: 'center',
  },
  bestImageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  qualityBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 16,
    color: '#6e45e2',
    fontWeight: 'bold',
  },
  noResultSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 30,
    borderRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noResultSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  summarySection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6e45e2',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  allImagesSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  imageAnalysisItem: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  analysisInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  imageNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  confidenceSmall: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
  },
  useImageButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  useImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#6e45e2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MuzzleDetectionScreen;