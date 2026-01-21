export const sounds = {
  // Reliable URLs for immediate feedback
  correct: "https://rpg.hamsterrepublic.com/ohrrpgce/item_get.ogg",
  wrong: "https://rpg.hamsterrepublic.com/ohrrpgce/lose_die.ogg",
  tick: "https://rpg.hamsterrepublic.com/ohrrpgce/click.ogg",
  tap: "https://rpg.hamsterrepublic.com/ohrrpgce/click.ogg",
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
        a.volume = 0.6;
        a.preload = "auto";
        a.load();
      }
    });

    const unlock = () => {
      [this.correctAudio, this.wrongAudio, this.tickAudio, this.tapAudio].forEach(a => {
        if (a) {
          a.play().then(() => {
            a.pause();
            a.currentTime = 0;
          }).catch(() => {});
        }
      });
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('touchstart', unlock);
      this.initialized = true;
      console.log("Audio unlocked and initialized");
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  private static playInstant(audio: HTMLAudioElement | null) {
    if (!audio) return;
    try {
      // Force instant playback by cloning and playing immediately
      const sound = audio.cloneNode() as HTMLAudioElement;
      sound.volume = audio.volume;
      sound.play().catch(e => console.warn("Audio play failed:", e));
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  static playCorrect() { this.playInstant(this.correctAudio); }
  static playWrong() { this.playInstant(this.wrongAudio); }
  static playTick() { this.playInstant(this.tickAudio); }
  static playTap() { this.playInstant(this.tapAudio); }
}
