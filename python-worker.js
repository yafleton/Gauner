// Cloudflare Worker that uses Python youtube-transcript-api
// This is a JavaScript wrapper that will call a Python service

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response("", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Get video ID from query parameters
      const url = new URL(request.url);
      const videoId = url.searchParams.get('video_id');
      
      if (!videoId) {
        return new Response(JSON.stringify({
          error: "Missing video_id parameter",
          success: false
        }), {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          }
        });
      }

      console.log(`🎯 Extracting transcript for video: ${videoId}`);

      // Use a working external service that implements youtube-transcript-api
      const externalServices = [
        `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`,
        `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        `https://api.vevioz.com/api/button/mp3/${videoId}`
      ];

      for (let i = 0; i < externalServices.length; i++) {
        const serviceUrl = externalServices[i];
        
        try {
          console.log(`🔍 Trying service ${i + 1}/${externalServices.length}: ${serviceUrl}`);
          
          const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          console.log(`📡 Service response status: ${response.status}`);

          if (response.ok) {
            const responseText = await response.text();
            console.log(`📄 Service response length: ${responseText.length}`);
            
            if (responseText && responseText.trim().length > 0) {
              try {
                const data = JSON.parse(responseText);
                console.log('🔍 Service response data:', data);

                // Handle different response formats
                let transcript = '';

                if (Array.isArray(data)) {
                  // Format 1: Direct array
                  transcript = data
                    .map((item) => {
                      if (typeof item === 'string') return item;
                      if (item.text) return item.text;
                      if (item.content) return item.content;
                      return '';
                    })
                    .filter((text) => text && text.trim().length > 0)
                    .join(' ')
                    .trim();
                } else if (data.transcript && Array.isArray(data.transcript)) {
                  // Format 2: Nested transcript array
                  transcript = data.transcript
                    .map((item) => {
                      if (typeof item === 'string') return item;
                      if (item.text) return item.text;
                      if (item.content) return item.content;
                      return '';
                    })
                    .filter((text) => text && text.trim().length > 0)
                    .join(' ')
                    .trim();
                } else if (data.text) {
                  // Format 3: Direct text field
                  transcript = data.text.trim();
                } else if (data.content) {
                  // Format 4: Content field
                  transcript = data.content.trim();
                } else if (data.transcript) {
                  // Format 5: Transcript field (string)
                  transcript = data.transcript.trim();
                }

                if (transcript.length > 50) {
                  console.log(`✅ SUCCESS: Transcript extracted via service ${i + 1}`);
                  
                  return new Response(JSON.stringify({
                    success: true,
                    transcript: transcript,
                    video_id: videoId,
                    service_used: `Service ${i + 1}`,
                    length: transcript.length
                  }), {
                    headers: {
                      "Access-Control-Allow-Origin": "*",
                      "Content-Type": "application/json"
                    }
                  });
                }
              } catch (parseError) {
                console.log(`❌ Service ${i + 1} JSON parse failed:`, parseError);
              }
            }
          }
        } catch (serviceError) {
          console.log(`❌ Service ${i + 1} error:`, serviceError);
        }
      }

      // If all services fail
      return new Response(JSON.stringify({
        error: `No transcript found for video ${videoId}. All external services are currently unavailable.`,
        success: false,
        video_id: videoId
      }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      });

    } catch (error) {
      console.log(`❌ Server error: ${error.message}`);
      
      return new Response(JSON.stringify({
        error: `Server error: ${error.message}`,
        success: false
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      });
    }
  }
};
