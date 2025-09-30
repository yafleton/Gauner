import React, { useState, useEffect, useCallback } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { CacheService } from '../../services/cache';

const CacheStats: React.FC = () => {
  const [stats, setStats] = useState({ size: 0, keys: [] as string[] });
  const [isRefreshing] = useState(false);

  const cache = CacheService.getInstance();

  const refreshStats = useCallback(() => {
    setStats(cache.getStats());
  }, [cache]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const clearCache = () => {
    cache.clear();
    refreshStats();
  };

  const clearSpecificCache = (key: string) => {
    cache.clear(key);
    refreshStats();
  };

  const formatCacheKey = (key: string): string => {
    if (key.startsWith('cache_')) {
      return key.substring(6);
    }
    return key;
  };

  const getCacheDescription = (key: string): string => {
    if (key.includes('azure_voices')) return 'Azure TTS Voices';
    if (key.includes('channels_data')) return 'YouTube Channels Data';
    if (key.includes('user_preferences')) return 'User Preferences';
    return 'Unknown Cache';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
          <Database size={20} />
          <span>Cache Management</span>
        </h3>
        <button
          onClick={refreshStats}
          disabled={isRefreshing}
          className="btn-secondary px-3 py-2 text-sm"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Cache Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-card p-4 rounded-lg">
            <div className="text-2xl font-bold text-accent-blue">{stats.size}</div>
            <div className="text-sm text-text-secondary">Cached Items</div>
          </div>
          <div className="bg-dark-card p-4 rounded-lg">
            <div className="text-2xl font-bold text-accent-purple">{stats.keys.length}</div>
            <div className="text-sm text-text-secondary">Cache Keys</div>
          </div>
        </div>

        {/* Cache Items */}
        {stats.keys.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-3">Cached Items:</h4>
            <div className="space-y-2">
              {stats.keys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-dark-card p-3 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {getCacheDescription(key)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {formatCacheKey(key)}
                    </div>
                  </div>
                  <button
                    onClick={() => clearSpecificCache(key)}
                    className="text-red-400 hover:text-red-300 transition-colors duration-200"
                    title="Clear this cache item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Database size={32} className="text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">No cached items</p>
          </div>
        )}

        {/* Clear All Button */}
        {stats.keys.length > 0 && (
          <button
            onClick={clearCache}
            className="w-full btn-danger py-2 px-4 text-sm font-medium flex items-center justify-center space-x-2"
          >
            <Trash2 size={16} />
            <span>Clear All Cache</span>
          </button>
        )}

        {/* Cache Info */}
        <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-400 mb-2">Cache Information:</h4>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Azure voices are cached for 24 hours</li>
            <li>• Channel data is cached for 24 hours</li>
            <li>• Cache persists across browser sessions</li>
            <li>• Clearing cache will force fresh API calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CacheStats;
