// PWA Utility Functions
// Handles service worker registration, installation prompts, and PWA features

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAConfig {
  enableNotifications?: boolean;
  enableBackground?: boolean;
  enableOffline?: boolean;
  updateCheckInterval?: number;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private updateAvailable = false;
  private config: PWAConfig;
  private updateCheckTimer: number | null = null;

  constructor(config: PWAConfig = {}) {
    this.config = {
      enableNotifications: true,
      enableBackground: true,
      enableOffline: true,
      updateCheckInterval: 30000, // 30 seconds
      ...config
    };

    this.init();
  }

  private async init() {
    // Check if running in browser environment
    if (typeof window === 'undefined') return;

    // Register service worker
    await this.registerServiceWorker();

    // Set up installation prompt handling
    this.setupInstallPrompt();

    // Check if already installed
    this.checkInstallationStatus();

    // Set up update checking
    if (this.config.updateCheckInterval) {
      this.startUpdateCheck();
    }

    // Handle PWA shortcuts from manifest
    this.handleShortcuts();

    console.log('PWA Manager initialized');
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
  }

  private checkInstallationStatus() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('Running as installed PWA');
    }

    // Check for iOS Safari standalone mode
    if ((window.navigator as any).standalone === true) {
      this.isInstalled = true;
      console.log('Running as iOS PWA');
    }
  }

  private handleShortcuts() {
    // Handle URL parameters for PWA shortcuts
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action) {
      console.log('PWA shortcut action:', action);
      this.executeShortcutAction(action);
    }
  }

  private executeShortcutAction(action: string) {
    // Dispatch custom event that the main app can listen for
    const event = new CustomEvent('pwa-shortcut', {
      detail: { action }
    });
    window.dispatchEvent(event);
  }

  private startUpdateCheck() {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }

    this.updateCheckTimer = window.setInterval(async () => {
      await this.checkForUpdates();
    }, this.config.updateCheckInterval!);
  }

  private async checkForUpdates() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;

    switch (type) {
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.showUpdateNotification();
        break;

      case 'OFFLINE_STATUS':
        this.handleOfflineStatus(payload.isOffline);
        break;

      default:
        console.log('Unknown service worker message:', type);
    }
  }

  private showInstallButton() {
    // Create install button if it doesn't exist
    let installButton = document.getElementById('pwa-install-button');
    
    if (!installButton) {
      installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install App
      `;
      installButton.className = `
        fixed bottom-4 right-4 z-50 bg-teal-500 hover:bg-teal-600 text-white 
        px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium
        transform transition-all duration-300 hover:scale-105
      `;
      
      installButton.addEventListener('click', () => this.promptInstall());
      document.body.appendChild(installButton);
    }

    // Animate in
    requestAnimationFrame(() => {
      installButton!.style.transform = 'translateY(0)';
    });
  }

  private hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.transform = 'translateY(100px)';
      setTimeout(() => {
        installButton.remove();
      }, 300);
    }
  }

  private showUpdateNotification() {
    // Show update notification using the app's toast system if available
    if (typeof window !== 'undefined' && (window as any).toast) {
      const toastId = (window as any).toast.info(
        'App update available! Click to refresh.',
        {
          duration: 0, // Don't auto-dismiss
          onClick: () => this.applyUpdate()
        }
      );
    } else {
      // Fallback notification
      const updateButton = document.createElement('div');
      updateButton.innerHTML = `
        <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                    bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg
                    flex items-center gap-3 cursor-pointer hover:bg-blue-600
                    transition-colors" id="pwa-update-notification">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Update available - Click to refresh</span>
        </div>
      `;
      
      updateButton.addEventListener('click', () => this.applyUpdate());
      document.body.appendChild(updateButton);
    }
  }

  private handleOfflineStatus(isOffline: boolean) {
    // Dispatch offline status event
    const event = new CustomEvent('pwa-offline-status', {
      detail: { isOffline }
    });
    window.dispatchEvent(event);

    console.log('Network status changed:', isOffline ? 'offline' : 'online');
  }

  // Public methods

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('Install prompt result:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        this.hideInstallButton();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  async applyUpdate(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page after the new service worker takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Update application failed:', error);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  async shareContent(shareData: ShareData): Promise<boolean> {
    if ('share' in navigator) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        console.error('Web Share failed:', error);
        return false;
      }
    }
    
    // Fallback: copy to clipboard
    if ('clipboard' in navigator && shareData.url) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        console.log('URL copied to clipboard');
        return true;
      } catch (error) {
        console.error('Clipboard write failed:', error);
      }
    }
    
    return false;
  }

  destroy() {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }
    
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.remove();
    }
    
    const updateNotification = document.getElementById('pwa-update-notification');
    if (updateNotification) {
      updateNotification.remove();
    }
  }
}

// Singleton instance
let pwaManager: PWAManager | null = null;

export const initializePWA = (config?: PWAConfig): PWAManager => {
  if (!pwaManager) {
    pwaManager = new PWAManager(config);
  }
  return pwaManager;
};

export const getPWAManager = (): PWAManager | null => {
  return pwaManager;
};

export default PWAManager;