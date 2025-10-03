#!/bin/bash

# Cloudflare Worker Deployment Script
echo "🚀 Deploying Cloudflare Worker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is authenticated
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please authenticate with Cloudflare:"
    wrangler login
fi

# Deploy the worker
echo "📦 Deploying worker to Cloudflare..."
wrangler deploy

# Get the worker URL
echo "🌐 Worker deployed! URL:"
wrangler tail --format=pretty

echo "✅ Worker deployment complete!"
echo "📝 Update src/config/worker.ts with your worker URL"
