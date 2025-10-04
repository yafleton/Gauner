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

    // Method 2: Try tubetranscript.com (simple GET request)
    try {
      console.log('🔍 Method 2: tubetranscript.com');
      const response = await fetch(`https://www.tubetranscript.com/de/watch?v=${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9',
          'Cache-Control': 'max-age=0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Referer': 'https://www.tubetranscript.com/de/'
        }
      });

      if (response.ok) {
        const htmlText = await response.text();
        console.log('📄 Method 2 response length:', htmlText.length);
        console.log('📄 Method 2 response preview:', htmlText.substring(0, 500));
        
        // Extract transcript from HTML
        const transcript = this.extractTranscriptFromHTML(htmlText);
        if (transcript && transcript.length > 10) {
          console.log('✅ Method 2 SUCCESS: tubetranscript.com worked');
          console.log('📄 Transcript preview:', transcript.substring(0, 200));
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

  // Helper method to extract transcript from HTML
  private extractTranscriptFromHTML(html: string): string | null {
    try {
      // Look for common transcript patterns in HTML
      const patterns = [
        // Look for <div class="transcript"> or similar
        /<div[^>]*class="[^"]*transcript[^"]*"[^>]*>(.*?)<\/div>/is,
        // Look for <pre> tags (often used for transcripts)
        /<pre[^>]*>(.*?)<\/pre>/is,
        // Look for <textarea> tags
        /<textarea[^>]*>(.*?)<\/textarea>/is,
        // Look for JSON data in script tags
        /<script[^>]*>.*?transcript.*?:\s*["'](.*?)["'].*?<\/script>/is,
        // Look for any text content that might be a transcript
        /transcript[^>]*>([^<]+)/i
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let transcript = match[1]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&quot;/g, '"') // Decode HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&#34;/g, '"')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          if (transcript && transcript.length > 20) {
            console.log('📄 Extracted transcript from HTML:', transcript.substring(0, 200));
            return transcript;
          }
        }
      }

      // Fallback: Look for any long text content that might be a transcript
      const textContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
        .replace(/&quot;/g, '"') // Decode HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&#34;/g, '"')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Look for sentences that might be transcript content
      const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length >= 3) {
        const transcript = sentences.join('. ').trim();
        console.log('📄 Extracted transcript from text content:', transcript.substring(0, 200));
        return transcript;
      }

    } catch (error) {
      console.log('❌ Error extracting transcript from HTML:', error);
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