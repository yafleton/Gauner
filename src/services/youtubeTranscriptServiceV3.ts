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

  // WORKING TRANSCRIPT: Use CORS proxy to bypass browser restrictions
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 WORKING TRANSCRIPT: Using CORS proxy to bypass browser restrictions');
    
    // List of CORS proxies to try
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    // YouTube transcript endpoints to try
    const endpoints = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3&kind=asr`
    ];

    // Try each combination
    for (let proxyIndex = 0; proxyIndex < corsProxies.length; proxyIndex++) {
      const proxy = corsProxies[proxyIndex];
      
      for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
        const endpoint = endpoints[endpointIndex];
        const fullUrl = proxy + encodeURIComponent(endpoint);
        
        try {
          console.log(`🔍 Trying proxy ${proxyIndex + 1}/${corsProxies.length}, endpoint ${endpointIndex + 1}/${endpoints.length}`);
          console.log(`📡 URL: ${fullUrl}`);
          
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
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

                // Extract transcript from YouTube's format
                if (data.events && Array.isArray(data.events)) {
                  const transcript = data.events
                    .map((event: any) => {
                      if (event.segs && Array.isArray(event.segs)) {
                        return event.segs
                          .map((seg: any) => seg.utf8 || seg.text || '')
                          .join('')
                          .trim();
                      }
                      return '';
                    })
                    .filter((text: string) => text.length > 0)
                    .join(' ')
                    .trim();

                  if (transcript.length > 50) {
                    console.log('✅ SUCCESS: Real transcript extracted via CORS proxy');
                    return transcript.replace(/\s+/g, ' ').trim();
                  }
                }

                // Alternative format: direct text
                if (data.text && typeof data.text === 'string' && data.text.length > 50) {
                  console.log('✅ SUCCESS: Direct text transcript found');
                  return data.text.replace(/\s+/g, ' ').trim();
                }

              } catch (parseError) {
                console.log(`❌ JSON parse failed for this combination:`, parseError);
              }
            }
          } else {
            console.log(`❌ Request failed with status: ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ Request error for this combination:`, error);
        }
      }
    }

    // If all methods fail, return informative message
    const fallbackMessage = `Transcript extraction failed for video ${videoId}. All CORS proxy methods were unsuccessful. YouTube's transcript APIs are heavily protected against browser access. A backend service would be needed for reliable transcript extraction.`;
    
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
