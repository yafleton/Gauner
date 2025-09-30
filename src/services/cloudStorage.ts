import { AudioFile } from './audioStorage';

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
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private syncTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDeviceId();
    this.startSyncTimer();
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
      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'mobile' : 'desktop';
      deviceId = `${deviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.USER_DEVICE_ID, deviceId);
    }
  }

  // Start sync timer for cross-device updates
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, this.SYNC_INTERVAL);
  }

  // Background sync to check for updates
  private async performBackgroundSync(): Promise<void> {
    try {
      // Check for cross-device updates using localStorage events
      // This is a simple approach - in production you'd use a real cloud service
      console.log('🔄 Background sync check...');
      
      // Listen for storage events (when localStorage changes in other tabs/devices)
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('gauner_cloud_audio_')) {
          console.log('📱 Cross-device update detected:', e.key);
          // Trigger a refresh of cloud files
          this.triggerCloudUpdate();
        }
      });
    } catch (error) {
      console.error('❌ Background sync error:', error);
    }
  }

  // Trigger cloud update notification
  private triggerCloudUpdate(): void {
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('cloudStorageUpdate', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Get device ID
  getDeviceId(): string {
    return localStorage.getItem(this.USER_DEVICE_ID) || 'unknown';
  }

  // Save audio file to cloud storage with cross-device sync
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
      
      // Save to localStorage with timestamp for sync
      const syncData = {
        files: existingFiles,
        lastUpdated: Date.now(),
        deviceId: this.getDeviceId()
      };
      
      localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(syncData));
      
      // Also save to a global sync key for cross-device access
      this.updateGlobalSync(userId, syncData);
      
      console.log('✅ Audio file saved to cloud storage:', {
        userId,
        fileName: audioFile.filename,
        deviceId: this.getDeviceId(),
        totalFiles: existingFiles.length
      });

      return { success: true, data: cloudAudioFile };
    } catch (error) {
      console.error('❌ Error saving audio file to cloud:', error);
      return { success: false, error: 'Failed to save audio file to cloud storage' };
    }
  }

  // Update global sync data for cross-device access
  private updateGlobalSync(userId: string, syncData: any): void {
    try {
      const globalKey = `gauner_global_sync_${userId}`;
      const existingGlobal = localStorage.getItem(globalKey);
      let globalData = existingGlobal ? JSON.parse(existingGlobal) : { devices: [], lastSync: 0 };
      
      // Update device info
      const deviceIndex = globalData.devices.findIndex((d: any) => d.deviceId === this.getDeviceId());
      if (deviceIndex >= 0) {
        globalData.devices[deviceIndex] = {
          deviceId: this.getDeviceId(),
          lastUpdate: Date.now(),
          fileCount: syncData.files.length
        };
      } else {
        globalData.devices.push({
          deviceId: this.getDeviceId(),
          lastUpdate: Date.now(),
          fileCount: syncData.files.length
        });
      }
      
      globalData.lastSync = Date.now();
      localStorage.setItem(globalKey, JSON.stringify(globalData));
    } catch (error) {
      console.error('❌ Error updating global sync:', error);
    }
  }

  // Get all cloud audio files for a user
  getCloudAudioFiles(userId: string): CloudAudioFile[] {
    try {
      const cloudData = localStorage.getItem(`${this.CLOUD_STORAGE_KEY}_${userId}`);
      if (!cloudData) return [];
      
      const syncData = JSON.parse(cloudData);
      const files: CloudAudioFile[] = syncData.files || syncData; // Handle both old and new format
      
      // Filter out expired files (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const validFiles = files.filter(file => {
        const uploadedDate = new Date(file.uploadedAt);
        return uploadedDate > thirtyDaysAgo;
      });
      
      // Update storage if files were filtered
      if (validFiles.length !== files.length) {
        const updatedSyncData = {
          files: validFiles,
          lastUpdated: Date.now(),
          deviceId: this.getDeviceId()
        };
        localStorage.setItem(`${this.CLOUD_STORAGE_KEY}_${userId}`, JSON.stringify(updatedSyncData));
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
      
      // Check for global sync data
      const globalKey = `gauner_global_sync_${userId}`;
      const globalData = localStorage.getItem(globalKey);
      const globalSync = globalData ? JSON.parse(globalData) : { devices: [], lastSync: 0 };
      
      console.log('🔄 Syncing audio files:', {
        userId,
        currentDevice: currentDeviceId,
        totalFiles: files.length,
        otherDeviceFiles: otherDeviceFiles.length,
        connectedDevices: globalSync.devices.length
      });

      return { 
        success: true, 
        data: { 
          files, 
          currentDevice: currentDeviceId,
          otherDevices: otherDeviceFiles.length,
          connectedDevices: globalSync.devices
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
