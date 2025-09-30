import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mic, Loader, Save } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { AzureTTSService } from '../../services/azureTTS';
import { AudioStorageService } from '../../services/audioStorage';
import { AzureVoice } from '../../types';
import AudioLibrary from './AudioLibrary';

const AzureTTS: React.FC = () => {
  const { user } = useSimpleAuth();
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<AzureVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [customFilename, setCustomFilename] = useState('');

  const audioStorage = useMemo(() => AudioStorageService.getInstance(), []);

  const ttsService = useMemo(() => {
    // Get API key from localStorage using user ID
    const getAzureApiKey = () => {
      if (!user?.id) return null;
      const key = localStorage.getItem(`azure_api_key_${user.id}`);
      console.log('AzureTTS: Retrieved API key from localStorage:', key ? `${key.substring(0, 8)}...` : 'none');
      return key;
    };

    const getAzureRegion = () => {
      if (!user?.id) return 'eastus';
      const region = localStorage.getItem(`azure_region_${user.id}`) || 'eastus';
      console.log('AzureTTS: Retrieved region from localStorage:', region);
      return region;
    };

    const currentApiKey = getAzureApiKey();
    const currentRegion = getAzureRegion();
    
    console.log('AzureTTS: Creating service with:', {
      userId: user?.id,
      apiKey: currentApiKey ? `${currentApiKey.substring(0, 8)}...` : 'none',
      region: currentRegion,
      hasApiKey: !!currentApiKey
    });
    
    // Always create service, even without API key (for voices)
    return new AzureTTSService(currentApiKey || 'demo-key', currentRegion);
  }, [user?.id]);

  const loadVoices = useCallback(async () => {
    if (!ttsService) return;
    
    try {
      setIsLoading(true);
      console.log('AzureTTS: Loading voices...');
      const availableVoices = await ttsService.getAvailableVoices();
      console.log('AzureTTS: Received voices:', availableVoices.length);
      setVoices(availableVoices);
      
      if (availableVoices.length === 0) {
        setError('No voices available. Please configure your Azure TTS API key in Settings.');
      } else {
        setError('');
      }
    } catch (error) {
      console.error('AzureTTS: Error loading voices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load voices: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [ttsService]);

  useEffect(() => {
    if (ttsService) {
      loadVoices();
    }
  }, [ttsService, loadVoices]);

  useEffect(() => {
    // Filter voices by selected language
    if (voices.length > 0 && selectedLanguage) {
      const languageVoices = getLanguageVoices();
      if (languageVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(languageVoices[0].ShortName);
      }
    }
  }, [voices, selectedLanguage, selectedVoice, getLanguageVoices]);

  const handleSynthesize = async () => {
    if (!ttsService || !selectedVoice || !text.trim()) {
      setError('Please provide text and select a voice.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setProgress({ current: 0, total: 0 });

      const audioBuffer = await ttsService.synthesizeLongText(
        text,
        selectedVoice,
        selectedLanguage,
        (current, total) => setProgress({ current, total })
      );

          // Generate filename
          const timestamp = Date.now();
          const filename = customFilename.trim() 
            ? `${customFilename.trim()}.wav`
            : `tts-${timestamp}.wav`;

          // Save to user's audio storage
          if (user?.id) {
            await audioStorage.saveAudio(
              user.id,
              audioBuffer,
              selectedVoice,
              text,
              filename
            );
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
          }

    } catch (error) {
      setError('Failed to synthesize speech. Please check your API key and try again.');
      console.error('Error synthesizing speech:', error);
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };


  const getLanguageVoices = useCallback(() => {
    // Map full language names back to codes for filtering
    const languageCodeMap: { [key: string]: string } = {
      'English': 'en',
      'German': 'de',
      'French': 'fr',
      'Italian': 'it',
      'Spanish': 'es',
      'Romanian': 'ro',
      'Portuguese': 'pt',
      'Dutch': 'nl',
      'Swedish': 'sv',
      'Polish': 'pl',
      'Danish': 'da',
      'Norwegian': 'no'
    };
    
    const languageCode = languageCodeMap[selectedLanguage] || selectedLanguage;
    
    return voices.filter(voice => {
      // Extract locale from the Name property
      const nameMatch = voice.Name?.match(/\(([^,]+),/);
      const locale = nameMatch ? nameMatch[1] : '';
      return locale.toLowerCase().startsWith(languageCode.toLowerCase());
    });
  }, [voices, selectedLanguage]);

  const getAvailableLanguages = () => {
    const languageSet = new Set(voices.map(voice => {
      // Extract locale from the Name property (e.g., "Microsoft Server Speech Text to Speech Voice (en-US, AndrewNeural)")
      const nameMatch = voice.Name?.match(/\(([^,]+),/);
      return nameMatch ? nameMatch[1].split('-')[0] : '';
    }).filter(lang => lang !== ''));
    const languages = Array.from(languageSet);
    
    // Map language codes to full language names
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'de': 'German',
      'fr': 'French',
      'it': 'Italian',
      'es': 'Spanish',
      'ro': 'Romanian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'pl': 'Polish',
      'da': 'Danish',
      'no': 'Norwegian'
    };
    
    return languages
      .map(lang => languageMap[lang] || lang)
      .filter(lang => languageMap[Object.keys(languageMap).find(key => languageMap[key] === lang) || ''] || Object.values(languageMap).includes(lang))
      .sort();
  };

  // Debug logging
  console.log('AzureTTS: User object:', user);
  console.log('AzureTTS: User ID:', user?.id);
  console.log('AzureTTS: Voices array:', voices);
  console.log('AzureTTS: Voices length:', voices.length);
  console.log('AzureTTS: First few voices:', voices.slice(0, 3));
  console.log('AzureTTS: Available languages:', getAvailableLanguages());
  console.log('AzureTTS: Selected language:', selectedLanguage);
  console.log('AzureTTS: Language voices:', getLanguageVoices());

  // Check if API key is available for synthesis
  const hasApiKey = useMemo(() => {
    if (!user?.id) return false;
    return !!localStorage.getItem(`azure_api_key_${user.id}`);
  }, [user?.id]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <Mic size={32} className="text-accent-purple" />
          <h1 className="text-3xl font-bold text-text-primary">Free HQ TTS</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <div className="card h-full">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Text Input
              </h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Enter your text (up to 30,000+ characters)
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input min-h-[300px] resize-none"
                  placeholder="Enter the text you want to convert to speech..."
                  maxLength={1000000}
                />
                <div className="text-right text-sm text-text-secondary mt-2">
                  {text.length.toLocaleString()} characters
                </div>
              </div>

              {/* Voice Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="input"
                    disabled={isLoading}
                  >
                    {getAvailableLanguages().map(lang => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Voice
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="input"
                    disabled={isLoading || getLanguageVoices().length === 0}
                  >
                    {getLanguageVoices().map(voice => (
                      <option key={voice.ShortName} value={voice.ShortName}>
                        {voice.DisplayName} ({voice.Gender})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Filename */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Custom Filename (Optional)
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="input"
                  placeholder="Enter custom filename (without .wav extension)"
                  disabled={isLoading}
                  maxLength={50}
                />
                <div className="text-xs text-text-secondary mt-1">
                  Leave empty for auto-generated filename
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleSynthesize}
                disabled={isLoading || !text.trim() || !selectedVoice || !hasApiKey}
                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="animate-spin" size={20} />
                    <span>Generating Speech...</span>
                  </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Mic size={20} />
                      <span>{hasApiKey ? 'Generate Audio' : 'API Key Required'}</span>
                    </div>
                  )}
              </button>
              
              {!hasApiKey && (
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    <strong>API Key Required:</strong> Please configure your Azure TTS API key in the Settings page to generate speech.
                  </p>
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className="mt-2 text-yellow-400 hover:text-yellow-300 underline text-sm"
                  >
                    Go to Settings
                  </button>
                </div>
              )}

              {/* Progress */}
              {isLoading && progress.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-text-secondary mb-2">
                    <span>Processing chunks...</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-dark-card rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-accent-purple to-accent-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {showSaveSuccess && (
                <div className="mt-4 bg-green-900/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
                  <div className="flex items-center">
                    <Save size={16} className="mr-2" />
                    Audio generated and saved to your library (24h)
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                  {!hasApiKey && (
                    <div className="mt-2">
                      <button
                        onClick={() => window.location.href = '/settings'}
                        className="text-red-300 hover:text-red-200 underline text-sm"
                      >
                        Configure API Key in Settings
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Audio Library Section */}
          <div className="lg:col-span-1">
            <div className="h-full">
              <AudioLibrary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AzureTTS;
