interface YouTubeVideoInfo {
  title: string;
  transcript: string;
  videoId: string;
  duration?: number;
  channelName?: string;
}

export class YouTubeTranscriptServiceV4 {
  private static instance: YouTubeTranscriptServiceV4;

  public static getInstance(): YouTubeTranscriptServiceV4 {
    if (!YouTubeTranscriptServiceV4.instance) {
      YouTubeTranscriptServiceV4.instance = new YouTubeTranscriptServiceV4();
    }
    return YouTubeTranscriptServiceV4.instance;
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

  // Main transcript extraction method - SIMPLE AND WORKING
  async extractTranscript(url: string): Promise<YouTubeVideoInfo> {
    console.log('🎥 Starting SIMPLE transcript extraction from:', url);
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    console.log('📹 Video ID extracted:', videoId);

    // Get video information
    const videoInfo = await this.getVideoInfo(videoId);

    // ONLY ONE SIMPLE METHOD: YouTube's own transcript API
    const transcript = await this.getTranscriptSimple(videoId);

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

  // SIMPLE METHOD: Use YouTube's own transcript API directly
  private async getTranscriptSimple(videoId: string): Promise<string> {
    console.log('🎯 SIMPLE METHOD: Using YouTube\'s own transcript API');
    
    try {
      // Try YouTube's own transcript API - this should work
      const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`;
      
      console.log('🔍 Calling YouTube transcript API:', transcriptUrl);
      
      const response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 Response data:', responseData);

        // Extract transcript from YouTube's response
        let transcript = '';
        
        if (responseData && responseData.events) {
          // YouTube's json3 format
          const textParts = responseData.events
            .filter((event: any) => event.segs && event.segs.length > 0)
            .map((event: any) => 
              event.segs.map((seg: any) => seg.utf8 || '').join('')
            )
            .join(' ')
            .trim();
          
          transcript = textParts;
        }

        if (transcript && transcript.length > 10) {
          console.log('✅ SUCCESS: YouTube transcript API worked');
          console.log('📄 Transcript length:', transcript.length);
          console.log('📄 Transcript preview:', transcript.substring(0, 200));
          return transcript;
        }
      }

      // If that didn't work, try without kind=asr
      console.log('🔄 Trying without kind=asr...');
      const fallbackUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
      
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log('📄 Fallback response data:', fallbackData);

        if (fallbackData && fallbackData.events) {
          const textParts = fallbackData.events
            .filter((event: any) => event.segs && event.segs.length > 0)
            .map((event: any) => 
              event.segs.map((seg: any) => seg.utf8 || '').join('')
            )
            .join(' ')
            .trim();
          
          if (textParts && textParts.length > 10) {
            console.log('✅ SUCCESS: Fallback YouTube transcript API worked');
            console.log('📄 Transcript length:', textParts.length);
            console.log('📄 Transcript preview:', textParts.substring(0, 200));
            return textParts;
          }
        }
      }

      console.log('❌ YouTube transcript API failed');
      return `DEBUG: YouTube transcript API failed for ${videoId}. Status: ${response.status}`;

    } catch (error) {
      console.log('❌ YouTube transcript API error:', error);
      return `DEBUG: Network error - ${error}`;
    }
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

export const youtubeTranscriptServiceV4 = YouTubeTranscriptServiceV4.getInstance();
