import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Download, Trash2, Clock, FileAudio, Cloud, Smartphone, Monitor } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { AudioFile } from '../../services/audioStorage';
import GoogleDriveStorageService, { GoogleDriveAudioFile } from '../../services/googleDriveStorage';

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatTimeRemaining = (expiresAt: Date): string => {
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();
  
  if (timeLeft <= 0) return 'Expired';
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
};

const AudioLibrary: React.FC = () => {
  const { user } = useSimpleAuth();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [googleDriveFiles, setGoogleDriveFiles] = useState<GoogleDriveAudioFile[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const googleDriveStorage = useMemo(() => GoogleDriveStorageService.getInstance(), []);

  const loadAudioFiles = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    // Wait for Google Drive to be ready with retry logic
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!googleDriveStorage.isReady() && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Google Drive to be ready... attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Load ONLY Google Drive files (no localStorage)
    try {
      console.log('🔍 Loading Google Drive files for user:', user.id);
      const googleDriveAudioFiles = await googleDriveStorage.getAudioFiles(user.id);
      console.log('📁 Google Drive files loaded:', googleDriveAudioFiles.length, googleDriveAudioFiles);
      setGoogleDriveFiles(googleDriveAudioFiles);
      
      // Set empty local files array
      setAudioFiles([]);
    } catch (error) {
      console.error('❌ Failed to load Google Drive files:', error);
      setGoogleDriveFiles([]);
      setAudioFiles([]);
    }
    
    setIsLoading(false);
  }, [user?.id, googleDriveStorage]);

  useEffect(() => {
    if (user?.id) {
      loadAudioFiles();
    }
  }, [user?.id, loadAudioFiles]);

  // Listen for Google Drive updates
  useEffect(() => {
    const handleGoogleDriveUpdate = () => {
      console.log('📱 Google Drive update received, reloading files...');
      loadAudioFiles();
    };

    const handleGoogleDriveReady = () => {
      console.log('✅ Google Drive ready event received, reloading files...');
      loadAudioFiles();
    };

    window.addEventListener('googleDriveUpdate', handleGoogleDriveUpdate);
    window.addEventListener('googleDriveReady', handleGoogleDriveReady);
    
    return () => {
      window.removeEventListener('googleDriveUpdate', handleGoogleDriveUpdate);
      window.removeEventListener('googleDriveReady', handleGoogleDriveReady);
    };
  }, [loadAudioFiles]);

  // Debug: Log current state
  useEffect(() => {
    console.log('🔍 AudioLibrary state update:', {
      audioFiles: audioFiles.length,
      googleDriveFiles: googleDriveFiles.length,
      isLoading,
      user: user?.id
    });
  }, [audioFiles, googleDriveFiles, isLoading, user]);

  const handlePlayPause = async (file: AudioFile | GoogleDriveAudioFile) => {
    if (playingId === file.id) {
      // Pause current audio
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
      }
      setPlayingId(null);
    } else {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      try {
        let audioBlob: Blob;
        
        // Check if this is a Google Drive file
        if ('driveFileId' in file) {
          console.log('🎵 Loading Google Drive audio file:', file.driveFileId);
          
          // Load audio from Google Drive
          const token = localStorage.getItem('google_drive_access_token');
          if (!token) {
            throw new Error('No Google Drive access token');
          }

          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to load audio from Google Drive: ${response.statusText}`);
          }

          audioBlob = await response.blob();
        } else {
          // Regular local file
          audioBlob = file.blob;
        }

        // Play the audio
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          setPlayingId(null);
          setAudioElement(null);
          URL.revokeObjectURL(url);
        };

        audio.onerror = () => {
          setPlayingId(null);
          setAudioElement(null);
          URL.revokeObjectURL(url);
        };

        await audio.play();
        setAudioElement(audio);
        setPlayingId(file.id);
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        alert(`Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDownload = (file: AudioFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (fileId: string) => {
    if (!user?.id) return;
    
    if (await googleDriveStorage.deleteAudioFile(user.id, fileId)) {
      loadAudioFiles(); // Refresh the list
      
      // Stop playing if this file was playing
      if (playingId === fileId) {
        if (audioElement) {
          audioElement.pause();
          setAudioElement(null);
        }
        setPlayingId(null);
      }
    }
  };


  const handleGoogleDriveDelete = async (fileId: string) => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to delete this Google Drive audio file?')) {
      const result = await googleDriveStorage.deleteAudioFile(user.id, fileId);
      if (result.success) {
        loadAudioFiles(); // Reload files after deletion
        if (playingId === fileId && audioElement) {
          audioElement.pause();
          setPlayingId(null);
          setAudioElement(null);
        }
      } else {
        alert('Failed to delete Google Drive file: ' + result.error);
      }
    }
  };


  const handleDeleteAll = async () => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to delete all your audio files?')) {
      // Delete all files from Google Drive
      const deletedCount = googleDriveFiles.length;
      for (const file of googleDriveFiles) {
        await googleDriveStorage.deleteAudioFile(user.id, file.id);
      }
      if (deletedCount > 0) {
        loadAudioFiles(); // Refresh the list
        
        // Stop any playing audio
        if (audioElement) {
          audioElement.pause();
          setAudioElement(null);
        }
        setPlayingId(null);
      }
    }
  };

  const stats = useMemo(() => {
    if (!user?.id) return { count: 0, totalSize: 0 };
    // Calculate stats from Google Drive files
    const totalSize = googleDriveFiles.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = googleDriveFiles.length;
    return { totalSize, totalFiles };
  }, [googleDriveFiles, user?.id]);


  if (!user) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Audio Library
        </h2>
        <p className="text-text-secondary">Please log in to view your audio files.</p>
      </div>
    );
  }

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Audio Library
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadAudioFiles}
              className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-400/30 rounded"
            >
              🔄 Refresh
            </button>
            {audioFiles.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Google Drive Storage Info */}
        <div className="mt-2">
          <div className="text-sm text-green-400 flex items-center space-x-1">
            <Cloud size={14} />
            <span>Google Drive Storage ({googleDriveFiles.length} files)</span>
          </div>
          <div className="text-xs text-text-secondary mt-1 space-y-1">
            <p>✅ Cross-Device Sync: Audio files are automatically synced to Google Drive</p>
            <div className="bg-green-900/20 border border-green-500/30 rounded p-2 mt-2">
              <p className="text-green-300 font-medium">✅ Google Drive Integration Active</p>
              <p className="text-green-200 text-xs">
                Your audio files are automatically saved to Google Drive for cross-device access.
                Generate audio on any device and it will appear on all your devices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {audioFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-bg-secondary/30 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-text-primary">{stats.count}</div>
            <div className="text-xs text-text-secondary">Files</div>
          </div>
          <div className="bg-bg-secondary/30 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-text-primary">
              {formatFileSize(stats.totalSize)}
            </div>
            <div className="text-xs text-text-secondary">Total Size</div>
          </div>
        </div>
      )}

      {/* Google Drive Files List */}
      {googleDriveFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center space-x-2">
            <Cloud size={16} />
            <span>Google Drive Files</span>
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {googleDriveFiles.map((file) => (
              <div
                key={file.id}
                className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 hover:border-green-400/50 transition-all duration-200"
              >
                <div className="flex items-start space-x-3">
                  {/* Device Icon */}
                  <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {file.deviceId.includes('mobile') || file.deviceId.includes('phone') ? (
                      <Smartphone size={12} className="text-green-400" />
                    ) : (
                      <Monitor size={12} className="text-green-400" />
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-text-primary truncate">
                        {file.filename}
                      </h3>
                      <span className="text-xs text-text-secondary bg-green-900/30 px-2 py-0.5 rounded text-nowrap ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-text-secondary mb-1">
                      <span className="truncate">Device: {file.deviceId.split('_')[0]}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePlayPause(file)}
                      className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center hover:bg-green-600/30 transition-colors"
                      title="Play/Pause"
                    >
                      {playingId === file.id ? (
                        <Pause size={10} className="text-green-400" />
                      ) : (
                        <Play size={10} className="text-green-400 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => window.open(file.driveUrl, '_blank')}
                      className="p-1 text-text-secondary hover:text-green-400 transition-colors"
                      title="Open in Google Drive"
                    >
                      <Cloud size={14} />
                    </button>
                    <button
                      onClick={() => handleGoogleDriveDelete(file.driveFileId)}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Files List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="loading mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading audio files...</p>
        </div>
      ) : audioFiles.length === 0 && googleDriveFiles.length === 0 ? (
        <div className="text-center py-8">
          <FileAudio size={48} className="text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary mb-2">No audio files yet</p>
          <p className="text-sm text-text-secondary">
            Generate some audio using the Voice tab to see them here
          </p>
        </div>
      ) : audioFiles.length > 0 ? (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {audioFiles.map((file) => (
            <div
              key={file.id}
              className="bg-bg-secondary/20 border border-border-primary/50 rounded-lg p-3 hover:border-accent-purple/30 transition-all duration-200"
            >
              <div className="flex items-start space-x-3">
                {/* Play Button */}
                <button
                  onClick={() => handlePlayPause(file)}
                  className="w-8 h-8 bg-gradient-to-r from-accent-purple to-accent-blue rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200 flex-shrink-0 mt-0.5"
                >
                  {playingId === file.id ? (
                    <Pause size={12} className="text-white" />
                  ) : (
                    <Play size={12} className="text-white ml-0.5" />
                  )}
                </button>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {file.filename}
                    </h3>
                    <span className="text-xs text-text-secondary bg-bg-secondary/50 px-2 py-0.5 rounded text-nowrap ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-text-secondary mb-1">
                    <span className="truncate">Voice: {file.voice}</span>
                    <span className="flex items-center text-nowrap">
                      <Clock size={10} className="mr-1" />
                      {formatTimeRemaining(file.expiresAt)}
                    </span>
                  </div>

                  {file.text && (
                    <p className="text-xs text-text-secondary/80 truncate mb-2">
                      "{file.text}"
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 text-text-secondary hover:text-accent-blue transition-colors rounded"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-text-secondary hover:text-red-400 transition-colors rounded"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AudioLibrary;
