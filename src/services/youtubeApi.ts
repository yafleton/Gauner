import { Channel } from '../types';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  comments: number;
  likes: number;
  uploadDate: string;
  duration: string;
  description?: string;
}

export interface YouTubeChannelResponse {
  kind: string;
  etag: string;
  items: YouTubeChannelItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    defaultLanguage?: string;
    localized?: {
      title: string;
      description: string;
    };
    country?: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  brandingSettings?: {
    channel: {
      title: string;
      description: string;
      keywords?: string;
      defaultTab?: string;
      trackingAnalyticsAccountId?: string;
      moderateComments?: boolean;
      showRelatedChannels?: boolean;
      showBrowseView?: boolean;
      featuredChannelsTitle?: string;
      featuredChannelsUrls?: string[];
      unsubscribedTrailer?: string;
      profileColor?: string;
      defaultLanguage?: string;
      country?: string;
    };
    image: {
      bannerExternalUrl?: string;
    };
  };
}

export interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  items: YouTubeSearchItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeVideoResponse {
  kind: string;
  etag: string;
  items: YouTubeVideoItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

export interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    categoryId: string;
    liveBroadcastContent: string;
    localized?: {
      title: string;
      description: string;
    };
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
}

class YouTubeApiService {
  private static instance: YouTubeApiService;
  private apiKey: string | null = null;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private rateLimitDelay = 100; // 100ms between requests to stay under quota
  private lastRequestTime = 0;

  private constructor() {}

  static getInstance(): YouTubeApiService {
    if (!YouTubeApiService.instance) {
      YouTubeApiService.instance = new YouTubeApiService();
    }
    return YouTubeApiService.instance;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async getChannelDetails(channelIds: string[]): Promise<YouTubeChannelResponse> {
    const params = {
      part: 'snippet,statistics,brandingSettings',
      id: channelIds.join(','),
      maxResults: '50'
    };

    return this.makeRequest<YouTubeChannelResponse>('/channels', params);
  }

  // Get videos for a specific channel
  async getChannelVideosList(channelId: string, maxResults: number = 50): Promise<Video[]> {
    try {
      // First, get the channel's uploads playlist ID
      const channelResponse = await this.makeRequest('/channels', {
        part: 'contentDetails',
        id: channelId
      }) as any;
      
      if (!channelResponse.items || channelResponse.items.length === 0) {
        throw new Error('Channel not found');
      }
      
      const uploadsPlaylistId = channelResponse.items[0].contentDetails.relatedPlaylists.uploads;
      
      // Get videos from the uploads playlist
      const playlistResponse = await this.makeRequest('/playlistItems', {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: maxResults.toString()
      }) as any;
      
      if (!playlistResponse.items || playlistResponse.items.length === 0) {
        return [];
      }
      
      // Extract video IDs
      const videoIds = playlistResponse.items.map((item: any) => item.snippet.resourceId.videoId);
      
      // Get detailed video information
      const videoDetailsResponse = await this.getVideoDetails(videoIds);
      
      // Convert to our Video format
      const videos: Video[] = videoDetailsResponse.items.map((video: any) => ({
        id: video.id,
        title: video.snippet?.title || 'Unknown Title',
        thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
        views: parseInt(video.statistics?.viewCount) || 0,
        comments: parseInt(video.statistics?.commentCount) || 0,
        likes: parseInt(video.statistics?.likeCount) || 0,
        uploadDate: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration ? this.parseDuration(video.contentDetails.duration) : '0:00',
        description: video.snippet?.description || '',
      }));
      
      return videos;
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  }

  // Parse YouTube duration format (PT1H2M3S) to readable format (1:02:03)
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 5): Promise<YouTubeSearchResponse> {
    const params = {
      part: 'snippet',
      channelId: channelId,
      order: 'date',
      type: 'video',
      maxResults: maxResults.toString()
    };

    return this.makeRequest<YouTubeSearchResponse>('/search', params);
  }

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoResponse> {
    const params = {
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      maxResults: '50'
    };

    return this.makeRequest<YouTubeVideoResponse>('/videos', params);
  }

  // Convert YouTube API response to our Channel format
  convertToChannel(youtubeChannel: YouTubeChannelItem, videos48h: number = 0): Channel {
    const stats = youtubeChannel.statistics;
    const snippet = youtubeChannel.snippet;
    
    return {
      id: youtubeChannel.id,
      name: snippet.title,
      avatar: snippet.thumbnails.medium?.url || snippet.thumbnails.default.url,
      niche: this.detectNiche(snippet.description, snippet.title),
      subscribers: parseInt(stats.subscriberCount) || 0,
      language: this.detectLanguage(snippet.defaultLanguage, snippet.title, snippet.description),
      views48h: videos48h,
      description: snippet.description,
      channelUrl: `https://www.youtube.com/channel/${youtubeChannel.id}`,
      videoCount: parseInt(stats.videoCount) || 0,
      lastVideoDate: snippet.publishedAt
    };
  }

  private detectNiche(description: string, title: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    const nicheKeywords = {
      'Billionaire': ['billionaire', 'rich', 'wealthy', 'millionaire', 'fortune', 'money'],
      'Crime': ['crime', 'criminal', 'murder', 'theft', 'robbery', 'detective', 'police'],
      'Emotional': ['emotional', 'heart', 'love', 'sad', 'tear', 'cry', 'feeling', 'story'],
      'Animal & Pet Stories': ['animal', 'pet', 'dog', 'cat', 'wildlife', 'nature', 'creature'],
      'Gay/Lesbian Niche': ['lgbt', 'gay', 'lesbian', 'queer', 'pride', 'rainbow'],
      'HFY': ['hfy', 'humanity', 'human', 'fuck yeah', 'humanity fuck yeah'],
      'HOA & Neighborhood Drama': ['hoa', 'neighborhood', 'neighbor', 'drama', 'community'],
      'History & Hidden Truths': ['history', 'historical', 'ancient', 'truth', 'secret', 'hidden'],
      'Miscellaneous-Horror & Other Story Channels': ['horror', 'scary', 'creepy', 'ghost', 'haunted', 'paranormal'],
      'Mixed / General Storytelling': ['story', 'tale', 'narrative', 'fiction', 'storytelling'],
      'Old West & Cowboy Tales': ['cowboy', 'western', 'wild west', 'frontier', 'outlaw'],
      'Revenge & Justice Stories': ['revenge', 'justice', 'vengeance', 'retribution', 'payback'],
      'Single Dad/ Single MOM': ['single dad', 'single mom', 'single parent', 'father', 'mother'],
      'Sleep Videos': ['sleep', 'bedtime', 'relax', 'calm', 'meditation', 'asmr'],
      'Veterans': ['veteran', 'military', 'soldier', 'war', 'service', 'army', 'navy']
    };

    for (const [niche, keywords] of Object.entries(nicheKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return niche;
      }
    }

    return 'Mixed / General Storytelling';
  }

  private detectLanguage(defaultLanguage: string | undefined, title: string, description: string): string {
    if (defaultLanguage) {
      const languageMap: Record<string, string> = {
        'en': 'English',
        'es': 'Español',
        'de': 'German',
        'fr': 'French',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese'
      };
      
      const lang = languageMap[defaultLanguage.split('-')[0]];
      if (lang) return lang;
    }

    // Fallback to text analysis
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('español') || text.includes('spanish') || /[ñáéíóúü]/.test(text)) {
      return 'Español';
    }
    if (text.includes('deutsch') || text.includes('german') || /[äöüß]/.test(text)) {
      return 'German';
    }
    if (text.includes('français') || text.includes('french') || /[àâäéèêëïîôöùûüÿç]/.test(text)) {
      return 'French';
    }
    
    return 'English'; // Default
  }

