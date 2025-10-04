@echo off
echo 🚀 Deploying Cloudflare Worker with Python youtube-transcript-api...

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Wrangler CLI not found. Installing...
    npm install -g wrangler
)

REM Check if logged in to Cloudflare
wrangler whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Cloudflare first:
    wrangler login
)

REM Deploy the worker
echo 📦 Deploying worker...
wrangler deploy --config wrangler-python.toml

echo ✅ Worker deployed successfully!
echo 🌐 Worker URL: https://youtube-transcript-worker.yafleton.workers.dev
echo 🧪 Test URL: https://youtube-transcript-worker.yafleton.workers.dev?video_id=dQw4w9WgXcQ

pause
