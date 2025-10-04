// Cloudflare Worker for YouTube Transcript Extraction
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    
    if (url.pathname === '/api/transcript') {
      const videoId = url.searchParams.get('video_id');
      
      if (!videoId) {
        return new Response(JSON.stringify({ error: 'video_id parameter required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      try {
        // Try different YouTube subtitle formats
        const formats = ['json3', 'srv3', 'ttml', 'vtt'];
        
        for (const format of formats) {
          try {
            const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=${format}`;
            console.log(`Trying format: ${format}`);
            
            const response = await fetch(transcriptUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (response.ok) {
              const content = await response.text();
              console.log(`Success with format: ${format}, content length: ${content.length}`);
              
              // Parse based on format
              let transcript = '';
              
              if (format === 'json3') {
                try {
                  const data = JSON.parse(content);
                  if (data.events && Array.isArray(data.events)) {
                    transcript = data.events
                      .filter(event => event.segs && event.segs.length > 0)
                      .map(event => event.segs.map(seg => seg.utf8 || '').join(''))
                      .join(' ')
                      .trim();
                  }
                } catch (e) {
                  console.log('Failed to parse JSON3:', e);
                }
              } else if (format === 'srv3') {
                // Parse SRV3 format (similar to JSON3)
                try {
                  const data = JSON.parse(content);
                  if (data.events && Array.isArray(data.events)) {
                    transcript = data.events
                      .filter(event => event.segs && event.segs.length > 0)
                      .map(event => event.segs.map(seg => seg.utf8 || '').join(''))
                      .join(' ')
                      .trim();
                  }
                } catch (e) {
                  console.log('Failed to parse SRV3:', e);
                }
              } else if (format === 'ttml' || format === 'vtt') {
                // Parse XML/TTML format
                const textMatches = content.match(/<text[^>]*>(.*?)<\/text>/g);
                if (textMatches && textMatches.length > 0) {
                  transcript = textMatches
                    .map(match => {
                      const textContent = match.replace(/<text[^>]*>(.*?)<\/text>/, '$1');
                      return textContent
                        .replace(/&quot;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&#39;/g, "'")
                        .replace(/&#34;/g, '"');
                    })
                    .join(' ')
                    .trim();
                }
              }

              if (transcript && transcript.length > 10) {
                return new Response(JSON.stringify({
                  success: true,
                  transcript: transcript,
                  format: format,
                  length: transcript.length
                }), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                  },
                });
              }
            }
          } catch (error) {
            console.log(`Error with format ${format}:`, error);
            continue;
          }
        }

        // If no format worked
        return new Response(JSON.stringify({
          success: false,
          error: 'No transcript found for this video'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });

      } catch (error) {
        console.log('Worker error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Internal server error'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
