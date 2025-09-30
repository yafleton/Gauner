import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Calendar, Filter } from 'lucide-react';
import { Channel } from '../../types';
import YouTubeApiService, { Video } from '../../services/youtubeApi';
import CloudConfigService from '../../services/cloudConfig';

interface VideoFilters {
  views: string;
  comments: string;
  likes: string;
  sortBy: string;
  direction: string;
  dateFrom: string;
  dateTo: string;
}

const ChannelVideos: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const channel = location.state?.channel as Channel;

  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<VideoFilters>({
    views: 'all',
    comments: 'all',
    likes: 'all',
    sortBy: 'uploadDate',
    direction: 'highToLow',
    dateFrom: '',
    dateTo: '',
  });

  const youtubeApi = useMemo(() => YouTubeApiService.getInstance(), []);
  const cloudConfig = useMemo(() => CloudConfigService.getInstance(), []);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!channelId || !channel) {
        setError('Channel information not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const apiKey = cloudConfig.getYouTubeApiKey();
        console.log('YouTube API Key available:', !!apiKey);
        console.log('API Key length:', apiKey?.length);
        
        if (!apiKey) {
          setError('A global YouTube API key is required to fetch videos. Please configure it in Settings.');
          setLoading(false);
          return;
        }

        youtubeApi.setApiKey(apiKey);
        console.log('Fetching videos for channel:', channelId);
        console.log('Channel object:', channel);
        console.log('YouTube Channel ID:', channel?.youtubeChannelId);
        
        // Use YouTube channel ID if available, otherwise use the main ID
        const youtubeChannelId = channel?.youtubeChannelId || channelId;
        console.log('Using YouTube Channel ID for API call:', youtubeChannelId);
        
        const fetchedVideos = await youtubeApi.getChannelVideosList(youtubeChannelId, 50);
        console.log('Fetched videos:', fetchedVideos.length);
        setVideos(fetchedVideos);
      } catch (err) {
        console.error('Error fetching channel videos:', err);
        setError(`Failed to load videos: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [channelId, channel, youtubeApi, cloudConfig]);

  useEffect(() => {
    let filtered = [...videos];

    // Apply filters
    if (filters.views !== 'all') {
      const [min, max] = filters.views.split('-').map(v => {
        if (v.includes('K')) return parseInt(v.replace('K', '')) * 1000;
        if (v.includes('M')) return parseInt(v.replace('M', '')) * 1000000;
        return parseInt(v) || 0;
      });
      filtered = filtered.filter(video => video.views >= min && (max ? video.views <= max : true));
    }

    if (filters.comments !== 'all') {
      const [min, max] = filters.comments.split('-').map(v => {
        if (v.includes('K')) return parseInt(v.replace('K', '')) * 1000;
        return parseInt(v) || 0;
      });
      filtered = filtered.filter(video => video.comments >= min && (max ? video.comments <= max : true));
    }

    if (filters.likes !== 'all') {
      const [min, max] = filters.likes.split('-').map(v => {
        if (v.includes('K')) return parseInt(v.replace('K', '')) * 1000;
        return parseInt(v) || 0;
      });
      filtered = filtered.filter(video => video.likes >= min && (max ? video.likes <= max : true));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (filters.sortBy) {
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        case 'comments':
          aValue = a.comments;
          bValue = b.comments;
          break;
        case 'likes':
          aValue = a.likes;
          bValue = b.likes;
          break;
        case 'uploadDate':
        default:
          aValue = new Date(a.uploadDate).getTime();
          bValue = new Date(b.uploadDate).getTime();
          break;
      }

      if (filters.direction === 'highToLow') {
        return (bValue as number) - (aValue as number);
      } else {
        return (aValue as number) - (bValue as number);
      }
    });

    setFilteredVideos(filtered);
  }, [videos, filters]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const filterOptions = {
    views: [
      { value: 'all', label: 'All Views' },
      { value: '0-10K', label: '0 - 10K' },
      { value: '10K-100K', label: '10K - 100K' },
      { value: '100K-500K', label: '100K - 500K' },
      { value: '500K+', label: '500K+' },
    ],
    comments: [
      { value: 'all', label: 'All Comments' },
      { value: '0-100', label: '0 - 100' },
      { value: '100-500', label: '100 - 500' },
      { value: '500-1K', label: '500 - 1K' },
      { value: '1K+', label: '1K+' },
    ],
    likes: [
      { value: 'all', label: 'All Likes' },
      { value: '0-1K', label: '0 - 1K' },
      { value: '1K-5K', label: '1K - 5K' },
      { value: '5K-10K', label: '5K - 10K' },
      { value: '10K+', label: '10K+' },
    ],
    sortBy: [
      { value: 'uploadDate', label: 'Upload Date' },
      { value: 'views', label: 'Views' },
      { value: 'comments', label: 'Comments' },
      { value: 'likes', label: 'Likes' },
    ],
    direction: [
      { value: 'highToLow', label: 'High to Low' },
      { value: 'lowToHigh', label: 'Low to High' },
    ],
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Videos</h1>
          <p className="text-text-secondary mb-4">{error}</p>
          {!cloudConfig.hasYouTubeApiKey() && (
            <button
              onClick={() => navigate('/settings')}
              className="btn-primary mr-4"
            >
              Configure YouTube API Key
            </button>
          )}
          <button
            onClick={() => navigate('/niche-finder')}
            className="btn-secondary"
          >
            Back to Niche Finder
          </button>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Channel Not Found</h1>
          <button
            onClick={() => navigate('/niche-finder')}
            className="btn-primary"
          >
            Back to Niche Finder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/niche-finder')}
              className="p-2 hover:bg-card-primary rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-text-primary" />
            </button>
            <div className="flex items-center space-x-4">
              {/* Channel Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden">
                {channel.avatar && channel.avatar.startsWith('http') ? (
                  <img 
                    src={channel.avatar} 
                    alt={channel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {channel.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">{channel.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-text-secondary">
                  <span>{formatNumber(channel.subscribers)} subscribers</span>
                  <span>•</span>
                  <span>{channel.niche}</span>
                  <span>•</span>
                  <span>{channel.language}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
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
            }}
            className="btn-danger flex items-center space-x-2"
          >
            <Play size={16} />
            <span>View Channel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-accent-purple" />
            <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Views Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Views</label>
              <select
                value={filters.views}
                onChange={(e) => setFilters(prev => ({ ...prev, views: e.target.value }))}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {filterOptions.views.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Comments Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Comments</label>
              <select
                value={filters.comments}
                onChange={(e) => setFilters(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {filterOptions.comments.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Likes Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Likes</label>
              <select
                value={filters.likes}
                onChange={(e) => setFilters(prev => ({ ...prev, likes: e.target.value }))}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {filterOptions.likes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {filterOptions.sortBy.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
              <select
                value={filters.direction}
                onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                {filterOptions.direction.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date From</label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
                <Calendar size={16} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date To</label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-purple [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
                <Calendar size={16} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-300">
            Showing {filteredVideos.length} of {videos.length} videos
          </div>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-purple"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div key={video.id} className="card hover:shadow-lg transition-all duration-300">
                {/* Video Thumbnail */}
                <div className="relative mb-4">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/320x180/374151/9CA3AF?text=${encodeURIComponent(video.title.substring(0, 20))}`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 rounded-full p-3">
                      <Play size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>

                {/* Video Info */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                    <span>{formatNumber(video.views)} views</span>
                    <span>{formatDate(video.uploadDate)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{formatNumber(video.comments)} comments</span>
                    <span>{formatNumber(video.likes)} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredVideos.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No videos found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelVideos;
