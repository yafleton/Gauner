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

  // CORS PROXY METHOD: Use CORS proxy to bypass YouTube blocking
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 CORS PROXY METHOD: Using CORS proxy to bypass YouTube blocking');
    
    try {
      // Step 1: Get the YouTube video page via CORS proxy
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(videoUrl)}`;
      
      console.log('🔍 Fetching YouTube page via CORS proxy:', proxyUrl);
      
      const pageResponse = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch YouTube page via proxy: ${pageResponse.status}`);
      }

      const pageHtml = await pageResponse.text();
      console.log('📄 YouTube page HTML length:', pageHtml.length);

      // Step 2: Extract player_response JSON from the page
      const playerResponseMatch = pageHtml.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (!playerResponseMatch) {
        throw new Error('Could not find ytInitialPlayerResponse in page');
      }

      const playerResponseJson = playerResponseMatch[1];
      console.log('🔍 Found player_response JSON, length:', playerResponseJson.length);

      const playerResponse = JSON.parse(playerResponseJson);
      console.log('🔍 Parsed player_response structure:', Object.keys(playerResponse));

      // Step 3: Extract caption tracks
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captionTracks || !Array.isArray(captionTracks)) {
        throw new Error('No caption tracks found in player response');
      }

      console.log('📝 Found caption tracks:', captionTracks.length);
      captionTracks.forEach((track: any, index: number) => {
        console.log(`  Track ${index}:`, {
          name: track?.name?.simpleText,
          languageCode: track?.languageCode,
          kind: track?.kind,
          isTranslatable: track?.isTranslatable
        });
      });

      // Step 4: Try to find auto-generated English captions
      let selectedTrack = captionTracks.find((track: any) => 
        track?.languageCode === 'en' && track?.kind === 'asr'
      );

      // Fallback to any English track
      if (!selectedTrack) {
        selectedTrack = captionTracks.find((track: any) => 
          track?.languageCode === 'en'
        );
      }

      // Fallback to any auto-generated track
      if (!selectedTrack) {
        selectedTrack = captionTracks.find((track: any) => 
          track?.kind === 'asr'
        );
      }

      // Fallback to first available track
      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }

      if (!selectedTrack?.baseUrl) {
        throw new Error('No suitable caption track found');
      }

      console.log('🎯 Selected caption track:', {
        name: selectedTrack?.name?.simpleText,
        languageCode: selectedTrack?.languageCode,
        kind: selectedTrack?.kind,
        baseUrl: selectedTrack?.baseUrl?.substring(0, 100) + '...'
      });

      // Step 5: Fetch the caption XML via CORS proxy
      const captionUrl = selectedTrack.baseUrl;
      const captionProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(captionUrl)}`;
      
      console.log('🔍 Fetching caption XML via CORS proxy:', captionProxyUrl.substring(0, 100) + '...');

      const captionResponse = await fetch(captionProxyUrl);

      if (!captionResponse.ok) {
        throw new Error(`Failed to fetch captions via proxy: ${captionResponse.status}`);
      }

      const captionXml = await captionResponse.text();
      console.log('📄 Caption XML length:', captionXml.length);

      // Step 6: Parse the caption XML
      const transcript = this.parseCaptionXml(captionXml);
      
      if (transcript.length > 50) {
        console.log('✅ SUCCESS: Transcript extracted via CORS proxy method');
        return transcript;
      } else {
        throw new Error('Transcript too short after parsing');
      }

    } catch (error) {
      console.log('❌ CORS proxy method failed:', error);
      
      // Fallback: Try alternative CORS proxy
      try {
        console.log('🔄 Trying alternative CORS proxy...');
        return await this.tryAlternativeProxy(videoId);
      } catch (fallbackError) {
        console.log('❌ Alternative proxy also failed:', fallbackError);
        throw new Error(`CORS proxy method failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Alternative CORS proxy method
  private async tryAlternativeProxy(videoId: string): Promise<string> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${videoUrl}`;
    
    console.log('🔍 Trying alternative CORS proxy:', proxyUrl);
    
    const pageResponse = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!pageResponse.ok) {
      throw new Error(`Alternative proxy failed: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();
    console.log('📄 Alternative proxy page HTML length:', pageHtml.length);

    // Extract and process the same way
    const playerResponseMatch = pageHtml.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (!playerResponseMatch) {
      throw new Error('Could not find ytInitialPlayerResponse in alternative proxy response');
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || !Array.isArray(captionTracks)) {
      throw new Error('No caption tracks found in alternative proxy response');
    }

    let selectedTrack = captionTracks.find((track: any) => 
      track?.languageCode === 'en' && track?.kind === 'asr'
    ) || captionTracks.find((track: any) => track?.languageCode === 'en') || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      throw new Error('No suitable caption track found in alternative proxy');
    }

    const captionProxyUrl = `https://cors-anywhere.herokuapp.com/${selectedTrack.baseUrl}`;
    const captionResponse = await fetch(captionProxyUrl);
    
    if (!captionResponse.ok) {
      throw new Error(`Failed to fetch captions via alternative proxy: ${captionResponse.status}`);
    }

    const captionXml = await captionResponse.text();
    const transcript = this.parseCaptionXml(captionXml);
    
    if (transcript.length > 50) {
      console.log('✅ SUCCESS: Transcript extracted via alternative CORS proxy');
      return transcript;
    } else {
      throw new Error('Transcript too short after alternative proxy parsing');
    }
  }

  // Parse YouTube caption XML to extract text
  private parseCaptionXml(xml: string): string {
    console.log('🔍 Parsing caption XML...');
    
    try {
      // Remove XML declaration and extract text content from <text> tags
      const textMatches = xml.match(/<text[^>]*>(.*?)<\/text>/g);
      
      if (!textMatches || textMatches.length === 0) {
        console.log('❌ No text tags found in caption XML');
        return '';
      }

      console.log('📝 Found text segments:', textMatches.length);

      const transcriptParts = textMatches.map(match => {
        // Extract text content and decode HTML entities
        const textContent = match.replace(/<text[^>]*>(.*?)<\/text>/, '$1');
        
        // Decode HTML entities
        const decoded = textContent
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/&#34;/g, '"')
          .replace(/&#x27;/g, "'");
        
        return decoded.trim();
      }).filter(text => text.length > 0);

      const transcript = transcriptParts.join(' ').replace(/\s+/g, ' ').trim();
      
      console.log('📄 Parsed transcript length:', transcript.length);
      console.log('📄 Transcript preview:', transcript.substring(0, 200) + '...');
      
      return transcript;
    } catch (error) {
      console.log('❌ Failed to parse caption XML:', error);
      return '';
    }
  }

  // Parse XML captions
  private parseXmlCaptions(xml: string): string {
    try {
      console.log('🔍 Parsing XML captions...');
      console.log('📄 XML preview:', xml.substring(0, 500));
      
      // Extract text from XML captions - try multiple patterns
      const patterns = [
        /<text[^>]*>([^<]*)<\/text>/g,  // Standard pattern
        /<text[^>]*start="[^"]*"[^>]*>([^<]*)<\/text>/g,  // With start time
        /<p[^>]*>([^<]*)<\/p>/g,  // Paragraph pattern
        /<span[^>]*>([^<]*)<\/span>/g  // Span pattern
      ];
      
      let transcript = '';
      
      for (const pattern of patterns) {
        const matches = xml.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`✅ Found ${matches.length} matches with pattern:`, pattern);
          
          transcript = matches
            .map(match => {
              const textContent = match.match(/>([^<]*)</);
              return textContent ? textContent[1] : '';
            })
            .filter(text => text.trim().length > 0)
            .join(' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (transcript.length > 50) {
            console.log(`✅ Parsed XML transcript (${transcript.length} chars)`);
            return transcript;
          }
        }
      }
      
      console.log('❌ No text elements found in XML with any pattern');
      return '';
    } catch (error) {
      console.log('❌ XML parse error:', error);
      return '';
    }
  }



  // Parse JSON transcript format
  private parseTranscriptJSON(jsonText: string): string {
    try {
      console.log('🔍 Parsing JSON transcript...');
      
      const data = JSON.parse(jsonText);
      console.log('📊 JSON data structure:', typeof data, Array.isArray(data) ? `Array with ${data.length} items` : 'Object');
      
      const transcriptParts: string[] = [];
      
      if (Array.isArray(data)) {
        // Format: [{"text": "...", "start": 0, "duration": 2.5}, ...]
        console.log('📝 Processing array format...');
        for (const item of data) {
          if (item && typeof item === 'object' && (item.text || item.content)) {
            const text = item.text || item.content;
            if (text && typeof text === 'string' && text.trim().length > 0) {
              transcriptParts.push(text.trim());
            }
          }
        }
      } else if (data && typeof data === 'object') {
        // Try different object formats
        console.log('📝 Processing object format...');
        
        if (data.events && Array.isArray(data.events)) {
          // Format: {"events": [{"segs": [{"utf8": "..."}]}]}
          console.log('📝 Processing events format...');
          for (const event of data.events) {
            if (event && event.segs && Array.isArray(event.segs)) {
              for (const seg of event.segs) {
                if (seg && (seg.utf8 || seg.text)) {
                  const text = seg.utf8 || seg.text;
                  if (text && typeof text === 'string' && text.trim().length > 0) {
                    transcriptParts.push(text.trim());
                  }
                }
              }
            }
          }
        } else if (data.text || data.transcript) {
          // Format: {"text": "...", "transcript": "..."}
          console.log('📝 Processing simple object format...');
          const text = data.text || data.transcript;
          if (text && typeof text === 'string' && text.trim().length > 0) {
            transcriptParts.push(text.trim());
          }
        }
      }
      
      const finalTranscript = transcriptParts.join(' ').trim();
      console.log('📊 Final transcript length:', finalTranscript.length);
      console.log('📊 Final transcript preview:', finalTranscript.substring(0, 200));
      
      return finalTranscript;
    } catch (error) {
      console.error('❌ Failed to parse JSON transcript:', error);
      throw new Error('Failed to parse transcript JSON');
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

export const youtubeTranscriptServiceV3 = YouTubeTranscriptServiceV3.getInstance();
