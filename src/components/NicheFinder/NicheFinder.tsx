import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChannelCard from './ChannelCard';
import FilterDropdown from './FilterDropdown';
import { Channel, FilterOptions } from '../../types';
import { CacheService, CACHE_KEYS } from '../../services/cache';
import YouTubeApiService from '../../services/youtubeApi';
import CloudConfigService from '../../services/cloudConfig';
import TubeChefApiService from '../../services/tubechefApi';

const NicheFinder: React.FC = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    subscribers: 'all',
    niche: 'all',
    language: 'all',
    views48h: 'all',
  });

  const cache = CacheService.getInstance();
  const tubechefApi = useMemo(() => TubeChefApiService.getInstance(), []);

  // Mock data - replace with actual API call
  const mockChannels = useMemo((): Channel[] => [
    {
      id: '1',
      name: 'The Human Stories',
      avatar: '',
      niche: 'Emotional',
      subscribers: 28200,
      language: 'English',
      views48h: 0,
    },
    {
      id: '2',
      name: 'Dónde Están?',
      avatar: '',
      niche: 'Mixed / General Storytelling',
      subscribers: 14100,
      language: 'Español',
      views48h: 10700,
    },
    {
      id: '3',
      name: 'Historias Elefante',
      avatar: '',
      niche: 'Mixed / General Storytelling',
      subscribers: 10100,
      language: 'Español',
      views48h: 7600,
    },
    {
      id: '4',
      name: 'Tolle spannende Geschichten',
      avatar: '',
      niche: 'Mixed / General Storytelling',
      subscribers: 6100,
      language: 'German',
      views48h: 6600,
    },
    {
      id: '5',
      name: 'Black Thread',
      avatar: '',
      niche: 'Billionaire',
      subscribers: 131000,
      language: 'English',
      views48h: 33200,
    },
    {
      id: '6',
      name: 'SoulfulStories',
      avatar: '',
      niche: 'Emotional',
      subscribers: 24600,
      language: 'English',
      views48h: 53500,
    },
    {
      id: '7',
      name: 'Radio Life Stories',
      avatar: '',
      niche: 'History & Hidden Truths',
      subscribers: 4800,
      language: 'English',
      views48h: 1600,
    },
    {
      id: '8',
      name: 'Historia Tenebris',
      avatar: '',
      niche: 'Miscellaneous-Horror & Other Story Channels',
      subscribers: 1100,
      language: 'Español',
      views48h: 903,
    },
    {
      id: '9',
      name: 'Stories of Silent Bonds',
      avatar: '',
      niche: 'Emotional',
      subscribers: 643,
      language: 'English',
      views48h: 0,
    },
    {
      id: '10',
      name: 'Fictional Reimagined',
      avatar: '',
      niche: 'Mixed / General Storytelling',
      subscribers: 57900,
      language: 'English',
      views48h: 0,
    },
    {
      id: '11',
      name: 'Impressive Stories',
      avatar: '',
      niche: 'Mixed / General Storytelling',
      subscribers: 151000,
      language: 'English',
      views48h: 0,
    },
    {
      id: '12',
      name: 'Siente estos cuentos',
      avatar: '',
      niche: 'Emotional',
      subscribers: 1900,
      language: 'Español',
      views48h: 0,
    },
  ], []);

  const filterOptions = {
    subscribers: [
      { value: 'all', label: 'All Subscribers' },
      { value: '0-100k', label: '0 - 100K' },
      { value: '100k-500k', label: '100K - 500K' },
      { value: '500k-1m', label: '500K - 1M' },
      { value: '1m-5m', label: '1M - 5M' },
      { value: '5m+', label: '5M+' },
    ],
    niche: [
      { value: 'all', label: 'All Niches' },
      { value: 'billionaire', label: 'Billionaire' },
      { value: 'crime', label: 'Crime' },
      { value: 'emotional', label: 'Emotional' },
      { value: 'animal-pet', label: 'Animal & Pet Stories' },
      { value: 'gay-lesbian', label: 'Gay/Lesbian Niche' },
      { value: 'hfy', label: 'HFY' },
      { value: 'hoa-drama', label: 'HOA & Neighborhood Drama' },
      { value: 'history', label: 'History & Hidden Truths' },
      { value: 'horror', label: 'Miscellaneous-Horror & Other Story Channels' },
      { value: 'mixed', label: 'Mixed / General Storytelling' },
      { value: 'old-west', label: 'Old West & Cowboy Tales' },
      { value: 'revenge', label: 'Revenge & Justice Stories' },
      { value: 'single-parent', label: 'Single Dad/ Single MOM' },
      { value: 'sleep', label: 'Sleep Videos' },
      { value: 'veterans', label: 'Veterans' },
    ],
    language: [
      { value: 'all', label: 'All Languages' },
      { value: 'english', label: 'English' },
      { value: 'español', label: 'Español' },
      { value: 'german', label: 'German' },
    ],
    views48h: [
      { value: 'all', label: 'All Views' },
      { value: '0-50k', label: '0 - 50K' },
      { value: '50k-100k', label: '50K - 100K' },
      { value: '100k-200k', label: '100K - 200K' },
      { value: '200k+', label: '200K+' },
    ],
  };

  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Check cache first for optimization
        const cachedChannels = cache.get<Channel[]>(CACHE_KEYS.TUBECHEF_CHANNELS);
        
        if (cachedChannels) {
          console.log('Using cached TubeChef channels data');
          setChannels(cachedChannels);
          setLoading(false);
          return;
        }

        console.log('Fetching fresh channels from TubeChef API...');

        console.log('Fetching channels from TubeChef API...');
        
        // Fetch channels from TubeChef API
        const tubechefChannels = await tubechefApi.getChannels();
        
        // Convert to our Channel format with real avatars AND URLs
        console.log('🔄 Converting channels with YouTube API integration...');
        const convertedChannels = await tubechefApi.convertToChannelsWithAvatars(tubechefChannels);
        console.log('✅ Conversion complete:', convertedChannels.length, 'channels');
        
        setChannels(convertedChannels);
        
        // Cache the channels for 24 hours for optimization
        cache.set(CACHE_KEYS.TUBECHEF_CHANNELS, convertedChannels, 24 * 60 * 60 * 1000);
        console.log(`✅ Cached ${convertedChannels.length} channels with YouTube API data for 24 hours`);
        
      } catch (error) {
        console.error('Error fetching channels from TubeChef API:', error);
        setError('Failed to fetch channel data from TubeChef API. Using mock data instead.');
        // Fallback to mock data on error
        setChannels(mockChannels);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [cache, mockChannels, tubechefApi]);

  useEffect(() => {
    let filtered = [...channels];

    // Apply filters
    if (filters.subscribers !== 'all') {
      const [min, max] = filters.subscribers.split('-').map(v => {
        if (v.endsWith('k')) return parseInt(v.slice(0, -1)) * 1000;
        if (v.endsWith('m')) return parseInt(v.slice(0, -1)) * 1000000;
        return parseInt(v);
      });
      
      filtered = filtered.filter(channel => {
        if (filters.subscribers === '5m+') {
          return channel.subscribers >= 5000000;
        }
        return channel.subscribers >= min && channel.subscribers <= max;
      });
    }

    if (filters.niche !== 'all') {
      filtered = filtered.filter(channel => 
        channel.niche.toLowerCase().includes(filters.niche.toLowerCase())
      );
    }

    if (filters.language !== 'all') {
      filtered = filtered.filter(channel => 
        channel.language.toLowerCase() === filters.language.toLowerCase()
      );
    }

    if (filters.views48h !== 'all') {
      const [min, max] = filters.views48h.split('-').map(v => {
        if (v.endsWith('k')) return parseInt(v.slice(0, -1)) * 1000;
        return parseInt(v);
      });
      
      filtered = filtered.filter(channel => {
        if (filters.views48h === '200k+') {
          return channel.views48h >= 200000;
        }
        return channel.views48h >= min && channel.views48h <= max;
      });
    }

    setFilteredChannels(filtered);
  }, [channels, filters]);

  const handleFilterChange = (filterType: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <Search size={32} className="text-accent-purple" />
          <h1 className="text-3xl font-bold text-text-primary">Q Niche Finder</h1>
        </div>
        
        {/* Data Source Status */}
        {error && (
          <div className="mt-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} className="text-yellow-400" />
              <div>
                <p className="text-yellow-300 text-sm font-medium">
                  Using Fallback Data
                </p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FilterDropdown
            label="Subscribers"
            options={filterOptions.subscribers}
            value={filters.subscribers}
            onChange={(value) => handleFilterChange('subscribers', value)}
          />
          
          <FilterDropdown
            label="Niche"
            options={filterOptions.niche}
            value={filters.niche}
            onChange={(value) => handleFilterChange('niche', value)}
          />
          
          <FilterDropdown
            label="Language"
            options={filterOptions.language}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          
          <FilterDropdown
            label="48h Views"
            options={filterOptions.views48h}
            value={filters.views48h}
            onChange={(value) => handleFilterChange('views48h', value)}
          />
        </div>
        
        <div className="mt-4 text-gray-300">
          Showing {filteredChannels.length} of {channels.length} channels
        </div>
      </div>

      {/* Channel Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="loading"></div>
          <span className="ml-3 text-text-secondary">Loading channels...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredChannels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      {!loading && filteredChannels.length === 0 && (
        <div className="text-center py-12">
          <Search size={48} className="text-text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No channels found</h3>
          <p className="text-text-secondary">Try adjusting your filters to see more results.</p>
        </div>
      )}
    </div>
  );
};

export default NicheFinder;
