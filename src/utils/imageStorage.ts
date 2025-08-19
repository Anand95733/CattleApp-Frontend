import RNFS from 'react-native-fs';

// Create a directory for storing beneficiary images
const IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/beneficiary_images`;

// Ensure the images directory exists
export const ensureImagesDirectory = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(IMAGES_DIR);
    if (!exists) {
      await RNFS.mkdir(IMAGES_DIR);
      console.log('📁 Created images directory:', IMAGES_DIR);
    }
  } catch (error) {
    console.error('❌ Failed to create images directory:', error);
    throw error;
  }
};

// Save an image locally and return the local path
export const saveImageLocally = async (imageUri: string, beneficiaryId: string): Promise<string> => {
  try {
    await ensureImagesDirectory();
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `beneficiary_${beneficiaryId}_${timestamp}.jpg`;
    const localPath = `${IMAGES_DIR}/${filename}`;
    
    // Copy the image from the temporary location to our permanent storage
    await RNFS.copyFile(imageUri, localPath);
    
    console.log('💾 Image saved locally:', localPath);
    return localPath;
  } catch (error) {
    console.error('❌ Failed to save image locally:', error);
    throw error;
  }
};

// Check if a local image exists
export const imageExists = async (localPath: string): Promise<boolean> => {
  try {
    return await RNFS.exists(localPath);
  } catch (error) {
    console.error('❌ Failed to check image existence:', error);
    return false;
  }
};

// Delete a local image
export const deleteLocalImage = async (localPath: string): Promise<void> => {
  try {
    const exists = await RNFS.exists(localPath);
    if (exists) {
      await RNFS.unlink(localPath);
      console.log('🗑️ Deleted local image:', localPath);
    }
  } catch (error) {
    console.error('❌ Failed to delete local image:', error);
  }
};

// Get the file:// URI for displaying the image
export const getLocalImageUri = (localPath: string): string => {
  return `file://${localPath}`;
};

// ========================= Cattle Images (Offline) =========================
// Directory for storing cattle images
const CATTLE_IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/cattle_images`;

// Ensure the cattle images directory exists
export const ensureCattleImagesDirectory = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(CATTLE_IMAGES_DIR);
    if (!exists) {
      await RNFS.mkdir(CATTLE_IMAGES_DIR);
      console.log('📁 Created cattle images directory:', CATTLE_IMAGES_DIR);
    }
  } catch (error) {
    console.error('❌ Failed to create cattle images directory:', error);
    throw error;
  }
};

// Save a cattle image locally and return the absolute local file path (no file:// prefix)
export const saveCattleImageLocally = async (
  imageUri: string,
  beneficiaryId: string,
  kind: 'muzzle1' | 'muzzle2' | 'muzzle3' | 'front' | 'left' | 'right'
): Promise<string> => {
  try {
    await ensureCattleImagesDirectory();
    const timestamp = Date.now();
    const filename = `cattle_${beneficiaryId}_${kind}_${timestamp}.jpg`;
    const localPath = `${CATTLE_IMAGES_DIR}/${filename}`;

    // Normalize source: RNFS.copyFile expects a filesystem path, not file:// URI
    const sourcePath = imageUri.startsWith('file://') ? imageUri.replace(/^file:\/\//, '') : imageUri;

    await RNFS.copyFile(sourcePath, localPath);
    console.log('💾 Cattle image saved locally:', localPath);
    return localPath;
  } catch (error) {
    // Fallback: if copy fails (e.g., content URI or permission issues), keep original path
    console.error('❌ Failed to save cattle image locally, falling back to original path:', { imageUri, error });
    const fallbackPath = imageUri.startsWith('file://') ? imageUri.replace(/^file:\/\//, '') : imageUri;
    return fallbackPath;
  }
};