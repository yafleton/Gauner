// Service to fetch channel data from TubeChef API
// This replaces the YouTube API for channel data fetching

import YouTubeApiService from './youtubeApi';
import CloudConfigService from './cloudConfig';

interface TubeChefChannel {
  id: string;
  name: string;
  avatar?: string;
  subscribers?: number;
  niche?: string;
  language?: string;
  views48h?: number;
  channelUrl?: string;
  videoCount?: number;
  lastVideoDate?: string;
  youtubeChannelId?: string; // YouTube channel ID if available
}

interface TubeChefResponse {
  channels: TubeChefChannel[];
  total: number;
  lastUpdated: string;
}

class TubeChefApiService {
  private static instance: TubeChefApiService;
  private readonly API_BASE_URL = 'https://static.tubechef.ai';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private constructor() {}

  static getInstance(): TubeChefApiService {
    if (!TubeChefApiService.instance) {
      TubeChefApiService.instance = new TubeChefApiService();
    }
    return TubeChefApiService.instance;
  }

  async getChannels(): Promise<TubeChefChannel[]> {
    try {
      console.log('Fetching channels from TubeChef API...');
      
      const response = await fetch(`${this.API_BASE_URL}/data-exports/channels.json`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TubeChefResponse = await response.json();
      console.log(`Successfully fetched ${data.channels?.length || 0} channels from TubeChef API`);
      
      return data.channels || [];
    } catch (error) {
      console.error('Error fetching channels from TubeChef API:', error);
      throw error;
    }
  }

  // Convert TubeChef channel format to our Channel interface
  convertToChannel(tubechefChannel: TubeChefChannel): any {
    // Extract YouTube channel ID from URL if available
    const youtubeChannelId = tubechefChannel.youtubeChannelId || 
                            (tubechefChannel.channelUrl ? this.extractYouTubeChannelId(tubechefChannel.channelUrl) : null);
    
    // Construct channel URL if not provided
    let channelUrl = tubechefChannel.channelUrl;
    if (!channelUrl && youtubeChannelId) {
      // Try to construct a YouTube channel URL from the ID
      channelUrl = `https://youtube.com/channel/${youtubeChannelId}`;
      console.log(`Constructed channel URL for ${tubechefChannel.name}: ${channelUrl}`);
    } else if (!channelUrl) {
      // Try to construct a search URL as fallback
      const searchQuery = encodeURIComponent(tubechefChannel.name);
      channelUrl = `https://youtube.com/results?search_query=${searchQuery}`;
      console.log(`No direct channel URL for ${tubechefChannel.name}. Using search URL: ${channelUrl}`);
      console.log(`TubeChef data:`, {
        id: tubechefChannel.id,
        name: tubechefChannel.name,
        channelUrl: tubechefChannel.channelUrl,
        youtubeChannelId: tubechefChannel.youtubeChannelId
      });
    }
    
    return {
      id: youtubeChannelId || tubechefChannel.id, // Use YouTube ID if available, fallback to TubeChef ID
      name: tubechefChannel.name,
      avatar: tubechefChannel.avatar || this.generateAvatar(tubechefChannel.name),
      subscribers: tubechefChannel.subscribers || 0,
      niche: tubechefChannel.niche || 'Unknown',
      language: tubechefChannel.language || 'Unknown',
      views48h: tubechefChannel.views48h || 0,
      channelUrl: channelUrl,
      videoCount: tubechefChannel.videoCount,
      lastVideoDate: tubechefChannel.lastVideoDate,
      tubechefId: tubechefChannel.id, // Keep original TubeChef ID for reference
      youtubeChannelId: youtubeChannelId, // Store YouTube channel ID separately
    };
  }

  // Convert multiple channels and fetch real avatars and channel URLs
  async convertToChannelsWithAvatars(tubechefChannels: TubeChefChannel[]): Promise<any[]> {
    console.log('Converting', tubechefChannels.length, 'TubeChef channels with real avatars and URLs...');
    
    const channels = tubechefChannels.map(channel => this.convertToChannel(channel));
    
    // Fetch real avatars and channel URLs for channels that need them
    const enhancementPromises = channels.map(async (channel, index) => {
      console.log(`Processing channel ${index + 1}/${channels.length}:`, channel.name, 'ID:', channel.id, 'YouTube ID:', channel.youtubeChannelId);
      
      let enhancedChannel = { ...channel };
      
      // Fetch avatar if needed
      if (!channel.avatar || channel.avatar.includes('ui-avatars.com')) {
        try {
          const channelIdForAvatar = channel.youtubeChannelId || channel.id;
          console.log('Fetching real avatar for channel:', channel.name, 'using ID:', channelIdForAvatar);
          
          const realAvatar = await this.getYouTubeChannelAvatar(channelIdForAvatar);
          console.log('Avatar result for', channel.name, ':', realAvatar);
          
          enhancedChannel.avatar = realAvatar;
        } catch (error) {
          console.error('Failed to fetch avatar for channel:', channel.id, error);
        }
      }
      
      // Fetch channel URL if missing
      console.log('Checking channel URL for:', channel.name, 'Current URL:', channel.channelUrl);
      if (!channel.channelUrl || channel.channelUrl.includes('search_query')) {
        try {
          const channelIdForUrl = channel.youtubeChannelId || channel.id;
          console.log('🔗 Fetching channel URL for:', channel.name, 'using ID:', channelIdForUrl);
          
          const channelUrl = await this.getYouTubeChannelUrl(channelIdForUrl);
          if (channelUrl) {
            console.log('✅ Channel URL result for', channel.name, ':', channelUrl);
            enhancedChannel.channelUrl = channelUrl;
          } else {
            console.log('❌ No channel URL returned for', channel.name);
          }
        } catch (error) {
          console.error('❌ Failed to fetch channel URL for:', channel.name, error);
        }
      } else {
        console.log('✅ Channel', channel.name, 'already has URL:', channel.channelUrl);
      }
      
      return enhancedChannel;
    });

    const result = await Promise.all(enhancementPromises);
    console.log('✅ Completed avatar and URL fetching for', result.length, 'channels');
    return result;
  }

  // Extract YouTube channel ID from channel URL
  private extractYouTubeChannelId(channelUrl: string): string | null {
    try {
      console.log('Extracting YouTube channel ID from URL:', channelUrl);
      
      // Handle different YouTube URL formats
      const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/
      ];
      
      for (const pattern of patterns) {
        const match = channelUrl.match(pattern);
        if (match) {
          console.log('✅ Extracted YouTube channel ID:', match[1], 'from URL:', channelUrl);
          return match[1];
        }
      }
      
      console.log('❌ No YouTube channel ID found in URL:', channelUrl);
      return null;
    } catch (error) {
      console.error('Error extracting YouTube channel ID from URL:', channelUrl, error);
      return null;
    }
  }

