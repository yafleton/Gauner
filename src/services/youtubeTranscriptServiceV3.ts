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

  // SINGLE METHOD: Public transcript API service with fallbacks
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 SINGLE METHOD: Public transcript API service');
    
    // Try multiple public transcript services
    const services = [
      {
        name: 'youtubetotranscript.com',
        url: 'https://youtubetotranscript.com/transcript',
        method: 'POST'
      },
      {
        name: 'youtube-transcript-api',
        url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        method: 'GET'
      },
      {
        name: 'youtube-auto-subs',
        url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`,
        method: 'GET'
      }
    ];
    
    for (const service of services) {
      try {
        console.log(`🔍 Trying service: ${service.name}`);
        
        if (service.method === 'POST') {
          const formData = new URLSearchParams();
          formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`);
          
          const response = await fetch(service.url, {
            method: 'POST',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://youtubetotranscript.com',
              'Referer': 'https://youtubetotranscript.com/'
            },
            body: formData
          });

          console.log(`📡 ${service.name} response status:`, response.status);

          if (response.ok) {
            const html = await response.text();
            console.log(`📄 ${service.name} HTML response length:`, html.length);
            
            if (html && html.trim().length > 0) {
              const transcript = this.extractTranscriptFromHTML(html);
              if (transcript && transcript.trim().length > 100) {
                console.log(`✅ SUCCESS: Transcript extracted via ${service.name}`);
                return transcript;
              }
            }
          }
        } else if (service.method === 'GET') {
          const response = await fetch(service.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json,text/plain,*/*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          console.log(`📡 ${service.name} response status:`, response.status);

          if (response.ok) {
            const data = await response.text();
            console.log(`📄 ${service.name} response length:`, data.length);
            
            if (data && data.trim().length > 0) {
              try {
                const jsonData = JSON.parse(data);
                if (jsonData.events && Array.isArray(jsonData.events)) {
                  const transcript = jsonData.events
                    .filter((event: any) => event.segs && Array.isArray(event.segs))
                    .map((event: any) => event.segs.map((seg: any) => seg.utf8).join(''))
                    .join(' ')
                    .trim();
                  
                  if (transcript.length > 100) {
                    console.log(`✅ SUCCESS: Transcript extracted via ${service.name}`);
                    return transcript;
                  }
                }
              } catch (parseError) {
                console.log(`❌ ${service.name} JSON parse failed:`, parseError);
              }
            }
          }
        }
        
        console.log(`❌ ${service.name} failed`);
      } catch (error) {
        console.log(`❌ ${service.name} error:`, error);
      }
    }

    throw new Error('All transcript services failed - no transcript found');
  }

  // Extract transcript from HTML response
  private extractTranscriptFromHTML(html: string): string {
    try {
      console.log('🔍 Extracting transcript from HTML response...');
      
      // Remove all HTML tags, scripts, styles, and attributes first
      let cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
        .replace(/data-[^=]*="[^"]*"/gi, '') // Remove data attributes
        .replace(/class="[^"]*"/gi, '') // Remove class attributes
        .replace(/id="[^"]*"/gi, '') // Remove id attributes
        .replace(/style="[^"]*"/gi, '') // Remove style attributes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      console.log('🧹 Cleaned HTML and removed attributes');
      
      // Look for the actual transcript content - simplified pattern
      const transcriptPattern = /Transcript of[^"]*?([^"]*?)(?:Author:|AI Translate|Transform your|Most Used|Back Top|Help us|Generating|Finding this|Aces API|Fedback|Contact|Terms|Privacy|Change Cokie|YouTubeToTranscript|Get Fre|adsbygogle)/i;
      
      const match = cleanHtml.match(transcriptPattern);
      
      if (match && match[1]) {
        console.log('✅ Found transcript content');
        const rawContent = match[1];
        
        // Clean up the content
        const cleanContent = rawContent
          .replace(/&#34;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&midot;/g, '•')
          .replace(/&hellip;/g, '...')
          .replace(/&mdash;/g, '—')
          .replace(/&ndash;/g, '–')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Filter out any remaining UI text and attributes
        const finalContent = cleanContent
          .replace(/Author:\s*[^•]+•/gi, '')
          .replace(/Like\s*•/gi, '')
          .replace(/Subscribe\s*•/gi, '')
          .replace(/Share\s*/gi, '')
          .replace(/Transcript\s*Pin\s*video/gi, '')
          .replace(/AI\s*Translate\s*Transcript/gi, '')
          .replace(/Translate\s*this\s*transcript/gi, '')
          .replace(/Target\s*Language/gi, '')
          .replace(/Select\s*a\s*language/gi, '')
          .replace(/Translation\s*completed/gi, '')
          .replace(/Show\s*Translation/gi, '')
          .replace(/Show\s*Original/gi, '')
          .replace(/Translation\s*failed/gi, '')
          .replace(/Copy\s*Timestamp/gi, '')
          .replace(/This wil cost/gi, '')
          .replace(/credit\./gi, '')
          .replace(/Select a language/gi, '')
          .replace(/French|Italian|Dutch|Japanese|Chinese|Hindi|Swedish|Danish|Czech|Grek|Turkish|Thai|Malay|Romanian|Croatian|Slovak|Lithuanian|Estonian/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (finalContent.length > 500) {
          console.log(`✅ Extracted clean transcript (${finalContent.length} chars)`);
          return finalContent;
        }
      }
      
      // Alternative: Look for content that contains dialogue patterns with quotes
      const dialoguePattern = /(".*?"[\s\S]*?"[^"]*")/g;
      const dialogueMatches = cleanHtml.match(dialoguePattern);
      
      if (dialogueMatches && dialogueMatches.length > 15) {
        console.log('✅ Found dialogue patterns');
        const dialogueContent = dialogueMatches.join(' ').trim();
        
        const cleanDialogue = dialogueContent
          .replace(/&#34;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanDialogue.length > 800) {
          console.log(`✅ Extracted dialogue content (${cleanDialogue.length} chars)`);
          return cleanDialogue;
        }
      }
      
    } catch (error) {
      console.error('❌ Error extracting transcript from HTML:', error);
    }
    
    throw new Error('Could not extract transcript from HTML response');
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
