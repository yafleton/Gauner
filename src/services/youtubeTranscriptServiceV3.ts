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

  // SINGLE METHOD: Public transcript API service
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 SINGLE METHOD: Public transcript API service');
    
    try {
      // Use a public transcript API service
      const apiUrl = `https://youtubetotranscript.com/transcript`;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log('🔍 Using public API:', apiUrl);
      console.log('🔍 For video URL:', youtubeUrl);
      
      const formData = new URLSearchParams();
      formData.append('youtube_url', youtubeUrl);
      
      const response = await fetch(apiUrl, {
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

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const html = await response.text();
        console.log('📄 HTML response length:', html.length);
        console.log('📄 HTML preview:', html.substring(0, 500));
        
        if (html && html.trim().length > 0) {
          const transcript = this.extractTranscriptFromHTML(html);
          if (transcript && transcript.trim().length > 10) {
            console.log('✅ SUCCESS: Transcript extracted via public API');
            return transcript;
          }
        }
      } else {
        console.log('❌ Public API returned status:', response.status);
      }
    } catch (error) {
      console.log('❌ Public API failed:', error);
    }

    throw new Error('Public transcript API failed - no transcript found');
  }

  // Extract transcript from HTML response
  private extractTranscriptFromHTML(html: string): string {
    try {
      console.log('🔍 Extracting transcript from HTML response...');
      
      // First, remove all JavaScript and CSS to avoid extracting code
      let cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<meta[^>]*>/gi, '');
      
      console.log('🧹 Removed scripts and styles');
      
      // Look for the actual transcript content - it should be after "Transcript of" title
      // and before UI elements like "Author:", "AI Translate", etc.
      const transcriptPattern = /Transcript of[^<]*<[^>]*>([\s\S]*?)(?:Author:|AI Translate|Translate this|Target Language|Most Used|Back Top|Help us improve|Generating Content|Finding this tol useful|Aces API|Fedback|Contact|Terms and Conditions|Privacy Policy|Change Cokie Consent|YouTubeToTranscript\.com|Get Fre Transcript|adsbygogle)/i;
      
      const match = cleanHtml.match(transcriptPattern);
      
      if (match && match[1]) {
        console.log('✅ Found transcript content between title and UI elements');
        const rawContent = match[1];
        
        // Clean up the content - remove HTML tags and decode entities
        const cleanContent = rawContent
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/&#34;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&midot;/g, '•')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Filter out any remaining UI text
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
          .replace(/\s+/g, ' ')
          .trim();
        
        if (finalContent.length > 300) {
          console.log(`✅ Extracted clean transcript (${finalContent.length} chars)`);
          return finalContent;
        }
      }
      
      // Alternative: Look for content that contains dialogue patterns with quotes
      const dialoguePattern = /(".*?"[\s\S]*?"[^"]*")/g;
      const dialogueMatches = cleanHtml.match(dialoguePattern);
      
      if (dialogueMatches && dialogueMatches.length > 10) {
        console.log('✅ Found dialogue patterns');
        const dialogueContent = dialogueMatches.join(' ').trim();
        
        const cleanDialogue = dialogueContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/&#34;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanDialogue.length > 500) {
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
