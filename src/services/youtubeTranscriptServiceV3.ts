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

  // MULTIPLE WORKING APIS METHOD: Try different working APIs systematically
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 MULTIPLE WORKING APIS METHOD: Trying different working APIs systematically');
    
    // List of working transcript APIs to try
    const apis = [
      {
        name: 'YouTube Transcript API (Vercel)',
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      {
        name: 'YouTube Transcript API (Heroku)',
        url: `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      {
        name: 'Transcript API (Alternative)',
        url: `https://api.vevioz.com/api/button/mp3/${videoId}`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      {
        name: 'YouTube Transcript (GitHub)',
        url: `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}&lang=en`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      {
        name: 'Transcript Service (Netlify)',
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}&lang=en`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    ];

    // Try each API one by one
    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      
      try {
        console.log(`🔍 Trying API ${i + 1}/${apis.length}: ${api.name}`);
        console.log(`📡 URL: ${api.url}`);
        
        const response = await fetch(api.url, {
          method: 'GET',
          headers: api.headers
        });

        console.log(`📡 Response status: ${response.status}`);

        if (response.ok) {
          const jsonData = await response.text();
          console.log(`📄 Response length: ${jsonData.length}`);

          if (jsonData && jsonData.trim().length > 0) {
            try {
              const data = JSON.parse(jsonData);
              console.log(`🔍 Response data:`, data);

              // Extract transcript text
              let transcript = '';

              if (Array.isArray(data)) {
                // Direct array of transcript entries
                transcript = data
                  .map((entry: any) => {
                    if (typeof entry === 'string') return entry;
                    if (entry.text) return entry.text;
                    if (entry.content) return entry.content;
                    return '';
                  })
                  .filter((text: string) => text.trim().length > 0)
                  .join(' ')
                  .trim();
              } else if (data.transcript && Array.isArray(data.transcript)) {
                // Nested transcript array
                transcript = data.transcript
                  .map((entry: any) => {
                    if (typeof entry === 'string') return entry;
                    if (entry.text) return entry.text;
                    if (entry.content) return entry.content;
                    return '';
                  })
                  .filter((text: string) => text.trim().length > 0)
                  .join(' ')
                  .trim();
              } else if (data.text) {
                // Single text field
                transcript = data.text.trim();
              } else if (data.subtitle || data.caption) {
                // Alternative field names
                transcript = (data.subtitle || data.caption).trim();
              } else {
                console.log(`❌ API ${i + 1} unknown response format`);
                continue;
              }

              if (transcript.length >= 50) {
                console.log(`✅ SUCCESS: Transcript extracted via ${api.name}`);
                return transcript.replace(/\s+/g, ' ').trim();
              } else {
                console.log(`❌ API ${i + 1} transcript too short: ${transcript.length} chars`);
              }
            } catch (parseError) {
              console.log(`❌ API ${i + 1} JSON parse failed:`, parseError);
            }
          } else {
            console.log(`❌ API ${i + 1} empty response`);
          }
        } else {
          console.log(`❌ API ${i + 1} failed with status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ API ${i + 1} error:`, error);
      }
    }

    throw new Error('All transcript APIs failed - no working service found');
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
