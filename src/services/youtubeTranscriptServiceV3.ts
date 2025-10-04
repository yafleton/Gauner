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

  // DIFFERENT API METHOD: Use a different public transcript service
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 DIFFERENT API METHOD: Using different public transcript service');
    
    try {
      // Try a different public transcript API service
      const apiUrl = `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`;
      
      console.log('🔍 Using different public API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://youtube-transcript-api.herokuapp.com'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const jsonData = await response.text();
        console.log('📄 JSON response length:', jsonData.length);
        console.log('📄 JSON response preview:', jsonData.substring(0, 200));
        
        if (jsonData && jsonData.trim().length > 0) {
          try {
            const data = JSON.parse(jsonData);
            console.log('🔍 Full API response:', data);
            
            // Try to extract transcript from any possible format
            let transcript = '';
            
            // Method 1: Direct array
            if (Array.isArray(data) && data.length > 0) {
              transcript = data
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item.text) return item.text;
                  if (item.content) return item.content;
                  if (item.transcript) return item.transcript;
                  return '';
                })
                .filter((text: string) => text.trim().length > 0)
                .join(' ')
                .trim();
            }
            
            // Method 2: Nested transcript
            else if (data.transcript && Array.isArray(data.transcript)) {
              transcript = data.transcript
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item.text) return item.text;
                  if (item.content) return item.content;
                  return '';
                })
                .filter((text: string) => text.trim().length > 0)
                .join(' ')
                .trim();
            }
            
            // Method 3: Single text field
            else if (data.text) {
              transcript = data.text.trim();
            }
            
            // Method 4: Content field
            else if (data.content) {
              transcript = data.content.trim();
            }
            
            // Method 5: Look for any string value
            else {
              const stringValues = Object.values(data).filter(value => 
                typeof value === 'string' && value.trim().length > 50
              );
              if (stringValues.length > 0) {
                transcript = stringValues.join(' ').trim();
              }
            }
            
            if (transcript.length > 50) {
              console.log('✅ SUCCESS: Transcript extracted via different API method');
              return transcript.replace(/\s+/g, ' ').trim();
            } else {
              console.log('❌ Transcript too short:', transcript.length);
            }
          } catch (parseError) {
            console.log('❌ JSON parse failed:', parseError);
            console.log('📄 Raw response:', jsonData);
          }
        } else {
          console.log('❌ Empty API response');
        }
      } else {
        console.log('❌ Different API returned status:', response.status);
        
        // Try another completely different service
        const altApiUrl = `https://api.vevioz.com/api/button/mp3/${videoId}`;
        console.log('🔍 Trying completely different API:', altApiUrl);
        
        const altResponse = await fetch(altApiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json,*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        console.log('📡 Alt API response status:', altResponse.status);

        if (altResponse.ok) {
          const altJsonData = await altResponse.text();
          console.log('📄 Alt JSON response length:', altJsonData.length);
          
          if (altJsonData && altJsonData.trim().length > 0) {
            try {
              const altData = JSON.parse(altJsonData);
              console.log('🔍 Alt API response:', altData);
              
              // Look for transcript in any field
              if (altData.transcript || altData.subtitle || altData.caption) {
                const transcript = (altData.transcript || altData.subtitle || altData.caption).trim();
                if (transcript.length > 50) {
                  console.log('✅ SUCCESS: Transcript found in alt API');
                  return transcript.replace(/\s+/g, ' ').trim();
                }
              }
            } catch (altParseError) {
              console.log('❌ Alt JSON parse failed:', altParseError);
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ Different API method failed:', error);
    }

    throw new Error('Different API method failed - no transcript found');
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