  // Get YouTube channel avatar URL
  private async getYouTubeChannelAvatar(channelId: string): Promise<string> {
    try {
      console.log('Fetching YouTube avatar for channel ID:', channelId);
      
      const cloudConfig = CloudConfigService.getInstance();
      const youtubeApi = YouTubeApiService.getInstance();
      
      if (!cloudConfig.hasYouTubeApiKey()) {
        console.log('No YouTube API key available for avatar fetch');
        return this.generateAvatar('Channel');
      }

      const apiKey = cloudConfig.getYouTubeApiKey();
      console.log('Using YouTube API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
      
      youtubeApi.setApiKey(apiKey!);
      const channelDetails = await youtubeApi.getChannelDetails([channelId]);
      
      console.log('Channel details response:', channelDetails);
      
      if (channelDetails.items && channelDetails.items.length > 0) {
        const thumbnails = channelDetails.items[0].snippet.thumbnails;
        console.log('Available thumbnails:', thumbnails);
        
        const avatarUrl = thumbnails.medium?.url || thumbnails.default?.url;
        if (avatarUrl) {
          console.log('✅ Successfully fetched real YouTube avatar for channel:', channelId, 'URL:', avatarUrl);
          return avatarUrl;
        } else {
          console.log('❌ No avatar URL found in thumbnails for channel:', channelId);
        }
      } else {
        console.log('❌ No channel details found for channel ID:', channelId);
      }
    } catch (error) {
      console.error('❌ Error fetching YouTube avatar for channel:', channelId, error);
    }
    
    // Fallback to generated avatar
    console.log('🔄 Using fallback avatar for channel:', channelId);
    return this.generateAvatar('Channel');
  }

  // Get YouTube channel URL using the API
  private async getYouTubeChannelUrl(channelId: string): Promise<string | null> {
    try {
      console.log('🔍 Fetching YouTube channel URL for channel ID:', channelId);
      
      const cloudConfig = CloudConfigService.getInstance();
      const youtubeApi = YouTubeApiService.getInstance();
      
      console.log('CloudConfig instance:', cloudConfig);
      console.log('YouTubeApi instance:', youtubeApi);
      
      const hasKey = cloudConfig.hasYouTubeApiKey();
      console.log('Has YouTube API key:', hasKey);
      
      if (!hasKey) {
        console.log('❌ No YouTube API key available for channel URL fetch');
        return null;
      }

      const apiKey = cloudConfig.getYouTubeApiKey();
      console.log('Using YouTube API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
      
      if (!apiKey) {
        console.log('❌ API key is null or empty');
        return null;
      }
      
      youtubeApi.setApiKey(apiKey);
      console.log('API key set on YouTube service');
      
      console.log('Making API call to get channel details for:', channelId);
      const channelDetails = await youtubeApi.getChannelDetails([channelId]);
      
      console.log('Channel details response for URL:', channelDetails);
      
      if (channelDetails.items && channelDetails.items.length > 0) {
        const channel = channelDetails.items[0];
        const channelUrl = `https://youtube.com/channel/${channel.id}`;
        console.log('✅ Successfully fetched YouTube channel URL:', channelUrl);
        return channelUrl;
      } else {
        console.log('❌ No channel details found for channel ID:', channelId);
        console.log('Response items:', channelDetails.items);
      }
    } catch (error) {
      console.error('❌ Error fetching YouTube channel URL for channel:', channelId, error);
      console.error('Error details:', error);
    }
    
    return null;
  }

  // Generate a simple avatar if none is provided
  private generateAvatar(name: string): string {
    const firstLetter = name.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B5CF6&color=fff&size=64`;
  }

  // Get a random profile picture for demo purposes
  private getRandomProfilePicture(): string {
    const profilePictures = [
      'https://i.pravatar.cc/64?img=1',
      'https://i.pravatar.cc/64?img=2',
      'https://i.pravatar.cc/64?img=3',
      'https://i.pravatar.cc/64?img=4',
      'https://i.pravatar.cc/64?img=5',
      'https://i.pravatar.cc/64?img=6',
      'https://i.pravatar.cc/64?img=7',
      'https://i.pravatar.cc/64?img=8',
      'https://i.pravatar.cc/64?img=9',
      'https://i.pravatar.cc/64?img=10',
      'https://i.pravatar.cc/64?img=11',
      'https://i.pravatar.cc/64?img=12',
    ];
    return profilePictures[Math.floor(Math.random() * profilePictures.length)];
  }

  // Get cache key for this service
  getCacheKey(): string {
    return 'tubechef_channels';
  }

  // Get cache duration
  getCacheDuration(): number {
    return this.CACHE_DURATION;
  }
}

export default TubeChefApiService;
