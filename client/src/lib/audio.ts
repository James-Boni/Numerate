export const sounds = {
  // Gentle, high-quality UI sounds
  correct: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3", // Musical chime
  wrong: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",   // Subtle thud
  tick: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3",   // Light tick
  tap: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",    // Quick, mellow pop
};

export class AudioManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;
  private static tickAudio: HTMLAudioElement | null = null;
  private static tapAudio: HTMLAudioElement | null = null;

  static init() {
    if (typeof window === 'undefined') return;
    
    // Pre-create audio elements for zero-latency playback
    this.correctAudio = new Audio(sounds.correct);
    this.wrongAudio = new Audio(sounds.wrong);
    this.tickAudio = new Audio(sounds.tick);
    this.tapAudio = new Audio(sounds.tap);
    
    // Optimize for instant playback
    [this.correctAudio, this.wrongAudio, this.tickAudio, this.tapAudio].forEach(a => {
      if (a) {
        a.volume = 0.25; // Lower volume for gentler feel
        a.preload = "auto";
        a.load();
      }
    });
  }

  private static playInstant(audio: HTMLAudioElement | null) {
    if (audio) {
      // The key to instant playback: reset time AND clone if needed for rapid taps
      const sound = audio.cloneNode() as HTMLAudioElement;
      sound.volume = audio.volume;
      sound.play().catch(() => {});
    }
  }

  static playCorrect() {
    this.playInstant(this.correctAudio);
  }

  static playWrong() {
    this.playInstant(this.wrongAudio);
  }

  static playTick() {
    this.playInstant(this.tickAudio);
  }

  static playTap() {
    this.playInstant(this.tapAudio);
  }
}
