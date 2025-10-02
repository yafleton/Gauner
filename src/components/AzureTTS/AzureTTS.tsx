import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mic, Loader, Save, Cloud, Scissors, Languages } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { AzureTTSService } from '../../services/azureTTS';
import GoogleDriveStorageService from '../../services/googleDriveStorage';
import { AzureVoice } from '../../types';
import AudioLibrary from './AudioLibrary';
import { v4 as uuidv4 } from 'uuid';
import { transcriptCleanupService } from '../../services/transcriptCleanupService';

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
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');
  const [isGoogleDriveReady, setIsGoogleDriveReady] = useState(false);
  const [googleDriveAuthStatus, setGoogleDriveAuthStatus] = useState<'checking' | 'authenticated' | 'not-authenticated' | 'error'>('checking');
  const [isCleaning, setIsCleaning] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // audioStorage removed - using Google Drive only
  const googleDriveStorage = useMemo(() => GoogleDriveStorageService.getInstance(), []);

  const ttsService = useMemo(() => {
    // Get API key from user object
    const currentApiKey = user?.azureApiKey;
    const currentRegion = user?.azureRegion || 'eastus';
    
    console.log('AzureTTS: Creating service with:', {
      userId: user?.id,
      apiKey: currentApiKey ? `${currentApiKey.substring(0, 8)}...` : 'none',
      region: currentRegion,
      hasApiKey: !!currentApiKey
    });
    
    // Always create service, even without API key (for voices)
    return new AzureTTSService(currentApiKey || 'demo-key', currentRegion);
  }, [user?.id, user?.azureApiKey, user?.azureRegion]);


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
      console.log('🔄 Voice loading completed, setting isLoading to false');
      setIsLoading(false);
    }
  }, [ttsService]);

  useEffect(() => {
    if (ttsService) {
      console.log('🔄 useEffect: Loading voices because ttsService changed');
      loadVoices();
    }
  }, [ttsService, loadVoices]);

  // Add page visibility detection for mobile browsers
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPaused(!isVisible && isLoading);
      
      if (!isVisible && isLoading) {
        console.log('📱 Mobile: Page hidden during audio generation - pausing');
      } else if (isVisible && isPaused) {
        console.log('📱 Mobile: Page visible again - resuming');
        setIsPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoading, isPaused]);

  // Handle transcript cleanup
  const handleCleanupTranscript = async () => {
    if (!text.trim()) {
      setError('Please enter some text to clean up.');
      return;
    }

    try {
      setIsCleaning(true);
      setError('');

      const cleanedText = transcriptCleanupService.cleanTranscript(text);
      setText(cleanedText);
      
      console.log('✅ Transcript cleaned successfully');
    } catch (error) {
      console.error('❌ Failed to clean transcript:', error);
      setError('Failed to clean transcript. Please try again.');
    } finally {
      setIsCleaning(false);
    }
  };

  // Handle translation
  const handleTranslateTranscript = async () => {
    if (!text.trim()) {
      setError('Please enter some text to translate.');
      return;
    }

    const targetLanguage = transcriptCleanupService.getLanguageName(selectedLanguage);
    
    try {
      setIsTranslating(true);
      setError('');

      const translatedText = await transcriptCleanupService.translateText({
        targetLanguage,
        sourceText: text
      });
      
      setText(translatedText);
      console.log('✅ Transcript translated successfully');
    } catch (error) {
      console.error('❌ Failed to translate transcript:', error);
      setError('Failed to translate transcript. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle cleanup and translation combined
  const handleCleanAndTranslate = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to clean and translate.');
      return;
    }

    const targetLanguage = transcriptCleanupService.getLanguageName(selectedLanguage);
    
    try {
      setIsCleaning(true);
      setIsTranslating(true);
      setError('');

      const result = await transcriptCleanupService.cleanAndTranslate(text, targetLanguage);
      setText(result);
      
      console.log('✅ Transcript cleaned and translated successfully');
    } catch (error) {
      console.error('❌ Failed to clean and translate transcript:', error);
      setError('Failed to clean and translate transcript. Please try again.');
    } finally {
      setIsCleaning(false);
      setIsTranslating(false);
    }
  }, [text, selectedLanguage]);

  // Auto-clean and translate when German is selected
  useEffect(() => {
    if (selectedLanguage.toLowerCase() === 'german' && text.trim()) {
      const isVTT = transcriptCleanupService.isVTTTranscript(text);
      if (isVTT) {
        console.log('🇩🇪 German selected with VTT transcript - auto cleaning and translating...');
        handleCleanAndTranslate();
      }
    }
  }, [selectedLanguage, text, handleCleanAndTranslate]);

  // Check Google Drive status
  useEffect(() => {
    const checkGoogleDriveStatus = async () => {
      try {
        console.log('🔍 Checking Google Drive status...');
        const isReady = googleDriveStorage.isReady();
        console.log('🔍 Google Drive ready:', isReady);
        setIsGoogleDriveReady(isReady);
        
        if (isReady) {
          const isAuth = await googleDriveStorage.isAuthenticated();
          console.log('🔍 Google Drive authenticated:', isAuth);
          setGoogleDriveAuthStatus(isAuth ? 'authenticated' : 'not-authenticated');
        } else {
          console.log('🔍 Google Drive not ready, setting status to error');
          setGoogleDriveAuthStatus('error');
        }
      } catch (error) {
        console.error('Google Drive status check failed:', error);
        setGoogleDriveAuthStatus('error');
      }
    };

    checkGoogleDriveStatus();
    // Poll for status every 5 seconds
    const interval = setInterval(checkGoogleDriveStatus, 5000);
    return () => clearInterval(interval);
  }, [googleDriveStorage]);

  const getLanguageVoices = useCallback(() => {
    // Map full language names back to codes for filtering
    const languageCodeMap: { [key: string]: string } = {
      'English': 'en',
      'German': 'de',
      'French': 'fr',
      'Spanish': 'es',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Russian': 'ru',
      'Japanese': 'ja',
      'Korean': 'ko',
      'Chinese': 'zh',
      'Arabic': 'ar',
      'Dutch': 'nl',
      'Polish': 'pl',
      'Turkish': 'tr',
      'Swedish': 'sv',
      'Norwegian': 'no',
      'Danish': 'da',
      'Finnish': 'fi',
      'Greek': 'el',
      'Hebrew': 'he',
      'Hindi': 'hi',
      'Thai': 'th',
      'Vietnamese': 'vi',
      'Indonesian': 'id',
      'Malay': 'ms',
      'Filipino': 'fil',
      'Ukrainian': 'uk',
      'Czech': 'cs',
      'Hungarian': 'hu',
      'Romanian': 'ro',
      'Bulgarian': 'bg',
      'Croatian': 'hr',
      'Slovak': 'sk',
      'Slovenian': 'sl',
      'Estonian': 'et',
      'Latvian': 'lv',
      'Lithuanian': 'lt',
      'Icelandic': 'is',
      'Irish': 'ga',
      'Welsh': 'cy',
      'Basque': 'eu',
      'Catalan': 'ca',
      'Galician': 'gl',
      'Maltese': 'mt',
      'Luxembourgish': 'lb',
      'Afrikaans': 'af',
      'Amharic': 'am',
      'Azerbaijani': 'az',
      'Bengali': 'bn',
      'Bosnian': 'bs',
      'Georgian': 'ka',
      'Gujarati': 'gu',
      'Kannada': 'kn',
      'Kazakh': 'kk',
      'Khmer': 'km',
      'Lao': 'lo',
      'Macedonian': 'mk',
      'Malayalam': 'ml',
      'Marathi': 'mr',
      'Mongolian': 'mn',
      'Myanmar': 'my',
      'Nepali': 'ne',
      'Persian': 'fa',
      'Punjabi': 'pa',
      'Serbian': 'sr',
      'Sinhala': 'si',
      'Tamil': 'ta',
      'Telugu': 'te',
      'Urdu': 'ur',
      'Uzbek': 'uz',
      'Yoruba': 'yo',
      'Zulu': 'zu'
    };
    
    const languageCode = languageCodeMap[selectedLanguage] || selectedLanguage;
    
    return voices.filter(voice => {
      // Extract locale from the Name property
      const nameMatch = voice.Name?.match(/\(([^,]+),/);
      const locale = nameMatch ? nameMatch[1] : '';
      return locale.toLowerCase().startsWith(languageCode.toLowerCase());
    });
  }, [voices, selectedLanguage]);

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
    console.log('🎵 handleSynthesize called');
    console.log('🔍 handleSynthesize - ttsService:', !!ttsService);
    console.log('🔍 handleSynthesize - selectedVoice:', selectedVoice);
    console.log('🔍 handleSynthesize - text length:', text.trim().length);
    
    if (!ttsService || !selectedVoice || !text.trim()) {
      console.log('❌ handleSynthesize - validation failed');
      setError('Please provide text and select a voice.');
      return;
    }

    console.log('✅ handleSynthesize - validation passed, starting synthesis');
    
    try {
      setIsLoading(true);
      setError('');
      setProgress({ current: 0, total: 0 });
      
      console.log('🔄 handleSynthesize - starting Azure TTS call');

      // Convert language name to language code for Azure TTS
      const languageCodeMap: { [key: string]: string } = {
        'English': 'en-US',
        'German': 'de-DE',
        'French': 'fr-FR',
        'Spanish': 'es-ES',
        'Italian': 'it-IT',
        'Portuguese': 'pt-PT',
        'Russian': 'ru-RU',
        'Japanese': 'ja-JP',
        'Korean': 'ko-KR',
        'Chinese': 'zh-CN',
        'Arabic': 'ar-SA',
        'Dutch': 'nl-NL',
        'Polish': 'pl-PL',
        'Romanian': 'ro-RO',
        'Swedish': 'sv-SE',
        'Danish': 'da-DK',
        'Norwegian': 'nb-NO'
      };
      
      const languageCode = languageCodeMap[selectedLanguage] || selectedLanguage;

      console.log('🎯 About to call synthesizeLongText with:', {
        textLength: text.length,
        selectedVoice,
        languageCode,
        ttsServiceExists: !!ttsService
      });

      const audioBuffer = await ttsService.synthesizeLongText(
        text,
        selectedVoice,
        languageCode,
        (current, total) => {
          console.log(`📊 Progress: ${current}/${total}`);
          setProgress({ current, total });
        }
      );

      console.log('✅ synthesizeLongText completed, audioBuffer size:', audioBuffer.byteLength);

      // Test: Download the audio file directly to verify it's not corrupt
      const testBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const testUrl = URL.createObjectURL(testBlob);
      console.log('🔍 Test audio URL created:', testUrl);
      
      // Create a temporary download link to test the file
      const testLink = document.createElement('a');
      testLink.href = testUrl;
      testLink.download = 'test-direct.mp3';
      testLink.style.display = 'none';
      document.body.appendChild(testLink);
      console.log('🔍 Test download link created - check your downloads folder for test-direct.mp3');

      // Generate filename
      const timestamp = Date.now();
      const generatedFilename = customFilename.trim()
        ? `${customFilename.trim()}.mp3`
        : `tts-${timestamp}.mp3`;

      // Save to user's audio storage
      if (user?.id) {
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
        
        // Create audio file object
        const audioFile = {
          id: uuidv4(),
          userId: user.id,
          filename: generatedFilename,
          blob: audioBlob,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          voice: selectedVoice,
          text: text.substring(0, 100), // First 100 chars
          size: audioBlob.size,
        };

        // Save to Google Drive via backend (to avoid CORS issues)
        if (isGoogleDriveReady && googleDriveAuthStatus === 'authenticated') {
          console.log('🔄 Uploading to Google Drive via backend...');
          try {
            const accessToken = localStorage.getItem('google_drive_access_token');
            if (!accessToken) {
              throw new Error('No Google Drive access token available');
            }

            // Create FormData for backend upload
            const formData = new FormData();
            formData.append('audioFile', audioBlob, audioFile.filename);
            formData.append('accessToken', accessToken);
            formData.append('userId', user.id);
            formData.append('filename', audioFile.filename);
            formData.append('metadata', JSON.stringify({
              ...audioFile,
              userId: user.id,
              uploadedAt: new Date().toISOString(),
              deviceId: 'browser-' + Date.now()
            }));

            // Upload via Cloudflare Worker backend to avoid CORS
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://gauner-backend.danielfahmy02.workers.dev';
            const uploadResponse = await fetch(`${backendUrl}/api/upload-to-drive`, {
              method: 'POST',
              body: formData
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`Backend upload failed: ${uploadResponse.status} - ${errorText}`);
            }

            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
              console.log('✅ Audio file saved to Google Drive via backend');
              setShowSaveSuccess(true);
              setTimeout(() => setShowSaveSuccess(false), 3000);
            } else {
              throw new Error(uploadResult.error || 'Backend upload failed');
            }
          } catch (error) {
            console.error('❌ Google Drive upload failed:', error);
            console.warn('⚠️ Google Drive save failed, but audio was generated successfully');
            setShowSaveSuccess(true); // Show success because audio was generated
            setTimeout(() => setShowSaveSuccess(false), 3000);
            // Don't return - continue to show success
          }
        } else {
          console.log('❌ Google Drive not available - cannot save audio');
          setError('Google Drive is required to save audio files. Please authenticate with Google Drive first.');
          return;
        }

        setCustomFilename('');
      }

    } catch (error) {
      // Better error handling for different types of errors
      if (error instanceof Error) {
        if (error.message.includes('API key not configured')) {
          setError('Azure TTS API key not configured. Please set up your API key in Settings.');
        } else if (error.message.includes('AbortError') || error.message.includes('fetch')) {
          setError('Network connection interrupted. This can happen when switching tabs on mobile. Please try again.');
        } else if (error.message.includes('TTS synthesis failed')) {
          setError('Azure TTS service error. Please check your API key and try again.');
        } else {
          setError('Failed to synthesize speech. Please try again.');
        }
      } else {
        setError('Failed to synthesize speech. Please try again.');
      }
      console.error('Error synthesizing speech:', error);
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };



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
    console.log('AzureTTS: hasApiKey check:', {
      user: user ? 'exists' : 'null',
      azureApiKey: user?.azureApiKey ? `${user.azureApiKey.substring(0, 8)}...` : 'none',
      hasApiKey: !!user?.azureApiKey
    });
    return !!user?.azureApiKey;
  }, [user]);

  // Debug button state
  const buttonDisabled = isLoading || !text.trim() || !selectedVoice || !hasApiKey;
  console.log('🔘 Generate button state:', {
    isLoading,
    textLength: text.trim().length,
    selectedVoice,
    hasApiKey,
    buttonDisabled
  });

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <Mic size={32} className="text-accent-purple" />
          <h1 className="text-3xl font-bold text-text-primary">Free HQ TTS</h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
              activeTab === 'generate'
                ? 'bg-accent-purple text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
            }`}
          >
            <Mic size={18} />
            <span>Generate</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
              activeTab === 'library'
                ? 'bg-accent-purple text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
            }`}
          >
            <Cloud size={18} />
            <span>Audio Library</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Input Section */}
            <div className="lg:col-span-2">
              <div className="card h-full">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Text Input
              </h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Enter your text (up to 30,000+ characters)
                  </label>
                  <div className="flex space-x-2">
                    {/* Cleanup Button */}
                    <button
                      onClick={handleCleanupTranscript}
                      disabled={isCleaning || !text.trim()}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Clean VTT transcript (remove timestamps, tags, duplicates)"
                    >
                      {isCleaning ? (
                        <Loader className="animate-spin" size={12} />
                      ) : (
                        <Scissors size={12} />
                      )}
                      <span>{isCleaning ? 'Cleaning...' : 'Clean'}</span>
                    </button>
                    
                    {/* Translate Button */}
                    <button
                      onClick={handleTranslateTranscript}
                      disabled={isTranslating || !text.trim()}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Translate text to selected language"
                    >
                      {isTranslating ? (
                        <Loader className="animate-spin" size={12} />
                      ) : (
                        <Languages size={12} />
                      )}
                      <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
                    </button>
                    
                    {/* Clean & Translate Button */}
                    <button
                      onClick={handleCleanAndTranslate}
                      disabled={isCleaning || isTranslating || !text.trim()}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Clean and translate in one operation"
                    >
                      {(isCleaning || isTranslating) ? (
                        <Loader className="animate-spin" size={12} />
                      ) : (
                        <>
                          <Scissors size={12} />
                          <Languages size={12} />
                        </>
                      )}
                      <span>
                        {(isCleaning || isTranslating) ? 'Processing...' : 'Clean & Translate'}
                      </span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(''); // Clear error when user starts typing
                  }}
                  className="input min-h-[300px] resize-none"
                  placeholder="Enter the text you want to convert to speech, or paste a VTT transcript to clean up..."
                  maxLength={1000000}
                />
                <div className="flex justify-between items-center text-sm text-text-secondary mt-2">
                  <div>
                    {text.trim() && transcriptCleanupService.isVTTTranscript(text) && (
                      <span className="text-blue-400">📝 VTT transcript detected</span>
                    )}
                  </div>
                  <div>
                    {text.length.toLocaleString()} characters
                  </div>
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
                  placeholder="Enter custom filename (without .mp3 extension)"
                  disabled={isLoading}
                  maxLength={50}
                />
                <div className="text-xs text-text-secondary mt-1">
                  Leave empty for auto-generated filename
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={(e) => {
                  console.log('🔘 Generate button clicked!', {
                    disabled: buttonDisabled,
                    isLoading,
                    textLength: text.trim().length,
                    selectedVoice,
                    hasApiKey
                  });
                  if (!buttonDisabled) {
                    handleSynthesize();
                  } else {
                    console.log('❌ Button click ignored - button is disabled');
                  }
                }}
                disabled={buttonDisabled}
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

              {/* Mobile Pause Warning */}
              {isPaused && (
                <div className="mt-4 bg-orange-900/20 border border-orange-500/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-pulse">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-orange-300 font-medium">Audio Generation Paused</p>
                      <p className="text-orange-200 text-sm">
                        📱 Switch back to this tab to continue generation
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {isLoading && progress.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-text-secondary mb-2">
                    <span>{isPaused ? 'Paused - Switch back to continue...' : 'Processing chunks...'}</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-dark-card rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isPaused 
                          ? 'bg-orange-500 animate-pulse' 
                          : 'bg-gradient-to-r from-accent-purple to-accent-blue'
                      }`}
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
                    {isGoogleDriveReady && googleDriveAuthStatus === 'authenticated' 
                      ? 'Audio saved to Google Drive!' 
                      : 'Audio saved to local library!'
                    }
                  </div>
                </div>
              )}

              {/* Google Drive Status */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Cloud size={16} className="text-blue-400" />
                  <span className="text-blue-300 font-medium text-sm">Google Drive Status</span>
                </div>
                {googleDriveAuthStatus === 'checking' && (
                  <p className="text-blue-200 text-xs">Checking Google Drive connection...</p>
                )}
                {googleDriveAuthStatus === 'authenticated' && (
                  <div>
                    <p className="text-green-300 text-xs">✅ Connected to Google Drive</p>
                    <p className="text-green-200 text-xs">Audio files will sync across all your devices</p>
                  </div>
                )}
                {googleDriveAuthStatus === 'not-authenticated' && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-300 text-sm font-medium">⚠️ Google Drive Required</p>
                    <p className="text-yellow-200 text-xs mt-1">Connect to Google Drive to save and sync audio files across devices</p>
                    <button
                      onClick={async () => {
                        console.log('🔄 Starting Google Drive authentication...');
                        const success = await googleDriveStorage.authenticate();
                        if (success) {
                          setGoogleDriveAuthStatus('authenticated');
                          console.log('✅ Google Drive connected successfully');
                        } else {
                          setGoogleDriveAuthStatus('error');
                          console.error('❌ Google Drive authentication failed');
                        }
                      }}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors font-medium"
                    >
                      Connect Google Drive
                    </button>
                  </div>
                )}
                {googleDriveAuthStatus === 'error' && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-300 text-sm font-medium">❌ Google Drive Connection Failed</p>
                    <p className="text-red-200 text-xs mt-1">Authentication token may be expired. Clear and retry.</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          googleDriveStorage.clearAuthentication();
                          setGoogleDriveAuthStatus('not-authenticated');
                        }}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors font-medium"
                      >
                        Clear & Retry
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors font-medium"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
        )}


        {activeTab === 'library' && (
          <div className="max-w-4xl mx-auto">
            <AudioLibrary />
          </div>
        )}
      </div>
    </div>
  );
};

export default AzureTTS;
