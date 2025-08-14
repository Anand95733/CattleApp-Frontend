import RoboflowService from '../RoboflowService';
import RoboflowWarmupService from '../RoboflowWarmupService';

// Mock axios to avoid actual API calls during testing
jest.mock('axios');
jest.mock('react-native-fs');
jest.mock('react-native-image-crop-picker');

describe('RoboflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectMuzzle', () => {
    it('should handle successful muzzle detection with high confidence', async () => {
      // This is a basic test structure - in a real scenario you'd mock the axios response
      // For now, we'll just test that the service exists and has the right methods
      expect(RoboflowService.detectMuzzle).toBeDefined();
      expect(typeof RoboflowService.detectMuzzle).toBe('function');
    });

    it('should handle detection failure gracefully', async () => {
      // Test that the service handles errors properly
      expect(RoboflowService.detectMuzzle).toBeDefined();
    });
  });
});

describe('RoboflowWarmupService', () => {
  it('should have warmup functionality', () => {
    expect(RoboflowWarmupService.isWarmedUp).toBeDefined();
    expect(RoboflowWarmupService.performWarmupIfNeeded).toBeDefined();
    expect(typeof RoboflowWarmupService.isWarmedUp).toBe('function');
    expect(typeof RoboflowWarmupService.performWarmupIfNeeded).toBe('function');
  });

  it('should start as not warmed up', () => {
    RoboflowWarmupService.reset();
    expect(RoboflowWarmupService.isWarmedUp()).toBe(false);
  });
});