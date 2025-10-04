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

  // SINGLE DIRECT METHOD: YouTube get_video_info API
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 SINGLE DIRECT METHOD: YouTube get_video_info API');
    
    try {
      // Use YouTube's get_video_info endpoint to get transcript data
      const apiUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}&el=detailpage&ps=default&eurl=&gl=US&hl=en`;
      
      console.log('🔍 Using direct YouTube API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.text();
        console.log('📄 Response length:', data.length);
        
        if (data && data.trim().length > 0) {
          // Parse URL-encoded data
          const urlParams = new URLSearchParams(data);
          const playerResponse = urlParams.get('player_response');
          
          if (playerResponse) {
            try {
              const playerData = JSON.parse(playerResponse);
              console.log('🔍 Player data keys:', Object.keys(playerData));
              
              // Look for captions in player data
              if (playerData.captions && playerData.captions.playerCaptionsTracklistRenderer) {
                const captions = playerData.captions.playerCaptionsTracklistRenderer.captionTracks;
                console.log('🔍 Found captions:', captions);
                
                if (captions && captions.length > 0) {
                  // Try to get auto-generated captions first
                  const autoCaption = captions.find((cap: any) => cap.kind === 'asr');
                  const caption = autoCaption || captions[0];
                  
                  if (caption && caption.baseUrl) {
                    console.log('🔍 Using caption URL:', caption.baseUrl);
                    
                    // Fetch the actual caption data
                    const captionResponse = await fetch(caption.baseUrl);
                    if (captionResponse.ok) {
                      const captionXml = await captionResponse.text();
                      console.log('📄 Caption XML length:', captionXml.length);
                      
                      // Parse XML captions
                      const transcript = this.parseXmlCaptions(captionXml);
                      if (transcript && transcript.length > 50) {
                        console.log('✅ SUCCESS: Transcript extracted via YouTube get_video_info');
                        return transcript;
                      }
                    }
                  }
                }
              }
              
              console.log('❌ No captions found in player data');
            } catch (parseError) {
              console.log('❌ Player data parse failed:', parseError);
            }
          } else {
            console.log('❌ No player_response in URL params');
          }
        } else {
          console.log('❌ Empty response data');
        }
      } else {
        console.log('❌ API returned status:', response.status);
      }
    } catch (error) {
      console.log('❌ Direct API failed:', error);
    }

    throw new Error('Direct YouTube API failed - no transcript found');
  }

  // Parse XML captions
  private parseXmlCaptions(xml: string): string {
    try {
      console.log('🔍 Parsing XML captions...');
      
      // Extract text from XML captions
      const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g);
      
      if (textMatches && textMatches.length > 0) {
        const transcript = textMatches
          .map(match => {
            const textContent = match.match(/<text[^>]*>([^<]*)<\/text>/);
            return textContent ? textContent[1] : '';
          })
          .filter(text => text.trim().length > 0)
          .join(' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`✅ Parsed XML transcript (${transcript.length} chars)`);
        return transcript;
      }
      
      console.log('❌ No text elements found in XML');
    } catch (error) {
      console.log('❌ XML parse error:', error);
    }
    
    return '';
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
