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

    // Try to extract transcript using multiple methods
    try {
      let transcript: string;
      
      // First try backend service (most reliable)
      try {
        transcript = await this.fetchTranscriptFromBackend(videoId);
      } catch (backendError) {
        console.log('🔄 Backend service unavailable, trying proxy methods...');
        transcript = await this.fetchTranscriptFromProxy(videoId);
      }
      
      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Transcript is too short or empty');
      }
      
      console.log('✅ Successfully extracted transcript, length:', transcript.length);
      
      return {
        title: videoInfo.title,
        transcript: transcript,
        videoId: videoId,
        duration: videoInfo.duration,
        channelName: videoInfo.channelName
      };
    } catch (error) {
      console.error('❌ Failed to extract transcript:', error);
      
      // Provide more helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('No transcript available')) {
        throw new Error('No transcript available for this video. Please ensure the video has captions or auto-generated subtitles enabled. You can check this by opening the video on YouTube and looking for the CC (captions) button.');
      }
      
      throw new Error(`Failed to extract transcript: ${errorMessage}`);
    }
  }

  // Fetch transcript using CORS proxy services
  private async fetchTranscriptFromProxy(videoId: string): Promise<string> {
    console.log('🔍 Attempting to extract transcript for video:', videoId);
    
    // CORS proxy services that allow YouTube API access
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://thingproxy.freeboard.io/fetch/',
    ];

    // YouTube transcript API endpoints to try
    const transcriptEndpoints = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-GB`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto`,
    ];

    // Try each CORS proxy with each endpoint
    for (const proxy of corsProxies) {
      for (const endpoint of transcriptEndpoints) {
        try {
          const proxiedUrl = proxy + encodeURIComponent(endpoint);
          console.log('🔍 Trying CORS proxy:', proxy, 'with endpoint:', endpoint);
          
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
              console.log('📄 Got response from proxy, parsing...');
              
              // Try to parse as JSON first (for transcript APIs)
              if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
                try {
                  const data = JSON.parse(text);
                  if (Array.isArray(data)) {
                    // Format: [{"text": "...", "start": 0, "duration": 2.5}, ...]
                    const transcript = data.map((item: any) => item.text || item.content || '').join(' ').trim();
                    if (transcript.length > 10) {
                      console.log('✅ Successfully extracted transcript via proxy (JSON format)');
                      return transcript;
                    }
                  } else if (data.text || data.transcript) {
                    // Format: {"text": "...", "transcript": "..."}
                    const transcript = data.text || data.transcript || '';
                    if (transcript.length > 10) {
                      console.log('✅ Successfully extracted transcript via proxy (object format)');
                      return transcript;
                    }
                  }
                } catch (parseError) {
                  console.warn('❌ Failed to parse JSON response:', parseError);
                }
              }
              
              // Try to parse as transcript text
              const parsedTranscript = this.parseTranscriptText(text);
              if (parsedTranscript.trim().length > 10) {
                console.log('✅ Successfully extracted transcript via proxy (text format)');
                return parsedTranscript;
              }
            }
          }
        } catch (error) {
          console.warn('❌ Failed to fetch via proxy:', proxy, error);
        }
      }
    }

    // If CORS proxies fail, try direct public transcript services
    console.log('🔄 CORS proxies failed, trying direct public services...');
    return this.fetchTranscriptFromPublicServices(videoId);
  }

  // Try backend service first (most reliable)
  private async fetchTranscriptFromBackend(videoId: string): Promise<string> {
    try {
      console.log('🔍 Trying backend yt-dlp service for video:', videoId);
      
      const response = await fetch('http://localhost:3001/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId })
      });
      
      console.log('📡 Backend response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Backend response data:', { success: data.success, transcriptLength: data.transcript?.length });
        
        if (data.success && data.transcript) {
          console.log('✅ Successfully extracted transcript from backend yt-dlp service');
          return data.transcript;
        } else {
          throw new Error(data.error || 'Backend service failed');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Backend service error:', response.status, errorText);
        throw new Error(`Backend service error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.warn('❌ Backend yt-dlp service failed:', error);
      throw error;
    }
  }

  // Try public transcript services that don't require CORS
  private async fetchTranscriptFromPublicServices(videoId: string): Promise<string> {
    console.log('🔍 Trying yt-dlp based services...');
    
    // Try services that actually use yt-dlp on the backend
    const ytdlpServices = [
      // Services that run yt-dlp on their servers
      `https://youtubetranscript.com/?server_vid2=${videoId}`,
      `https://youtubetranscript.com/?server_vid=${videoId}`,
      
      // Alternative transcript services
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
    ];

    for (const serviceUrl of ytdlpServices) {
      try {
        console.log('🔍 Trying yt-dlp service:', serviceUrl);
        
        // Use a reliable CORS proxy for yt-dlp services
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(serviceUrl)}`;
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });
        
        if (response.ok) {
          const text = await response.text();
          console.log('📄 Got response from yt-dlp service:', text.substring(0, 100) + '...');
          
          if (text && text.trim().length > 0) {
            // Try to parse as JSON first (yt-dlp format)
            if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
              try {
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                  // yt-dlp JSON format: [{"text": "...", "start": 0, "duration": 2.5}, ...]
                  const transcript = data.map((item: any) => item.text || item.content || '').join(' ').trim();
                  if (transcript.length > 10) {
                    console.log('✅ Successfully extracted transcript via yt-dlp service (JSON)');
                    return transcript;
                  }
                } else if (data.text || data.transcript) {
                  // Alternative format: {"text": "...", "transcript": "..."}
                  const transcript = data.text || data.transcript || '';
                  if (transcript.length > 10) {
                    console.log('✅ Successfully extracted transcript via yt-dlp service (object)');
                    return transcript;
                  }
                }
              } catch (parseError) {
                console.warn('❌ Failed to parse JSON from yt-dlp service:', parseError);
              }
            }
            
            // Try to parse as plain text (VTT, SRT, etc.)
            const parsedTranscript = this.parseTranscriptText(text);
            if (parsedTranscript.trim().length > 10) {
              console.log('✅ Successfully extracted transcript via yt-dlp service (text)');
              return parsedTranscript;
            }
          }
        }
      } catch (error) {
        console.warn('❌ yt-dlp service failed:', serviceUrl, error);
      }
    }

    // Try a different approach - use a service that specifically handles YouTube transcripts
    try {
      console.log('🔍 Trying dedicated YouTube transcript service...');
      
      // Use a service that's known to work with YouTube transcripts
      const transcriptServiceUrl = `https://youtubetranscript.com/?server_vid2=${videoId}`;
      
      // Try with a different proxy
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(transcriptServiceUrl)}`;
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const text = await response.text();
        console.log('📄 Got response from dedicated service:', text.substring(0, 100) + '...');
        
        if (text && text.trim().length > 0) {
          // Parse the response
          const parsedTranscript = this.parseTranscriptText(text);
          if (parsedTranscript.trim().length > 10) {
            console.log('✅ Successfully extracted transcript from dedicated service');
            return parsedTranscript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Dedicated transcript service failed:', error);
    }

    // Try using a simple transcript service that works
    try {
      console.log('🔍 Trying simple transcript service...');
      
      // Use a simple service that should work
      const simpleServiceUrl = `https://youtubetranscript.com/?server_vid2=${videoId}`;
      
      // Try with a simple fetch (no proxy needed if the service has CORS enabled)
      const response = await fetch(simpleServiceUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log('📄 Got response from simple service:', text.substring(0, 100) + '...');
        
        if (text && text.trim().length > 0) {
          const parsedTranscript = this.parseTranscriptText(text);
          if (parsedTranscript.trim().length > 10) {
            console.log('✅ Successfully extracted transcript from simple service');
            return parsedTranscript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Simple transcript service failed:', error);
    }

    // Try a different approach - use a service that specifically handles YouTube transcripts
    try {
      console.log('🔍 Trying alternative transcript service...');
      
      // Use a different service
      const altServiceUrl = `https://youtubetranscript.com/?server_vid=${videoId}`;
      
      const response = await fetch(altServiceUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log('📄 Got response from alternative service:', text.substring(0, 100) + '...');
        
        if (text && text.trim().length > 0) {
          const parsedTranscript = this.parseTranscriptText(text);
          if (parsedTranscript.trim().length > 10) {
            console.log('✅ Successfully extracted transcript from alternative service');
            return parsedTranscript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Alternative transcript service failed:', error);
    }

    // Try one more approach - use a public API that runs yt-dlp
    try {
      console.log('🔍 Trying public yt-dlp API service...');
      
      // Use a public API that actually runs yt-dlp
      const ytdlpApiUrl = `https://api.smmry.com/youtube-transcript/${videoId}`;
      
      const response = await fetch(ytdlpApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log('📄 Got response from yt-dlp API:', text.substring(0, 100) + '...');
        
        if (text && text.trim().length > 0) {
          const parsedTranscript = this.parseTranscriptText(text);
          if (parsedTranscript.trim().length > 10) {
            console.log('✅ Successfully extracted transcript from yt-dlp API');
            return parsedTranscript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ yt-dlp API service failed:', error);
    }

    // If all else fails, try HTML parsing approach
    console.log('🔄 All yt-dlp services failed, trying HTML parsing approach...');
    return this.fetchTranscriptFromHtml(videoId);
  }

  // Fetch transcript by parsing HTML page
  private async fetchTranscriptFromHtml(videoId: string): Promise<string> {
    try {
      const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log('📄 Fetching video page to extract transcript URLs...');
      
      const pageResponse = await fetch(videoPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      if (pageResponse.ok) {
        const pageHtml = await pageResponse.text();
        console.log('📄 Got video page HTML, extracting transcript URLs...');
        
        // Extract transcript URLs from the page HTML
        const transcriptUrls = this.extractTranscriptUrlsFromHtml(pageHtml, videoId);
        console.log('🔍 Found transcript URLs:', transcriptUrls);
        
        if (transcriptUrls.length > 0) {
          // Try each transcript URL
          for (const transcriptUrl of transcriptUrls) {
            try {
              console.log('🔍 Trying transcript URL:', transcriptUrl);
              const transcriptResponse = await fetch(transcriptUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://www.youtube.com/',
                }
              });

              if (transcriptResponse.ok) {
                const transcriptText = await transcriptResponse.text();
                if (transcriptText && transcriptText.trim().length > 0) {
                  const parsedTranscript = this.parseTranscriptText(transcriptText);
                  if (parsedTranscript.trim().length > 10) {
                    console.log('✅ Successfully extracted transcript from URL:', transcriptUrl);
                    return parsedTranscript;
                  }
                }
              }
            } catch (error) {
              console.warn('❌ Failed to fetch transcript from URL:', transcriptUrl, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('❌ Failed to fetch video page:', error);
    }

    // If HTML parsing fails, try alternative methods
    console.log('🔄 HTML parsing failed, trying alternative methods...');
    return this.fetchTranscriptAlternative(videoId);
  }

  // Extract transcript URLs from YouTube page HTML (yt-dlp style)
  private extractTranscriptUrlsFromHtml(html: string, videoId: string): string[] {
    const transcriptUrls: string[] = [];
    
    try {
      // Look for transcript URLs in the page HTML
      // YouTube embeds transcript URLs in various places in the HTML
      
      // Method 1: Look for captions in player config
      const playerConfigMatch = html.match(/"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[([^\]]+)\]/);
      if (playerConfigMatch) {
        const captionTracks = playerConfigMatch[1];
        const urlMatches = captionTracks.match(/"baseUrl":"([^"]+)"/g);
        if (urlMatches) {
          urlMatches.forEach(match => {
            const url = match.match(/"baseUrl":"([^"]+)"/)?.[1];
            if (url) {
              transcriptUrls.push(decodeURIComponent(url));
            }
          });
        }
      }
      
      // Method 2: Look for transcript URLs in ytInitialPlayerResponse
      const ytInitialPlayerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (ytInitialPlayerResponseMatch) {
        try {
          const playerResponse = JSON.parse(ytInitialPlayerResponseMatch[1]);
          if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
            playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks.forEach((track: any) => {
              if (track.baseUrl) {
                transcriptUrls.push(track.baseUrl);
              }
            });
          }
        } catch (error) {
          console.warn('Failed to parse ytInitialPlayerResponse:', error);
        }
      }
      
      // Method 3: Look for transcript URLs in various other places
      const urlPatterns = [
        /"baseUrl":"([^"]*timedtext[^"]*)"/g,
        /"captionTracks":\s*\[([^\]]+)\]/g,
        /"captions":\s*{[^}]*"baseUrl":"([^"]+)"/g
      ];
      
      urlPatterns.forEach(pattern => {
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
      });
      
      // Method 4: Construct common transcript URLs
      const commonUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto`,
      ];
      
      commonUrls.forEach(url => {
        if (!transcriptUrls.includes(url)) {
          transcriptUrls.push(url);
        }
      });
      
      console.log('🔍 Extracted transcript URLs:', transcriptUrls);
      return transcriptUrls;
    } catch (error) {
      console.error('❌ Error extracting transcript URLs from HTML:', error);
      return [];
    }
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

    // Final fallback - try CORS proxy
    console.log('🔄 Trying CORS proxy fallback...');
    try {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0) {
          const transcript = this.parseTranscriptText(text);
          if (transcript.trim().length > 10) {
            console.log('✅ Found transcript with CORS proxy fallback');
            return transcript;
          }
        }
      }
    } catch (error) {
      console.warn('❌ CORS proxy fallback also failed:', error);
    }

    // Last resort - try different CORS proxies
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors.bridged.cc/',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    for (const proxy of corsProxies) {
      try {
        console.log(`🔄 Trying CORS proxy: ${proxy}`);
        const proxyUrl = `${proxy}https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0) {
            const transcript = this.parseTranscriptText(text);
            if (transcript.trim().length > 10) {
              console.log(`✅ Found transcript with proxy: ${proxy}`);
              return transcript;
            }
          }
        }
      } catch (error) {
        console.warn(`❌ Proxy ${proxy} failed:`, error);
      }
    }

    throw new Error('No transcript available for this video. The video may not have captions or auto-generated subtitles. Try a different video with confirmed captions.');
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
