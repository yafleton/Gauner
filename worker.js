// Cloudflare Worker for yt-dlp transcript extraction
// This worker uses a public yt-dlp API service to extract transcripts

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(request.url)
  
  // Handle transcript extraction
  if (url.pathname.startsWith('/api/transcript/')) {
    const videoId = url.pathname.split('/')[3]
    
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    try {
      console.log(`🎯 Extracting transcript for video: ${videoId}`)
      
      // Use multiple yt-dlp based services
      const services = [
        `https://youtube-transcript-api.herokuapp.com/api/transcript?video_id=${videoId}`,
        `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        `https://api.vevioz.com/api/button/mp3/${videoId}`
      ]
      
      for (const serviceUrl of services) {
        try {
          console.log(`🔍 Trying service: ${serviceUrl}`)
          
          const response = await fetch(serviceUrl, {
            headers: {
              'Accept': 'application/json,*/*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })

          console.log(`📡 Service response status: ${response.status}`)

          if (response.ok) {
            const jsonData = await response.text()
            console.log(`📄 Service response length: ${jsonData.length}`)
            
            if (jsonData && jsonData.trim().length > 0) {
              try {
                const data = JSON.parse(jsonData)
                console.log(`🔍 Service response structure:`, typeof data, Array.isArray(data) ? `Array(${data.length})` : Object.keys(data))
                
                // Extract transcript from various formats
                let transcript = ''
                
                // Method 1: Direct array
                if (Array.isArray(data) && data.length > 0) {
                  transcript = data
                    .map((entry) => {
                      if (typeof entry === 'string') return entry
                      if (entry.text) return entry.text
                      if (entry.content) return entry.content
                      if (entry.transcript) return entry.transcript
                      return ''
                    })
                    .filter((text) => text.trim().length > 0)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                }
                
                // Method 2: Nested transcript
                else if (data.transcript && Array.isArray(data.transcript)) {
                  transcript = data.transcript
                    .map((entry) => {
                      if (typeof entry === 'string') return entry
                      if (entry.text) return entry.text
                      if (entry.content) return entry.content
                      return ''
                    })
                    .filter((text) => text.trim().length > 0)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                }
                
                // Method 3: Single text field
                else if (data.text) {
                  transcript = data.text.trim()
                }
                
                // Method 4: Content field
                else if (data.content) {
                  transcript = data.content.trim()
                }
                
                // Method 5: Look for any string value
                else {
                  const stringValues = Object.values(data).filter(value => 
                    typeof value === 'string' && value.trim().length > 50
                  )
                  if (stringValues.length > 0) {
                    transcript = stringValues.join(' ').trim()
                  }
                }
                
                if (transcript.length > 50) {
                  console.log(`✅ SUCCESS: Transcript extracted via ${serviceUrl}`)
                  return new Response(JSON.stringify({ transcript }), {
                    status: 200,
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*',
                    },
                  })
                } else {
                  console.log(`❌ Transcript too short: ${transcript.length}`)
                }
              } catch (parseError) {
                console.log(`❌ JSON parse failed for ${serviceUrl}:`, parseError)
              }
            } else {
              console.log(`❌ Empty response from ${serviceUrl}`)
            }
          } else {
            console.log(`❌ Service ${serviceUrl} returned status: ${response.status}`)
          }
        } catch (serviceError) {
          console.log(`❌ Service ${serviceUrl} error:`, serviceError)
        }
      }
      
      // If all services failed, return error
      return new Response(JSON.stringify({ 
        error: 'All transcript services failed',
        videoId: videoId,
        message: 'No auto-subs found or all services unavailable'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
      
    } catch (error) {
      console.error('❌ Worker error:', error)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  }

  // Handle root path
  return new Response(JSON.stringify({ 
    message: 'yt-dlp Transcript Worker',
    endpoints: ['/api/transcript/:videoId']
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
