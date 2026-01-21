export const sounds = {
  // Using stable base64 or verified short MP3s for reliability
  correct: "https://www.soundjay.com/buttons/sounds/button-37.mp3",
  wrong: "https://www.soundjay.com/buttons/sounds/button-10.mp3",
  tick: "https://www.soundjay.com/buttons/sounds/button-50.mp3",
  tap: "https://www.soundjay.com/buttons/sounds/button-50.mp3",
};

export class AudioManager {
  private static context: AudioContext | null = null;
  private static buffers: Map<string, AudioBuffer> = new Map();
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Pre-load all sounds
      const loadSound = async (name: string, url: string) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
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
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('mousedown', unlock);
      };

      window.addEventListener('touchstart', unlock);
      window.addEventListener('mousedown', unlock);
    } catch (e) {
      console.error("Web Audio initialization failed:", e);
    }
  }

  private static playBuffer(name: string) {
    if (!this.context || !this.buffers.has(name)) return;
    
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

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
