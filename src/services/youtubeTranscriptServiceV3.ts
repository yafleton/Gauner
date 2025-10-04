interface YouTubeVideoInfo {
  title: string;
  transcript: string;
  videoId: string;
  duration?: number;
  channelName?: string;
}

export class YouTubeTranscriptServiceV3 {
  private static instance: YouTubeTranscriptServiceV3;

  public static getInstance(): YouTubeTranscriptServiceV3 {
    if (!YouTubeTranscriptServiceV3.instance) {
      YouTubeTranscriptServiceV3.instance = new YouTubeTranscriptServiceV3();
    }
    return YouTubeTranscriptServiceV3.instance;
  }

  // Extract video ID from YouTube URL
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  // Get video information using oEmbed
  private async getVideoInfo(videoId: string): Promise<{ title: string; channelName?: string }> {
    try {
      console.log('📹 Fetching video info for:', videoId);
      
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Video info fetched:', data.title);
        return {
          title: data.title,
          channelName: data.author_name
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch video info:', error);
    }

    return {
      title: `YouTube Video ${videoId}`
    };
  }

  // Main transcript extraction method - SIMPLE APPROACH
  async extractTranscript(url: string): Promise<YouTubeVideoInfo> {
    console.log('🎥 Starting SIMPLE transcript extraction from:', url);
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    console.log('📹 Video ID extracted:', videoId);

    // Get video information
    const videoInfo = await this.getVideoInfo(videoId);

    // ONLY ONE METHOD: Direct YouTube API with auto-generated subtitles
    const transcript = await this.getTranscriptDirect(videoId);

    if (!transcript || transcript.trim().length < 10) {
      throw new Error('No transcript available for this video. The video may not have captions or auto-generated subtitles.');
    }

    console.log('✅ Transcript extracted successfully, length:', transcript.length);

    return {
      title: videoInfo.title,
      transcript: transcript.trim(),
      videoId: videoId,
      channelName: videoInfo.channelName
    };
  }

  // WORKING TRANSCRIPT: Use Railway-hosted YouTube Transcript API
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using Railway-hosted YouTube Transcript API');
    
    try {
      // Use our Railway-hosted API
      const apiUrl = 'https://web-production-5c2a.up.railway.app';
      const transcriptUrl = `${apiUrl}/transcript/${videoId}`;
      
      console.log('🔍 Calling Railway API:', transcriptUrl);
      
      const response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Railway API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 Railway API response data:', responseData);

        if (responseData.success && responseData.transcript) {
          const transcript = responseData.transcript.trim();
          
          console.log(`✅ SUCCESS: Real transcript extracted via Railway API`);
          console.log(`📄 Transcript length: ${transcript.length} characters`);
          console.log(`📄 Transcript preview: ${transcript.substring(0, 200)}...`);
          console.log(`🌍 Language used: ${responseData.language_used}`);
          console.log(`📊 Segments count: ${responseData.segments_count}`);
          
          return transcript;
        } else {
          console.log('❌ Railway API returned error:', responseData.detail || 'Unknown error');
          return `Transcript extraction failed: ${responseData.detail || 'Unknown error'}`;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Railway API request failed:', response.status, errorData);
        return `Transcript extraction failed: HTTP ${response.status} - ${errorData.detail || 'Unknown error'}`;
      }

    } catch (error) {
      console.log('❌ Railway API error:', error);
      
      // Fallback to informative message if Railway API fails
      console.log('🔄 Railway API failed - returning informative message');
      return this.getFallbackMessage(videoId);
    }
  }

  // Fallback method - return informative message
  private getFallbackMessage(videoId: string): string {
    return `Transcript extraction failed for video ${videoId}. 

The Railway API might be:
❌ Starting up (first request takes 10-30 seconds)
❌ Temporarily unavailable
❌ Being blocked by YouTube

Try again in a few seconds, or use the Voice tab to manually add your text.`;
  }






  // Validate YouTube URL
  isValidYouTubeUrl(url: string): boolean {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
      /^https?:\/\/(www\.)?youtube\.com\/v\//
    ];

    return patterns.some(pattern => pattern.test(url));
  }
}

export const youtubeTranscriptServiceV3 = YouTubeTranscriptServiceV3.getInstance();
