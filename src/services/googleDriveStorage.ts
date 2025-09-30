// Google Drive API Service for Cross-Device Audio Sync
// This is a complete implementation using Google Drive API

import { AudioFile } from './audioStorage';

// Extend Window interface to include gapi
declare global {
  interface Window {
    gapi: any;
  }
}

export interface GoogleDriveAudioFile extends AudioFile {
  userId: string;
  uploadedAt: string;
  deviceId: string;
  driveFileId: string;
  driveUrl: string;
}

export interface GoogleDriveStorageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class GoogleDriveStorageService {
  private static instance: GoogleDriveStorageService;
  private gapi: any = null;
  private initialized = false;
  private readonly CLIENT_ID = '679494238214-lnnselboo16bsogbtmrp3bl52r6gikeu.apps.googleusercontent.com';
  private readonly API_KEY = 'AIzaSyBVeNrc3QeryTV8npFerdD0P9tRbxpCNpc';
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';

  private constructor() {
    this.initializeGoogleDrive();
  }

  static getInstance(): GoogleDriveStorageService {
    if (!GoogleDriveStorageService.instance) {
      GoogleDriveStorageService.instance = new GoogleDriveStorageService();
    }
    return GoogleDriveStorageService.instance;
  }

  // Initialize Google Drive API
  private async initializeGoogleDrive(): Promise<void> {
    try {
      // Load Google API script
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      // Initialize gapi
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize client
      await window.gapi.client.init({
        apiKey: this.API_KEY,
        clientId: this.CLIENT_ID,
        discoveryDocs: [this.DISCOVERY_DOC],
        scope: this.SCOPES
      });

      this.gapi = window.gapi;
      this.initialized = true;

      console.log('✅ Google Drive API initialized successfully');
    } catch (error) {
      console.error('❌ Google Drive initialization error:', error);
      this.initialized = false;
    }
  }

  // Load Google API script
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  // Check if Google Drive is ready
  private isReady(): boolean {
    return this.initialized && this.gapi;
  }

