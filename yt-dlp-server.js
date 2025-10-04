const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// yt-dlp endpoint for transcript extraction
app.get('/api/transcript/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  console.log(`🎯 Extracting transcript for video: ${videoId}`);
  
  try {
    // Use yt-dlp to extract auto-generated subtitles
    const command = `yt-dlp --write-auto-subs --sub-langs en --skip-download --sub-format vtt "https://www.youtube.com/watch?v=${videoId}" -o "%(title)s.%(ext)s"`;
    
    console.log(`🔍 Running command: ${command}`);
    
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ yt-dlp error:', error);
        return res.status(500).json({ 
          error: 'Failed to extract transcript', 
          details: error.message 
        });
      }
      
      console.log('✅ yt-dlp output:', stdout);
      
      // Look for the generated VTT file
      const fs = require('fs');
      const path = require('path');
      
      // Find VTT files in current directory
      const files = fs.readdirSync('.');
      const vttFile = files.find(file => file.endsWith('.en.vtt'));
      
      if (vttFile) {
        console.log(`📄 Found VTT file: ${vttFile}`);
        
        // Read and parse VTT file
        const vttContent = fs.readFileSync(vttFile, 'utf8');
        const transcript = parseVTT(vttContent);
        
        // Clean up VTT file
        fs.unlinkSync(vttFile);
        
        if (transcript.length > 50) {
          console.log(`✅ Successfully extracted transcript (${transcript.length} chars)`);
          res.json({ transcript });
        } else {
          res.status(404).json({ error: 'No transcript found or transcript too short' });
        }
      } else {
        console.log('❌ No VTT file found');
        res.status(404).json({ error: 'No auto-generated subtitles found' });
      }
    });
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Parse VTT file to extract text
function parseVTT(vttContent) {
  console.log('🔍 Parsing VTT content...');
  
  // Remove VTT header and timing information
  const lines = vttContent.split('\n');
  const textLines = lines
    .filter(line => {
      // Skip empty lines, timing lines, and VTT header
      return line.trim() && 
             !line.includes('-->') && 
             !line.startsWith('WEBVTT') &&
             !line.match(/^\d+$/);
    })
    .map(line => line.replace(/<[^>]*>/g, '').trim()) // Remove HTML tags
    .filter(line => line.length > 0);
  
  const transcript = textLines.join(' ').replace(/\s+/g, ' ').trim();
  
  console.log(`📄 Parsed transcript: ${transcript.length} characters`);
  return transcript;
}

app.listen(PORT, () => {
  console.log(`🚀 yt-dlp server running on port ${PORT}`);
  console.log(`📡 Transcript endpoint: http://localhost:${PORT}/api/transcript/:videoId`);
});

module.exports = app;
