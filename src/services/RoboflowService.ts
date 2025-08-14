import axios from 'axios';
import RNFS from 'react-native-fs';
import ImagePicker from 'react-native-image-crop-picker';

// Roboflow configuration
const ROBOFLOW_CONFIG = {
  API_KEY: 'lqrt0B12SJTeNBvW9kAM',
  MODEL_ID: 'car-33z0o',
  MODEL_VERSION: '1',
  BASE_URL: 'https://detect.roboflow.com',
  TIMEOUT: 25000,
};

export interface MuzzlePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface RoboflowResponse {
  predictions: MuzzlePrediction[];
  image: {
    width: number;
    height: number;
  };
}

export interface MuzzleDetectionResult {
  success: boolean;
  confidence?: number;
  quality: 'high' | 'medium' | 'low' | 'none';
  prediction?: MuzzlePrediction;
  error?: string;
}

class RoboflowService {
  private getDetectionUrl(): string {
    return `${ROBOFLOW_CONFIG.BASE_URL}/${ROBOFLOW_CONFIG.MODEL_ID}/${ROBOFLOW_CONFIG.MODEL_VERSION}`;
  }

  /**
   * Check file size and compress if needed
   */
  private async compressImageIfNeeded(imageUri: string): Promise<string> {
    try {
      // Check file size
      const fileInfo = await RNFS.stat(imageUri);
      const fileSizeInMB = fileInfo.size / (1024 * 1024);
      
      console.log(`Original image size: ${fileSizeInMB.toFixed(2)} MB`);
      
      // If file is larger than 2MB, compress it
      if (fileSizeInMB > 2) {
        console.log('Compressing large image...');
        
        // Determine compression settings based on file size
        let quality = 0.8;
        let maxWidth = 1024;
        let maxHeight = 1024;
        
        if (fileSizeInMB > 10) {
          quality = 0.5;
          maxWidth = 800;
          maxHeight = 800;
        } else if (fileSizeInMB > 5) {
          quality = 0.6;
          maxWidth = 900;
          maxHeight = 900;
        }
        
        const compressedImage = await ImagePicker.openCropper({
          path: imageUri,
          width: maxWidth,
          height: maxHeight,
          cropping: false,
          compressImageQuality: quality,
          mediaType: 'photo',
        });
        
        console.log('Image compressed successfully');
        return compressedImage.path;
      }
      
      return imageUri;
    } catch (error) {
      console.warn('Image compression failed, using original:', error.message);
      return imageUri;
    }
  }

  /**
   * Convert image to Base64
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // First compress the image if needed
      const processedImageUri = await this.compressImageIfNeeded(imageUri);
      
      // Read file as base64
      const base64String = await RNFS.readFile(processedImageUri, 'base64');
      
      console.log(`Base64 string length: ${base64String.length}`);
      return base64String;
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }

  /**
   * Detect muzzle in the provided image
   */
  async detectMuzzle(imageUri: string): Promise<MuzzleDetectionResult> {
    try {
      // Convert image to base64
      const imageBase64 = await this.convertImageToBase64(imageUri);

      // Make API request to Roboflow
      const response = await axios({
        method: 'POST',
        url: this.getDetectionUrl(),
        params: {
          api_key: ROBOFLOW_CONFIG.API_KEY,
        },
        data: imageBase64,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: ROBOFLOW_CONFIG.TIMEOUT,
      });

      const data: RoboflowResponse = response.data;

      // Find muzzle prediction
      const muzzlePrediction = data.predictions?.find(
        (pred: MuzzlePrediction) => pred.class === 'muzzle'
      );

      if (!muzzlePrediction) {
        return {
          success: false,
          quality: 'none',
          error: 'No muzzle detected in the image',
        };
      }

      // Determine quality based on confidence
      let quality: 'high' | 'medium' | 'low';
      if (muzzlePrediction.confidence >= 0.9) {
        quality = 'high';
      } else if (muzzlePrediction.confidence >= 0.7) {
        quality = 'medium';
      } else {
        quality = 'low';
      }

      return {
        success: true,
        confidence: muzzlePrediction.confidence,
        quality,
        prediction: muzzlePrediction,
      };
    } catch (error) {
      console.error('Roboflow detection error:', error);
      
      let errorMessage = 'Failed to detect muzzle';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout - please check your internet connection and try again';
      } else if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Authentication failed - invalid API key';
        } else if (status === 429) {
          errorMessage = 'Rate limit exceeded - please try again later';
        } else if (status >= 500) {
          errorMessage = 'Server error - please try again later';
        } else {
          errorMessage = `API error: ${status} - ${error.response.data?.message || 'Unknown error'}`;
        }
      } else if (error.request) {
        errorMessage = 'Network error - please check your internet connection';
      } else if (error.message?.includes('Failed to convert image')) {
        errorMessage = 'Image processing failed - please try with a different image';
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        quality: 'none',
        error: errorMessage,
      };
    }
  }
}

export default new RoboflowService();