  // Authenticate user
  async authenticate(): Promise<boolean> {
    if (!this.isReady()) {
      console.error('❌ Google Drive not initialized');
      return false;
    }

    try {
      const authInstance = await this.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      
      console.log('✅ Google Drive authentication successful:', user.getBasicProfile().getName());
      return true;
    } catch (error) {
      console.error('❌ Google Drive authentication error:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      const authInstance = await this.gapi.auth2.getAuthInstance();
      return authInstance.isSignedIn.get();
    } catch (error) {
      console.error('❌ Authentication check error:', error);
      return false;
    }
  }

  // Create folder for user's audio files
  async createUserFolder(userId: string): Promise<string | null> {
    if (!this.isReady()) return null;

    try {
      const folderName = `Gauner-Audio-${userId}`;
      
      // Check if folder already exists
      const existingFolder = await this.findFolder(folderName);
      if (existingFolder) {
        return existingFolder.id;
      }

      // Create new folder
      const response = await this.gapi.client.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      console.log('✅ Created user folder:', folderName);
      return response.result.id;
    } catch (error) {
      console.error('❌ Error creating user folder:', error);
      return null;
    }
  }

  // Find folder by name
  private async findFolder(folderName: string): Promise<any> {
    try {
      const response = await this.gapi.client.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      return response.result.files.length > 0 ? response.result.files[0] : null;
    } catch (error) {
      console.error('❌ Error finding folder:', error);
      return null;
    }
  }

  // Save audio file to Google Drive
  async saveAudioFile(userId: string, audioFile: AudioFile): Promise<GoogleDriveStorageResponse> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Google Drive not initialized. Please check your configuration.'
      };
    }

    // Check authentication
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to Google Drive.'
        };
      }
    }

    try {
      // Create user folder
      const folderId = await this.createUserFolder(userId);
      if (!folderId) {
        return {
          success: false,
          error: 'Failed to create user folder'
        };
      }

      // Convert blob to base64
      const base64Data = await this.blobToBase64(audioFile.blob);

      // Upload file to Google Drive
      const response = await this.gapi.client.drive.files.create({
        resource: {
          name: audioFile.filename,
          parents: [folderId]
        },
        media: {
          mimeType: 'audio/wav',
          body: base64Data
        }
      });

      const driveFileId = response.result.id;
      const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

      const googleDriveAudioFile: GoogleDriveAudioFile = {
        ...audioFile,
        userId,
        uploadedAt: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        driveFileId,
        driveUrl
      };

      // Save metadata to localStorage (since we don't have a database)
      this.saveFileMetadata(googleDriveAudioFile);

      console.log('✅ Audio file saved to Google Drive:', {
        userId,
        fileName: audioFile.filename,
        driveFileId,
        driveUrl
      });

      return { success: true, data: googleDriveAudioFile };
    } catch (error) {
      console.error('❌ Google Drive upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get audio files from Google Drive
  async getAudioFiles(userId: string): Promise<GoogleDriveAudioFile[]> {
    if (!this.isReady()) {
      console.error('❌ Google Drive not initialized');
      return [];
    }

    try {
      // Get files from localStorage metadata
      const metadata = this.getFileMetadata(userId);
      
      // Verify files still exist in Google Drive
      const verifiedFiles: GoogleDriveAudioFile[] = [];
      
      for (const file of metadata) {
        try {
          const response = await this.gapi.client.drive.files.get({
            fileId: file.driveFileId,
            fields: 'id, name, size, modifiedTime'
          });
          
          if (response.result.id) {
            verifiedFiles.push(file);
          }
        } catch (error) {
          console.warn('⚠️ File not found in Google Drive, removing from metadata:', file.filename);
          this.removeFileMetadata(file.id);
        }
      }

      console.log('📥 Retrieved audio files from Google Drive:', verifiedFiles.length);
      return verifiedFiles;
    } catch (error) {
      console.error('❌ Google Drive retrieval error:', error);
      return [];
    }
  }

  // Delete audio file from Google Drive
  async deleteAudioFile(userId: string, fileId: string): Promise<GoogleDriveStorageResponse> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Google Drive not initialized'
      };
    }

    try {
      // Get file metadata
      const metadata = this.getFileMetadata(userId);
      const file = metadata.find(f => f.id === fileId);
      
      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Delete from Google Drive
      await this.gapi.client.drive.files.delete({
        fileId: file.driveFileId
      });

      // Remove from metadata
      this.removeFileMetadata(fileId);

      console.log('🗑️ Audio file deleted from Google Drive:', fileId);
      return { success: true };
    } catch (error) {
      console.error('❌ Google Drive deletion error:', error);
      return {
        success: false,
        error: `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Save file metadata to localStorage
  private saveFileMetadata(file: GoogleDriveAudioFile): void {
    const key = `gauner_drive_metadata_${file.userId}`;
    const existing = this.getFileMetadata(file.userId);
    existing.push(file);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  // Get file metadata from localStorage
  private getFileMetadata(userId: string): GoogleDriveAudioFile[] {
    const key = `gauner_drive_metadata_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Remove file metadata from localStorage
  private removeFileMetadata(fileId: string): void {
    // This is a simplified version - in practice you'd need to know the userId
    // For now, we'll iterate through all stored metadata
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gauner_drive_metadata_')) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = data.filter((file: GoogleDriveAudioFile) => file.id !== fileId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  }

  // Get device ID
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('gauner_device_id');
    if (!deviceId) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'mobile' : 'desktop';
      deviceId = `${deviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('gauner_device_id', deviceId);
    }
    return deviceId;
  }

  // Get storage usage stats
  async getStorageStats(userId: string): Promise<{ count: number; totalSize: number }> {
    const files = await this.getAudioFiles(userId);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      count: files.length,
      totalSize
    };
  }
}

export default GoogleDriveStorageService;
