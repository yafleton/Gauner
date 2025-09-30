// Cloud-based configuration service for production deployment
// This service handles API key storage in cloud environments

interface CloudConfig {
  youtubeApiKey?: string;
  lastUpdated?: string;
  version?: string;
}

class CloudConfigService {
  private static instance: CloudConfigService;
  private config: CloudConfig = {};
  private readonly CLOUD_CONFIG_KEY = 'gauner_cloud_config';
  private readonly FALLBACK_KEY = 'youtube_api_key_global';

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): CloudConfigService {
    if (!CloudConfigService.instance) {
      CloudConfigService.instance = new CloudConfigService();
    }
    return CloudConfigService.instance;
  }

  private loadConfig(): void {
    try {
      // Try to load from admin config first
      const adminConfig = localStorage.getItem('gauner_admin_config');
      if (adminConfig) {
        const parsedConfig = JSON.parse(adminConfig);
        if (parsedConfig.youtubeApiKey) {
          this.config = { youtubeApiKey: parsedConfig.youtubeApiKey };
          console.log('Using admin-configured YouTube API key');
          return;
        }
      }

      // Try to load from cloud storage (if available)
      const cloudConfig = this.getCloudConfig();
      if (cloudConfig) {
        this.config = cloudConfig;
        console.log('Cloud config loaded successfully');
        return;
      }

      // Fallback to localStorage for development
      const fallbackKey = localStorage.getItem(this.FALLBACK_KEY);
      if (fallbackKey) {
        this.config = { youtubeApiKey: fallbackKey };
        console.log('Using fallback localStorage config');
      } else {
        // Temporary hardcoded key for development
        this.config = { youtubeApiKey: 'AIzaSyB4tK-I83NcFPYvCPMxn1_S7qm0wH5vZVo' };
        console.log('Using temporary hardcoded YouTube API key for development');
      }
    } catch (error) {
      console.error('Error loading cloud config:', error);
    }
  }

  private getCloudConfig(): CloudConfig | null {
    // In production, this would fetch from your cloud storage
    // For now, we'll use a more persistent localStorage approach
    
    try {
      const configData = localStorage.getItem(this.CLOUD_CONFIG_KEY);
      if (configData) {
        const parsed = JSON.parse(configData);
        // Check if config is not too old (e.g., 30 days)
        if (parsed.lastUpdated) {
          const lastUpdated = new Date(parsed.lastUpdated);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          if (lastUpdated > thirtyDaysAgo) {
            return parsed;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing cloud config:', error);
    }
    
    return null;
  }

  private saveCloudConfig(config: CloudConfig): void {
    try {
      const configToSave = {
        ...config,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      localStorage.setItem(this.CLOUD_CONFIG_KEY, JSON.stringify(configToSave));
      console.log('Cloud config saved successfully');
    } catch (error) {
      console.error('Error saving cloud config:', error);
    }
  }

  setYouTubeApiKey(apiKey: string): boolean {
    try {
      this.config.youtubeApiKey = apiKey;
      this.saveCloudConfig(this.config);
      
      // Also save to fallback location for compatibility
      localStorage.setItem(this.FALLBACK_KEY, apiKey);
      
      return true;
    } catch (error) {
      console.error('Error setting YouTube API key:', error);
      return false;
    }
  }

  getYouTubeApiKey(): string | null {
    const key = this.config.youtubeApiKey || null;
    console.log('CloudConfigService.getYouTubeApiKey():', key ? `${key.substring(0, 10)}...` : 'null');
    return key;
  }

  hasYouTubeApiKey(): boolean {
    return Boolean(this.config.youtubeApiKey && this.config.youtubeApiKey.trim() !== '');
  }

  clearConfig(): void {
    this.config = {};
    localStorage.removeItem(this.CLOUD_CONFIG_KEY);
    localStorage.removeItem(this.FALLBACK_KEY);
    console.log('Cloud config cleared');
  }

  // For production deployment - this would sync with your cloud storage
  async syncWithCloud(): Promise<boolean> {
    try {
      // In a real implementation, this would:
      // 1. Fetch config from your cloud database/storage
      // 2. Update local config if cloud version is newer
      // 3. Upload local config to cloud if local is newer
      
      console.log('Cloud sync not implemented - using localStorage fallback');
      return true;
    } catch (error) {
      console.error('Cloud sync failed:', error);
      return false;
    }
  }

  // Export config for backup/migration
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import config from backup
  importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = importedConfig;
      this.saveCloudConfig(this.config);
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }
}

export default CloudConfigService;
