import axios from 'axios';

export interface MuzzlePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface MuzzleDetectionResult {
  success: boolean;
  quality: 'high' | 'medium' | 'low' | null;
  confidence: number;
  reason?: string;
  prediction?: MuzzlePrediction;
}

export interface MuzzleImageAnalysis {
  imageIndex: number;
  imageUri: string;
  base64: string;
  detection: MuzzleDetectionResult;
  processingTime: number;
}

class MuzzleDetectionService {
  private static readonly ROBOFLOW_API_URL = 'https://detect.roboflow.com/car-33z0o/1';
  private static readonly API_KEY = 'lqrt0B12SJTeNBvW9kAM';
  private static readonly TIMEOUT = 25000;
  
  // Confidence thresholds
  private static readonly HIGH_QUALITY_THRESHOLD = 0.90;
  private static readonly MEDIUM_QUALITY_THRESHOLD = 0.70;

  /**
   * Convert image URI to Base64 string (without data prefix)
   */
  static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          // Remove data:image/jpeg;base64, prefix
          const cleanBase64 = base64String.split(',')[1];
          resolve(cleanBase64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to Base64: ${error.message}`);
    }
  }

  /**
   * Detect muzzle in a single image using Roboflow API
   */
  static async detectMuzzleFromBase64(imageBase64: string): Promise<MuzzleDetectionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Sending image to Roboflow for muzzle detection...');
      
      const response = await axios({
        method: 'POST',
        url: this.ROBOFLOW_API_URL,
        params: { api_key: this.API_KEY },
        data: imageBase64,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: this.TIMEOUT,
      });

      const predictions: MuzzlePrediction[] = response.data.predictions || [];
      const processingTime = Date.now() - startTime;
      
      console.log(`📊 Detection completed in ${processingTime}ms, found ${predictions.length} predictions`);

      // Find muzzle prediction
      const muzzlePrediction = predictions.find(pred => pred.class === 'muzzle');
      
      if (!muzzlePrediction) {
        return {
          success: false,
          quality: null,
          confidence: 0,
          reason: 'No muzzle detected in image',
        };
      }

      const confidence = muzzlePrediction.confidence;
      let quality: 'high' | 'medium' | 'low';

      if (confidence >= this.HIGH_QUALITY_THRESHOLD) {
        quality = 'high';
      } else if (confidence >= this.MEDIUM_QUALITY_THRESHOLD) {
        quality = 'medium';
      } else {
        quality = 'low';
      }

      console.log(`✅ Muzzle detected with ${(confidence * 100).toFixed(1)}% confidence (${quality} quality)`);

      return {
        success: true,
        quality,
        confidence,
        prediction: muzzlePrediction,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Muzzle detection failed after ${processingTime}ms:`, error.message);
      
      let reason = 'Detection failed';
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        reason = 'Detection timeout - please try again';
      } else if (error.message.includes('Network Error')) {
        reason = 'Network error - check your connection';
      }

      return {
        success: false,
        quality: null,
        confidence: 0,
        reason,
      };
    }
  }

  /**
   * Analyze a single image (convert to base64 and detect)
   */
  static async analyzeImage(imageUri: string, imageIndex: number): Promise<MuzzleImageAnalysis> {
    const startTime = Date.now();
    
    try {
      console.log(`📸 Analyzing image ${imageIndex + 1}/4...`);
      
      // Convert to Base64
      const base64 = await this.convertImageToBase64(imageUri);
      
      // Detect muzzle
      const detection = await this.detectMuzzleFromBase64(base64);
      
      const processingTime = Date.now() - startTime;
      
      return {
        imageIndex,
        imageUri,
        base64,
        detection,
        processingTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        imageIndex,
        imageUri,
        base64: '',
        detection: {
          success: false,
          quality: null,
          confidence: 0,
          reason: error.message,
        },
        processingTime,
      };
    }
  }

  /**
   * Process multiple images and find the best quality muzzle
   */
  static async findBestMuzzleImage(imageUris: string[]): Promise<{
    bestImage: MuzzleImageAnalysis | null;
    allAnalysis: MuzzleImageAnalysis[];
    summary: {
      totalImages: number;
      successfulDetections: number;
      highQualityCount: number;
      mediumQualityCount: number;
      lowQualityCount: number;
    };
  }> {
    console.log(`🚀 Starting batch analysis of ${imageUris.length} muzzle images...`);
    
    const allAnalysis: MuzzleImageAnalysis[] = [];
    
    // Process each image
    for (let i = 0; i < imageUris.length; i++) {
      const analysis = await this.analyzeImage(imageUris[i], i);
      allAnalysis.push(analysis);
    }

    // Find successful detections
    const successfulDetections = allAnalysis.filter(analysis => analysis.detection.success);
    
    // Count quality levels
    const highQualityCount = successfulDetections.filter(a => a.detection.quality === 'high').length;
    const mediumQualityCount = successfulDetections.filter(a => a.detection.quality === 'medium').length;
    const lowQualityCount = successfulDetections.filter(a => a.detection.quality === 'low').length;

    // Find the best image (highest confidence)
    let bestImage: MuzzleImageAnalysis | null = null;
    if (successfulDetections.length > 0) {
      bestImage = successfulDetections.reduce((best, current) => 
        current.detection.confidence > best.detection.confidence ? current : best
      );
    }

    const summary = {
      totalImages: imageUris.length,
      successfulDetections: successfulDetections.length,
      highQualityCount,
      mediumQualityCount,
      lowQualityCount,
    };

    console.log('📋 Analysis Summary:', summary);
    if (bestImage) {
      console.log(`🏆 Best image: #${bestImage.imageIndex + 1} with ${(bestImage.detection.confidence * 100).toFixed(1)}% confidence`);
    } else {
      console.log('❌ No suitable muzzle images found');
    }

    return {
      bestImage,
      allAnalysis,
      summary,
    };
  }
}

export default MuzzleDetectionService;