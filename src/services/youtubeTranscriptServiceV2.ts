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

  // Method 2: Via specialized transcript services
  private async fetchTranscriptViaProxy(videoId: string): Promise<string> {
    console.log('🎯 Trying specialized transcript services...');
    
    // Try dedicated transcript services that don't rely on direct YouTube API
    const transcriptServices = [
      {
        name: 'youtube-transcript-api service',
        url: `https://youtubetranscript.com/?server_vid2=${videoId}`,
        proxy: 'https://api.allorigins.win/raw?url='
      },
      {
        name: 'alternative transcript service',
        url: `https://youtubetranscript.com/?server_vid=${videoId}`,
        proxy: 'https://corsproxy.io/?'
      },
      {
        name: 'simple transcript service',
        url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        proxy: 'https://api.allorigins.win/raw?url='
      }
    ];

    for (const service of transcriptServices) {
      try {
        const proxiedUrl = service.proxy + encodeURIComponent(service.url);
        console.log(`🔍 Trying ${service.name}: ${proxiedUrl}`);
        
        const response = await fetch(proxiedUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });

        if (response.ok) {
          const text = await response.text();
          console.log(`📄 Response from ${service.name}:`, text.substring(0, 200) + '...');
          
          // Check if we got an error page instead of transcript
          if (this.isErrorPage(text)) {
            console.log(`⚠️ ${service.name} returned error page, skipping`);
            continue;
          }
          
          if (text && text.trim().length > 0) {
            const transcript = this.parseTranscriptText(text);
            if (transcript.trim().length > 10) {
              console.log(`✅ Success with ${service.name}`);
              return transcript;
            }
          }
        }
      } catch (error) {
        console.warn(`❌ ${service.name} failed:`, error);
      }
    }

    throw new Error('Specialized services failed');
  }

  // Check if response is an error page
  private isErrorPage(text: string): boolean {
    const errorIndicators = [
      'We\'re sorry',
      'automated queries',
      'can\'t process your request',
      'Google Help',
      'sory..',
      'body { font-family: verdana',
      'background-color: #f',
      'color: #0',
      'Gogle'
    ];
    
    return errorIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  // Method 3: Alternative scraping approaches
  private async fetchTranscriptScraping(videoId: string): Promise<string> {
    console.log('🎯 Trying alternative scraping methods...');
    
    // Try different approaches that might work better
    const scrapingMethods = [
      {
        name: 'HTML page parsing',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        method: 'html'
      },
      {
        name: 'embed page parsing',
        url: `https://www.youtube.com/embed/${videoId}`,
        method: 'embed'
      },
      {
        name: 'alternative transcript API',
        url: `https://youtubetranscript.com/?server_vid2=${videoId}`,
        method: 'api'
      }
    ];

    for (const method of scrapingMethods) {
      try {
        console.log(`🔍 Trying ${method.name}: ${method.url}`);
        
        // Use a reliable proxy
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(method.url);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });

        if (response.ok) {
          const text = await response.text();
          console.log(`📄 Response from ${method.name}:`, text.substring(0, 200) + '...');
          
          // Check for error pages
          if (this.isErrorPage(text)) {
            console.log(`⚠️ ${method.name} returned error page, skipping`);
            continue;
          }
          
          if (text && text.trim().length > 0) {
            let transcript: string;
            
            if (method.method === 'html' || method.method === 'embed') {
              // Extract transcript URLs from HTML
              transcript = await this.extractTranscriptFromHtml(text, videoId);
            } else {
              // Parse API response
              transcript = this.parseTranscriptText(text);
            }
            
            if (transcript && transcript.trim().length > 10) {
              console.log(`✅ Success with ${method.name}`);
              return transcript;
            }
          }
        }
      } catch (error) {
        console.warn(`❌ ${method.name} failed:`, error);
      }
    }

    throw new Error('All scraping methods failed');
  }

  // Extract transcript from YouTube page HTML
  private async extractTranscriptFromHtml(html: string, videoId: string): Promise<string> {
    try {
      console.log('🔍 Extracting transcript URLs from HTML...');
      
      // Look for transcript URLs in the page
      const transcriptUrlPatterns = [
        /"baseUrl":"([^"]*timedtext[^"]*)"/g,
        /"captionTracks":\s*\[([^\]]+)\]/g,
        /"captions":\s*{[^}]*"baseUrl":"([^"]+)"/g
      ];
      
      const transcriptUrls: string[] = [];
      
      for (const pattern of transcriptUrlPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const urlMatch = match.match(/"baseUrl":"([^"]+)"/);
            if (urlMatch) {
              const url = decodeURIComponent(urlMatch[1]);
              if (url.includes('timedtext') && !transcriptUrls.includes(url)) {
                transcriptUrls.push(url);
              }
            }
          });
        }
      }
      
      console.log('🔍 Found transcript URLs:', transcriptUrls);
      
      // Try each transcript URL
      for (const url of transcriptUrls) {
        try {
          console.log('🔍 Fetching transcript from URL:', url);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.youtube.com/',
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) {
                console.log('✅ Successfully extracted transcript from HTML');
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn('❌ Failed to fetch transcript from URL:', url, error);
        }
      }
      
      // If no URLs found, try common patterns
      const commonUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      ];
      
      for (const url of commonUrls) {
        try {
          console.log('🔍 Trying common URL:', url);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.youtube.com/',
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) {
                console.log('✅ Successfully extracted transcript from common URL');
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn('❌ Failed to fetch from common URL:', url, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error extracting transcript from HTML:', error);
    }
    
    throw new Error('Failed to extract transcript from HTML');
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
