// Google Drive API Service for Cross-Device Audio Sync
// This is a complete implementation using Google Drive API

import { AudioFile } from './audioStorage';

// Extend Window interface to include gapi and google
declare global {
  interface Window {
    gapi: any;
    google: any;
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
      console.log('🔄 Initializing Google Drive API...');
      
      // Load Google Identity Services
      console.log('📥 Loading Google Identity Services...');
      await this.loadGoogleIdentityServices();

      // Wait for google to be available
      let attempts = 0;
      while (!window.google && attempts < 30) {
        console.log(`⏳ Waiting for Google Identity Services... attempt ${attempts + 1}/30`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!window.google) {
        console.error('❌ Google Identity Services failed to load after 30 attempts');
        console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('google')));
        throw new Error('Google Identity Services failed to load after 30 attempts');
      }

      console.log('✅ Google Identity Services loaded:', !!window.google);
      this.initialized = true;
      console.log('✅ Google Drive API initialized successfully');
    } catch (error) {
      console.error('❌ Google Drive initialization error:', error);
      this.initialized = false;
    }
  }

  // Load Google Identity Services
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        console.log('📋 Google Identity Services script already exists');
        resolve();
        return;
      }

      console.log('📥 Creating Google Identity Services script...');
      
      // Load Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = false; // Load synchronously to ensure proper initialization
      gisScript.defer = false;
      gisScript.onload = () => {
        console.log('✅ Google Identity Services script loaded successfully');
        // Wait a bit more for the google object to be available
        setTimeout(() => {
          console.log('🔍 Checking for window.google after script load:', !!window.google);
          resolve();
        }, 1000);
      };
      gisScript.onerror = (error) => {
        console.error('❌ Failed to load Google Identity Services script:', error);
        reject(new Error('Failed to load Google Identity Services'));
      };
      
      console.log('📤 Adding Google Identity Services script to document head...');
      document.head.appendChild(gisScript);
    });
  }

  // Check if Google Drive is ready
  isReady(): boolean {
    const ready = this.initialized && window.google;
    console.log('🔍 Google Drive ready check:', {
      initialized: this.initialized,
      hasGoogle: !!window.google,
      ready
    });
    return ready;
  }

  // Authenticate user
  async authenticate(): Promise<boolean> {
    if (!this.isReady()) {
      console.error('❌ Google Drive not initialized');
      return false;
    }

    try {
      console.log('🔐 Starting Google Drive authentication...');
      
      // Use the new Google Identity Services approach
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (response: any) => {
          console.log('✅ Google Drive authentication successful');
          // Store the access token for later use
          localStorage.setItem('google_drive_access_token', response.access_token);
        },
        error_callback: (error: any) => {
          console.error('❌ Google Drive authentication error:', error);
        }
      });

      tokenClient.requestAccessToken();
      return true;
    } catch (error) {
      console.error('❌ Google Drive authentication error:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    if (!this.isReady()) {
      console.log('❌ Google Drive not ready for authentication check');
      return false;
    }

    try {
      // Check if we have a valid access token
      const token = localStorage.getItem('google_drive_access_token');
      const isSignedIn = !!token;
      console.log('🔐 Authentication status:', isSignedIn);
      return isSignedIn;
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
      const accessToken = localStorage.getItem('google_drive_access_token');
      
      if (!accessToken) {
        console.error('❌ No access token available');
        return null;
      }

      // Check if folder already exists
      const existingFolder = await this.findFolder(folderName, accessToken);
      if (existingFolder) {
        return existingFolder.id;
      }

      // Create new folder using fetch API
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Created user folder:', folderName);
      return result.id;
    } catch (error) {
      console.error('❌ Error creating user folder:', error);
      return null;
    }
  }

  // Find folder by name
  private async findFolder(folderName: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search folder: ${response.statusText}`);
      }

      const result = await response.json();
      return result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      console.error('❌ Error finding folder:', error);
      return null;
    }
  }

  // Save audio file to Google Drive
  async saveAudioFile(userId: string, audioFile: AudioFile): Promise<GoogleDriveStorageResponse> {
    console.log('💾 Starting Google Drive save for user:', userId);
    
    if (!this.isReady()) {
      console.error('❌ Google Drive not ready');
      return {
        success: false,
        error: 'Google Drive not initialized. Please check your configuration.'
      };
    }

    // Check authentication
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      console.log('🔐 User not authenticated, starting authentication...');
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        console.error('❌ Authentication failed');
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

      const accessToken = localStorage.getItem('google_drive_access_token');
      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available'
        };
      }

      // Use resumable upload to avoid CORS issues
      const metadata = {
        name: audioFile.filename,
        parents: [folderId]
      };

      // Step 1: Create the file metadata
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create file metadata: ${createResponse.statusText}`);
      }

      const createResult = await createResponse.json();
      const fileId = createResult.id;

      // Step 2: Upload the file content using resumable upload
      const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'audio/wav'
        },
        body: audioFile.blob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file content: ${uploadResponse.statusText}`);
      }

      const driveFileId = fileId;
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
      window.dispatchEvent(new CustomEvent('googleDriveUpdate')); // Notify components of update

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
      const accessToken = localStorage.getItem('google_drive_access_token');
      
      if (!accessToken) {
        console.warn('⚠️ No access token available for file verification');
        return metadata;
      }
      
      for (const file of metadata) {
        try {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}?fields=id,name,size,modifiedTime`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            verifiedFiles.push(file);
          } else {
            console.warn('⚠️ File not found in Google Drive, removing from metadata:', file.filename);
            this.removeFileMetadata(file.id);
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
      const accessToken = localStorage.getItem('google_drive_access_token');
      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available'
        };
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      // Remove from metadata
      this.removeFileMetadata(fileId);
      window.dispatchEvent(new CustomEvent('googleDriveUpdate')); // Notify components of update

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
    console.log('💾 Saved metadata for user', file.userId, ':', existing.length, 'total files');
  }

  // Get file metadata from localStorage
  private getFileMetadata(userId: string): GoogleDriveAudioFile[] {
    const key = `gauner_drive_metadata_${userId}`;
    const data = localStorage.getItem(key);
    const files = data ? JSON.parse(data) : [];
    console.log('📁 Retrieved metadata for user', userId, ':', files.length, 'files');
    return files;
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
