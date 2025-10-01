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

  // Fetch transcript using a CORS proxy service
  private async fetchTranscriptFromProxy(videoId: string): Promise<string> {
    // Using a public CORS proxy for YouTube transcript extraction
    // In production, you should implement this on your backend
    const proxyUrl = `https://cors-anywhere.herokuapp.com/https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`Transcript API error: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseTranscriptXML(xmlText);
    } catch (error) {
      console.warn('Primary transcript method failed, trying alternative:', error);
      
      // Alternative method - try different transcript endpoints
      return this.fetchTranscriptAlternative(videoId);
    }
  }

  // Alternative transcript extraction method
  private async fetchTranscriptAlternative(videoId: string): Promise<string> {
    // Try to get transcript from different languages
    const languages = ['en', 'de', 'es', 'fr'];
    
    for (const lang of languages) {
      try {
        const url = `https://cors-anywhere.herokuapp.com/https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`;
        const response = await fetch(url, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (response.ok) {
          const xmlText = await response.text();
          const transcript = this.parseTranscriptXML(xmlText);
          if (transcript.trim().length > 0) {
            console.log(`✅ Found transcript in ${lang}`);
            return transcript;
          }
        }
      } catch (error) {
        console.warn(`Failed to get transcript in ${lang}:`, error);
      }
    }

    throw new Error('No transcript available for this video');
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
