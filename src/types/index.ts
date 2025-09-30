export interface User {
  id: string;
  username: string;
  email: string;
  azureApiKey?: string;
  azureRegion?: string;
  createdAt: Date;
  hasPermission?: boolean; // Whether user has permission to access the website
  status?: 'pending' | 'approved' | 'rejected'; // User approval status
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  niche: string;
  subscribers: number;
  language: string;
  views48h: number;
  description?: string;
  channelUrl?: string;
  videoCount?: number;
  lastVideoDate?: string;
  tubechefId?: string; // Original TubeChef ID
  youtubeChannelId?: string; // YouTube channel ID for API calls
}

export interface FilterOptions {
  subscribers: string;
  niche: string;
  language: string;
  views48h: string;
}

export interface AzureVoice {
  Name: string;
  DisplayName: string;
  LocalName: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  StyleList?: string[];
  SampleRateHertz: string;
  VoiceType: string;
  Status: string;
}

export interface TTSRequest {
  text: string;
  voice: string;
  language: string;
  rate?: string;
  pitch?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateAzureKey: (key: string) => Promise<boolean>;
  updateAzureRegion: (region: string) => Promise<boolean>;
  loading: boolean;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  comments: number;
  likes: number;
  uploadDate: string;
  duration: string;
  description?: string;
}

// Re-export admin types
export * from './admin';
