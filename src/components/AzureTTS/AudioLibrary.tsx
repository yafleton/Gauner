import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Download, Trash2, Clock, FileAudio, Cloud, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { AudioStorageService, AudioFile } from '../../services/audioStorage';
import CloudStorageService, { CloudAudioFile } from '../../services/cloudStorage';

const AudioLibrary: React.FC = () => {
  const { user } = useSimpleAuth();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [cloudFiles, setCloudFiles] = useState<CloudAudioFile[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCloudFiles, setShowCloudFiles] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const audioStorage = useMemo(() => AudioStorageService.getInstance(), []);
  const cloudStorage = useMemo(() => CloudStorageService.getInstance(), []);

  const loadAudioFiles = useCallback(() => {
    if (!user?.id) return;
    
    setIsLoading(true);
    const files = audioStorage.getUserAudioFiles(user.id);
    setAudioFiles(files);
    
    // Load cloud files
    const cloudAudioFiles = cloudStorage.getCloudAudioFiles(user.id);
    setCloudFiles(cloudAudioFiles);
    
    setIsLoading(false);
  }, [user?.id, audioStorage, cloudStorage]);

  useEffect(() => {
    if (user?.id) {
      loadAudioFiles();
    }
  }, [user?.id, loadAudioFiles]);

  const handlePlayPause = (file: AudioFile) => {
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

      // Play new audio
      const url = URL.createObjectURL(file.blob);
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

      audio.play();
      setAudioElement(audio);
      setPlayingId(file.id);
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
    
    if (await audioStorage.deleteAudioFile(fileId, user.id)) {
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

  const handleCloudDelete = async (fileId: string) => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to delete this cloud audio file?')) {
      const result = await cloudStorage.deleteAudioFile(user.id, fileId);
      if (result.success) {
        loadAudioFiles(); // Reload files after deletion
        if (playingId === fileId && audioElement) {
          audioElement.pause();
          setPlayingId(null);
          setAudioElement(null);
        }
      } else {
        alert('Failed to delete cloud file: ' + result.error);
      }
    }
  };

  const handleSyncCloud = async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    try {
      const result = await cloudStorage.syncAudioFiles(user.id);
      if (result.success) {
        loadAudioFiles(); // Reload files after sync
        console.log('✅ Cloud sync completed:', result.data);
      } else {
        console.error('❌ Cloud sync failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Cloud sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to delete all your audio files?')) {
      const deletedCount = await audioStorage.deleteAllUserFiles(user.id);
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
    return audioStorage.getStorageStats(user.id);
  }, [user?.id, audioStorage]);

  const cloudStats = useMemo(() => {
    if (!user?.id) return { count: 0, totalSize: 0, devices: [] };
    return cloudStorage.getCloudStorageStats(user.id);
  }, [user?.id, cloudStorage]);

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
            {cloudFiles.length > 0 && (
              <button
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                title="Sync cloud files"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
            )}
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
        
        {/* Cloud Storage Toggle */}
        {cloudFiles.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowCloudFiles(!showCloudFiles)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
            >
              <Cloud size={14} />
              <span>Cloud Storage ({cloudStats.count} files)</span>
              <span className="text-xs">({cloudStats.devices.length} devices)</span>
            </button>
          </div>
        )}
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
              {audioStorage.formatFileSize(stats.totalSize)}
            </div>
            <div className="text-xs text-text-secondary">Total Size</div>
          </div>
        </div>
      )}

      {/* Cloud Files List */}
      {showCloudFiles && cloudFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center space-x-2">
            <Cloud size={16} />
            <span>Cloud Storage</span>
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cloudFiles.map((file) => (
              <div
                key={file.id}
                className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 hover:border-blue-400/50 transition-all duration-200"
              >
                <div className="flex items-start space-x-3">
                  {/* Device Icon */}
                  <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {file.deviceId.includes('mobile') || file.deviceId.includes('phone') ? (
                      <Smartphone size={12} className="text-blue-400" />
                    ) : (
                      <Monitor size={12} className="text-blue-400" />
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-text-primary truncate">
                        {file.filename}
                      </h3>
                      <span className="text-xs text-text-secondary bg-blue-900/30 px-2 py-0.5 rounded text-nowrap ml-2">
                        {audioStorage.formatFileSize(file.size)}
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
                      onClick={() => handleDownload(file as any)}
                      className="p-1 text-text-secondary hover:text-accent-purple transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleCloudDelete(file.id)}
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
      ) : audioFiles.length === 0 && cloudFiles.length === 0 ? (
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
                      {audioStorage.formatFileSize(file.size)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-text-secondary mb-1">
                    <span className="truncate">Voice: {file.voice}</span>
                    <span className="flex items-center text-nowrap">
                      <Clock size={10} className="mr-1" />
                      {audioStorage.formatTimeRemaining(file.expiresAt)}
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
