// Global YouTube API configuration
// This key is shared across all users for channel data fetching

class YouTubeConfigService {
  private static instance: YouTubeConfigService;
  private apiKey: string | null = null;
  private readonly STORAGE_KEY = 'youtube_api_key_global';

  private constructor() {
    // Load API key from localStorage on initialization
    this.loadApiKey();
  }

  static getInstance(): YouTubeConfigService {
    if (!YouTubeConfigService.instance) {
      YouTubeConfigService.instance = new YouTubeConfigService();
    }
    return YouTubeConfigService.instance;
  }

  private loadApiKey(): void {
    try {
      const savedKey = localStorage.getItem(this.STORAGE_KEY);
      if (savedKey) {
        this.apiKey = savedKey;
        console.log('YouTube API key loaded from storage');
      }
    } catch (error) {
      console.error('Error loading YouTube API key:', error);
    }
  }

  setApiKey(apiKey: string): boolean {
    try {
      this.apiKey = apiKey;
      localStorage.setItem(this.STORAGE_KEY, apiKey);
      console.log('YouTube API key saved globally');
      return true;
    } catch (error) {
      console.error('Error saving YouTube API key:', error);
      return false;
    }
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.trim() !== '';
  }

  clearApiKey(): void {
    this.apiKey = null;
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('YouTube API key cleared');
  }

  // Validate API key format (basic validation)
  isValidApiKey(apiKey: string): boolean {
    // YouTube API keys are typically 39 characters long and start with 'AIza'
    return Boolean(apiKey && apiKey.length >= 35 && apiKey.startsWith('AIza'));
  }
}

export default YouTubeConfigService;