  // Batch process multiple channels efficiently
  async getMultipleChannelsWithVideos(channelIds: string[]): Promise<Channel[]> {
    const channels: Channel[] = [];
    const batchSize = 50; // YouTube API limit
    
    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize);
      
      try {
        // Get channel details
        const channelResponse = await this.getChannelDetails(batch);
        
        // Get recent videos for each channel to calculate 48h views
        const channelPromises = channelResponse.items.map(async (channel) => {
          try {
            const videosResponse = await this.getChannelVideos(channel.id, 10);
            const videoIds = videosResponse.items.map(v => v.id.videoId);
            
            if (videoIds.length > 0) {
              const videoDetails = await this.getVideoDetails(videoIds);
              const videos48h = this.calculate48hViews(videoDetails.items);
              return this.convertToChannel(channel, videos48h);
            }
            
            return this.convertToChannel(channel, 0);
          } catch (error) {
            console.warn(`Failed to get videos for channel ${channel.id}:`, error);
            return this.convertToChannel(channel, 0);
          }
        });
        
        const batchChannels = await Promise.all(channelPromises);
        channels.push(...batchChannels);
        
      } catch (error) {
        console.error(`Failed to process channel batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    return channels;
  }

  private calculate48hViews(videos: YouTubeVideoItem[]): number {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    return videos
      .filter(video => {
        const publishedAt = new Date(video.snippet.publishedAt);
        return publishedAt >= fortyEightHoursAgo;
      })
      .reduce((total, video) => {
        return total + (parseInt(video.statistics.viewCount) || 0);
      }, 0);
  }
}

export default YouTubeApiService;
