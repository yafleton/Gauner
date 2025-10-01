const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://your-domain.com'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Transcript service is running' });
});

// Transcript extraction endpoint
app.post('/api/transcript', async (req, res) => {
  const { videoId, url } = req.body;
  
  if (!videoId && !url) {
    return res.status(400).json({ 
      success: false, 
      error: 'Either videoId or url is required' 
    });
  }

  try {
    // Determine the video URL
    let videoUrl;
    if (url) {
      videoUrl = url;
    } else {
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    console.log(`🎥 Extracting transcript for: ${videoUrl}`);

    // Use yt-dlp to extract transcript to a temporary file
    const tempDir = __dirname; // Use backend directory
    const tempFile = path.join(tempDir, `transcript_${Date.now()}_${videoId}.vtt`);
    
    console.log(`📁 Temp file path: ${tempFile}`);
    
    const command = `cd "${__dirname}" && yt-dlp --write-auto-sub --sub-lang en --skip-download --output "${tempFile}" "${videoUrl}"`;
    
    console.log(`🔧 Command: ${command}`);
    
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ yt-dlp error:', error);
        
        // Try alternative approach with different language codes
        const altCommand = `cd "${__dirname}" && yt-dlp --write-auto-sub --sub-lang en,en-US,en-GB --skip-download --output "${tempFile}" "${videoUrl}"`;
        
        exec(altCommand, { timeout: 30000 }, (altError, altStdout, altStderr) => {
          if (altError) {
            console.error('❌ Alternative yt-dlp error:', altError);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to extract transcript. The video may not have captions or auto-generated subtitles.' 
            });
          }
          
          // Read the transcript file
          try {
            // yt-dlp adds language code to filename, so check for that too
            const actualFile = fs.existsSync(tempFile) ? tempFile : tempFile + '.en.vtt';
            
            if (fs.existsSync(actualFile)) {
              const transcript = fs.readFileSync(actualFile, 'utf8');
              fs.unlinkSync(actualFile); // Clean up
              
              if (transcript && transcript.trim()) {
                console.log('✅ Successfully extracted transcript with alternative command');
                res.json({ 
                  success: true, 
                  transcript: transcript.trim() 
                });
              } else {
                res.status(404).json({ 
                  success: false, 
                  error: 'No transcript available for this video' 
                });
              }
            } else {
              res.status(404).json({ 
                success: false, 
                error: 'No transcript available for this video' 
              });
            }
          } catch (readError) {
            console.error('❌ Error reading transcript file:', readError);
            res.status(500).json({ 
              success: false, 
              error: 'Failed to read transcript file' 
            });
          }
        });
        return;
      }
      
      // Read the transcript file
      try {
        // yt-dlp adds language code to filename, so check for that too
        const actualFile = fs.existsSync(tempFile) ? tempFile : tempFile + '.en.vtt';
        
        if (fs.existsSync(actualFile)) {
          const transcript = fs.readFileSync(actualFile, 'utf8');
          fs.unlinkSync(actualFile); // Clean up
          
          if (transcript && transcript.trim()) {
            console.log('✅ Successfully extracted transcript');
            res.json({ 
              success: true, 
              transcript: transcript.trim() 
            });
          } else {
            console.log('❌ No transcript found, trying alternative...');
            
            // Try with different language codes
            const altCommand = `cd "${__dirname}" && yt-dlp --write-auto-sub --sub-lang en,en-US,en-GB --skip-download --output "${tempFile}" "${videoUrl}"`;
            
            exec(altCommand, { timeout: 30000 }, (altError, altStdout, altStderr) => {
              if (altError) {
                console.error('❌ Alternative command failed:', altError);
                return res.status(404).json({ 
                  success: false, 
                  error: 'No transcript available for this video' 
                });
              }
              
              // Read the alternative transcript file
              try {
                // yt-dlp adds language code to filename, so check for that too
                const actualFile = fs.existsSync(tempFile) ? tempFile : tempFile + '.en.vtt';
                
                if (fs.existsSync(actualFile)) {
                  const altTranscript = fs.readFileSync(actualFile, 'utf8');
                  fs.unlinkSync(actualFile); // Clean up
                  
                  if (altTranscript && altTranscript.trim()) {
                    console.log('✅ Successfully extracted transcript with alternative command');
                    res.json({ 
                      success: true, 
                      transcript: altTranscript.trim() 
                    });
                  } else {
                    res.status(404).json({ 
                      success: false, 
                      error: 'No transcript available for this video' 
                    });
                  }
                } else {
                  res.status(404).json({ 
                    success: false, 
                    error: 'No transcript available for this video' 
                  });
                }
              } catch (readError) {
                console.error('❌ Error reading alternative transcript file:', readError);
                res.status(500).json({ 
                  success: false, 
                  error: 'Failed to read transcript file' 
                });
              }
            });
          }
        } else {
          res.status(404).json({ 
            success: false, 
            error: 'No transcript available for this video' 
          });
        }
      } catch (readError) {
        console.error('❌ Error reading transcript file:', readError);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to read transcript file' 
        });
      }
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Google Drive upload endpoint
app.post('/api/upload-to-drive', upload.single('audioFile'), async (req, res) => {
  try {
    const { accessToken, userId, filename, metadata } = req.body;
    
    if (!accessToken || !userId || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accessToken, userId, or audioFile'
      });
    }

    console.log(`📤 Uploading audio file to Google Drive for user: ${userId}`);
    
    // Initialize Google Drive API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    // Create or find user folder
    const folderName = `GaunerAudio_${userId}`;
    let folderId = await findOrCreateFolder(drive, folderName);
    
    if (!folderId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user folder'
      });
    }

    // Upload file metadata
    const fileMetadata = {
      name: filename || `audio_${Date.now()}.wav`,
      parents: [folderId]
    };

    // Upload the file
    const media = {
      mimeType: 'audio/wav',
      body: req.file.buffer
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink'
    });

    const fileId = response.data.id;
    const fileUrl = response.data.webViewLink;

    console.log(`✅ Successfully uploaded to Google Drive: ${fileId}`);

    // Save metadata if provided
    if (metadata) {
      try {
        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        const metadataResponse = await drive.files.create({
          resource: {
            name: `${fileId}_metadata.json`,
            parents: [folderId]
          },
          media: {
            mimeType: 'application/json',
            body: Buffer.from(JSON.stringify(metadata))
          }
        });
        console.log(`✅ Metadata saved: ${metadataResponse.data.id}`);
      } catch (metadataError) {
        console.warn('⚠️ Failed to save metadata:', metadataError);
      }
    }

    res.json({
      success: true,
      data: {
        fileId,
        fileUrl,
        folderId
      }
    });

  } catch (error) {
    console.error('❌ Google Drive upload error:', error);
    res.status(500).json({
      success: false,
      error: `Upload failed: ${error.message}`
    });
  }
});

// Helper function to find or create folder
async function findOrCreateFolder(drive, folderName) {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id,name)'
    });

    if (response.data.files.length > 0) {
      console.log(`📁 Found existing folder: ${folderName}`);
      return response.data.files[0].id;
    }

    // Create new folder
    const folderResponse = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      }
    });

    console.log(`📁 Created new folder: ${folderName}`);
    return folderResponse.data.id;
  } catch (error) {
    console.error('❌ Error with folder operation:', error);
    return null;
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Transcript service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Transcript endpoint: http://localhost:${PORT}/api/transcript`);
});
