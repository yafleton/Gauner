// Cloudflare Worker version of the backend server
// This replaces the Node.js backend for production deployment

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'OK',
        message: 'Transcript service is running on Cloudflare Workers'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transcript extraction endpoint
    if (url.pathname === '/api/transcript' && request.method === 'POST') {
      try {
        const { videoId, url: videoUrl } = await request.json();
        
        if (!videoId && !videoUrl) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Either videoId or url is required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Determine the video URL
        const finalVideoUrl = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
        
        // Use a CORS proxy to fetch transcript
        const transcriptUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`)}`;
        
        const response = await fetch(transcriptUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch transcript: ${response.statusText}`);
        }

        const transcriptData = await response.text();
        
        if (!transcriptData || transcriptData.trim().length < 10) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No transcript available for this video'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Parse transcript data
        let transcript = '';
        try {
          const data = JSON.parse(transcriptData);
          if (Array.isArray(data)) {
            transcript = data.map(item => item.text || item.content || '').join(' ').trim();
          } else if (data.text) {
            transcript = data.text.trim();
          }
        } catch (parseError) {
          // If not JSON, treat as plain text
          transcript = transcriptData.trim();
        }

        return new Response(JSON.stringify({
          success: true,
          transcript: transcript
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to extract transcript: ${error.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Google Drive upload endpoint (simplified for Workers)
    if (url.pathname === '/api/upload-to-drive' && request.method === 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Google Drive upload via backend is not supported in Workers. Please use direct client-side upload.'
      }), {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      success: false,
      error: 'Not found'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
