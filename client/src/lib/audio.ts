export const sounds = {
  correct: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  wrong: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3",
  tap: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3", // Mellow pop for key taps
};

export class AudioManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;
  private static tickAudio: HTMLAudioElement | null = null;
  private static tapAudio: HTMLAudioElement | null = null;

  static init() {
    if (typeof window === 'undefined') return;
    this.correctAudio = new Audio(sounds.correct);
    this.wrongAudio = new Audio(sounds.wrong);
    this.tickAudio = new Audio(sounds.tick);
    this.tapAudio = new Audio(sounds.tap);
    
    [this.correctAudio, this.wrongAudio, this.tickAudio, this.tapAudio].forEach(a => {
      if (a) {
        a.volume = 0.3;
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

  static playTap() {
    if (this.tapAudio) {
      this.tapAudio.currentTime = 0;
      this.tapAudio.play().catch(() => {});
    }
  }
}
