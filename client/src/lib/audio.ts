export const sounds = {
  correct: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  wrong: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3", // Added soft tick
};

export class AudioManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;
  private static tickAudio: HTMLAudioElement | null = null;

  static init() {
    if (typeof window === 'undefined') return;
    this.correctAudio = new Audio(sounds.correct);
    this.wrongAudio = new Audio(sounds.wrong);
    this.tickAudio = new Audio(sounds.tick);
    
    [this.correctAudio, this.wrongAudio, this.tickAudio].forEach(a => {
      if (a) {
        a.volume = 0.3; // Quiet by default
        a.load();
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

  static playTick() {
    if (this.tickAudio) {
      this.tickAudio.currentTime = 0;
      this.tickAudio.play().catch(() => {});
    }
  }
}
