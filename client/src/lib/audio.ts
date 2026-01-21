export const sounds = {
  // Gentle, high-quality UI sounds - Using reliable URLs
  correct: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  wrong: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3",
  tap: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
};

export class AudioManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;
  private static tickAudio: HTMLAudioElement | null = null;
  private static tapAudio: HTMLAudioElement | null = null;
  private static initialized = false;

  static init() {
    if (typeof window === 'undefined' || this.initialized) return;
    
    this.correctAudio = new Audio(sounds.correct);
    this.wrongAudio = new Audio(sounds.wrong);
    this.tickAudio = new Audio(sounds.tick);
    this.tapAudio = new Audio(sounds.tap);
    
    [this.correctAudio, this.wrongAudio, this.tickAudio, this.tapAudio].forEach(a => {
      if (a) {
        a.volume = 0.4;
        a.preload = "auto";
        a.load();
      }
    });
    this.initialized = true;
  }

  private static playInstant(audio: HTMLAudioElement | null) {
    if (!audio) return;
    try {
      // The key to instant playback: create a clone and play it immediately
      const sound = audio.cloneNode() as HTMLAudioElement;
      sound.volume = audio.volume;
      sound.play().catch(e => console.warn("Audio play blocked", e));
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }

  static playCorrect() { this.playInstant(this.correctAudio); }
  static playWrong() { this.playInstant(this.wrongAudio); }
  static playTick() { this.playInstant(this.tickAudio); }
  static playTap() { this.playInstant(this.tapAudio); }
}
