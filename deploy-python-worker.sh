#!/bin/bash

echo "🚀 Deploying Cloudflare Worker with Python youtube-transcript-api..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare first:"
    wrangler login
fi

# Deploy the worker
echo "📦 Deploying worker..."
wrangler deploy --config wrangler-python.toml

echo "✅ Worker deployed successfully!"
echo "🌐 Worker URL: https://youtube-transcript-worker.yafleton.workers.dev"
echo "🧪 Test URL: https://youtube-transcript-worker.yafleton.workers.dev?video_id=dQw4w9WgXcQ"
