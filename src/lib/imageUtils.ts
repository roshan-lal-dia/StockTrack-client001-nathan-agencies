/**
 * Image utilities using Cloudinary for cloud storage
 * 
 * Cloudinary Free Tier (Spark equivalent):
 * - 25GB storage
 * - 25GB bandwidth/month
 * - Automatic optimization & CDN
 * 
 * We store only URLs in Firestore (tiny strings), images in Cloudinary
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string; // Unsigned upload preset for frontend uploads
}

export interface UploadedImage {
  url: string;           // Full-size URL
  thumbnailUrl: string;  // Auto-generated thumbnail URL
  publicId: string;      // Cloudinary public ID for deletion
  originalName: string;
  size: number;
}

// Get Cloudinary config from environment
export const getCloudinaryConfig = (): CloudinaryConfig | null => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    return null;
  }
  
  return { cloudName, uploadPreset };
};

/**
 * Upload image to Cloudinary
 * Returns URLs to store in Firestore
 */
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'stocktrack'
): Promise<UploadedImage> => {
  const config = getCloudinaryConfig();
  
  if (!config) {
    throw new Error('Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', config.uploadPreset);
  formData.append('folder', folder);
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }
  
  const data = await response.json();
  
  return {
    url: data.secure_url,
    thumbnailUrl: getCloudinaryThumbnail(data.secure_url, 150),
    publicId: data.public_id,
    originalName: file.name,
    size: data.bytes,
  };
};

/**
 * Generate Cloudinary thumbnail URL with transformations
 * This is FREE - just URL manipulation, no extra API calls
 */
export const getCloudinaryThumbnail = (url: string, size: number = 150): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // Insert transformation before /upload/
  return url.replace(
    '/upload/',
    `/upload/c_fill,w_${size},h_${size},f_auto,q_auto/`
  );
};

/**
 * Get optimized image URL (auto format & quality)
 */
export const getOptimizedUrl = (url: string, maxWidth: number = 800): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  return url.replace(
    '/upload/',
    `/upload/c_limit,w_${maxWidth},f_auto,q_auto/`
  );
};

/**
 * Validate file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB max
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }
  
  return { valid: true };
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = (): boolean => {
  return getCloudinaryConfig() !== null;
};

/**
 * Get placeholder image for items without photos
 */
export const getPlaceholderImage = (): string => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNFMkU4RjAiLz48cGF0aCBkPSJNNTkgNzVDNTkgNjYuNzE1NyA2NS43MTU3IDYwIDc0IDYwQzgyLjI4NDMgNjAgODkgNjYuNzE1NyA4OSA3NUM4OSA4My4yODQzIDgyLjI4NDMgOTAgNzQgOTBDNjUuNzE1NyA5MCA1OSA4My4yODQzIDU5IDc1WiIgZmlsbD0iI0NCRDVFMSIvPjwvc3ZnPg==';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
