import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Zap, Target, TrendingUp, Clock } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

function CountUp({ value, duration = 1, delay = 0, onTick, suffix = '' }: { 
  value: number, 
  duration?: number, 
  delay?: number, 
  onTick?: () => void,
  suffix?: string
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const initialized = React.useRef(false);
  const lastRounded = React.useRef(0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timer = setTimeout(() => {
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate: (latest) => {
          const rounded = Math.round(latest);
          if (rounded !== lastRounded.current) {
            lastRounded.current = rounded;
            setDisplayValue(rounded);
            onTick?.();
          }
        }
      });
      return () => controls.stop();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, duration, delay]);

  return <span>{displayValue}{suffix}</span>;
}

export default function Game() {
  const [step, setStep] = useState<'active' | 'results'>('active');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [_, setLocation] = useLocation();
  const { currentTier, saveSession, settings } = useStore();
  const revealRun = React.useRef(false);

  // Pre-initialize audio context on mount
  useEffect(() => {
    AudioManager.init();
  }, []);

  const handleComplete = (stats: SessionStats) => {
    console.log(`[SESSION_FLOW] Training complete: ${Date.now()}`, stats);
    saveSession(stats);
    setResults(stats);
    setStep('results');
  };

  useEffect(() => {
    if (step === 'results' && results && !revealRun.current) {
      revealRun.current = true;
      console.log(`[SESSION_FLOW] Reveal sequence started: ${Date.now()}`);
      console.log("[XP_SUMMARY_RENDER]", {
        xpDisplayed: results.xpEarned,
        xpSourceValue: results.xpEarned,
        sourceField: "results.xpEarned",
      });
      
      if (settings.soundOn) {
        AudioManager.playCompletion();
        setTimeout(() => AudioManager.playEnergyRise(0.8), 200);
        
        // Accuracy reveal overlap
        setTimeout(() => {
          AudioManager.playThud();
          if (results.accuracy >= 0.95) {
            setTimeout(() => AudioManager.playSuccessBell(), 600);
          }
        }, 900);

        // Speed reveal
        setTimeout(() => {
          AudioManager.playZap();
        }, 1300);
      }
    }
  }, [step, results, settings.soundOn]);

  if (step === 'active') {
    return (
      <SessionScreen 
        mode="training"
        durationSeconds={180}
        initialTier={currentTier}
        onComplete={handleComplete}
        onExit={() => setLocation('/train')}
      />
    );
  }

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 p-8 space-y-8 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4"
          >
            <ClipboardCheck size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900">Session Complete</h1>
          <p className="text-slate-500">Great progress today.</p>
        </div>

        <motion.div 
          initial={{ scale: 1, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">XP Earned</span>
          <motion.div 
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-7xl font-black text-primary"
          >
            <CountUp 
              value={results?.xpEarned || 0} 
              duration={0.8} 
              delay={0.2} 
              onTick={() => settings.soundOn && AudioManager.playTallyTick()} 
            />
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-5 flex flex-col items-center justify-center space-y-2 bg-slate-50 border-none shadow-none rounded-[2rem]">
              <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ delay: 0.9, duration: 0.3 }}>
                <Target size={20} className="text-primary" />
              </motion.div>
              <span className={clsx(
                "text-2xl font-bold tabular-nums transition-colors duration-300",
                (results?.accuracy || 0) >= 0.95 ? "text-primary" : "text-slate-900"
              )}>
                <CountUp 
                  value={Math.round((results?.accuracy || 0) * 100)} 
                  duration={0.6} 
                  delay={0.9} 
                  onTick={() => settings.soundOn && AudioManager.playTallyTick()}
                  suffix="%"
                />
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accuracy</span>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="p-5 flex flex-col items-center justify-center space-y-2 bg-slate-50 border-none shadow-none rounded-[2rem]">
              <motion.div animate={{ x: [0, -2, 2, -2, 2, 0] }} transition={{ delay: 1.3, duration: 0.4 }}>
                <Clock size={20} className="text-primary" />
              </motion.div>
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                <CountUp 
                  value={Math.round((results?.avgResponseTimeMs || 0) / 1000 * 10) / 10} 
                  duration={0.5} 
                  delay={1.3} 
                  onTick={() => settings.soundOn && AudioManager.playTallyTick()}
                  suffix="s"
                />
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Speed</span>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/10 mt-4"
            onClick={() => setLocation('/train')}
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}

function useRef(arg0: boolean) {
    return React.useRef(arg0);
}
