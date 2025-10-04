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

    // ONLY ONE METHOD: External public API
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

  // WORKING TRANSCRIPT: Use youtube-transcript.io API
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using youtube-transcript.io API');
    
    try {
      // Use CORS proxy to bypass browser restrictions
      const apiUrl = 'https://www.youtube-transcript.io/api/transcripts/v2';
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const proxiedUrl = `${corsProxy}${encodeURIComponent(apiUrl)}`;
      
      console.log('🔍 Using CORS proxy for youtube-transcript.io API');
      console.log('📹 Video ID:', videoId);
      console.log('🌐 Proxied URL:', proxiedUrl);
      
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'Origin': 'https://www.youtube-transcript.io',
          'Referer': `https://www.youtube-transcript.io/videos?id=${videoId}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          ids: [videoId]
        })
      });

      console.log('📡 API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 API response data:', responseData);

        // Handle youtube-transcript.io response format
        let transcript = '';
        
        if (responseData && typeof responseData === 'object') {
          // Look for transcript data in the response
          if (responseData[videoId]) {
            const videoData = responseData[videoId];
            if (videoData.transcript) {
              transcript = videoData.transcript;
            } else if (videoData.segments && Array.isArray(videoData.segments)) {
              // If it's segments format, join them
              transcript = videoData.segments.map((segment: any) => 
                segment.text || segment.content || ''
              ).join(' ').trim();
            }
          } else if (responseData.transcript) {
            transcript = responseData.transcript;
          } else if (responseData.segments && Array.isArray(responseData.segments)) {
            transcript = responseData.segments.map((segment: any) => 
              segment.text || segment.content || ''
            ).join(' ').trim();
          }
        }

        if (transcript && transcript.length > 10) {
          console.log(`✅ SUCCESS: Real transcript extracted via youtube-transcript.io`);
          console.log(`📄 Transcript length: ${transcript.length} characters`);
          console.log(`📄 Transcript preview: ${transcript.substring(0, 200)}...`);
          
          return transcript;
        } else {
          console.log('❌ API returned empty or invalid transcript');
          console.log('📄 Raw response:', JSON.stringify(responseData, null, 2));
          return `DEBUG: API returned empty/invalid transcript for ${videoId}. Raw response: ${JSON.stringify(responseData, null, 2)}`;
        }
      } else {
        console.log('❌ API request failed:', response.status);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log('❌ Error response:', errorText);
        return `DEBUG: HTTP ${response.status} - ${errorText}`;
      }

    } catch (error) {
      console.log('❌ youtube-transcript.io API error:', error);
      return `DEBUG: Network error - ${error}`;
    }
  }

  // Fallback method - return informative message (not used anymore, keeping for compatibility)
  private getFallbackMessage(videoId: string): string {
    return `DEBUG: Fallback message for ${videoId} - This should not appear anymore`;
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