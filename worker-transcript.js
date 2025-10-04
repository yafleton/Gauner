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
        // Try different YouTube subtitle formats and URLs with different parameters
        const attempts = [
          // Try with different language codes
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`, format: 'json3' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3&kind=asr`, format: 'json3' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`, format: 'json3' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`, format: 'srv3' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`, format: 'ttml' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`, format: 'vtt' },
          // Try without language parameter
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`, format: 'json3' },
          { url: `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`, format: 'srv3' },
          // Try alternative endpoints
          { url: `https://video.google.com/timedtext?lang=en&v=${videoId}`, format: 'xml' },
          { url: `https://video.google.com/timedtext?lang=en-US&v=${videoId}`, format: 'xml' },
          { url: `https://video.google.com/timedtext?v=${videoId}`, format: 'xml' }
        ];
        
        const results = [];
        
        for (let i = 0; i < attempts.length; i++) {
          const attempt = attempts[i];
          try {
            console.log(`Trying attempt ${i + 1}: ${attempt.url}`);
            
            const response = await fetch(attempt.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
              }
            });

            console.log(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
            
            if (response.ok) {
              const content = await response.text();
              console.log(`Success with attempt ${i + 1}, content length: ${content.length}`);
              console.log(`Content preview: ${content.substring(0, 200)}`);
              
              // Parse based on format
              let transcript = '';
              
              if (attempt.format === 'json3') {
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
              } else if (attempt.format === 'srv3') {
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
              } else if (attempt.format === 'ttml' || attempt.format === 'xml') {
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
              } else if (attempt.format === 'vtt') {
                // Parse VTT format
                const lines = content.split('\n');
                const textLines = lines.filter(line => 
                  line.trim() && 
                  !line.includes('-->') && 
                  !line.includes('WEBVTT') &&
                  !line.match(/^\d+$/)
                );
                transcript = textLines.join(' ').trim();
              }

              results.push({
                attempt: i + 1,
                url: attempt.url,
                format: attempt.format,
                status: response.status,
                contentLength: content.length,
                transcriptLength: transcript.length,
                hasTranscript: transcript.length > 10,
                preview: content.substring(0, 200)
              });

              if (transcript && transcript.length > 10) {
                return new Response(JSON.stringify({
                  success: true,
                  transcript: transcript,
                  format: attempt.format,
                  length: transcript.length,
                  url: attempt.url,
                  debug: results
                }), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                  },
                });
              }
            } else {
              results.push({
                attempt: i + 1,
                url: attempt.url,
                format: attempt.format,
                status: response.status,
                error: `HTTP ${response.status}`
              });
            }
          } catch (error) {
            console.log(`Error with attempt ${i + 1}:`, error);
            results.push({
              attempt: i + 1,
              url: attempt.url,
              format: attempt.format,
              error: error.message
            });
            continue;
          }
        }

        // If no format worked, return detailed debug info
        return new Response(JSON.stringify({
          success: false,
          error: 'No transcript found for this video',
          debug: {
            videoId: videoId,
            attempts_made: results,
            message: 'All YouTube subtitle endpoints were tried but no transcript was found'
          }
        }), {
          status: 200, // Return 200 instead of 404 to avoid frontend errors
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

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid endpoint',
      debug: {
        pathname: url.pathname,
        message: 'Use /api/transcript?video_id=VIDEO_ID'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
