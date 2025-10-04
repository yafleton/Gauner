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

  // Method 1: Direct YouTube API access with better headers
  private async fetchTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 Trying direct YouTube API access...');
    
    // Try different language codes and formats, prioritizing auto-generated
    const languageCodes = ['auto', 'en', 'en-US', 'en-GB', 'de', 'es', 'fr'];
    const formats = ['json3', 'srv3', 'ttml', 'vtt'];

    for (const lang of languageCodes) {
      for (const format of formats) {
        try {
          // Try with auto-generated parameter first
          const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=${format}&kind=asr`;
          console.log(`🔍 Trying: ${lang} with format ${format} (auto-generated)`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.youtube.com/',
              'Origin': 'https://www.youtube.com',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            credentials: 'omit'
          });

          if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0 && !this.isErrorPage(text)) {
              const transcript = this.parseTranscriptText(text, format);
              if (transcript.trim().length > 10) {
                console.log(`✅ Success with ${lang}/${format} (auto-generated)`);
                return transcript;
              }
            }
          }

          // If auto-generated fails, try without kind parameter
          const url2 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=${format}`;
          console.log(`🔍 Trying: ${lang} with format ${format} (any)`);
          
          const response2 = await fetch(url2, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.youtube.com/',
              'Origin': 'https://www.youtube.com',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            credentials: 'omit'
          });

          if (response2.ok) {
            const text2 = await response2.text();
            if (text2 && text2.trim().length > 0 && !this.isErrorPage(text2)) {
              const transcript2 = this.parseTranscriptText(text2, format);
              if (transcript2.trim().length > 10) {
                console.log(`✅ Success with ${lang}/${format} (any)`);
                return transcript2;
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

  // Method 2: Via working transcript API service
  private async fetchTranscriptViaProxy(videoId: string): Promise<string> {
    console.log('🎯 Trying working transcript API service...');
    
    try {
      // Use the working youtubetotranscript.com API
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const apiUrl = 'https://youtubetotranscript.com/transcript';
      
      console.log(`🔍 Using youtubetotranscript.com API for: ${youtubeUrl}`);
      
      const formData = new URLSearchParams();
      formData.append('youtube_url', youtubeUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Origin': 'https://youtubetotranscript.com',
          'Referer': 'https://youtubetotranscript.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Priority': 'u=0, i'
        },
        body: formData
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`📄 Response from transcript API:`, html.substring(0, 300) + '...');
        
        // Check if we got an error page
        if (this.isErrorPage(html)) {
          console.log(`⚠️ Transcript API returned error page`);
          throw new Error('Transcript API returned error page');
        }
        
        // Extract transcript from the HTML response
        const transcript = this.extractTranscriptFromApiResponse(html);
        if (transcript && transcript.trim().length > 10) {
          console.log(`✅ Success with transcript API service`);
          return transcript;
        }
      }
      
      console.log(`❌ Transcript API failed with status: ${response.status}`);
    } catch (error) {
      console.warn(`❌ Transcript API failed:`, error);
    }

    // Fallback to CORS proxy with direct YouTube API
    console.log('🔄 Falling back to CORS proxy method...');
    return this.fetchTranscriptViaCorsProxy(videoId);
  }

  // Fallback CORS proxy method
  private async fetchTranscriptViaCorsProxy(videoId: string): Promise<string> {
    console.log('🎯 Trying CORS proxy with direct YouTube API...');
    
    // Try direct YouTube API through CORS proxies
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    const transcriptUrls = [
      // Try auto-generated first
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=json3&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3&kind=asr`,
      // Then try without kind parameter
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`
    ];

    for (const proxy of proxies) {
      for (const url of transcriptUrls) {
        try {
          const proxiedUrl = proxy + encodeURIComponent(url);
          console.log(`🔍 Trying CORS proxy: ${proxy} with ${url}`);
          
          const response = await fetch(proxiedUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
          });

          if (response.ok) {
            const text = await response.text();
            console.log(`📄 Response from CORS proxy:`, text.substring(0, 200) + '...');
            
            // Check if we got an error page instead of transcript
            if (this.isErrorPage(text)) {
              console.log(`⚠️ CORS proxy returned error page, skipping`);
              continue;
            }
            
            if (text && text.trim().length > 0) {
              const transcript = this.parseTranscriptText(text);
              if (transcript.trim().length > 10) {
                console.log(`✅ Success with CORS proxy: ${proxy}`);
                return transcript;
              }
            }
          }
        } catch (error) {
          console.warn(`❌ CORS proxy failed: ${proxy}`, error);
        }
      }
    }

    throw new Error('CORS proxy method failed');
  }

  // Extract transcript from API response HTML
  private extractTranscriptFromApiResponse(html: string): string {
    try {
      console.log('🔍 Extracting transcript from API response HTML...');
      
      // Look for transcript content in various possible containers
      const transcriptPatterns = [
        // Look for transcript in textarea or div
        /<textarea[^>]*>([\s\S]*?)<\/textarea>/i,
        /<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // Look for content in pre tags
        /<pre[^>]*>([\s\S]*?)<\/pre>/i,
        // Look for content in specific containers
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // Look for text content in paragraphs
        /<p[^>]*>([\s\S]*?)<\/p>/gi
      ];
      
      for (const pattern of transcriptPatterns) {
        const matches = html.match(pattern);
        if (matches && matches[1]) {
          const content = matches[1];
          
          // Clean up HTML tags and decode entities
          const cleanText = content
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          if (cleanText.length > 50) { // Ensure we have meaningful content
            console.log(`✅ Found transcript in HTML (${cleanText.length} chars)`);
            return cleanText;
          }
        }
      }
      
      // If no specific patterns match, try to extract all text content
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Look for meaningful text content (longer than typical UI text)
      const lines = textContent.split(/[.!?]\s+/);
      const meaningfulLines = lines.filter(line => 
        line.trim().length > 20 && 
        !line.toLowerCase().includes('cookie') &&
        !line.toLowerCase().includes('privacy') &&
        !line.toLowerCase().includes('terms') &&
        !line.toLowerCase().includes('submit') &&
        !line.toLowerCase().includes('button')
      );
      
      if (meaningfulLines.length > 0) {
        const transcript = meaningfulLines.join('. ').trim();
        if (transcript.length > 50) {
          console.log(`✅ Extracted transcript from general text content (${transcript.length} chars)`);
          return transcript;
        }
      }
      
    } catch (error) {
      console.error('❌ Error extracting transcript from API response:', error);
    }
    
    throw new Error('Could not extract transcript from API response');
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
      'Gogle',
      'Please stop using a bot',
      'Your bot is costing',
      'YouTubeTranscript.com',
      'youtube-transcript-api',
      'Bite hören Sie auf',
      'Ihr Bot kostet',
      'CAPTCHA',
      'blocked',
      'access denied',
      'forbidden',
      'unauthorized'
    ];
    
    return errorIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  // Method 3: Alternative scraping approaches
  private async fetchTranscriptScraping(videoId: string): Promise<string> {
    console.log('🎯 Trying alternative scraping methods...');
    
    // First, try to get available languages from the video page
    try {
      console.log('🔍 Trying to discover available languages...');
      const availableLanguages = await this.discoverAvailableLanguages(videoId);
      console.log('🌍 Discovered languages:', availableLanguages);
      
      // Try each discovered language
      for (const lang of availableLanguages) {
        try {
          console.log(`🔍 Trying discovered language: ${lang}`);
          const transcript = await this.fetchTranscriptForLanguage(videoId, lang);
          if (transcript && transcript.trim().length > 10) {
            console.log(`✅ Success with discovered language: ${lang}`);
            return transcript;
          }
        } catch (error) {
          console.warn(`❌ Failed with discovered language ${lang}:`, error);
        }
      }
    } catch (error) {
      console.warn('❌ Language discovery failed:', error);
    }

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

  // Discover available languages for a video
  private async discoverAvailableLanguages(videoId: string): Promise<string[]> {
    try {
      const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(videoPageUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        // Extract available languages from the page
        const languages: string[] = [];
        
        // Look for caption tracks in various formats
        const patterns = [
          /"captionTracks":\s*\[([^\]]+)\]/g,
          /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[([^\]]+)\]/g,
          /"languageCode":"([^"]+)"/g,
          /"vssId":"[^"]*([a-z]{2}(?:-[A-Z]{2})?)"/g
        ];
        
        for (const pattern of patterns) {
          const matches = html.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const langMatch = match.match(/"languageCode":"([^"]+)"/);
              if (langMatch && !languages.includes(langMatch[1])) {
                languages.push(langMatch[1]);
              }
            });
          }
        }
        
        // Add common fallbacks
        const fallbacks = ['auto', 'en', 'en-US', 'en-GB', 'de', 'es', 'fr'];
        fallbacks.forEach(lang => {
          if (!languages.includes(lang)) {
            languages.push(lang);
          }
        });
        
        return languages;
      }
    } catch (error) {
      console.warn('❌ Language discovery failed:', error);
    }
    
    // Fallback to common languages
    return ['auto', 'en', 'en-US', 'en-GB', 'de', 'es', 'fr'];
  }

  // Fetch transcript for a specific language
  private async fetchTranscriptForLanguage(videoId: string, language: string): Promise<string> {
    const formats = ['json3', 'srv3', 'ttml', 'vtt'];
    
    for (const format of formats) {
      try {
        // Try with auto-generated parameter first
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}&fmt=${format}&kind=asr`;
        console.log(`🔍 Trying ${language}/${format} with auto-generated`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.youtube.com/',
          }
        });

        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0 && !this.isErrorPage(text)) {
            const transcript = this.parseTranscriptText(text, format);
            if (transcript.trim().length > 10) {
              console.log(`✅ Success with ${language}/${format} (auto-generated)`);
              return transcript;
            }
          }
        }

        // Try without kind parameter
        const url2 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}&fmt=${format}`;
        console.log(`🔍 Trying ${language}/${format} without kind parameter`);
        
        const response2 = await fetch(url2, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.youtube.com/',
          }
        });

        if (response2.ok) {
          const text2 = await response2.text();
          if (text2 && text2.trim().length > 0 && !this.isErrorPage(text2)) {
            const transcript2 = this.parseTranscriptText(text2, format);
            if (transcript2.trim().length > 10) {
              console.log(`✅ Success with ${language}/${format} (any)`);
              return transcript2;
            }
          }
        }
      } catch (error) {
        console.warn(`❌ Failed ${language}/${format}:`, error);
      }
    }
    
    throw new Error(`Failed to fetch transcript for language: ${language}`);
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
