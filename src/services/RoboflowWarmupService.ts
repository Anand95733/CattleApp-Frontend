import axios from 'axios';

// Roboflow configuration
const ROBOFLOW_CONFIG = {
  API_KEY: 'lqrt0B12SJTeNBvW9kAM',
  MODEL_ID: 'car-33z0o',
  MODEL_VERSION: '1',
  BASE_URL: 'https://detect.roboflow.com',
  TIMEOUT: 10000,
};

class RoboflowWarmupService {
  private warmedUp: boolean = false;
  private warmupInProgress: boolean = false;

  /**
   * Check if the service has been warmed up
   */
  isWarmedUp(): boolean {
    return this.warmedUp;
  }

  /**
   * Perform warmup request to keep Roboflow servers active
   */
  async performWarmup(): Promise<void> {
    if (this.warmedUp || this.warmupInProgress) {
      return;
    }

    this.warmupInProgress = true;

    try {
      // Create a small dummy base64 image (1x1 pixel transparent PNG)
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      const response = await axios({
        method: 'POST',
        url: `${ROBOFLOW_CONFIG.BASE_URL}/${ROBOFLOW_CONFIG.MODEL_ID}/${ROBOFLOW_CONFIG.MODEL_VERSION}`,
        params: {
          api_key: ROBOFLOW_CONFIG.API_KEY,
        },
        data: dummyBase64,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: ROBOFLOW_CONFIG.TIMEOUT,
      });

      console.log('Roboflow warmup successful');
      this.warmedUp = true;
    } catch (error) {
      console.warn('Roboflow warmup failed:', error.message);
      // Don't throw error for warmup failure - it's not critical
    } finally {
      this.warmupInProgress = false;
    }
  }

  /**
   * Perform warmup if needed
   */
  async performWarmupIfNeeded(): Promise<void> {
    if (!this.isWarmedUp()) {
      await this.performWarmup();
    }
  }

  /**
   * Reset warmup status (useful for testing or manual reset)
   */
  reset(): void {
    this.warmedUp = false;
    this.warmupInProgress = false;
  }
}

export default new RoboflowWarmupService();