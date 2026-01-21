export const sounds = {
  correct: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3", // Soft, high-pitched pop/ding
  wrong: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",   // Muted, lower-pitched thud
};

export class AudioManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;

  static init() {
    if (typeof window === 'undefined') return;
    this.correctAudio = new Audio(sounds.correct);
    this.wrongAudio = new Audio(sounds.wrong);
    
    // Preload
    this.correctAudio.load();
    this.wrongAudio.load();
    
    // Configure for short, snappy playback
    [this.correctAudio, this.wrongAudio].forEach(a => {
      if (a) {
        a.volume = 0.4;
      }
    });
  }

  static playCorrect() {
    if (this.correctAudio) {
      this.correctAudio.currentTime = 0;
      this.correctAudio.play().catch(() => {});
    }
  }

  static playWrong() {
    if (this.wrongAudio) {
      this.wrongAudio.currentTime = 0;
      this.wrongAudio.play().catch(() => {});
    }
  }
}
