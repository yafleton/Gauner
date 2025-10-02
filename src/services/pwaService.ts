class PWAService {
  private static instance: PWAService;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ PWA features not supported in this browser');
      return false;
    }

    try {
      console.log('🔧 Registering Service Worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('✅ Service Worker registered successfully:', this.registration.scope);
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New content available, please refresh');
              this.showUpdateNotification();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      console.log('❌ Service Worker not registered');
      return;
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options
      });
      console.log('✅ Notification sent:', title);
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
    }
  }

  async sendMessageToWorker(type: string, data?: any): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.log('❌ No Service Worker controller');
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage({
        type,
        data
      });
      console.log('💬 Message sent to Service Worker:', type);
    } catch (error) {
      console.error('❌ Failed to send message to Service Worker:', error);
    }
  }

  async requestBackgroundSync(): Promise<void> {
    if (!this.registration || !('sync' in this.registration)) {
      console.log('❌ Background Sync not supported');
      return;
    }

    try {
      await (this.registration as any).sync.register('audio-generation');
      console.log('✅ Background sync registered');
    } catch (error) {
      console.error('❌ Failed to register background sync:', error);
    }
  }

  canInstall(): boolean {
    return this.isSupported && !!this.registration;
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  private showUpdateNotification(): void {
    if (this.registration) {
      this.showNotification('App Update Available', {
        body: 'A new version is available. Please refresh the page.',
        actions: [
          {
            action: 'refresh',
            title: 'Refresh Now'
          },
          {
            action: 'dismiss',
            title: 'Later'
          }
        ]
      });
    }
  }

  // Audio generation specific methods
  async notifyAudioGenerationComplete(audioFileName: string): Promise<void> {
    await this.sendMessageToWorker('AUDIO_GENERATION_COMPLETE', {
      fileName: audioFileName
    });
    
    await this.showNotification('Audio Ready! 🎵', {
      body: `Your audio file "${audioFileName}" has been generated successfully.`,
      vibrate: [100, 50, 100],
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'download',
          title: 'Download'
        }
      ]
    });
  }

  async notifyAudioGenerationError(errorMessage: string): Promise<void> {
    await this.showNotification('Audio Generation Failed ❌', {
      body: errorMessage,
      vibrate: [200, 100, 200]
    });
  }

  async notifyAudioGenerationProgress(current: number, total: number): Promise<void> {
    const percentage = Math.round((current / total) * 100);
    await this.sendMessageToWorker('AUDIO_GENERATION_PROGRESS', {
      current,
      total,
      percentage
    });
  }
}

export default PWAService;
