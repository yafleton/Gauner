// Cloudflare Worker for Google Drive uploads
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Handle Google Drive upload
  if (request.method === 'POST' && request.url.includes('/api/upload-to-drive')) {
    try {
      const formData = await request.formData()
      const audioFile = formData.get('audioFile')
      const accessToken = formData.get('accessToken')
      const userId = formData.get('userId')
      const filename = formData.get('filename')
      const metadata = JSON.parse(formData.get('metadata'))

      if (!accessToken || !userId || !audioFile) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Find or create user folder
      const folderId = await findOrCreateUserFolder(accessToken, userId)
      
      // Upload file to Google Drive
      const uploadResult = await uploadToGoogleDrive(accessToken, folderId, audioFile, filename, metadata)

      return new Response(JSON.stringify({ 
        success: true, 
        data: uploadResult 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })

    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }

  return new Response('Not Found', { status: 404 })
}

async function findOrCreateUserFolder(accessToken, userId) {
  const folderName = `GaunerAudio_${userId}`
  
  // Search for existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`
  
  const searchResponse = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (searchResponse.ok) {
    const searchData = await searchResponse.json()
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }
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

  if (createResponse.ok) {
    const createData = await createResponse.json()
    return createData.id
  }

  throw new Error('Failed to create user folder')
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
    parents: [folderId],
    description: JSON.stringify(metadata)
  }

  const updateResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
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
