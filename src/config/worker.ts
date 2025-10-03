// Cloudflare Worker configuration
export const WORKER_CONFIG = {
  // This will be updated after deploying the worker
  // Replace 'your-subdomain' with your actual Cloudflare Worker subdomain
  BASE_URL: 'https://gauner-backend.your-subdomain.workers.dev',
  
  // Alternative: Use a custom domain if you have one
  // BASE_URL: 'https://api.gauner.com',
  
  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Environment-specific configuration
export const getWorkerUrl = (): string => {
  // In production, this could be read from environment variables
  if (process.env.NODE_ENV === 'production') {
    return WORKER_CONFIG.BASE_URL;
  }
  
  // For development, you might want to use a different URL
  return WORKER_CONFIG.BASE_URL;
};
