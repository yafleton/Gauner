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

  // WORKING METHOD: Use Cloudflare Worker backend
  private async getTranscriptSimple(videoId: string): Promise<string> {
    console.log('🎯 WORKING METHOD: Using Cloudflare Worker backend');
    
    try {
      // Use Cloudflare Worker to bypass CORS
      const workerUrl = 'https://youtube-transcript-worker.yafleton.workers.dev/api/transcript';
      const apiUrl = `${workerUrl}?video_id=${videoId}`;
      
      console.log('🔍 Calling Cloudflare Worker:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📄 Response data:', responseData);

        if (responseData.success && responseData.transcript) {
          console.log('✅ SUCCESS: Cloudflare Worker method worked');
          console.log('📄 Transcript length:', responseData.length);
          console.log('📄 Transcript preview:', responseData.transcript.substring(0, 200));
          return responseData.transcript;
        } else {
          console.log('❌ No transcript found in response');
          return `DEBUG: No transcript found in Cloudflare Worker response for ${videoId}. Response: ${JSON.stringify(responseData)}`;
        }
      }

      console.log('❌ Cloudflare Worker method failed');
      return `DEBUG: Cloudflare Worker method failed for ${videoId}. Status: ${response.status}`;

    } catch (error) {
      console.log('❌ Cloudflare Worker method error:', error);
      return `DEBUG: Network error - ${error}`;
    }
  }

  // Helper method to parse XML transcript
  private parseXMLTranscript(xmlText: string): string {
    try {
      // Simple XML parsing to extract text from <text> tags
      const textMatches = xmlText.match(/<text[^>]*>(.*?)<\/text>/g);
      
      if (textMatches && textMatches.length > 0) {
        const transcript = textMatches
          .map(match => {
            // Extract text content from <text> tag
            const textContent = match.replace(/<text[^>]*>(.*?)<\/text>/, '$1');
            // Decode HTML entities
            return textContent
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#39;/g, "'")
              .replace(/&#34;/g, '"');
          })
          .join(' ')
          .trim();
        
        return transcript;
      }
      
      return '';
    } catch (error) {
      console.log('❌ XML parsing error:', error);
      return '';
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
