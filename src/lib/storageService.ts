import { supabase } from './supabase';

export interface UploadProgress {
  percentage: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  filename: string;
  sizeBytes: number;
  bucket: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Derives bucket name from file purpose or path
 */
export function determineBucket(pathOrType: string): 'apps' | 'app-icons' | 'screenshots' {
  if (pathOrType.startsWith('app-icons') || pathOrType.includes('icon')) {
    return 'app-icons';
  }
  if (pathOrType.startsWith('screenshots') || pathOrType.includes('screenshot')) {
    return 'screenshots';
  }
  return 'apps';
}

/**
 * Uploads a file (APK, ZIP, JAR, Mod, image, icon, screenshot) to Supabase Storage.
 * Generates public download URL from the bucket.
 */
export function uploadToSupabaseStorage(
  file: File,
  storagePath: string,
  onProgress?: ProgressCallback,
  targetBucket?: 'apps' | 'app-icons' | 'screenshots'
): { promise: Promise<UploadResult>; cancel: () => void } {
  let isCancelled = false;

  const bucket = targetBucket || determineBucket(storagePath);
  // Ensure storagePath does not contain bucket prefix
  const cleanPath = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(`${bucket}/`.length)
    : storagePath;

  const promise = new Promise<UploadResult>(async (resolve, reject) => {
    try {
      if (onProgress) {
        onProgress({
          percentage: 15,
          bytesTransferred: Math.round(file.size * 0.15),
          totalBytes: file.size,
          state: 'running',
        });
      }

      if (isCancelled) {
        throw new Error('Upload cancelled');
      }

      // Upload to Supabase Storage with contentType
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(cleanPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) {
        if (onProgress) {
          onProgress({
            percentage: 0,
            bytesTransferred: 0,
            totalBytes: file.size,
            state: 'error',
          });
        }
        return reject(error);
      }

      if (onProgress) {
        onProgress({
          percentage: 85,
          bytesTransferred: Math.round(file.size * 0.85),
          totalBytes: file.size,
          state: 'running',
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(cleanPath);

      const downloadUrl = urlData.publicUrl;

      if (onProgress) {
        onProgress({
          percentage: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          state: 'success',
        });
      }

      resolve({
        downloadUrl,
        storagePath: `${bucket}/${cleanPath}`,
        filename: file.name,
        sizeBytes: file.size,
        bucket,
      });
    } catch (err) {
      if (onProgress) {
        onProgress({
          percentage: 0,
          bytesTransferred: 0,
          totalBytes: file.size,
          state: isCancelled ? 'canceled' : 'error',
        });
      }
      reject(err);
    }
  });

  return {
    promise,
    cancel: () => {
      isCancelled = true;
    },
  };
}

/**
 * Backward compatibility alias for uploadToSupabaseStorage
 */
export const uploadToFirebaseStorage = uploadToSupabaseStorage;

/**
 * Safely removes a file from Supabase Storage by its full storage path.
 */
export async function deleteFromSupabaseStorage(
  storagePath: string,
  targetBucket?: 'apps' | 'app-icons' | 'screenshots'
): Promise<boolean> {
  if (!storagePath) return false;

  const bucket = targetBucket || determineBucket(storagePath);
  const cleanPath = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(`${bucket}/`.length)
    : storagePath;

  try {
    const { error } = await supabase.storage.from(bucket).remove([cleanPath]);
    if (error) {
      console.warn('Failed deleting Supabase storage object:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting Supabase storage object:', err);
    return false;
  }
}

/**
 * Backward compatibility alias for deleteFromSupabaseStorage
 */
export const deleteFromFirebaseStorage = deleteFromSupabaseStorage;
