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

  // SIMPLE PUBLIC API METHOD: One simple public API that works
  private async getTranscriptDirect(videoId: string): Promise<string> {
    console.log('🎯 SIMPLE PUBLIC API METHOD: Using single working public API');
    
    // Use a reliable public transcript API
    const apiUrl = `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`;
    
    console.log('🔍 Using public API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const jsonData = await response.text();
    console.log('📄 Response length:', jsonData.length);

    if (!jsonData || jsonData.trim().length === 0) {
      throw new Error('Empty API response');
    }

    const data = JSON.parse(jsonData);
    console.log('🔍 Response data:', data);

    // Extract transcript text
    let transcript = '';

    if (Array.isArray(data)) {
      // Direct array of transcript entries
      transcript = data
        .map((entry: any) => {
          if (typeof entry === 'string') return entry;
          if (entry.text) return entry.text;
          if (entry.content) return entry.content;
          return '';
        })
        .filter((text: string) => text.trim().length > 0)
        .join(' ')
        .trim();
    } else if (data.transcript && Array.isArray(data.transcript)) {
      // Nested transcript array
      transcript = data.transcript
        .map((entry: any) => {
          if (typeof entry === 'string') return entry;
          if (entry.text) return entry.text;
          if (entry.content) return entry.content;
          return '';
        })
        .filter((text: string) => text.trim().length > 0)
        .join(' ')
        .trim();
    } else if (data.text) {
      // Single text field
      transcript = data.text.trim();
    } else {
      throw new Error('Unknown response format');
    }

    if (transcript.length < 50) {
      throw new Error('Transcript too short');
    }

    console.log('✅ SUCCESS: Transcript extracted');
    return transcript.replace(/\s+/g, ' ').trim();
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
