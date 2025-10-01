import React, { useEffect } from 'react';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { AzureTTSService } from '../../services/azureTTS';
import { queueService } from '../../services/queueService';
import YouTubeQueue from './YouTubeQueue';

const YouTube: React.FC = () => {
  const { user } = useSimpleAuth();

  // Create TTS service and set it in queue service
  useEffect(() => {
    if (user?.azureApiKey && user?.azureRegion) {
      const ttsService = new AzureTTSService(user.azureApiKey, user.azureRegion);
      queueService.setTTSService(ttsService);
    }
  }, [user?.azureApiKey, user?.azureRegion]);

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="container mx-auto px-4 py-8">
        <YouTubeQueue user={user} />
      </div>
    </div>
  );
};

export default YouTube;
