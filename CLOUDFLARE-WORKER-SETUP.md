# Cloudflare Worker yt-dlp Transcript Setup

## Deployment

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy the Worker:**
   ```bash
   # Windows
   deploy-worker.bat
   
   # Or manually
   wrangler deploy
   ```

## Worker Endpoint

After deployment, the worker will be available at:
```
https://yt-dlp-transcript-worker.yafleton.workers.dev/api/transcript/:videoId
```

## How it works

1. The Cloudflare Worker tries multiple yt-dlp based services
2. Extracts transcripts from various response formats
3. Returns clean transcript text via JSON API
4. Handles CORS for frontend integration

## Services Used

- `youtube-transcript-api.herokuapp.com`
- `youtube-transcript-api.vercel.app`
- `api.vevioz.com`

## Testing

Test with the A-10 Warthog video:
```
curl https://yt-dlp-transcript-worker.yafleton.workers.dev/api/transcript/ZRFIvdnzcl8
```

## Frontend Integration

The frontend automatically uses the Cloudflare Worker for transcript extraction. No local setup required!

## Troubleshooting

- Check Cloudflare Worker logs in the dashboard
- Verify the worker is deployed and accessible
- Test the endpoint directly with curl
- Check console logs for detailed error messages
