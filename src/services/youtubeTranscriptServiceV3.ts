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

  // WORKING TRANSCRIPT: Use Cloudflare Worker with Python youtube-transcript-api
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using Cloudflare Worker with Python youtube-transcript-api');
    
    try {
      // Use our Cloudflare Worker with Python
      const workerUrl = 'https://youtube-transcript-worker.yafleton.workers.dev';
      const transcriptUrl = `${workerUrl}?video_id=${videoId}`;
      
      console.log('🔍 Calling Cloudflare Worker:', transcriptUrl);
      
      const response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Worker response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 Worker response data:', responseData);

        if (responseData.success && responseData.transcript) {
          const transcript = responseData.transcript.trim();
          
          console.log(`✅ SUCCESS: Real transcript extracted via Cloudflare Worker`);
          console.log(`📄 Transcript length: ${transcript.length} characters`);
          console.log(`📄 Transcript preview: ${transcript.substring(0, 200)}...`);
          console.log(`📊 Segments count: ${responseData.segments_count}`);
          
          return transcript;
        } else {
          console.log('❌ Worker returned error:', responseData.error);
          return `Transcript extraction failed: ${responseData.error || 'Unknown error'}`;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Worker request failed:', response.status, errorData);
        return `Transcript extraction failed: HTTP ${response.status} - ${errorData.error || 'Unknown error'}`;
      }

    } catch (error) {
      console.log('❌ Cloudflare Worker error:', error);
      
      // Fallback to external services if worker fails
      console.log('🔄 Falling back to external services...');
      return await this.getTranscriptFallback(videoId);
    }
  }

  // Fallback method using external services
  private async getTranscriptFallback(videoId: string): Promise<string> {
    console.log('🎯 FALLBACK: Using external YouTube Transcript API services');
    
    // Services that use the youtube-transcript-api Python library
    const services = [
      {
        name: 'YouTube Transcript API (Heroku)',
        url: `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`
      },
      {
        name: 'YouTube Transcript API (Vercel)',
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`
      },
      {
        name: 'Transcript API (Alternative)',
        url: `https://api.vevioz.com/api/button/mp3/${videoId}`
      }
    ];

    // Try each service
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      
      try {
        console.log(`🔍 Trying fallback service ${i + 1}/${services.length}: ${service.name}`);
        
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log(`📡 Fallback response status: ${response.status}`);

        if (response.ok) {
          const responseData = await response.json();
          console.log('📄 Fallback response data:', responseData);

          // Handle different response formats
          let transcript = '';

          if (Array.isArray(responseData)) {
            transcript = responseData
              .map((item: any) => item.text || item.content || item)
              .filter((text: string) => text && text.trim().length > 0)
              .join(' ')
              .trim();
          } else if (responseData.transcript) {
            transcript = responseData.transcript.trim();
          } else if (responseData.text) {
            transcript = responseData.text.trim();
          }

          if (transcript.length > 50) {
            console.log(`✅ SUCCESS: Transcript extracted via fallback ${service.name}`);
            return transcript;
          }
        }
      } catch (error) {
        console.log(`❌ Fallback service ${i + 1} error:`, error);
      }
    }

    // If all methods fail
    const fallbackMessage = `Transcript extraction failed for video ${videoId}. Both the Cloudflare Worker and external services are unavailable. YouTube's transcript APIs are heavily protected and require server-side implementation. You can try again later or manually add text using the Voice tab.`;
    
    console.log('⚠️ All transcript extraction methods failed');
    return fallbackMessage;
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
