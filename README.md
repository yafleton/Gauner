# Gauner Niche Finder

A YouTube niche finder website with Azure Text-to-Speech integration.

## Features

- **Niche Finder**: Browse and filter YouTube channels by subscribers, niche, language, and views
- **Azure TTS**: Generate high-quality speech from text with multiple voices and languages
- **Audio Library**: Save generated audio files for 24 hours with user-specific access
- **Authentication**: Secure user registration and login system
- **Settings**: Configure Azure TTS API keys and regions per user

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Azure TTS API integration
- LocalStorage for data persistence
- Cloudflare Pages for hosting

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Azure TTS API key (optional, for voice synthesis)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Azure TTS Setup

1. Get an Azure TTS API key from the Azure portal
2. Go to Settings in the app
3. Enter your API key and select your region
4. Start generating speech!

## Audio Storage

- Generated audio files are automatically saved to your personal library
- Files are stored locally and automatically deleted after 24 hours
- Each user can only access their own audio files
- Files are stored in browser localStorage for privacy

## Deployment to Cloudflare

### Prerequisites

- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`

### Deploy

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Cloudflare Pages:
   ```bash
   npm run deploy
   ```

3. Or use the Cloudflare dashboard:
   - Go to Cloudflare Pages
   - Connect your repository
   - Set build command: `npm run build`
   - Set build output directory: `build`

### Configuration

Update `wrangler.toml` with your domain settings:

```toml
[env.production]
route = "your-domain.com/*"
```

## File Structure

```
src/
├── components/
│   ├── Auth/           # Login/Register components
│   ├── AzureTTS/       # TTS functionality and audio library
│   ├── Layout/         # Sidebar and layout components
│   ├── NicheFinder/    # Channel browsing and filtering
│   └── Settings/       # User settings and configuration
├── contexts/           # React contexts (Auth)
├── services/           # API services and utilities
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support, please contact the development team.