// Railway Deployment Helper Script
// Run this after deploying to Railway to test the API

const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Deployment Helper');
console.log('============================');

// Read the current API URL from the service file
const serviceFile = path.join(__dirname, 'src', 'services', 'youtubeTranscriptServiceV3.ts');
const serviceContent = fs.readFileSync(serviceFile, 'utf8');

// Extract current API URL
const apiUrlMatch = serviceContent.match(/const apiUrl = '([^']+)';/);
const currentApiUrl = apiUrlMatch ? apiUrlMatch[1] : 'Not found';

console.log('📋 Current Configuration:');
console.log(`   API URL: ${currentApiUrl}`);
console.log('');

console.log('🔧 Next Steps:');
console.log('1. Deploy to Railway:');
console.log('   - Go to: https://railway.app');
console.log('   - Login with GitHub');
console.log('   - Deploy from repo: yafleton/Gauner');
console.log('   - Wait for deployment (2-5 minutes)');
console.log('');

console.log('2. Get your Railway URL:');
console.log('   - Copy the deployment URL from Railway dashboard');
console.log('   - Format: https://your-app-name.railway.app');
console.log('');

console.log('3. Update API URL:');
console.log('   - Edit: src/services/youtubeTranscriptServiceV3.ts');
console.log('   - Line 97: Replace API URL with your Railway URL');
console.log('');

console.log('4. Test the API:');
console.log('   - Health: https://your-app.railway.app/health');
console.log('   - Docs: https://your-app.railway.app/docs');
console.log('   - Test: https://your-app.railway.app/transcript/_Q3RluSaobc');
console.log('');

console.log('5. Deploy frontend:');
console.log('   - npm run build');
console.log('   - git add . && git commit -m "Update Railway API URL" && git push');
console.log('');

console.log('🎯 Expected Result:');
console.log('   ✅ Railway API extracts real YouTube transcripts');
console.log('   ✅ Frontend displays actual video content');
console.log('   ✅ No more "service unavailable" messages');
console.log('');

console.log('💡 Tips:');
console.log('   - First request takes 10-30 seconds (Cold Start)');
console.log('   - Railway auto-pauses after 15 min inactivity');
console.log('   - Free tier: 500 hours/month (more than enough)');
console.log('');

console.log('🚀 Ready to deploy! Good luck!');
