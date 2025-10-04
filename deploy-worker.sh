#!/bin/bash

echo "🚀 Deploying yt-dlp transcript worker to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Deploy the worker
echo "📦 Deploying worker..."
wrangler deploy

echo "✅ Worker deployed successfully!"
echo "🌐 Worker URL: https://yt-dlp-transcript-worker.yafleton.workers.dev"
echo "📡 Test endpoint: https://yt-dlp-transcript-worker.yafleton.workers.dev/api/transcript/ZRFIvdnzcl8"
