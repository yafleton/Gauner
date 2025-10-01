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

      // The loadGoogleIdentityServices method now handles the waiting internally
      // Just check if we're ready
      if (window.google?.accounts?.oauth2) {
        console.log('✅ Google Identity Services loaded:', !!window.google);
        this.initialized = true;
        console.log('✅ Google Drive API initialized successfully');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('googleDriveReady'));
      } else {
        console.error('❌ Google Identity Services not available after loading');
        this.initialized = false;
      }
    } catch (error) {
      console.error('❌ Google Drive initialization error:', error);
      this.initialized = false;
    }
  }

  // Load Google Identity Services
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.accounts?.oauth2) {
        console.log('✅ Google Identity Services already loaded');
        resolve();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        console.log('📋 Google Identity Services script already exists');
        // Wait for it to load with retry logic
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          console.log(`🔍 Checking for window.google (attempt ${attempts}):`, !!window.google);
          if (window.google?.accounts?.oauth2) {
            console.log('✅ Google Identity Services loaded after wait');
            clearInterval(checkInterval);
            resolve();
          } else if (attempts >= 20) { // 10 seconds max
            console.warn('⚠️ Google Identity Services script exists but not loaded after 10 seconds');
            clearInterval(checkInterval);
            reject(new Error('Google Identity Services failed to load'));
          }
        }, 500);
        return;
      }

      console.log('📥 Creating Google Identity Services script...');
      
      // Load Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true; // Change to async
      gisScript.defer = true; // Add defer
      gisScript.onload = () => {
        console.log('✅ Google Identity Services script loaded successfully');
        // Wait for google object to be available with retry logic
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          console.log(`🔍 Checking for window.google after script load (attempt ${attempts}):`, !!window.google);
          if (window.google?.accounts?.oauth2) {
            console.log('✅ Google Identity Services ready');
            clearInterval(checkInterval);
            resolve();
          } else if (attempts >= 30) { // 15 seconds max
            console.error('❌ Google Identity Services failed to initialize after 15 seconds');
            clearInterval(checkInterval);
            reject(new Error('Google Identity Services failed to initialize'));
          }
        }, 500);
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
    const ready = this.initialized && window.google?.accounts?.oauth2;
    console.log('🔍 Google Drive ready check:', {
      initialized: this.initialized,
      hasGoogle: !!window.google,
      hasOAuth2: !!window.google?.accounts?.oauth2,
      ready
    });
    
    // If not ready but google is available, try to reinitialize
    if (!ready && window.google && !this.initialized) {
      console.log('🔄 Google available but not initialized, attempting reinitialization...');
      this.initializeGoogleDrive().then(() => {
        if (this.initialized) {
          window.dispatchEvent(new CustomEvent('googleDriveReady'));
        }
      }).catch(error => {
        console.error('❌ Reinitialization failed:', error);
      });
    }
    
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
      
      // Use the new Google Identity Services approach with Promise
      return new Promise((resolve) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          redirect_uri: window.location.origin,
          callback: (response: any) => {
            if (response.access_token) {
              console.log('✅ Google Drive authentication successful');
              // Store the access token for later use
              localStorage.setItem('google_drive_access_token', response.access_token);
              resolve(true);
            } else {
              console.error('❌ Authentication failed - no access token');
              resolve(false);
            }
          },
          error_callback: (error: any) => {
            console.error('❌ Google Drive authentication error:', error);
            resolve(false);
          }
        });

        tokenClient.requestAccessToken();
      });
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
      if (!token) {
        console.log('🔐 No access token found');
        return false;
      }

      // Validate token by making a simple API call
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('🔐 Authentication status: valid token');
        return true;
      } else if (response.status === 401) {
        console.log('🔐 Authentication status: invalid/expired token');
        // Clear invalid token
        localStorage.removeItem('google_drive_access_token');
        return false;
      } else {
        console.log('🔐 Authentication status: token validation failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication check error:', error);
      return false;
    }
  }

  // Create folder for user's audio files
  async createUserFolder(userId: string): Promise<string | null> {
    if (!this.isReady()) return null;

    try {
      const folderName = `GaunerAudio_${userId}`;
      const accessToken = localStorage.getItem('google_drive_access_token');
      
      if (!accessToken) {
        console.error('❌ No access token available');
        return null;
      }

      // Check if folder already exists
      console.log('🔍 Checking if folder exists:', folderName);
      const existingFolder = await this.findFolder(folderName, accessToken);
      if (existingFolder) {
        console.log('✅ Folder already exists:', existingFolder.id);
        return existingFolder.id;
      }
      console.log('📁 Folder does not exist, creating new folder:', folderName);

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

      console.log('📡 Folder creation response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Folder creation failed:', response.status, errorText);
        throw new Error(`Failed to create folder: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Created user folder:', folderName, 'with ID:', result.id);
      return result.id;
    } catch (error) {
      console.error('❌ Error creating user folder:', error);
      return null;
    }
  }

  // Find folder by name
  private async findFolder(folderName: string, accessToken: string): Promise<any> {
    try {
      console.log('🔍 Searching for folder:', folderName);
      const url = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`;
      console.log('📡 Folder search URL:', url);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('📡 Folder search response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Folder search error response:', errorText);
        throw new Error(`Failed to search folder: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📁 Folder search result:', result);
      console.log('📁 Folder search completed successfully, found', result.files?.length || 0, 'folders');
      return result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Folder search timed out after 10 seconds');
      } else {
        console.error('❌ Error finding folder:', error);
      }
      return null;
    }
  }

  // Save audio file to Google Drive using backend server to avoid CORS
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
      const accessToken = localStorage.getItem('google_drive_access_token');
      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available'
        };
      }

      // Upload directly to Google Drive API to avoid backend dependency
      console.log('📤 Uploading directly to Google Drive API...');
      console.log('⚠️ Note: Direct browser uploads to Google Drive API may fail due to CORS restrictions');
      
      // Prepare metadata for cross-device sync
      const metadata = {
        ...audioFile,
        userId,
        uploadedAt: new Date().toISOString(),
        deviceId: this.getDeviceId()
      };

      // Find or create user folder first
      const folderId = await this.createUserFolder(userId);
      
      // Upload file to Google Drive
      const formData = new FormData();
      
      // Create file metadata
      const fileMetadata = {
        name: audioFile.filename,
        parents: [folderId],
        description: JSON.stringify(metadata)
      };
      
      formData.append('metadata', JSON.stringify(fileMetadata));
      formData.append('media', audioFile.blob, audioFile.filename);
      
      const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Google Drive upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.id;
      const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;

      const googleDriveAudioFile: GoogleDriveAudioFile = {
        ...audioFile,
        userId,
        uploadedAt: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        driveFileId: fileId,
        driveUrl
      };

      // Notify components of update
      window.dispatchEvent(new CustomEvent('googleDriveUpdate'));

      console.log('✅ Audio file saved to Google Drive:', {
        userId,
        fileName: audioFile.filename,
        driveFileId: fileId,
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

    const token = localStorage.getItem('google_drive_access_token');
    if (!token) {
      console.warn('⚠️ User not authenticated with Google Drive - no access token found');
      return [];
    }

    try {
      console.log('🔑 Access token available, length:', token.length);

      // Get user folder
      const folderName = `GaunerAudio_${userId}`;
      console.log('📁 Looking for user folder:', folderName);
      const folder = await this.findFolder(folderName, token);
      
      if (!folder) {
        console.log('📁 No user folder found in Google Drive for user:', userId);
        console.log('💡 This is normal for first-time users - folder will be created when first audio is saved');
        console.log('🔍 Folder search completed, returning empty array');
        return [];
      }

      console.log('✅ Found user folder:', folder.name, 'ID:', folder.id);

      // Get all files from user folder
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folder.id}' in parents&fields=files(id,name,mimeType,size,modifiedTime)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Searching for files in folder:', folder.id, 'for user:', userId);

      if (!response.ok) {
        console.warn('⚠️ Failed to list files from Google Drive');
        return [];
      }

      const result = await response.json();
      console.log('📁 Found files in Google Drive:', result.files.length, result.files);
      const audioFiles: GoogleDriveAudioFile[] = [];

      // First, collect all metadata files
      const metadataFiles: { [key: string]: any } = {};
      console.log('🔍 Processing all files to find metadata...');
      for (const file of result.files) {
        console.log('📄 Processing file:', file.name, 'Type:', file.mimeType);
        if (file.name.endsWith('_metadata.json')) {
          try {
            // Download metadata content
            const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              // Extract audio file ID from metadata filename (remove _metadata.json suffix)
              const audioFileId = file.name.replace('_metadata.json', '');
              metadataFiles[audioFileId] = metadata;
              console.log('✅ Loaded metadata for audio file ID:', audioFileId, 'Metadata:', metadata);
            }
          } catch (error) {
            console.warn('⚠️ Failed to load metadata file:', file.name, error);
          }
        }
      }
      console.log('📋 All metadata files collected:', Object.keys(metadataFiles));

      // Then, process audio files and match with metadata
      console.log('🔍 Processing audio files and matching with metadata...');
      for (const file of result.files) {
        if (file.mimeType === 'audio/wav') {
          console.log('🎵 Processing audio file:', file.name, 'ID:', file.id);
          console.log('🔍 Looking for metadata with key:', file.id, 'Available keys:', Object.keys(metadataFiles));
          
          if (metadataFiles[file.id]) {
            // Found matching metadata
            audioFiles.push(metadataFiles[file.id]);
            console.log('✅ Matched audio file with metadata:', file.name);
          } else {
            // No metadata found, create a basic entry from the audio file
            console.log('⚠️ No metadata found for audio file:', file.name, 'creating basic entry');
            const basicEntry: GoogleDriveAudioFile = {
              id: file.id,
              userId: userId,
              filename: file.name,
              blob: new Blob(), // Empty blob, will be loaded when needed
              createdAt: new Date(file.modifiedTime),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              voice: 'Unknown',
              text: 'Audio file from Google Drive',
              size: parseInt(file.size) || 0,
              uploadedAt: file.modifiedTime,
              deviceId: 'unknown',
              driveFileId: file.id,
              driveUrl: `https://drive.google.com/file/d/${file.id}/view`
            };
            audioFiles.push(basicEntry);
          }
        }
      }

      console.log('📥 Retrieved audio files from Google Drive:', audioFiles.length);
      return audioFiles;
    } catch (error) {
      console.error('❌ Google Drive retrieval error:', error);
      return [];
    }
  }

  // Delete audio file from Google Drive
  async deleteAudioFile(userId: string, fileId: string): Promise<GoogleDriveStorageResponse> {
    console.log('🗑️ Starting deletion for file ID:', fileId, 'user:', userId);
    
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Google Drive not initialized'
      };
    }

    try {
      const accessToken = localStorage.getItem('google_drive_access_token');
      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available'
        };
      }

      // First, find the user folder to get all files
      const folderName = `GaunerAudio_${userId}`;
      const folder = await this.findFolder(folderName, accessToken);
      if (!folder) {
        console.error('❌ User folder not found:', folderName);
        return {
          success: false,
          error: 'User folder not found'
        };
      }

      // Get all files in the folder to find the metadata file
      const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folder.id}' in parents&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to list files: ${listResponse.statusText}`);
      }

      const listResult = await listResponse.json();
      console.log('📁 Files in folder:', listResult.files);

      // Find the metadata file for this audio file
      let metadataFileId = null;
      for (const file of listResult.files) {
        if (file.name === `${fileId}_metadata.json`) {
          metadataFileId = file.id;
          console.log('📄 Found metadata file:', file.name, 'ID:', metadataFileId);
          break;
        }
      }

      // Delete the audio file
      console.log('🗑️ Deleting audio file with ID:', fileId);
      console.log('🗑️ File ID type:', typeof fileId, 'Length:', fileId.length);
      const audioResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error('❌ Failed to delete audio file:', audioResponse.status, errorText);
        throw new Error(`Failed to delete audio file: ${audioResponse.status} ${audioResponse.statusText} - ${errorText}`);
      }

      console.log('✅ Audio file deleted successfully');

      // Delete the metadata file if it exists
      if (metadataFileId) {
        console.log('🗑️ Deleting metadata file:', metadataFileId);
        const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${metadataFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!metadataResponse.ok) {
          const errorText = await metadataResponse.text();
          console.warn('⚠️ Failed to delete metadata file:', metadataResponse.status, errorText);
        } else {
          console.log('✅ Metadata file deleted successfully');
        }
      } else {
        console.log('ℹ️ No metadata file found to delete');
      }

      // Notify components of update
      window.dispatchEvent(new CustomEvent('googleDriveUpdate'));
      console.log('🗑️ Audio file and metadata deleted from Google Drive');

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

  // localStorage methods removed - using Google Drive only for cross-device sync

  // Clear invalid authentication and force re-authentication
  clearAuthentication(): void {
    localStorage.removeItem('google_drive_access_token');
    console.log('🔐 Cleared invalid authentication token');
  }

  // localStorage methods removed - using Google Drive only for cross-device sync

  // Save metadata to Google Drive for cross-device sync
  private async saveMetadataToDrive(file: GoogleDriveAudioFile, accessToken: string): Promise<void> {
    try {
      // Create a simple metadata file with the audio file ID in the name
      const metadataContent = JSON.stringify(file);
      const metadataBlob = new Blob([metadataContent], { type: 'application/json' });
      
      // Get user folder
      const folderName = `GaunerAudio_${file.userId}`;
      const folder = await this.findFolder(folderName, accessToken);
      
      if (!folder) {
        console.warn('⚠️ User folder not found for metadata save');
        return;
      }
      
      // Create metadata file with audio file ID in the name for easy matching
      const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${file.driveFileId}_metadata.json`, // Use audio file ID as prefix
          parents: [folder.id]
        })
      });

      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        
        // Upload metadata content
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${metadataResult.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: metadataBlob
        });
        
        console.log('✅ Metadata saved to Google Drive for cross-device sync:', `${file.driveFileId}_metadata.json`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to save metadata to Google Drive:', error);
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
