export interface AudioFile {
  id: string;
  userId: string;
  filename: string;
  blob: Blob;
  createdAt: Date;
  expiresAt: Date;
  voice: string;
  text: string;
  size: number;
}

export class AudioStorageService {
  private static instance: AudioStorageService;
  private storage: Map<string, AudioFile> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupTimer();
    this.loadFromLocalStorage();
  }

  public static getInstance(): AudioStorageService {
    if (!AudioStorageService.instance) {
      AudioStorageService.instance = new AudioStorageService();
    }
    return AudioStorageService.instance;
  }

  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredFiles();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredFiles(): Promise<void> {
    const now = new Date();
    const expiredFiles: string[] = [];

    for (const [id, file] of this.storage.entries()) {
      if (file.expiresAt <= now) {
        expiredFiles.push(id);
      }
    }

    expiredFiles.forEach(id => {
      this.storage.delete(id);
    });

    if (expiredFiles.length > 0) {
      console.log(`Cleaned up ${expiredFiles.length} expired audio files`);
      await this.saveToLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('audio_files');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, fileData] of Object.entries(data)) {
          const file = fileData as any;
          // Convert dates back from strings
          file.createdAt = new Date(file.createdAt);
          file.expiresAt = new Date(file.expiresAt);
          // Convert blob data back to Blob
          if (file.blobData) {
            file.blob = new Blob([new Uint8Array(file.blobData)], { type: 'audio/wav' });
            delete file.blobData;
          }
          this.storage.set(id, file as AudioFile);
        }
        console.log(`Loaded ${this.storage.size} audio files from localStorage`);
      }
    } catch (error) {
      console.error('Error loading audio files from localStorage:', error);
    }
  }

  private async saveToLocalStorage(): Promise<void> {
    try {
      const data: { [key: string]: any } = {};
      for (const [id, file] of this.storage.entries()) {
        // Convert Blob to ArrayBuffer for storage
        const blobData = file.blob instanceof Blob ? 
          Array.from(new Uint8Array(await file.blob.arrayBuffer())) : 
          file.blob;
        
        data[id] = {
          ...file,
          blob: undefined, // Remove blob from serialized data
          blobData: blobData
        };
      }
      localStorage.setItem('audio_files', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving audio files to localStorage:', error);
    }
  }

  public async saveAudio(
    userId: string,
    audioBuffer: ArrayBuffer,
    voice: string,
    text: string,
    filename?: string
  ): Promise<string> {
    const id = this.generateId();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const audioFile: AudioFile = {
      id,
      userId,
      filename: filename || `audio_${Date.now()}.wav`,
      blob,
      createdAt: now,
      expiresAt,
      voice,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), // Truncate for display
      size: audioBuffer.byteLength
    };

    this.storage.set(id, audioFile);
    await this.saveToLocalStorage();

    console.log(`Saved audio file: ${audioFile.filename} for user: ${userId}`);
    return id;
  }

  public getUserAudioFiles(userId: string): AudioFile[] {
    const userFiles = Array.from(this.storage.values())
      .filter(file => file.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first

    return userFiles;
  }

  public getAudioFile(id: string, userId: string): AudioFile | null {
    const file = this.storage.get(id);
    if (file && file.userId === userId && file.expiresAt > new Date()) {
      return file;
    }
    return null;
  }

  public async deleteAudioFile(id: string, userId: string): Promise<boolean> {
    const file = this.storage.get(id);
    if (file && file.userId === userId) {
      this.storage.delete(id);
      await this.saveToLocalStorage();
      console.log(`Deleted audio file: ${file.filename}`);
      return true;
    }
    return false;
  }

  public async deleteAllUserFiles(userId: string): Promise<number> {
    let deletedCount = 0;
    for (const [id, file] of this.storage.entries()) {
      if (file.userId === userId) {
        this.storage.delete(id);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      await this.saveToLocalStorage();
      console.log(`Deleted ${deletedCount} audio files for user: ${userId}`);
    }
    return deletedCount;
  }

  public getStorageStats(userId: string): { count: number; totalSize: number } {
    const userFiles = this.getUserAudioFiles(userId);
    const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
    return {
      count: userFiles.length,
      totalSize
    };
  }

  private generateId(): string {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public formatTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
