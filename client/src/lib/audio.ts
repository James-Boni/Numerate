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

  private static playSynth(freq: number, type: OscillatorType, duration: number, volume: number = 0.3, sweep: boolean = false, sweepEndFreq?: number) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    if (sweep && sweepEndFreq) {
      osc.frequency.exponentialRampToValueAtTime(sweepEndFreq, this.context.currentTime + duration);
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
    this.playSynth(880, 'sine', 0.12, 0.2, true, 1320);
  }

  static playWrong() {
    this.playSynth(110, 'triangle', 0.14, 0.4);
  }

  static playTick() {
    this.playSynth(1500, 'square', 0.04, 0.05);
  }

  static playTap() {
    this.playSynth(440, 'sine', 0.05, 0.15);
  }

  static playEnergyRise(duration: number) {
    this.playSynth(440, 'sine', duration, 0.2, true, 880);
  }

  static playTallyTick() {
    this.playSynth(1200, 'square', 0.02, 0.05);
  }

  static playSuccessBell() {
    this.playSynth(1500, 'sine', 0.25, 0.3, true, 1800);
  }

  static playCompletion() {
    // Short, clean completion cue
    this.playSynth(660, 'sine', 0.15, 0.2, true, 880);
  }

  static playThud() {
    // Precise thud for target icon pulse
    this.playSynth(220, 'triangle', 0.15, 0.3);
  }

  static playZap() {
    // Digital zap for speed reveal
    this.playSynth(2000, 'square', 0.1, 0.1, true, 1000);
  }
}
