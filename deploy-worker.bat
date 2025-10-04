@echo off
echo 🚀 Deploying yt-dlp transcript worker to Cloudflare...

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Wrangler CLI not found. Installing...
    npm install -g wrangler
)

REM Deploy the worker
echo 📦 Deploying worker...
wrangler deploy

echo ✅ Worker deployed successfully!
echo 🌐 Worker URL: https://yt-dlp-transcript-worker.yafleton.workers.dev
echo 📡 Test endpoint: https://yt-dlp-transcript-worker.yafleton.workers.dev/api/transcript/ZRFIvdnzcl8
pause
