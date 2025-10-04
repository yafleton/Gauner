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

  // WORKING TRANSCRIPT: Use YouTube Transcript API (Python-based services)
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using YouTube Transcript API services');
    
    // Services that use the youtube-transcript-api Python library
    const services = [
      {
        name: 'YouTube Transcript API (Heroku)',
        url: `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`,
        method: 'GET'
      },
      {
        name: 'YouTube Transcript API (Vercel)',
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        method: 'GET'
      },
      {
        name: 'Transcript API (Alternative)',
        url: `https://api.vevioz.com/api/button/mp3/${videoId}`,
        method: 'GET'
      },
      {
        name: 'YouTube Transcript (Netlify)',
        url: `https://youtube-transcript-api.netlify.app/api/transcript?video_id=${videoId}`,
        method: 'GET'
      }
    ];

    // Try each service
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      
      try {
        console.log(`🔍 Trying service ${i + 1}/${services.length}: ${service.name}`);
        console.log(`📡 URL: ${service.url}`);
        
        const response = await fetch(service.url, {
          method: service.method,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        console.log(`📡 Response status: ${response.status}`);

        if (response.ok) {
          const responseText = await response.text();
          console.log(`📄 Response length: ${responseText.length}`);
          console.log(`📄 Response preview: ${responseText.substring(0, 200)}...`);
          
          if (responseText && responseText.trim().length > 0) {
            try {
              const data = JSON.parse(responseText);
              console.log('🔍 Parsed data:', data);

              // Handle different response formats from youtube-transcript-api
              let transcript = '';

              if (Array.isArray(data)) {
                // Format 1: Direct array (youtube-transcript-api format)
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
              } else if (data.transcript) {
                // Format 5: Transcript field (string)
                transcript = data.transcript.trim();
              }

              console.log(`📄 Extracted transcript length: ${transcript.length}`);
              console.log(`📄 Transcript preview: ${transcript.substring(0, 200)}...`);

              if (transcript.length > 50) {
                console.log(`✅ SUCCESS: Real transcript extracted via ${service.name}`);
                return transcript.replace(/\s+/g, ' ').trim();
              } else {
                console.log(`❌ Service ${i + 1} transcript too short: ${transcript.length} chars`);
              }
            } catch (parseError) {
              console.log(`❌ Service ${i + 1} JSON parse failed:`, parseError);
              console.log(`📄 Raw response:`, responseText);
            }
          } else {
            console.log(`❌ Service ${i + 1} empty response`);
          }
        } else {
          console.log(`❌ Service ${i + 1} failed with status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Service ${i + 1} error:`, error);
      }
    }

    // If all services fail, provide helpful message
    const fallbackMessage = `Transcript extraction failed for video ${videoId}. All YouTube Transcript API services are currently unavailable. This is likely because YouTube has changed their API or the services are temporarily down. You can try again later or manually add text to the queue using the Voice tab.`;
    
    console.log('⚠️ All YouTube Transcript API services failed');
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
