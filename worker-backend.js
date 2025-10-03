addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Enable CORS for all requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (url.pathname === '/api/tts' && request.method === 'POST') {
      return await handleTTSRequest(request, corsHeaders)
    } else if (url.pathname === '/api/voices' && request.method === 'POST') {
      return await handleVoicesRequest(request, corsHeaders)
    } else if (url.pathname === '/api/upload-to-drive' && request.method === 'POST') {
      return await handleGoogleDriveUpload(request, corsHeaders)
    }
    
    return new Response('Not found', { 
      status: 404, 
      headers: corsHeaders 
    })
  } catch (error) {
    console.error('Worker error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleTTSRequest(request, corsHeaders) {
  try {
    const body = await request.json()
    const { text, voice, language, apiKey, region } = body

    if (!text || !voice || !apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🎤 Processing TTS request: ${text.length} characters, voice: ${voice}`)

    // For long texts, we need to chunk them due to Worker CPU limits
    if (text.length > 1000) {
      return await processLongText(text, voice, language, apiKey, region, corsHeaders)
    } else {
      return await processShortText(text, voice, language, apiKey, region, corsHeaders)
    }

  } catch (error) {
    console.error('TTS request error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function processShortText(text, voice, language, apiKey, region, corsHeaders) {
  try {
    const audioBuffer = await synthesizeSpeech(text, voice, language, apiKey, region)
    
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      }
    })
  } catch (error) {
    console.error('Short text TTS error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function processLongText(text, voice, language, apiKey, region, corsHeaders) {
  try {
    const chunkSize = 800 // Smaller chunks for Worker CPU limits
    const chunks = []
    
    // Split text into chunks
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }

    console.log(`📝 Processing ${chunks.length} chunks for long text`)

    const audioBuffers = []
    
    // Process chunks sequentially to avoid CPU limit
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`🎵 Processing chunk ${i + 1}/${chunks.length}`)
      
      const audioBuffer = await synthesizeSpeech(chunk, voice, language, apiKey, region)
      audioBuffers.push(audioBuffer)
    }

    // Combine audio buffers
    const combinedAudio = combineAudioBuffers(audioBuffers)
    
    console.log(`✅ Long text TTS completed: ${combinedAudio.byteLength} bytes`)

    return new Response(combinedAudio, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': combinedAudio.byteLength.toString()
      }
    })
  } catch (error) {
    console.error('Long text TTS error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function synthesizeSpeech(text, voice, language, apiKey, region) {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}"><voice name="${voice}">${text}</voice></speak>`
  
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
      'User-Agent': 'CloudflareWorker'
    },
    body: ssml
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure TTS failed: ${response.status} - ${errorText}`)
  }

  return await response.arrayBuffer()
}

function combineAudioBuffers(audioBuffers) {
  // For MP3 files, simple concatenation should work
  // Azure TTS returns concatenatable MP3 frames
  const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
  const combinedBuffer = new Uint8Array(totalLength)
  
  let offset = 0
  for (const buffer of audioBuffers) {
    combinedBuffer.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }
  
  return combinedBuffer.buffer
}

async function handleVoicesRequest(request, corsHeaders) {
  try {
    const body = await request.json()
    const { apiKey, region } = body

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key required' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🎤 Worker: Fetching voices for region ${region}`)

    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'User-Agent': 'CloudflareWorker'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Azure TTS voices API failed: ${response.status} - ${errorText}`)
    }

    const voices = await response.json()
    console.log(`✅ Worker: Retrieved ${voices.length} voices`)

    return new Response(JSON.stringify({ 
      success: true, 
      voices: voices 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Worker voices error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleGoogleDriveUpload(request, corsHeaders) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audioFile')
    const accessToken = formData.get('accessToken')
    const userId = formData.get('userId')
    const filename = formData.get('filename')
    const metadata = JSON.parse(formData.get('metadata'))

    if (!audioFile || !accessToken || !userId || !filename || !metadata) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing form data' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const folderId = await findOrCreateUserFolder(accessToken, userId)
    if (!folderId) {
      throw new Error('Failed to find or create user folder')
    }

    const uploadResult = await uploadToGoogleDrive(accessToken, folderId, audioFile, filename, metadata)

    return new Response(JSON.stringify({ 
      success: true, 
      data: uploadResult 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Worker upload error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function findOrCreateUserFolder(accessToken, userId) {
  const folderName = `GaunerAudio_${userId}`

  // Search for existing folder
  const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  const searchData = await searchResponse.json()
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  // Create new folder if not found
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    throw new Error(`Failed to create user folder: ${createResponse.status} - ${errorText}`)
  }
  
  const createData = await createResponse.json()
  return createData.id
}

async function uploadToGoogleDrive(accessToken, folderId, audioFile, filename, metadata) {
  // First, upload the file without metadata
  const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'audio/mp3'
    },
    body: audioFile
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`)
  }

  const uploadResult = await uploadResponse.json()
  const fileId = uploadResult.id

  // Then, update the file with metadata
  const fileMetadata = {
    name: filename,
    description: JSON.stringify(metadata)
  }

  const updateResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fileMetadata)
  })

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    throw new Error(`Metadata update failed: ${updateResponse.status} - ${errorText}`)
  }

  const driveUrl = `https://drive.google.com/file/d/${fileId}/view`

  return {
    fileId,
    driveUrl,
    filename,
    uploadedAt: new Date().toISOString()
  }
}