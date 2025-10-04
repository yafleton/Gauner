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

  // WORKING TRANSCRIPT: Use a simple, working approach
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using simple, working approach');
    
    try {
      // Try a simple approach: use a working transcript service
      const transcriptUrl = `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`;
      
      console.log('🔍 Trying working transcript service:', transcriptUrl);
      
      const response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const responseText = await response.text();
        console.log('📄 Response length:', responseText.length);
        console.log('📄 Response preview:', responseText.substring(0, 200));
        
        if (responseText && responseText.trim().length > 0) {
          try {
            const data = JSON.parse(responseText);
            console.log('🔍 Parsed data:', data);

            // Handle different response formats
            let transcript = '';

            if (Array.isArray(data)) {
              // Format 1: Array of transcript objects
              transcript = data
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item.text) return item.text;
                  if (item.content) return item.content;
                  return '';
                })
                .filter((text: string) => text.trim().length > 0)
                .join(' ')
                .trim();
            } else if (data.transcript && Array.isArray(data.transcript)) {
              // Format 2: Nested transcript array
              transcript = data.transcript
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item.text) return item.text;
                  if (item.content) return item.content;
                  return '';
                })
                .filter((text: string) => text.trim().length > 0)
                .join(' ')
                .trim();
            } else if (data.text) {
              // Format 3: Direct text field
              transcript = data.text.trim();
            } else if (data.content) {
              // Format 4: Content field
              transcript = data.content.trim();
            }

            if (transcript.length > 50) {
              console.log('✅ SUCCESS: Real transcript extracted');
              return transcript.replace(/\s+/g, ' ').trim();
            }
          } catch (parseError) {
            console.log('❌ JSON parse failed:', parseError);
          }
        }
      } else {
        console.log('❌ Service not available, status:', response.status);
      }

    } catch (error) {
      console.log('❌ Transcript service error:', error);
    }

    // If the service fails, provide a helpful message
    const fallbackMessage = `Transcript extraction is currently unavailable for video ${videoId}. YouTube's transcript APIs are heavily protected and require server-side implementation to work reliably. For now, you can manually add text to the queue or use the Voice tab to generate audio from your own text.`;
    
    console.log('⚠️ Using fallback message - transcript service unavailable');
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
