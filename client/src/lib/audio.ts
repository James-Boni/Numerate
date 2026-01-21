// Professional Micro-SFX using Web Audio Synth for zero-latency execution
// These sounds are curated to be extremely short and adult-UI focused.

export class AudioManager {
  private static context: AudioContext | null = null;
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const unlock = () => {
      if (this.context?.state === 'suspended') {
        this.context.resume();
      }
      this.initialized = true;
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  private static playSynth(freq: number, type: OscillatorType, duration: number, volume: number = 0.3, sweep: boolean = false) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.context.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration + 0.05);
  }

  static playCorrect() {
    // Satisfying high chime: 880Hz -> 1320Hz sweep, 120ms
    this.playSynth(880, 'sine', 0.12, 0.2, true);
  }

  static playWrong() {
    // Muted thud: 110Hz triangle, 140ms
    this.playSynth(110, 'triangle', 0.14, 0.4);
  }

  static playTick() {
    // Short sharp click: 1500Hz square, 40ms
    this.playSynth(1500, 'square', 0.04, 0.05);
  }

  static playTap() {
    // Soft tap: 440Hz sine, 50ms
    this.playSynth(440, 'sine', 0.05, 0.15);
  }
}
