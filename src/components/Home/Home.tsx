import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, Settings, ArrowRight } from 'lucide-react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSimpleAuth();

  const features = [
    {
      title: 'Niche Finder',
      description: 'Discover YouTube channels by niche, subscribers, language, and 48h views',
      icon: Search,
      path: '/niche-finder',
      color: 'from-blue-500 to-purple-600',
    },
    {
      title: 'Azure TTS',
      description: 'Convert long texts to high-quality speech with Azure Text-to-Speech',
      icon: Mic,
      path: '/azure-tts',
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Settings',
      description: 'Configure your Azure API key and manage your account settings',
      icon: Settings,
      path: '/settings',
      color: 'from-green-500 to-blue-600',
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Welcome back, {user?.username || 'User'}!
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Discover YouTube niches and convert text to speech with our powerful tools
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="card hover:scale-105 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(feature.path)}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={32} className="text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-text-secondary mb-6">
                  {feature.description}
                </p>
                
                <div className="flex items-center text-accent-blue group-hover:text-accent-purple transition-colors duration-200">
                  <span className="font-medium">Get Started</span>
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-3xl font-bold text-accent-blue mb-2">500+</div>
            <div className="text-text-secondary">YouTube Channels</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-accent-purple mb-2">50+</div>
            <div className="text-text-secondary">Available Voices</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">30K+</div>
            <div className="text-text-secondary">Characters per TTS</div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card">
          <h2 className="text-2xl font-bold text-text-primary mb-6">
            Getting Started
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-2">
                  Configure Azure TTS
                </h3>
                <p className="text-text-secondary">
                  Go to Settings and add your Azure Speech Service API key to enable text-to-speech functionality.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-accent-purple rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-2">
                  Explore Niche Finder
                </h3>
                <p className="text-text-secondary">
                  Use filters to find YouTube channels by subscribers, niche, language, and recent views.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-2">
                  Generate Speech
                </h3>
                <p className="text-text-secondary">
                  Convert long texts to high-quality speech with automatic chunking and voice selection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
