import React from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Channel } from '../../types';

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  const navigate = useNavigate();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleViewVideos = () => {
    navigate(`/channel/${channel.id}/videos`, { 
      state: { channel } 
    });
  };

  const handleViewChannel = () => {
    if (channel.channelUrl) {
      // Ensure the URL is a proper YouTube channel URL
      let channelUrl = channel.channelUrl;
      
      // If it's not a full URL, construct it
      if (!channelUrl.startsWith('http')) {
        if (channelUrl.startsWith('/')) {
          channelUrl = `https://youtube.com${channelUrl}`;
        } else {
          channelUrl = `https://youtube.com/${channelUrl}`;
        }
      }
      
      console.log('Opening YouTube channel:', channelUrl);
      window.open(channelUrl, '_blank');
    } else {
      console.error('No channel URL available for channel:', channel.name);
    }
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-300">
      <div className="flex items-start space-x-4">
        {/* Channel Avatar */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {channel.avatar && channel.avatar.startsWith('http') ? (
            <img 
              src={channel.avatar} 
              alt={channel.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('Image failed to load:', channel.avatar);
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                      <span class="text-white font-bold text-xl">${channel.name.charAt(0).toUpperCase()}</span>
                    </div>
                  `;
                }
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', channel.avatar);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {channel.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-text-primary mb-1 truncate">
            {channel.name}
          </h3>
          <p className="text-sm text-text-secondary mb-3 truncate">
            {channel.niche}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-secondary mb-1">Subscribers</p>
              <p className="text-sm font-medium text-text-primary">
                {formatNumber(channel.subscribers)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Language</p>
              <p className="text-sm font-medium text-text-primary">
                {channel.language}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">48h Views</p>
              <p className="text-sm font-medium text-accent-blue">
                {formatNumber(channel.views48h)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button 
              onClick={handleViewVideos}
              className="flex-1 btn-primary py-2 px-4 text-sm font-medium flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors"
            >
              <ExternalLink size={16} />
              <span>View Videos</span>
            </button>
            <button 
              onClick={handleViewChannel}
              className="flex-1 btn-danger py-2 px-4 text-sm font-medium flex items-center justify-center space-x-2 hover:bg-red-600 transition-colors"
            >
              <Play size={16} />
              <span>Channel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelCard;
