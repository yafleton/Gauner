const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
