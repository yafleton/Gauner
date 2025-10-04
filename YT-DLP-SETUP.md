# yt-dlp Transcript Server Setup

## Installation

1. **Install yt-dlp:**
   ```bash
   pip install yt-dlp
   ```

2. **Install Node.js dependencies:**
   ```bash
   cp yt-dlp-package.json package.json
   npm install
   ```

## Start the yt-dlp Server

```bash
node yt-dlp-server.js
```

The server will run on `http://localhost:3001`

## API Endpoint

```
GET http://localhost:3001/api/transcript/:videoId
```

Example:
```
GET http://localhost:3001/api/transcript/ZRFIvdnzcl8
```

## How it works

1. The server uses yt-dlp to extract auto-generated subtitles
2. Downloads VTT files with `--write-auto-subs --sub-langs en`
3. Parses VTT content to extract clean transcript text
4. Returns JSON response with transcript

## Testing

Test with the A-10 Warthog video:
```
curl http://localhost:3001/api/transcript/ZRFIvdnzcl8
```

## Frontend Integration

The frontend will automatically try the local yt-dlp server first, then fallback to public APIs if the local server is not available.

## Troubleshooting

- Make sure yt-dlp is installed: `yt-dlp --version`
- Check if the video has auto-generated subtitles
- Verify the server is running on port 3001
- Check console logs for detailed error messages
