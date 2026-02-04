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

  private static correctSoundIndex = 0;
  
  static playCorrect(streak: number = 0) {
    // For streak milestones (5, 10, 15, 20...), play special streak sound instead
    if (streak > 0 && streak % 5 === 0) {
      this.playStreakMilestone(streak);
      return;
    }
    
    // 3 pitch variations for regular correct answers - low, medium, high
    // Much lower base frequencies for a warmer, less shrill sound
    const pitches = [392.00, 440.00, 493.88]; // G4, A4, B4 - warmer tones
    const freq = pitches[this.correctSoundIndex];
    this.correctSoundIndex = (this.correctSoundIndex + 1) % 3;
    
    const volume = 0.22;
    this.playSynth(freq, 'sine', 0.1, volume, true, freq * 1.25);
  }

  static playWrong() {
    this.playSynth(180, 'triangle', 0.12, 0.25);
  }

  static playStreakMilestone(streak: number) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    if (streak >= 10) {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.1, 0.2), i * 50);
      });
    } else if (streak >= 5) {
      const notes = [659.25, 783.99, 987.77];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.1, 0.18), i * 60);
      });
    } else if (streak >= 3) {
      this.playSynth(783.99, 'sine', 0.15, 0.15, true, 987.77);
    }
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

  static playCountdownHorn() {
    // Game-like horn for countdown (3, 2, 1)
    this.playSynth(440, 'triangle', 0.15, 0.4, true, 550);
  }

  static playGoHorn() {
    // Higher-pitch horn signaling "GO / game has begun"
    this.playSynth(660, 'triangle', 0.2, 0.5, true, 880);
  }

  static playQuickTick() {
    // Quiet tick for Quick Fire timer
    this.playSynth(800, 'square', 0.02, 0.03);
  }

  static playCheer() {
    // Short uplifting cheer for new high score
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // Play a quick ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSynth(freq, 'sine', 0.15, 0.25), i * 80);
    });
  }

  static playPlacementReveal() {
    // Soft, satisfying reveal sound - warm and encouraging
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // Gentle ascending shimmer
    this.playSynth(523.25, 'sine', 0.3, 0.2, true, 784);
    setTimeout(() => this.playSynth(659.25, 'sine', 0.25, 0.15), 100);
  }

  static playLevelUp() {
    // Celebratory level-up sound - rewarding and clear
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // Quick triumphant arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSynth(freq, 'sine', 0.12, 0.3), i * 60);
    });
  }

  // XP feedback sounds - varied based on gain size
  static playXPTick() {
    // Small, subtle tick for incremental XP
    this.playSynth(1200, 'sine', 0.03, 0.08);
  }

  static playXPPop(intensity: number = 1) {
    // Pop sound with intensity scaling
    const baseFreq = 600 + intensity * 100;
    this.playSynth(baseFreq, 'sine', 0.08 + intensity * 0.02, 0.15 + intensity * 0.05, true, baseFreq * 1.3);
  }

  static playXPBurst() {
    // Satisfying burst for big XP gains
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // Layered burst - shimmer + thump
    this.playSynth(200, 'triangle', 0.15, 0.3); // Low thump
    this.playSynth(1000, 'sine', 0.1, 0.2, true, 1500); // High shimmer
    setTimeout(() => this.playSynth(1200, 'sine', 0.08, 0.15), 50);
  }

  // Enhanced level-up with intensity scaling - MORE JUBILANT AND DECISIVE
  static playLevelUpEnhanced(levelsGained: number = 1) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // More dramatic arpeggio - fuller and more celebratory
    const baseNotes = [196.00, 261.63, 329.63, 392.00, 523.25]; // G3, C4, E4, G4, C5
    const extendedNotes = [...baseNotes, 659.25, 783.99, 1046.50, 1318.51]; // Add E5, G5, C6, E6
    
    const notes = levelsGained >= 2 ? extendedNotes : baseNotes;
    const noteDelay = levelsGained >= 2 ? 60 : 75;
    const volume = Math.min(0.35 + levelsGained * 0.06, 0.50);
    
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSynth(freq, 'sine', 0.18, volume), i * noteDelay);
    });
    
    // Always add triumphant final chord - bigger for more levels
    const chordDelay = notes.length * noteDelay + 50;
    if (levelsGained >= 2) {
      setTimeout(() => {
        // Grand major chord with octave spread
        this.playSynth(261.63, 'sine', 0.5, 0.25); // C4 bass
        this.playSynth(523.25, 'sine', 0.45, 0.3); // C5
        this.playSynth(659.25, 'sine', 0.45, 0.28); // E5
        this.playSynth(783.99, 'sine', 0.4, 0.26); // G5
        this.playSynth(1046.50, 'sine', 0.35, 0.22); // C6
      }, chordDelay);
      // Add sparkle
      setTimeout(() => {
        this.playSynth(2093.00, 'sine', 0.15, 0.1, true, 2637.02);
      }, chordDelay + 100);
    } else {
      setTimeout(() => {
        this.playSynth(392.00, 'sine', 0.4, 0.25);
        this.playSynth(523.25, 'sine', 0.4, 0.28);
        this.playSynth(659.25, 'sine', 0.35, 0.25);
      }, chordDelay);
    }
  }

  // Session completion fanfare - scales with performance - MORE JUBILANT
  static playSessionComplete(accuracy: number = 0.7) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    // Performance-based sound selection - all more celebratory
    if (accuracy >= 0.9) {
      // TRIUMPHANT fanfare for excellent performance - full major chord progression
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51]; // C4 up to E6
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.15, 0.35), i * 45);
      });
      // Big triumphant final chord
      setTimeout(() => {
        this.playSynth(523.25, 'sine', 0.5, 0.3); // C5
        this.playSynth(659.25, 'sine', 0.45, 0.28); // E5
        this.playSynth(783.99, 'sine', 0.45, 0.26); // G5
        this.playSynth(1046.50, 'sine', 0.4, 0.24); // C6
      }, 400);
      // Sparkle overlay
      setTimeout(() => {
        this.playSynth(2093.00, 'sine', 0.2, 0.12, true, 2637.02); // High shimmer
      }, 500);
    } else if (accuracy >= 0.7) {
      // CELEBRATORY good job sound - ascending major with chord finish
      const notes = [392.00, 493.88, 587.33, 783.99, 987.77]; // G4, B4, D5, G5, B5
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.14, 0.3), i * 60);
      });
      // Finishing chord
      setTimeout(() => {
        this.playSynth(587.33, 'sine', 0.35, 0.25);
        this.playSynth(783.99, 'sine', 0.35, 0.22);
        this.playSynth(987.77, 'sine', 0.3, 0.2);
      }, 350);
    } else {
      // WARM encouraging completion sound - still positive
      const notes = [349.23, 440, 523.25, 659.25]; // F4, A4, C5, E5
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.15, 0.25), i * 80);
      });
      // Soft resolution chord
      setTimeout(() => {
        this.playSynth(440, 'sine', 0.3, 0.18);
        this.playSynth(523.25, 'sine', 0.3, 0.16);
      }, 380);
    }
  }

  // Streak milestone celebration - escalates with streak level
  static playStreakCelebration(streak: number) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    if (streak >= 20) {
      // Epic streak sound
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.08, 0.25), i * 40);
      });
      // Shimmer overlay
      setTimeout(() => {
        this.playSynth(2000, 'sine', 0.3, 0.1, true, 3000);
      }, 300);
    } else if (streak >= 15) {
      const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.1, 0.22), i * 45);
      });
    } else if (streak >= 10) {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.1, 0.2), i * 50);
      });
    } else if (streak >= 5) {
      const notes = [659.25, 783.99, 987.77];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.1, 0.18), i * 60);
      });
    } else if (streak >= 3) {
      this.playSynth(783.99, 'sine', 0.15, 0.15, true, 987.77);
    }
  }

  // Daily streak milestone sounds
  static playDailyStreakMilestone(days: number) {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();
    
    if (days >= 30) {
      // Month streak - grand celebration
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.15, 0.3), i * 60);
      });
      // Add harmonics
      setTimeout(() => {
        this.playSynth(523.25, 'sine', 0.5, 0.2);
        this.playSynth(783.99, 'sine', 0.45, 0.18);
        this.playSynth(1046.50, 'sine', 0.4, 0.15);
      }, 450);
    } else if (days >= 7) {
      // Week streak
      const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.12, 0.25), i * 70);
      });
    } else if (days >= 3) {
      // Getting started streak
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSynth(freq, 'sine', 0.12, 0.2), i * 80);
      });
    }
  }
}
