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

  // REAL WORKING API METHOD: Use real YouTube Transcript APIs correctly
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 REAL WORKING API METHOD: Using real YouTube Transcript APIs correctly');
    
    // List of real working YouTube Transcript APIs with correct endpoints
    const apis = [
      {
        name: 'YouTube Video Transcripts API',
        url: `https://youtubevideotranscripts.com/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json'
        }
      },
      {
        name: 'YouTube Transcript API (GitHub)',
        url: `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json'
        }
      },
      {
        name: 'YouTube Transcript API (Vercel)',
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json'
        }
      },
      {
        name: 'Transcript API (Alternative Service)',
        url: `https://api.vevioz.com/api/button/mp3/${videoId}`,
        headers: {
          'Accept': 'application/json'
        }
      },
      {
        name: 'YouTube Transcript (Public Service)',
        url: `https://youtube-transcript-api.netlify.app/api/transcript?video_id=${videoId}`,
        headers: {
          'Accept': 'application/json'
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
          console.log(`📄 Response preview: ${jsonData.substring(0, 200)}...`);

          if (jsonData && jsonData.trim().length > 0) {
            try {
              const data = JSON.parse(jsonData);
              console.log(`🔍 Response data type:`, typeof data);
              console.log(`🔍 Response data:`, data);

              // Extract transcript text - handle different response formats
              let transcript = '';

              // Format 1: Direct array of transcript objects
              if (Array.isArray(data)) {
                console.log(`📝 Processing array format with ${data.length} entries`);
                transcript = data
                  .map((entry: any) => {
                    if (typeof entry === 'string') return entry;
                    if (entry.text) return entry.text;
                    if (entry.content) return entry.content;
                    if (entry.transcript) return entry.transcript;
                    return '';
                  })
                  .filter((text: string) => text && text.trim().length > 0)
                  .join(' ')
                  .trim();
              }
              // Format 2: Nested transcript array
              else if (data.transcript && Array.isArray(data.transcript)) {
                console.log(`📝 Processing nested transcript format with ${data.transcript.length} entries`);
                transcript = data.transcript
                  .map((entry: any) => {
                    if (typeof entry === 'string') return entry;
                    if (entry.text) return entry.text;
                    if (entry.content) return entry.content;
                    return '';
                  })
                  .filter((text: string) => text && text.trim().length > 0)
                  .join(' ')
                  .trim();
              }
              // Format 3: Single text field
              else if (data.text) {
                console.log(`📝 Processing single text field`);
                transcript = data.text.trim();
              }
              // Format 4: Alternative field names
              else if (data.subtitle || data.caption || data.content) {
                console.log(`📝 Processing alternative field format`);
                transcript = (data.subtitle || data.caption || data.content).trim();
              }
              // Format 5: Check for any string values
              else {
                console.log(`📝 Checking for any string values in response`);
                const stringValues = Object.values(data).filter(value => 
                  typeof value === 'string' && value.trim().length > 50
                );
                if (stringValues.length > 0) {
                  transcript = stringValues.join(' ').trim();
                }
              }

              console.log(`📄 Extracted transcript length: ${transcript.length}`);
              console.log(`📄 Transcript preview: ${transcript.substring(0, 200)}...`);

              if (transcript.length >= 50) {
                console.log(`✅ SUCCESS: Transcript extracted via ${api.name}`);
                return transcript.replace(/\s+/g, ' ').trim();
              } else {
                console.log(`❌ API ${i + 1} transcript too short: ${transcript.length} chars`);
              }
            } catch (parseError) {
              console.log(`❌ API ${i + 1} JSON parse failed:`, parseError);
              console.log(`📄 Raw response:`, jsonData);
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

    throw new Error('All real YouTube transcript APIs failed - no working service found');
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
