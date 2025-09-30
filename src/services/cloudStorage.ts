import { AudioFile } from '../types';

interface CloudAudioFile extends AudioFile {
  userId: string;
  uploadedAt: string;
  deviceId: string;
}

interface CloudStorageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class CloudStorageService {
  private static instance: CloudStorageService;
  private readonly CLOUD_STORAGE_KEY = 'gauner_cloud_audio';
  private readonly USER_DEVICE_ID = 'gauner_device_id';

  private constructor() {
    this.initializeDeviceId();
  }

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  // Generate or retrieve device ID
  private initializeDeviceId(): void {
    let deviceId = localStorage.getItem(this.USER_DEVICE_ID);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.USER_DEVICE_ID, deviceId);
    }
  }

  // Get device ID
  getDeviceId(): string {
    return localStorage.getItem(this.USER_DEVICE_ID) || 'unknown';
  }

  // Save audio file to cloud storage (localStorage for now, can be extended to real cloud)
  async saveAudioFile(userId: string, audioFile: AudioFile): Promise<CloudStorageResponse> {
    try {
      const cloudAudioFile: CloudAudioFile = {
        ...audioFile,
        userId,
        uploadedAt: new Date().toISOString(),
        deviceId: this.getDeviceId()
      };

      // Get existing cloud files
      const existingFiles = this.getCloudAudioFiles(userId);
      
      // Add new file
      existingFiles.push(cloudAudioFile);
      
      // Save to localStorage (simulating cloud storage)
      localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(existingFiles));
      
      console.log('✅ Audio file saved to cloud storage:', {
        userId,
        fileName: audioFile.name,
        deviceId: this.getDeviceId(),
        totalFiles: existingFiles.length
      });

      return { success: true, data: cloudAudioFile };
    } catch (error) {
      console.error('❌ Error saving audio file to cloud:', error);
      return { success: false, error: 'Failed to save audio file to cloud storage' };
    }
  }

  // Get all cloud audio files for a user
  getCloudAudioFiles(userId: string): CloudAudioFile[] {
    try {
      const cloudData = localStorage.getItem(`${this.CLOUD_STORAGE_KEY}_${userId}`);
      if (!cloudData) return [];
      
      const files: CloudAudioFile[] = JSON.parse(cloudData);
      
      // Filter out expired files (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const validFiles = files.filter(file => {
        const uploadedDate = new Date(file.uploadedAt);
        return uploadedDate > thirtyDaysAgo;
      });
      
      // Update storage if files were filtered
      if (validFiles.length !== files.length) {
        localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(validFiles));
      }
      
      return validFiles;
    } catch (error) {
      console.error('Error getting cloud audio files:', error);
      return [];
    }
  }

  // Delete audio file from cloud storage
  async deleteAudioFile(userId: string, fileId: string): Promise<CloudStorageResponse> {
    try {
      const files = this.getCloudAudioFiles(userId);
      const filteredFiles = files.filter(file => file.id !== fileId);
      
      localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(filteredFiles));
      
      console.log('✅ Audio file deleted from cloud storage:', {
        userId,
        fileId,
        remainingFiles: filteredFiles.length
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting audio file from cloud:', error);
      return { success: false, error: 'Failed to delete audio file from cloud storage' };
    }
  }

  // Get cloud storage stats
  getCloudStorageStats(userId: string): { count: number; totalSize: number; devices: string[] } {
    const files = this.getCloudAudioFiles(userId);
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const devices = [...new Set(files.map(file => file.deviceId))];
    
    return {
      count: files.length,
      totalSize,
      devices
    };
  }

  // Sync audio files between devices (simulate cloud sync)
  async syncAudioFiles(userId: string): Promise<CloudStorageResponse> {
    try {
      const files = this.getCloudAudioFiles(userId);
      const currentDeviceId = this.getDeviceId();
      
      // Get files from other devices
      const otherDeviceFiles = files.filter(file => file.deviceId !== currentDeviceId);
      
      console.log('🔄 Syncing audio files:', {
        userId,
        currentDevice: currentDeviceId,
        totalFiles: files.length,
        otherDeviceFiles: otherDeviceFiles.length
      });

      return { 
        success: true, 
        data: { 
          files, 
          currentDevice: currentDeviceId,
          otherDevices: otherDeviceFiles.length 
        } 
      };
    } catch (error) {
      console.error('❌ Error syncing audio files:', error);
      return { success: false, error: 'Failed to sync audio files' };
    }
  }

  // Export audio files for backup
  exportAudioFiles(userId: string): string {
    const files = this.getCloudAudioFiles(userId);
    return JSON.stringify(files, null, 2);
  }

  // Import audio files from backup
  async importAudioFiles(userId: string, backupData: string): Promise<CloudStorageResponse> {
    try {
      const importedFiles: CloudAudioFile[] = JSON.parse(backupData);
      const existingFiles = this.getCloudAudioFiles(userId);
      
      // Merge files, avoiding duplicates
      const mergedFiles = [...existingFiles];
      importedFiles.forEach(importedFile => {
        if (!mergedFiles.find(existing => existing.id === importedFile.id)) {
          mergedFiles.push(importedFile);
        }
      });
      
      localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(mergedFiles));
      
      console.log('✅ Audio files imported:', {
        userId,
        imported: importedFiles.length,
        total: mergedFiles.length
      });

      return { success: true, data: { imported: importedFiles.length, total: mergedFiles.length } };
    } catch (error) {
      console.error('❌ Error importing audio files:', error);
      return { success: false, error: 'Failed to import audio files' };
    }
  }

  // Clear all cloud storage for a user
  async clearCloudStorage(userId: string): Promise<CloudStorageResponse> {
    try {
      localStorage.removeItem(`${this.CLOUD_STORAGE_KEY}_${userId}`);
      
      console.log('✅ Cloud storage cleared for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing cloud storage:', error);
      return { success: false, error: 'Failed to clear cloud storage' };
    }
  }
}

export default CloudStorageService;
export type { CloudAudioFile, CloudStorageResponse };
