import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, Eye, EyeOff, CheckCircle, Cloud, Download, Upload } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import YouTubeConfigService from '../../services/youtubeConfig';
import CloudConfigService from '../../services/cloudConfig';

const Settings: React.FC = () => {
  const { user, updateAzureKey, updateAzureRegion } = useSimpleAuth();
  const [azureKey, setAzureKey] = useState(user?.azureApiKey || '');
  const [azureRegion, setAzureRegion] = useState(user?.azureRegion || 'eastus');
  const [youtubeKey, setYoutubeKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  
  const youtubeConfig = YouTubeConfigService.getInstance();
  const cloudConfig = CloudConfigService.getInstance();

  // Load saved settings from localStorage when user changes
  useEffect(() => {
    console.log('Settings: useEffect triggered, user:', user);
    if (user) {
      console.log('Settings: Loading settings from localStorage');
      
      // Load from localStorage using user ID
      const userKey = `azure_api_key_${user.id}`;
      const regionKey = `azure_region_${user.id}`;
      
      const savedKey = localStorage.getItem(userKey);
      const savedRegion = localStorage.getItem(regionKey);
      const savedYoutubeKey = cloudConfig.getYouTubeApiKey();
      
      console.log('Settings: Loaded from localStorage:', { savedKey, savedRegion, savedYoutubeKey });
      
      if (savedKey) {
        setAzureKey(savedKey);
      }
      if (savedRegion) {
        setAzureRegion(savedRegion);
      }
      if (savedYoutubeKey) {
        setYoutubeKey(savedYoutubeKey);
      }
    }
  }, [user, cloudConfig]);

  const handleSave = async () => {
    if (!azureKey.trim()) {
      setError('Please enter your Azure TTS API key');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveStatus('idle');

    console.log('Settings: Saving API key:', azureKey.trim());
    console.log('Settings: Saving region:', azureRegion);
    console.log('Settings: Saving YouTube key:', youtubeKey.trim());

    try {
      // Save Azure settings
      await updateAzureKey(azureKey.trim());
      await updateAzureRegion(azureRegion);
      
      // Save YouTube key globally if provided
      if (youtubeKey.trim()) {
        if (youtubeConfig.isValidApiKey(youtubeKey.trim())) {
          cloudConfig.setYouTubeApiKey(youtubeKey.trim());
        } else {
          setError('Invalid YouTube API key format');
          return;
        }
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.log('Settings: Settings saved successfully');
      
    } catch (error) {
      setSaveStatus('error');
      setError('An error occurred while saving');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 sm:mb-8">
          <SettingsIcon size={28} className="text-accent-purple sm:w-8 sm:h-8" />
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Settings</h1>
        </div>

        {/* User Info */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Username
              </label>
              <div className="text-text-primary font-medium">
                {user?.username || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <div className="text-text-primary font-medium">
                {user?.email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Member Since
              </label>
              <div className="text-text-primary font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="card">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            API Configuration
          </h2>
          
          <div className="space-y-4">
            {/* Azure TTS Section */}
            <div className="border-b border-border-primary/30 pb-6">
              <h3 className="text-lg font-medium text-text-primary mb-4">Azure TTS</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Azure Speech Service API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={azureKey}
                      onChange={(e) => setAzureKey(e.target.value)}
                      className="input pl-12 pr-12 text-base min-h-[44px]"
                      placeholder="Enter your Azure TTS API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    {azureKey ? `Current key: ${maskKey(azureKey)}` : 'No API key configured'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Azure Region
                  </label>
                  <select
                    value={azureRegion}
                    onChange={(e) => setAzureRegion(e.target.value)}
                    className="input text-base min-h-[44px]"
                  >
                    <option value="eastus">East US</option>
                    <option value="eastus2">East US 2</option>
                    <option value="westus">West US</option>
                    <option value="westus2">West US 2</option>
                    <option value="westus3">West US 3</option>
                    <option value="centralus">Central US</option>
                    <option value="northcentralus">North Central US</option>
                    <option value="southcentralus">South Central US</option>
                    <option value="westcentralus">West Central US</option>
                    <option value="canadacentral">Canada Central</option>
                    <option value="canadaeast">Canada East</option>
                    <option value="brazilsouth">Brazil South</option>
                    <option value="northeurope">North Europe</option>
                    <option value="westeurope">West Europe</option>
                    <option value="uksouth">UK South</option>
                    <option value="ukwest">UK West</option>
                    <option value="francecentral">France Central</option>
                    <option value="francesouth">France South</option>
                    <option value="switzerlandnorth">Switzerland North</option>
                    <option value="switzerlandwest">Switzerland West</option>
                    <option value="germanynorth">Germany North</option>
                    <option value="germanywestcentral">Germany West Central</option>
                    <option value="norwayeast">Norway East</option>
                    <option value="norwaywest">Norway West</option>
                    <option value="swedencentral">Sweden Central</option>
                    <option value="swedensouth">Sweden South</option>
                    <option value="eastasia">East Asia</option>
                    <option value="southeastasia">Southeast Asia</option>
                    <option value="australiaeast">Australia East</option>
                    <option value="australiasoutheast">Australia Southeast</option>
                    <option value="australiacentral">Australia Central</option>
                    <option value="australiacentral2">Australia Central 2</option>
                    <option value="japaneast">Japan East</option>
                    <option value="japanwest">Japan West</option>
                    <option value="koreacentral">Korea Central</option>
                    <option value="koreasouth">Korea South</option>
                    <option value="indiawest">India West</option>
                    <option value="indiasouth">India South</option>
                    <option value="indiacentral">India Central</option>
                    <option value="southafricanorth">South Africa North</option>
                    <option value="southafricawest">South Africa West</option>
                    <option value="uaenorth">UAE North</option>
                    <option value="uaecentral">UAE Central</option>
                  </select>
                  <p className="text-sm text-text-secondary mt-2">
                    Current region: {azureRegion}
                  </p>
                </div>
              </div>
            </div>

            {/* YouTube API Section */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">YouTube Data API</h3>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  YouTube Data API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
                  <input
                    type={showYoutubeKey ? 'text' : 'password'}
                    value={youtubeKey}
                    onChange={(e) => setYoutubeKey(e.target.value)}
                    className="input pl-12 pr-12 text-base min-h-[44px]"
                    placeholder="Enter your YouTube Data API key (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                  >
                    {showYoutubeKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-sm text-text-secondary mt-2">
                  {youtubeKey ? `Current key: ${maskKey(youtubeKey)}` : 'No API key configured'}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Global key shared by all users for Niche Finder channel data
                </p>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2">
                How to get your API Keys:
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-blue-300 mb-1">Azure TTS API Key:</h4>
                  <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Go to the <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">Azure Portal</a></li>
                    <li>Create a new Speech Service resource</li>
                    <li>Choose your preferred region (this affects latency and available voices)</li>
                    <li>Copy the API key from the Keys and Endpoint section</li>
                    <li>Paste it in the field above and select the matching region</li>
                  </ol>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-300 mb-1">YouTube Data API Key:</h4>
                  <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">Google Cloud Console</a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable the YouTube Data API v3</li>
                    <li>Create credentials (API Key)</li>
                    <li>Copy the API key and paste it in the field above</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !azureKey.trim() || !azureRegion}
                className="btn-primary px-6 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
              >
                {isSaving ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save size={20} />
                    <span>Save API Keys</span>
                  </div>
                )}
              </button>

              {saveStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={20} />
                  <span className="text-sm">API keys saved successfully!</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>


        {/* Usage Information */}
        <div className="card mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Usage Information
          </h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <p>
              • Your API keys are stored locally and securely in your browser
            </p>
            <p>
              • Keys are used only for their respective API requests and are not shared
            </p>
            <p>
              • Azure TTS: Process texts up to 30,000+ characters with automatic chunking
            </p>
            <p>
              • Azure TTS: Generated audio files are saved to your library for 24 hours
            </p>
            <p>
              • Azure TTS: Voice selection is filtered by the chosen language
            </p>
            <p>
              • YouTube API: Global key shared by all users for channel data
            </p>
            <p>
              • YouTube API: Channel data is cached globally for 24 hours
            </p>
            <p>
              • YouTube API: Rate limiting is implemented to stay within quotas
            </p>
            <p>
              • Cloud Storage: API keys are stored persistently across sessions
            </p>
            <p>
              • Region selection affects Azure TTS latency and available voices
            </p>
          </div>
        </div>

        {/* Cloud Configuration Section */}
        <div className="bg-card-primary rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Cloud size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-text-primary">Cloud Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Configuration Management</h3>
              <p className="text-xs text-text-secondary mb-3">
                Export and import your configuration for backup or migration purposes.
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const config = cloudConfig.exportConfig();
                    const blob = new Blob([config], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'gauner-config.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                >
                  <Download size={14} />
                  <span>Export Config</span>
                </button>
                
                <label className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors cursor-pointer">
                  <Upload size={14} />
                  <span>Import Config</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (cloudConfig.importConfig(content)) {
                            setSaveStatus('success');
                            setTimeout(() => setSaveStatus('idle'), 3000);
                            // Reload the page to apply new config
                            window.location.reload();
                          } else {
                            setError('Failed to import configuration');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-400 mb-2">Production Deployment</h3>
              <p className="text-xs text-text-secondary mb-2">
                For production deployment, the API key will be stored in cloud storage and shared across all users.
              </p>
              <p className="text-xs text-text-secondary">
                <strong>Current Status:</strong> Using localStorage fallback (development mode)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
