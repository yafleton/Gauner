# YouTube Transcript Backend Service

This backend service uses `yt-dlp` to extract YouTube video transcripts reliably.

## Prerequisites

1. **Install yt-dlp**: 
   ```bash
   # Windows (using pip)
   pip install yt-dlp
   
   # Or download from: https://github.com/yt-dlp/yt-dlp/releases
   ```

2. **Node.js**: Make sure Node.js is installed on your system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Extract Transcript
```
POST /api/transcript
Content-Type: application/json

{
  "videoId": "ondt_xq0a0o"
}
```

Or with full URL:
```json
{
  "url": "https://www.youtube.com/watch?v=ondt_xq0a0o"
}
```

**Response:**
```json
{
  "success": true,
  "transcript": "Young nurse called a billionaire and said..."
}
```

## How it Works

1. Receives video ID or URL from frontend
2. Uses `yt-dlp` to extract auto-generated subtitles
3. Returns the transcript text
4. Falls back to multiple language codes if needed

## Testing

Test the service:
```bash
curl -X POST http://localhost:3001/api/transcript \
  -H "Content-Type: application/json" \
  -d '{"videoId": "ondt_xq0a0o"}'
```

## Deployment

For production deployment, consider:
- Using PM2 for process management
- Setting up environment variables
- Adding rate limiting
- Implementing authentication if needed
