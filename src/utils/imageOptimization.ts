/**
 * Image optimization utilities for event uploads
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
  outputFormat?: 'jpeg' | 'webp' | 'png';
}

export interface OptimizedImageResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

/**
 * Optimize an image file before upload
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    maxSizeMB = 3,
    outputFormat = 'webp'
  } = options;

  // Validate input
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const originalSize = file.size;
  
  // Create canvas for processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load image
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  // Calculate new dimensions
  let { width, height } = calculateDimensions(
    img.width,
    img.height,
    maxWidth,
    maxHeight
  );

  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Draw and compress image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to desired format
  const mimeType = outputFormat === 'webp' ? 'image/webp' : 
                   outputFormat === 'png' ? 'image/png' : 'image/jpeg';
  
  // Get compressed data
  const compressedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to compress image'));
        }
      },
      mimeType,
      quality
    );
  });

  // Check if optimized size is still too large
  if (compressedBlob.size > maxSizeMB * 1024 * 1024) {
    // Try again with lower quality
    const lowerQualityBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        mimeType,
        Math.max(0.5, quality - 0.2)
      );
    });

    if (lowerQualityBlob.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`Image is too large even after compression. Max size: ${maxSizeMB}MB`);
    }

    // Create optimized file
    const optimizedFile = new File(
      [lowerQualityBlob],
      `${file.name.split('.')[0]}.${outputFormat}`,
      { type: mimeType }
    );

    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: lowerQualityBlob.size,
      compressionRatio: (originalSize - lowerQualityBlob.size) / originalSize,
      dimensions: { width, height }
    };
  }

  // Create optimized file
  const optimizedFile = new File(
    [compressedBlob],
    `${file.name.split('.')[0]}.${outputFormat}`,
    { type: mimeType }
  );

  return {
    file: optimizedFile,
    originalSize,
    optimizedSize: compressedBlob.size,
    compressionRatio: (originalSize - compressedBlob.size) / originalSize,
    dimensions: { width, height }
  };
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Resize if too wide
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Resize if too tall
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  // Ensure minimum dimensions
  width = Math.max(width, 100);
  height = Math.max(height, 100);

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid image format. Please upload JPG, PNG, or WEBP files only.'
    };
  }

  // Check file size (10MB max before optimization)
  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'Image is too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
