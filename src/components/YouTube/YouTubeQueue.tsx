import React, { useState, useEffect, useMemo } from 'react';
import { Play, Trash2, RefreshCw, Download, AlertCircle, CheckCircle, Clock, Wand2, FileText, Youtube } from 'lucide-react';
import { youtubeTranscriptServiceV4 } from '../../services/youtubeTranscriptServiceV4';
import { geminiService } from '../../services/geminiService';
import { queueService, QueueItem, QueueStats } from '../../services/queueService';
import { ScriptAnalysis } from '../../services/geminiService';
import { transcriptCleanupService } from '../../services/transcriptCleanupService';
import { AzureTTSService } from '../../services/azureTTS';

interface YouTubeQueueProps {
  user: any;
}

const YouTubeQueue: React.FC<YouTubeQueueProps> = ({ user }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysis | null>(null);
  const [selectedModifications, setSelectedModifications] = useState<string[]>([]);
  const [showModifications, setShowModifications] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    title: string;
    transcript: string;
    originalTitle: string;
    originalTranscript: string;
  } | null>(null);

  const languages = geminiService.getSupportedLanguages();

  // Initialize TTS service like in AzureTTS component
  const ttsService = useMemo(() => {
    const currentApiKey = user?.azureApiKey;
    const currentRegion = user?.azureRegion || 'eastus';
    
    console.log('YouTubeQueue: Creating TTS service with:', {
      userId: user?.id,
      apiKey: currentApiKey ? `${currentApiKey.substring(0, 8)}...` : 'none',
      region: currentRegion,
      hasApiKey: !!currentApiKey
    });
    
    return new AzureTTSService(currentApiKey || 'demo-key', currentRegion);
  }, [user?.id, user?.azureApiKey, user?.azureRegion]);

  // Initialize queue service with TTS service
  useEffect(() => {
    if (ttsService) {
      queueService.setTTSService(ttsService);
      console.log('✅ Queue service initialized with TTS service');
    }
  }, [ttsService]);

  // Load queue on component mount
  useEffect(() => {
    const loadQueue = () => {
      setQueue(queueService.getQueue());
      setQueueStats(queueService.getQueueStats());
    };

    loadQueue();

    // Listen for queue updates
    const handleQueueUpdate = () => {
      loadQueue();
    };

    window.addEventListener('queueUpdate', handleQueueUpdate);
    return () => window.removeEventListener('queueUpdate', handleQueueUpdate);
  }, []);

  // Extract transcript from YouTube URL
  const handleExtractTranscript = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!youtubeTranscriptServiceV4.isValidYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🎥 Extracting transcript from:', youtubeUrl);
      const result = await youtubeTranscriptServiceV4.extractTranscript(youtubeUrl);
      
      console.log('✅ Transcript extracted:', result);
      
      // Automatically clean the transcript
      console.log('🧹 Auto-cleaning transcript...');
      const cleanedTranscript = transcriptCleanupService.cleanTranscript(result.transcript);
      console.log('✅ Auto-cleanup completed');
      
      setExtractedData({
        title: result.title,
        transcript: cleanedTranscript,
        originalTitle: result.title,
        originalTranscript: result.transcript
      });

      // Auto-translation temporarily disabled for testing
      // TODO: Re-enable after transcript extraction is improved
      console.log('🌍 Auto-translation disabled for testing');

      setError('');
    } catch (error) {
      console.error('❌ Failed to extract transcript:', error);
      setError(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Analyze script for modifications
  const handleAnalyzeScript = async () => {
    if (!extractedData?.transcript) {
      setError('No transcript available for analysis');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Analyzing script for modifications');
      const analysis = await geminiService.analyzeScriptForModifications(extractedData.transcript);
      setScriptAnalysis(analysis);
      setShowModifications(true);
      setSelectedModifications([]);
    } catch (error) {
      console.error('❌ Failed to analyze script:', error);
      setError(`Failed to analyze script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply modifications
  const handleApplyModifications = async () => {
    if (!extractedData?.transcript || selectedModifications.length === 0) {
      setError('No modifications selected');
      return;
    }

    setIsLoading(true);
    try {
      console.log('✨ Applying modifications:', selectedModifications);
      const modifiedTranscript = await geminiService.applyModifications(extractedData.transcript, selectedModifications);
      
      setExtractedData(prev => prev ? {
        ...prev,
        transcript: modifiedTranscript
      } : null);
      
      setShowModifications(false);
    } catch (error) {
      console.error('❌ Failed to apply modifications:', error);
      setError(`Failed to apply modifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add to queue
  const handleAddToQueue = () => {
    if (!extractedData) {
      setError('No extracted data available');
      return;
    }

    const queueId = queueService.addToQueue(
      extractedData.title,
      extractedData.transcript,
      selectedLanguage,
      selectedModifications,
      youtubeUrl,
      extractedData.originalTitle,
      extractedData.originalTranscript,
      user?.id || 'queue-user'
    );

    console.log('📥 Added to queue:', queueId);
    
    // Reset form
    setYoutubeUrl('');
    setExtractedData(null);
    setScriptAnalysis(null);
    setSelectedModifications([]);
    setShowModifications(false);
    setError('');
  };

  // Queue management functions
  const handleRemoveFromQueue = (id: string) => {
    queueService.removeFromQueue(id);
  };

  const handleRetryItem = (id: string) => {
    queueService.retryItem(id);
  };

  const handleGenerateAudio = async (id: string) => {
    try {
      setError('');
      await queueService.processItem(id);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setError(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePlayAudio = (audioFile: any) => {
    try {
      const audioUrl = URL.createObjectURL(audioFile.blob);
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Failed to play audio:', error);
      setError(`Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearCompleted = () => {
    queueService.clearCompleted();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all queue items?')) {
      queueService.clearAll();
    }
  };


  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' };
      case 'processing':
        return { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' };
      default:
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-900/20', border: 'border-gray-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Youtube className="w-6 h-6 text-red-500" />
        <h2 className="text-xl font-bold text-text-primary">YouTube Queue</h2>
      </div>

      {/* URL Input Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
          <FileText size={20} />
          <span>Extract YouTube Transcript</span>
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-primary)'
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Target Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            >
              {languages.map((lang) => (
                <option 
                  key={lang.code} 
                  value={lang.name}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {lang.name} ({lang.voice})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleExtractTranscript}
              disabled={isLoading || !youtubeUrl.trim()}
              className="flex-1 bg-accent-purple hover:bg-accent-purple/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Extract Transcript
                </>
              )}
            </button>

            {extractedData && (
              <button
                onClick={handleAnalyzeScript}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Analyze Script
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Extracted Data Display */}
      {extractedData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Extracted Content</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
              <p className="text-text-primary bg-bg-secondary/50 p-3 rounded-lg">{extractedData.title}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-secondary">Transcript</label>
                {extractedData.transcript && (
                  <span className="text-xs bg-green-900/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                    ✨ Auto-Cleaned Transcript
                  </span>
                )}
              </div>
              <div className="bg-bg-secondary/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-text-primary text-sm leading-relaxed">{extractedData.transcript}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAddToQueue}
                disabled={isLoading || !extractedData?.transcript || (selectedLanguage.toLowerCase() !== 'english' && extractedData?.transcript === extractedData?.originalTranscript)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
                title={selectedLanguage.toLowerCase() !== 'english' && extractedData?.transcript === extractedData?.originalTranscript ? "Please wait for translation to complete" : "Add to queue"}
              >
                <Play className="w-4 h-4 mr-2" />
                Add to Queue
              </button>

              <button
                onClick={() => setExtractedData(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Modifications Modal */}
      {showModifications && scriptAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center space-x-2">
              <Wand2 className="w-5 h-5" />
              <span>Script Modification Suggestions</span>
            </h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-secondary">Main Character:</span>
                  <p className="text-text-primary font-medium">{scriptAnalysis.mainCharacter}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Genre:</span>
                  <p className="text-text-primary font-medium">{scriptAnalysis.genre}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Setting:</span>
                  <p className="text-text-primary font-medium">{scriptAnalysis.setting}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Tone:</span>
                  <p className="text-text-primary font-medium">{scriptAnalysis.tone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-text-primary">Available Modifications</h4>
              {scriptAnalysis.modifications.map((mod, index) => (
                <div key={index} className="border border-border-primary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-text-primary">{mod.type}</h5>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mod.impact === 'high' ? 'bg-red-900/20 text-red-300' :
                      mod.impact === 'medium' ? 'bg-yellow-900/20 text-yellow-300' :
                      'bg-green-900/20 text-green-300'
                    }`}>
                      {mod.impact} impact
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm mb-3">{mod.description}</p>
                  <div className="space-y-2">
                    {mod.examples.map((example, exampleIndex) => (
                      <label key={exampleIndex} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModifications.includes(example)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModifications([...selectedModifications, example]);
                            } else {
                              setSelectedModifications(selectedModifications.filter(m => m !== example));
                            }
                          }}
                          className="rounded border-border-primary"
                        />
                        <span className="text-text-primary text-sm">{example}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleApplyModifications}
                disabled={isLoading || selectedModifications.length === 0}
                className="flex-1 bg-accent-purple hover:bg-accent-purple/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Apply Modifications
              </button>
              <button
                onClick={() => setShowModifications(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Processing Queue</span>
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handleClearCompleted}
              className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 border border-blue-400/30 rounded"
            >
              Clear Completed
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1 border border-red-400/30 rounded"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">{queueStats.total}</div>
            <div className="text-xs text-text-secondary">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{queueStats.pending}</div>
            <div className="text-xs text-text-secondary">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{queueStats.processing}</div>
            <div className="text-xs text-text-secondary">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{queueStats.completed}</div>
            <div className="text-xs text-text-secondary">Completed</div>
          </div>
        </div>

        {/* Queue Items */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items in queue</p>
              <p className="text-sm">Extract a YouTube transcript to add items to the queue</p>
            </div>
          ) : (
            queue.map((item) => {
              const statusDisplay = getStatusDisplay(item.status);
              const StatusIcon = statusDisplay.icon;
              
              return (
                <div
                  key={item.id}
                  className={`${statusDisplay.bg} ${statusDisplay.border} border rounded-lg p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
                        <h4 className="font-medium text-text-primary truncate">{item.title}</h4>
                        <span className="text-xs text-text-secondary bg-bg-secondary/50 px-2 py-0.5 rounded">
                          {item.language}
                        </span>
                      </div>
                      
                      <div className="text-sm text-text-secondary mb-2">
                        Voice: {item.voice} • Created: {item.createdAt.toLocaleString()}
                      </div>

                      {item.status === 'processing' && (
                        <div className="w-full bg-bg-secondary rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {item.error && (
                        <p className="text-red-400 text-sm mb-2">{item.error}</p>
                      )}

                      {item.processedAt && (
                        <p className="text-green-400 text-sm">Completed: {item.processedAt.toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleGenerateAudio(item.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                          title="Generate Audio"
                        >
                          Generate
                        </button>
                      )}
                      
                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetryItem(item.id)}
                          className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {item.status === 'completed' && item.audioFile && (
                        <button
                          onClick={() => handlePlayAudio(item.audioFile)}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                          title="Play Audio"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubeQueue;
