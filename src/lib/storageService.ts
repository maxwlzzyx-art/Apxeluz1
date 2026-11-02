import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { storage } from './firebase';

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
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Uploads any repository attachment (APK, ZIP, JAR, Mod, Images) to Firebase Cloud Storage.
 * Supports real-time progress callbacks and cancellation.
 */
export function uploadToFirebaseStorage(
  file: File,
  storagePath: string,
  onProgress?: ProgressCallback
): { promise: Promise<UploadResult>; cancel: () => void; task: UploadTask } {
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  const promise = new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        if (onProgress) {
          onProgress({
            percentage: pct,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state as any,
          });
        }
      },
      (error) => {
        if (onProgress) {
          onProgress({
            percentage: 0,
            bytesTransferred: 0,
            totalBytes: file.size,
            state: 'error',
          });
        }
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
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
            storagePath,
            filename: file.name,
            sizeBytes: file.size,
          });
        } catch (urlErr) {
          reject(urlErr);
        }
      }
    );
  });

  return {
    promise,
    cancel: () => uploadTask.cancel(),
    task: uploadTask,
  };
}

/**
 * Safely removes a file from Firebase Cloud Storage by its full storage path.
 */
export async function deleteFromFirebaseStorage(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return true;
  } catch (err: any) {
    if (err?.code === 'storage/object-not-found') {
      return true;
    }
    console.warn('Failed deleting storage object:', err);
    return false;
  }
}
