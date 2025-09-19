// Notification Sounds Utility
// Handles audio notifications for new leads and emails

export interface SoundPreferences {
  enabled: boolean;
  volume: number;
  newLeadSound: string;
  emailSound: string;
}

export const AVAILABLE_SOUNDS = {
  notification: 'Notification Bell',
  email: 'Email Alert',
  chime: 'Gentle Chime',
  ding: 'Classic Ding',
  pop: 'Pop Sound',
  swoosh: 'Swoosh',
  beep: 'Beep',
  none: 'No Sound'
} as const;

export type SoundType = keyof typeof AVAILABLE_SOUNDS;

class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();
  private initialized = false;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      // Initialize AudioContext on user interaction to comply with browser policies
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (error) {
      console.warn('AudioContext not supported:', error);
      this.initialized = false;
    }
  }

  private async createNotificationSound(frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine'): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let value = 0;
      
      switch (type) {
        case 'sine':
          value = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          value = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'triangle':
          value = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
          break;
      }

      // Apply envelope for smooth sound
      const envelope = Math.exp(-t * 3); // Exponential decay
      data[i] = value * envelope * 0.3; // Reduce volume
    }

    return buffer;
  }

  private async generateSounds() {
    if (!this.audioContext || !this.initialized) return;

    try {
      // Generate different notification sounds
      const sounds = {
        notification: await this.createNotificationSound(800, 0.3, 'sine'),
        email: await this.createNotificationSound(600, 0.4, 'triangle'),
        chime: await this.createNotificationSound(1000, 0.5, 'sine'),
        ding: await this.createNotificationSound(1200, 0.2, 'sine'),
        pop: await this.createNotificationSound(400, 0.1, 'square'),
        swoosh: await this.createNotificationSound(200, 0.6, 'triangle'),
        beep: await this.createNotificationSound(1000, 0.15, 'square')
      };

      // Cache the generated sounds
      Object.entries(sounds).forEach(([name, buffer]) => {
        this.soundCache.set(name, buffer);
      });
    } catch (error) {
      console.error('Error generating notification sounds:', error);
    }
  }

  async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initializeAudioContext();
    }

    if (this.initialized && this.soundCache.size === 0) {
      await this.generateSounds();
    }

    return this.initialized;
  }

  async playSound(soundType: SoundType, volume: number = 0.7): Promise<void> {
    if (soundType === 'none') return;
    
    try {
      await this.ensureInitialized();
      
      if (!this.audioContext || !this.initialized) {
        console.warn('AudioContext not available, using fallback notification');
        this.fallbackNotification(soundType);
        return;
      }

      // Resume AudioContext if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const buffer = this.soundCache.get(soundType);
      if (!buffer) {
        console.warn(`Sound "${soundType}" not found in cache`);
        return;
      }

      // Create and configure audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play sound
      source.start(0);
    } catch (error) {
      console.error('Error playing notification sound:', error);
      this.fallbackNotification(soundType);
    }
  }

  private fallbackNotification(soundType: SoundType) {
    // Fallback to browser notification sound or visual notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New ${soundType === 'email' ? 'Email' : 'Lead'} Notification`, {
        icon: '/favicon.ico',
        silent: false, // Use browser's default notification sound
        tag: 'lead-machine-notification'
      });
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Test sound playback
  async testSound(soundType: SoundType, volume: number = 0.7): Promise<void> {
    await this.playSound(soundType, volume);
  }

  // Get available sound types for UI
  getAvailableSounds(): typeof AVAILABLE_SOUNDS {
    return AVAILABLE_SOUNDS;
  }
}

// Singleton instance
const notificationSoundManager = new NotificationSoundManager();

export default notificationSoundManager;

// Convenience functions
export const playNewLeadSound = async (preferences: SoundPreferences) => {
  if (preferences.enabled) {
    await notificationSoundManager.playSound(preferences.newLeadSound as SoundType, preferences.volume);
  }
};

export const playEmailSound = async (preferences: SoundPreferences) => {
  if (preferences.enabled) {
    await notificationSoundManager.playSound(preferences.emailSound as SoundType, preferences.volume);
  }
};

export const testNotificationSound = async (soundType: SoundType, volume: number = 0.7) => {
  await notificationSoundManager.testSound(soundType, volume);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  return await notificationSoundManager.requestNotificationPermission();
};