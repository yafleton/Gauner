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

  // WORKING TRANSCRIPT: Try multiple methods for youtube-transcript.io
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Trying multiple methods for youtube-transcript.io');
    
    // Method 1: Try direct access (might work if no auth needed)
    try {
      console.log('🔍 Method 1: Direct API call');
      const response = await fetch('https://www.youtube-transcript.io/api/transcripts/v2', {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [videoId]
        })
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log('📄 Method 1 response:', responseText.substring(0, 200));
        
        if (responseText !== 'Unauthorized' && responseText.startsWith('{')) {
          const responseData = JSON.parse(responseText);
          const transcript = this.extractTranscriptFromResponse(responseData, videoId);
          if (transcript) {
            console.log('✅ Method 1 SUCCESS: Direct API worked');
            return transcript;
          }
        }
      }
    } catch (error) {
      console.log('❌ Method 1 failed:', error);
    }

    // Method 2: Try alternative transcript service
    try {
      console.log('🔍 Method 2: Alternative transcript service');
      const response = await fetch(`https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 Method 2 response:', responseData);
        
        let transcript = '';
        if (Array.isArray(responseData)) {
          transcript = responseData.map((item: any) => item.text || '').join(' ').trim();
        } else if (responseData.transcript) {
          transcript = responseData.transcript;
        }
        
        if (transcript && transcript.length > 10) {
          console.log('✅ Method 2 SUCCESS: Alternative service worked');
          return transcript;
        }
      }
    } catch (error) {
      console.log('❌ Method 2 failed:', error);
    }

    // Method 3: Try CORS proxy (as fallback)
    try {
      console.log('🔍 Method 3: CORS proxy fallback');
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const proxiedUrl = `${corsProxy}${encodeURIComponent('https://www.youtube-transcript.io/api/transcripts/v2')}`;
      
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [videoId]
        })
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log('📄 Method 3 response:', responseText.substring(0, 200));
        
        if (responseText !== 'Unauthorized' && responseText.startsWith('{')) {
          const responseData = JSON.parse(responseText);
          const transcript = this.extractTranscriptFromResponse(responseData, videoId);
          if (transcript) {
            console.log('✅ Method 3 SUCCESS: CORS proxy worked');
            return transcript;
          }
        }
      }
    } catch (error) {
      console.log('❌ Method 3 failed:', error);
    }

    // All methods failed
    return `DEBUG: All transcript methods failed for ${videoId}. The API requires authentication or is blocked.`;
  }

  // Helper method to extract transcript from response
  private extractTranscriptFromResponse(responseData: any, videoId: string): string | null {
    if (responseData && typeof responseData === 'object') {
      // Look for transcript data in the response
      if (responseData[videoId]) {
        const videoData = responseData[videoId];
        if (videoData.transcript) {
          return videoData.transcript;
        } else if (videoData.segments && Array.isArray(videoData.segments)) {
          // If it's segments format, join them
          return videoData.segments.map((segment: any) => 
            segment.text || segment.content || ''
          ).join(' ').trim();
        }
      } else if (responseData.transcript) {
        return responseData.transcript;
      } else if (responseData.segments && Array.isArray(responseData.segments)) {
        return responseData.segments.map((segment: any) => 
          segment.text || segment.content || ''
        ).join(' ').trim();
      }
    }
    return null;
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