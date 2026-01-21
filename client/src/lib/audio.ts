export const sounds = {
  correct: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
  wrong: "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg",
  tick: "https://actions.google.com/sounds/v1/ui/click_tone_small.ogg",
  tap: "https://actions.google.com/sounds/v1/ui/click_tone_small.ogg",
};

export class AudioManager {
  private static context: AudioContext | null = null;
  private static buffers: Map<string, AudioBuffer> = new Map();
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const loadSound = async (name: string, url: string) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
          this.buffers.set(name, audioBuffer);
        } catch (e) {
          console.error(`DIAGNOSTIC: Error loading ${name}:`, e);
          if (this.context) {
            this.buffers.set(name, this.context.createBuffer(1, 4410, 44100));
          }
        }
      };

      await Promise.all([
        loadSound('correct', sounds.correct),
        loadSound('wrong', sounds.wrong),
        loadSound('tick', sounds.tick),
        loadSound('tap', sounds.tap),
      ]);

      const unlock = async () => {
        if (this.context?.state === 'suspended') {
          await this.context.resume();
        }
        this.initialized = true;
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
      };

      window.addEventListener('click', unlock);
      window.addEventListener('touchstart', unlock);
    } catch (e) {
      console.error("DIAGNOSTIC: Web Audio Init Fail:", e);
    }
  }

  private static playBuffer(name: string) {
    if (!this.context || !this.buffers.has(name)) return;
    if (this.context.state === 'suspended') this.context.resume();

    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(name)!;
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0.5;
    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    source.start(0);
  }

  static playCorrect() { this.playBuffer('correct'); }
  static playWrong() { this.playBuffer('wrong'); }
  static playTick() { this.playBuffer('tick'); }
  static playTap() { this.playBuffer('tap'); }
}
