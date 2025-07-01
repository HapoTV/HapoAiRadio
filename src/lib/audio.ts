import { Howl } from 'howler';

interface AudioTrack {
  id: string;
  url: string;
  title: string;
  artist?: string;
  duration: number;
}

export interface AudioState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

class AudioEngine {
  private howl: Howl | null = null;
  private currentTrack: AudioTrack | null = null;
  private listeners: Set<(state: AudioState) => void> = new Set();
  private isDestroyed: boolean = false;

  constructor() {
    // Initialize with empty state
  }

  async loadTrack(track: AudioTrack): Promise<void> {
    // Clean up existing audio
    this.unloadTrack();
    
    if (this.isDestroyed) return;
    
    this.currentTrack = track;

    // Create new Howl instance with error handling
    return new Promise((resolve, reject) => {
      try {
        this.howl = new Howl({
          src: [track.url],
          html5: true,
          preload: true,
          format: ['mp3', 'wav', 'ogg'],
          onload: () => {
            this.notifyListeners();
            resolve();
          },
          onloaderror: (id, error) => {
            console.error('Error loading audio:', error);
            reject(new Error(`Failed to load audio: ${error}`));
          },
          onplayerror: (id, error) => {
            console.error('Error playing audio:', error);
            reject(new Error(`Failed to play audio: ${error}`));
          },
          onplay: () => this.notifyListeners(),
          onpause: () => this.notifyListeners(),
          onstop: () => this.notifyListeners(),
          onend: () => this.notifyListeners(),
          onseek: () => this.notifyListeners(),
        });
      } catch (error) {
        console.error('Error creating Howl instance:', error);
        reject(error);
      }
    });
  }

  unloadTrack(): void {
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
  }

  play(): void {
    if (this.howl && !this.isDestroyed) {
      this.howl.play();
    }
  }

  pause(): void {
    if (this.howl) {
      this.howl.pause();
    }
  }

  stop(): void {
    if (this.howl) {
      this.howl.stop();
    }
  }

  seek(position: number): void {
    if (this.howl) {
      this.howl.seek(position);
      this.notifyListeners();
    }
  }

  setVolume(volume: number): void {
    if (this.howl) {
      this.howl.volume(volume);
      this.notifyListeners();
    }
  }

  getCurrentTime(): number {
    if (!this.howl) return 0;
    try {
      const time = this.howl.seek() as number;
      return isNaN(time) ? 0 : time;
    } catch (error) {
      console.error('Error getting current time:', error);
      return 0;
    }
  }

  getDuration(): number {
    return this.howl?.duration() || 0;
  }

  isPlaying(): boolean {
    return this.howl?.playing() || false;
  }

  subscribe(listener: (state: AudioState) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.isDestroyed = true;
    this.unloadTrack();
    this.listeners.clear();
  }

  private getState(): AudioState {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying(),
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.howl?.volume() || 1,
    };
  }

  private notifyListeners(): void {
    if (this.isDestroyed) return;
    
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in audio listener:', error);
      }
    });
  }
}

export const audioEngine = new AudioEngine();

// Ensure cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioEngine.destroy();
  });
}