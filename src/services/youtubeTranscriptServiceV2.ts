interface YouTubeVideoInfo {
  title: string;
  transcript: string;
  videoId: string;
  duration?: number;
  channelName?: string;
}

// Interface for future use when we need structured transcript data
// interface TranscriptEntry {
//   text: string;
//   start: number;
//   duration: number;
// }

export class YouTubeTranscriptServiceV2 {
  private static instance: YouTubeTranscriptServiceV2;

  public static getInstance(): YouTubeTranscriptServiceV2 {
    if (!YouTubeTranscriptServiceV2.instance) {
      YouTubeTranscriptServiceV2.instance = new YouTubeTranscriptServiceV2();
    }
    return YouTubeTranscriptServiceV2.instance;
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

  // Get video information using oEmbed (no API key required)
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

    // Fallback
    return {
      title: `YouTube Video ${videoId}`
    };
  }

  // Main transcript extraction method
  async extractTranscript(url: string): Promise<YouTubeVideoInfo> {
    console.log('🎥 Starting transcript extraction from:', url);
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    console.log('📹 Video ID extracted:', videoId);

    // Get video information
    const videoInfo = await this.getVideoInfo(videoId);

    // Try multiple transcript extraction methods
    let transcript: string;

    try {
      // Method 1: Try direct YouTube API (most reliable)
      transcript = await this.fetchTranscriptDirect(videoId);
      console.log('✅ Direct API method successful');
    } catch (directError) {
      console.log('⚠️ Direct API failed, trying alternative methods...');
      
      try {
        // Method 2: Try YouTube Transcript API via proxy
        transcript = await this.fetchTranscriptViaProxy(videoId);
        console.log('✅ Proxy method successful');
      } catch (proxyError) {
        console.log('⚠️ Proxy method failed, trying scraping method...');
        
        try {
          // Method 3: Try scraping approach
          transcript = await this.fetchTranscriptScraping(videoId);
          console.log('✅ Scraping method successful');
        } catch (scrapingError) {
          console.log('❌ All methods failed');
          throw new Error('No transcript available for this video. The video may not have captions or auto-generated subtitles.');
        }
      }
    }

    if (!transcript || transcript.trim().length < 10) {
      throw new Error('Transcript is too short or empty');
    }

    console.log('✅ Transcript extracted successfully, length:', transcript.length);

    return {
      title: videoInfo.title,
      transcript: transcript.trim(),
      videoId: videoId,
      channelName: videoInfo.channelName
    };
  }

  // Method 1: Direct YouTube API access
  private async fetchTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 Trying direct YouTube API access...');
    
    // Try different language codes and formats
    const languageCodes = ['en', 'en-US', 'en-GB', 'de', 'es', 'fr', 'auto'];
    const formats = ['json3', 'srv3', 'ttml', 'vtt'];

    for (const lang of languageCodes) {
      for (const format of formats) {
        try {
          const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=${format}`;
          console.log(`🔍 Trying: ${lang} with format ${format}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.youtube.com/',
              'Origin': 'https://www.youtube.com'
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text, format);
              if (transcript.trim().length > 10) {
                console.log(`✅ Success with ${lang}/${format}`);
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn(`❌ Failed ${lang}/${format}:`, error);
        }
      }
    }

    throw new Error('Direct API access failed');
  }

  // Method 2: Via CORS proxy
  private async fetchTranscriptViaProxy(videoId: string): Promise<string> {
    console.log('🎯 Trying CORS proxy method...');
    
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://thingproxy.freeboard.io/fetch/',
      'https://api.codetabs.com/v1/proxy?quest='
    ];

    const transcriptUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
    ];

    for (const proxy of proxies) {
      for (const url of transcriptUrls) {
        try {
          const proxiedUrl = proxy + encodeURIComponent(url);
          console.log(`🔍 Trying proxy: ${proxy} with ${url}`);
          
          const response = await fetch(proxiedUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) {
                console.log(`✅ Success with proxy: ${proxy}`);
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn(`❌ Proxy failed: ${proxy}`, error);
        }
      }
    }

    throw new Error('Proxy method failed');
  }

  // Method 3: Scraping approach
  private async fetchTranscriptScraping(videoId: string): Promise<string> {
    console.log('🎯 Trying scraping method...');
    
    try {
      // Use a service that provides transcript scraping
      const serviceUrl = `https://youtubetranscript.com/?server_vid2=${videoId}`;
      
      // Try with different proxies
      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
      ];

      for (const proxy of proxies) {
        try {
          const proxiedUrl = proxy + encodeURIComponent(serviceUrl);
          console.log(`🔍 Trying scraping service with proxy: ${proxy}`);
          
          const response = await fetch(proxiedUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) {
                console.log(`✅ Success with scraping service: ${proxy}`);
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn(`❌ Scraping service failed with proxy: ${proxy}`, error);
        }
      }
    } catch (error) {
      console.warn('❌ Scraping method failed:', error);
    }

    throw new Error('Scraping method failed');
  }

  // Parse transcript text in various formats
  private parseTranscriptText(text: string, format?: string): string {
    try {
      // Try JSON format first
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        return this.parseJSONTranscript(text);
      }
      
      // Try VTT format
      if (text.includes('WEBVTT') || text.includes('-->')) {
        return this.parseVTTTranscript(text);
      }
      
      // Try TTML format
      if (text.includes('<tt') || text.includes('</tt>')) {
        return this.parseTTMLTranscript(text);
      }
      
      // Try XML format
      if (text.includes('<text') || text.includes('</text>')) {
        return this.parseXMLTranscript(text);
      }
      
      // Default: try to extract text from HTML/plain text
      return this.extractTextFromHTML(text);
      
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
      
      if (Array.isArray(data)) {
        // Format: [{"text": "...", "start": 0, "duration": 2.5}, ...]
        for (const item of data) {
          if (item.text || item.content) {
            transcriptParts.push((item.text || item.content).trim());
          }
        }
      } else if (data.events) {
        // Format: {"events": [{"segs": [{"utf8": "..."}]}]}
        for (const event of data.events) {
          if (event.segs) {
            for (const seg of event.segs) {
              if (seg.utf8) {
                transcriptParts.push(seg.utf8.trim());
              }
            }
          }
        }
      } else if (data.text || data.transcript) {
        // Format: {"text": "...", "transcript": "..."}
        transcriptParts.push(data.text || data.transcript);
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
          !trimmedLine.match(/^\d+$/) &&
          !trimmedLine.match(/^\d{2}:\d{2}:\d{2}/)) {
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

  // Parse XML format transcript
  private parseXMLTranscript(xmlText: string): string {
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
      console.error('Failed to parse XML transcript:', error);
      throw new Error('Failed to parse XML transcript');
    }
  }

  // Extract text from HTML or plain text
  private extractTextFromHTML(htmlText: string): string {
    try {
      // Remove HTML tags and extract text
      const text = htmlText
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&amp;/g, '&') // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      return text;
    } catch (error) {
      console.error('Failed to extract text from HTML:', error);
      return htmlText; // Return original text if parsing fails
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

export const youtubeTranscriptServiceV2 = YouTubeTranscriptServiceV2.getInstance();
