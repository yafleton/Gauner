# Cloudflare Pages Deployment Guide

## Prerequisites
1. Cloudflare account
2. GitHub repository connected to Cloudflare Pages

## Method 1: Deploy via Cloudflare Dashboard (Recommended)

### Step 1: Connect GitHub Repository
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** in the sidebar
3. Click **Create a project**
4. Select **Connect to Git**
5. Choose your GitHub repository: `yafleton/Gauner`
6. Click **Begin setup**

### Step 2: Configure Build Settings
- **Project name**: `gauner-niche-finder`
- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `build`
- **Root directory**: `/` (leave empty)

### Step 3: Environment Variables (Optional)
Add any environment variables if needed:
- `REACT_APP_API_URL` (if you have backend APIs)

### Step 4: Deploy
1. Click **Save and Deploy**
2. Wait for the build to complete
3. Your site will be available at: `https://gauner-niche-finder.pages.dev`

## Method 2: Deploy via Wrangler CLI

### Step 1: Get Cloudflare API Token
1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Custom token** template
4. Permissions:
   - `Account:Cloudflare Pages:Edit`
   - `Zone:Zone:Read`
5. Account Resources: Include your account
6. Zone Resources: Include all zones
7. Click **Continue to summary** and **Create Token**

### Step 2: Set Environment Variable
```bash
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your-api-token-here"

# Windows Command Prompt
set CLOUDFLARE_API_TOKEN=your-api-token-here

# Linux/Mac
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

### Step 3: Deploy
```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy build --project-name=gauner-niche-finder
```

## Method 3: GitHub Actions (Automatic Deployment)

### Step 1: Create GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: gauner-niche-finder
          directory: build
```

### Step 2: Add Secrets to GitHub
1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add these secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

## Custom Domain Setup

### Step 1: Add Custom Domain
1. In Cloudflare Pages dashboard, go to your project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter your domain name
5. Follow the DNS configuration instructions

### Step 2: Configure DNS
Add a CNAME record pointing to your Pages domain:
```
Type: CNAME
Name: @ (or subdomain)
Content: gauner-niche-finder.pages.dev
```

## Environment Variables for Production

If you need environment variables in production:

1. Go to your Cloudflare Pages project
2. Navigate to **Settings** > **Environment variables**
3. Add variables for Production, Preview, and Branch deployments

Common variables:
- `REACT_APP_API_URL`: Your API endpoint
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `REACT_APP_ANALYTICS_ID`: Analytics tracking ID

## Troubleshooting

### Build Failures
- Check build logs in Cloudflare Pages dashboard
- Ensure all dependencies are in `package.json`
- Verify build command and output directory

### Environment Variables Not Working
- Variables must start with `REACT_APP_` to be accessible in React
- Redeploy after adding new variables

### Custom Domain Issues
- Ensure DNS records are properly configured
- Check SSL certificate status
- Verify domain ownership

## Performance Optimization

### Enable Cloudflare Features
1. **Auto Minify**: Enable in Speed > Optimization
2. **Brotli Compression**: Enable in Speed > Optimization
3. **HTTP/2**: Automatically enabled
4. **HTTP/3**: Enable in Network tab

### Cache Configuration
The `_headers` file in the `public` folder configures caching:
```
/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/build/static/*
  Cache-Control: public, max-age=31536000, immutable
```

## Monitoring and Analytics

### Cloudflare Analytics
- Built-in analytics available in Pages dashboard
- Real-time visitor statistics
- Performance metrics

### Custom Analytics
Add Google Analytics or other tracking services:
```javascript
// In your React app
const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID;
```

## Security Considerations

### Headers Configuration
The `_headers` file provides security headers:
- XSS Protection
- Content Type Options
- Frame Options
- Referrer Policy

### HTTPS
- Automatically enabled on Cloudflare Pages
- Free SSL certificates
- HTTP to HTTPS redirects

## Cost
- **Free tier**: 500 builds per month, 20,000 requests per day
- **Paid plans**: Starting at $20/month for more builds and bandwidth
- **Custom domains**: Free
- **SSL certificates**: Free

## Support
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [GitHub Issues](https://github.com/yafleton/Gauner/issues)
