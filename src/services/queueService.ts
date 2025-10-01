import { AudioFile } from './audioStorage';
import { googleDriveStorage } from './googleDriveStorage';
import { AzureTTSService } from './azureTTS';

export interface QueueItem {
  id: string;
  title: string;
  transcript: string;
  language: string;
  voice: string;
  modifications: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  audioFile?: AudioFile;
  youtubeUrl: string;
  originalTitle: string;
  originalTranscript: string;
  userId: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

class QueueService {
  private static instance: QueueService;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private ttsService: AzureTTSService | null = null;

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  // Set the TTS service instance
  setTTSService(ttsService: AzureTTSService): void {
    this.ttsService = ttsService;
  }

  // Add item to queue
  addToQueue(
    title: string,
    transcript: string,
    language: string,
    modifications: string[],
    youtubeUrl: string,
    originalTitle: string,
    originalTranscript: string,
    userId: string = 'queue-user'
  ): string {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine voice based on language
    const voice = this.getVoiceForLanguage(language);
    
    const queueItem: QueueItem = {
      id,
      title,
      transcript,
      language,
      voice,
      modifications,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      youtubeUrl,
      originalTitle,
      originalTranscript,
      userId
    };

    this.queue.push(queueItem);
    this.notifyQueueUpdate();
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    console.log('📥 Added item to queue:', id, title);
    return id;
  }

  // Get all queue items
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  // Get queue statistics
  getQueueStats(): QueueStats {
    return {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      processing: this.queue.filter(item => item.status === 'processing').length,
      completed: this.queue.filter(item => item.status === 'completed').length,
      failed: this.queue.filter(item => item.status === 'failed').length
    };
  }

  // Remove item from queue
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.notifyQueueUpdate();
      console.log('🗑️ Removed item from queue:', id);
      return true;
    }
    return false;
  }

  // Clear completed items
  clearCompleted(): void {
    this.queue = this.queue.filter(item => item.status !== 'completed');
    this.notifyQueueUpdate();
    console.log('🧹 Cleared completed items from queue');
  }

  // Clear all items
  clearAll(): void {
    this.queue = [];
    this.notifyQueueUpdate();
    console.log('🧹 Cleared all items from queue');
  }

  // Start processing queue
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 Starting queue processing');
    
    this.processNextItem();
  }

  // Stop processing queue
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearTimeout(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('⏹️ Stopped queue processing');
  }

  // Process next item in queue
  private async processNextItem(): Promise<void> {
    if (!this.isProcessing) return;

    const nextItem = this.queue.find(item => item.status === 'pending');
    if (!nextItem) {
      console.log('✅ Queue processing complete - no more pending items');
      this.isProcessing = false;
      return;
    }

    try {
      console.log('🎯 Processing queue item:', nextItem.id, nextItem.title);
      nextItem.status = 'processing';
      nextItem.progress = 10;
      this.notifyQueueUpdate();

      // Generate audio using Azure TTS
      nextItem.progress = 30;
      this.notifyQueueUpdate();

      if (!this.ttsService) {
        throw new Error('TTS service not initialized');
      }

      const audioArrayBuffer = await this.ttsService.synthesizeSpeech(
        nextItem.transcript,
        nextItem.voice,
        this.getLanguageCode(nextItem.language)
      );

      if (!audioArrayBuffer) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });

      nextItem.progress = 60;
      this.notifyQueueUpdate();

      // Create audio file object
      const audioFile: AudioFile = {
        id: nextItem.id,
        userId: nextItem.userId || 'queue-user',
        filename: `${nextItem.title.replace(/[^a-zA-Z0-9]/g, '_')}.wav`,
        blob: audioBlob,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        voice: nextItem.voice,
        text: nextItem.transcript,
        size: audioBlob.size
      };

      nextItem.progress = 80;
      this.notifyQueueUpdate();

      // Save to Google Drive
      const saveResult = await googleDriveStorage.saveAudioFile(nextItem.userId || 'queue-user', audioFile);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save to Google Drive: ${saveResult.error}`);
      }

      nextItem.progress = 100;
      nextItem.status = 'completed';
      nextItem.processedAt = new Date();
      nextItem.audioFile = audioFile;
      
      console.log('✅ Queue item processed successfully:', nextItem.id);
      this.notifyQueueUpdate();

      // Process next item after a short delay
      this.processingInterval = setTimeout(() => {
        this.processNextItem();
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to process queue item:', nextItem.id, error);
      nextItem.status = 'failed';
      nextItem.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifyQueueUpdate();

      // Process next item after a delay
      this.processingInterval = setTimeout(() => {
        this.processNextItem();
      }, 2000);
    }
  }

  // Get voice for language
  private getVoiceForLanguage(language: string): string {
    const languageCode = language.toLowerCase();
    
    const voiceMap: { [key: string]: string } = {
      'en': 'Andrew (US)',
      'english': 'Andrew (US)',
      'de': 'Florian',
      'german': 'Florian',
      'deutsch': 'Florian',
      'es': 'Diego',
      'spanish': 'Diego',
      'fr': 'Denise',
      'french': 'Denise',
      'it': 'Isabella',
      'italian': 'Isabella',
      'pt': 'Cristiano',
      'portuguese': 'Cristiano',
      'nl': 'Maarten',
      'dutch': 'Maarten',
      'pl': 'Jan',
      'polish': 'Jan',
      'ru': 'Dmitri',
      'russian': 'Dmitri',
      'ja': 'Keita',
      'japanese': 'Keita',
      'ko': 'SangHyun',
      'korean': 'SangHyun',
      'zh': 'Xiaoxiao',
      'chinese': 'Xiaoxiao'
    };

    return voiceMap[languageCode] || 'Andrew (US)';
  }

  // Get language code for Azure TTS
  private getLanguageCode(language: string): string {
    const languageCode = language.toLowerCase();
    
    const codeMap: { [key: string]: string } = {
      'en': 'en-US',
      'english': 'en-US',
      'de': 'de-DE',
      'german': 'de-DE',
      'deutsch': 'de-DE',
      'es': 'es-ES',
      'spanish': 'es-ES',
      'fr': 'fr-FR',
      'french': 'fr-FR',
      'it': 'it-IT',
      'italian': 'it-IT',
      'pt': 'pt-PT',
      'portuguese': 'pt-PT',
      'nl': 'nl-NL',
      'dutch': 'nl-NL',
      'pl': 'pl-PL',
      'polish': 'pl-PL',
      'ru': 'ru-RU',
      'russian': 'ru-RU',
      'ja': 'ja-JP',
      'japanese': 'ja-JP',
      'ko': 'ko-KR',
      'korean': 'ko-KR',
      'zh': 'zh-CN',
      'chinese': 'zh-CN'
    };

    return codeMap[languageCode] || 'en-US';
  }

  // Notify components of queue updates
  private notifyQueueUpdate(): void {
    window.dispatchEvent(new CustomEvent('queueUpdate', {
      detail: {
        queue: this.getQueue(),
        stats: this.getQueueStats()
      }
    }));
  }

  // Get queue item by ID
  getQueueItem(id: string): QueueItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  // Retry failed item
  retryItem(id: string): boolean {
    const item = this.getQueueItem(id);
    if (item && item.status === 'failed') {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
      this.notifyQueueUpdate();
      
      if (!this.isProcessing) {
        this.startProcessing();
      }
      
      console.log('🔄 Retrying queue item:', id);
      return true;
    }
    return false;
  }
}

export const queueService = QueueService.getInstance();
