interface YouTubeVideoInfo {
  title: string;
  transcript: string;
  videoId: string;
  duration?: number;
  channelName?: string;
}


export class YouTubeTranscriptService {
  private static instance: YouTubeTranscriptService;

  public static getInstance(): YouTubeTranscriptService {
    if (!YouTubeTranscriptService.instance) {
      YouTubeTranscriptService.instance = new YouTubeTranscriptService();
    }
    return YouTubeTranscriptService.instance;
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

  // Get video information using YouTube Data API (requires API key)
  private async getVideoInfo(videoId: string): Promise<{ title: string; channelName?: string; duration?: number }> {
    // For now, we'll use a simple approach without requiring YouTube API key
    // In production, you might want to use YouTube Data API v3
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title,
          channelName: data.author_name
        };
      }
    } catch (error) {
      console.warn('Failed to fetch video info via oEmbed:', error);
    }

    // Fallback - return generic title
    return {
      title: `YouTube Video ${videoId}`
    };
  }

  // Extract transcript using a CORS proxy or backend service
  async extractTranscript(url: string): Promise<YouTubeVideoInfo> {
    console.log('🎥 Extracting transcript from YouTube URL:', url);
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    console.log('📹 Extracted video ID:', videoId);

    // Get video information
    const videoInfo = await this.getVideoInfo(videoId);
    console.log('📝 Video info:', videoInfo);

    // For transcript extraction, we'll use a CORS proxy approach
    // Note: This is a simplified approach. In production, you might want to use a backend service
    try {
      const transcript = await this.fetchTranscriptFromProxy(videoId);
      
      return {
        title: videoInfo.title,
        transcript: transcript,
        videoId: videoId,
        duration: videoInfo.duration,
        channelName: videoInfo.channelName
      };
    } catch (error) {
      console.error('❌ Failed to extract transcript:', error);
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch transcript using a more reliable method
  private async fetchTranscriptFromProxy(videoId: string): Promise<string> {
    console.log('🔍 Attempting to extract transcript for video:', videoId);
    
    // Try multiple transcript endpoints and methods
    const transcriptEndpoints = [
      // Primary method - try to get available transcripts first
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      // Fallback to XML format
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
    ];

    for (const endpoint of transcriptEndpoints) {
      try {
        console.log('🔍 Trying endpoint:', endpoint);
        
        // Try direct fetch first
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com'
          }
        });

        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0) {
            console.log('✅ Successfully got transcript from:', endpoint);
            return this.parseTranscriptText(text);
          }
        }
      } catch (error) {
        console.warn('❌ Failed to fetch from endpoint:', endpoint, error);
      }
    }

    // If all direct methods fail, try alternative approach
    console.log('🔄 All direct methods failed, trying alternative approach...');
    return this.fetchTranscriptAlternative(videoId);
  }

  // Alternative transcript extraction method
  private async fetchTranscriptAlternative(videoId: string): Promise<string> {
    console.log('🔄 Trying alternative transcript extraction methods...');
    
    // Try to get transcript from different languages and formats
    const languages = ['en', 'en-US', 'en-GB', 'de', 'es', 'fr', 'auto'];
    const formats = ['json3', 'srv3', 'ttml', 'vtt', ''];
    
    for (const lang of languages) {
      for (const format of formats) {
        try {
          const formatParam = format ? `&fmt=${format}` : '';
          const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}${formatParam}`;
          
          console.log(`🔍 Trying: ${lang} with format ${format || 'default'}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.youtube.com/',
              'Origin': 'https://www.youtube.com'
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) { // Ensure we have meaningful content
                console.log(`✅ Found transcript in ${lang} with format ${format || 'default'}`);
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn(`❌ Failed to get transcript in ${lang} with format ${format || 'default'}:`, error);
        }
      }
    }

    // Final fallback - try to get any available transcript
    console.log('🔄 Trying final fallback method...');
    try {
      const fallbackUrl = `https://www.youtube.com/api/timedtext?v=${videoId}`;
      const response = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.youtube.com/'
        }
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0) {
          const transcript = this.parseTranscriptText(text);
          if (transcript.trim().length > 10) {
            console.log('✅ Found transcript with fallback method');
            return transcript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Final fallback method also failed:', error);
    }

    throw new Error('No transcript available for this video. The video may not have captions or auto-generated subtitles.');
  }

  // Parse transcript text in various formats
  private parseTranscriptText(text: string): string {
    try {
      // Try to parse as JSON first (newer format)
      if (text.trim().startsWith('{')) {
        return this.parseJSONTranscript(text);
      }
      
      // Try to parse as VTT
      if (text.includes('WEBVTT') || text.includes('-->')) {
        return this.parseVTTTranscript(text);
      }
      
      // Try to parse as TTML
      if (text.includes('<tt') || text.includes('</tt>')) {
        return this.parseTTMLTranscript(text);
      }
      
      // Default to XML parsing
      return this.parseTranscriptXML(text);
    } catch (error) {
      console.error('Failed to parse transcript:', error);
      throw new Error('Failed to parse transcript');
    }
  }

  // Parse JSON format transcript
  private parseJSONTranscript(jsonText: string): string {
    try {
      const data = JSON.parse(jsonText);
      const transcriptParts: string[] = [];
      
      if (data.events) {
        for (const event of data.events) {
          if (event.segs) {
            for (const seg of event.segs) {
              if (seg.utf8) {
                transcriptParts.push(seg.utf8.trim());
              }
            }
          }
        }
      }
      
      return transcriptParts.join(' ');
    } catch (error) {
      console.error('Failed to parse JSON transcript:', error);
      throw new Error('Failed to parse JSON transcript');
    }
  }

  // Parse VTT format transcript
  private parseVTTTranscript(vttText: string): string {
    const lines = vttText.split('\n');
    const transcriptParts: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip WEBVTT header, timestamps, and empty lines
      if (trimmedLine && 
          !trimmedLine.startsWith('WEBVTT') && 
          !trimmedLine.includes('-->') && 
          !trimmedLine.match(/^\d+$/)) {
        transcriptParts.push(trimmedLine);
      }
    }
    
    return transcriptParts.join(' ');
  }

  // Parse TTML format transcript
  private parseTTMLTranscript(ttmlText: string): string {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(ttmlText, 'text/xml');
      const textElements = xmlDoc.getElementsByTagName('p');
      
      const transcriptParts: string[] = [];
      
      for (let i = 0; i < textElements.length; i++) {
        const textElement = textElements[i];
        const text = textElement.textContent || '';
        if (text.trim()) {
          transcriptParts.push(text.trim());
        }
      }

      return transcriptParts.join(' ');
    } catch (error) {
      console.error('Failed to parse TTML transcript:', error);
      throw new Error('Failed to parse TTML transcript');
    }
  }

  // Parse XML transcript into plain text
  private parseTranscriptXML(xmlText: string): string {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const textElements = xmlDoc.getElementsByTagName('text');
      
      const transcriptParts: string[] = [];
      
      for (let i = 0; i < textElements.length; i++) {
        const textElement = textElements[i];
        const text = textElement.textContent || '';
        if (text.trim()) {
          transcriptParts.push(text.trim());
        }
      }

      return transcriptParts.join(' ');
    } catch (error) {
      console.error('Failed to parse transcript XML:', error);
      throw new Error('Failed to parse transcript');
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

export const youtubeTranscriptService = YouTubeTranscriptService.getInstance();
