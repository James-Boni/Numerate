import React, { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Zap, Target, TrendingUp, Clock, Star, ChevronUp } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { xpRequiredToAdvance } from '@/lib/logic/xp-system';

function LevelUpCelebration({ 
  levelBefore, 
  levelAfter, 
  xpIntoLevelBefore,
  xpIntoLevelAfter,
  levelUpCount,
  onComplete,
  soundOn
}: {
  levelBefore: number;
  levelAfter: number;
  xpIntoLevelBefore: number;
  xpIntoLevelAfter: number;
  levelUpCount: number;
  onComplete: () => void;
  soundOn: boolean;
}) {
  const [displayLevel, setDisplayLevel] = useState(levelBefore);
  const [barProgress, setBarProgress] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'filling' | 'leveling' | 'complete'>('filling');
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;

    let currentLevel = levelBefore;
    let totalDuration = 0;
    const baseStepDuration = levelUpCount > 1 ? 400 : 600;

    const animateLevel = (lvl: number, isLast: boolean) => {
      const xpNeeded = xpRequiredToAdvance(lvl);
      const startXp = lvl === levelBefore ? xpIntoLevelBefore : 0;
      const endXp = isLast ? xpIntoLevelAfter : xpNeeded;
      const startPercent = (startXp / xpNeeded) * 100;
      const endPercent = isLast ? ((xpIntoLevelAfter / xpRequiredToAdvance(levelAfter)) * 100) : 100;

      setTimeout(() => {
        setDisplayLevel(lvl);
        setBarProgress(startPercent);
        setAnimationPhase('filling');
        
        setTimeout(() => {
          setBarProgress(isLast ? endPercent : 100);
          
          if (!isLast) {
            setTimeout(() => {
              if (soundOn) AudioManager.playLevelUp();
              setAnimationPhase('leveling');
              setBarProgress(0);
            }, baseStepDuration * 0.6);
          } else {
            setTimeout(() => {
              if (soundOn) AudioManager.playLevelUp();
              setAnimationPhase('complete');
            }, baseStepDuration * 0.4);
          }
        }, 50);
      }, totalDuration);

      totalDuration += baseStepDuration;
    };

    for (let i = 0; i <= levelUpCount; i++) {
      const lvl = levelBefore + i;
      const isLast = i === levelUpCount;
      if (lvl <= levelAfter) {
        animateLevel(lvl, isLast);
      }
    }

    setTimeout(() => {
      setDisplayLevel(levelAfter);
    }, totalDuration);

  }, [levelBefore, levelAfter, xpIntoLevelBefore, xpIntoLevelAfter, levelUpCount, soundOn]);

  return (
    <MobileLayout className="bg-gradient-to-b from-primary/5 to-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.6, repeat: animationPhase === 'leveling' ? Infinity : 0 }}
          >
            <ChevronUp size={48} className="text-primary mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900">Level Up!</h1>
        </motion.div>

        <motion.div 
          className="w-full max-w-xs bg-white rounded-3xl p-8 shadow-lg shadow-primary/10 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="text-8xl font-black text-primary mb-4"
            key={displayLevel}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {displayLevel}
          </motion.div>

          <div className="space-y-2">
            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${barProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              {animationPhase === 'leveling' && (
                <motion.div
                  className="absolute inset-0 bg-primary/30"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
            <p className="text-sm text-slate-500">
              {animationPhase === 'complete' ? `Level ${levelAfter} unlocked!` : 'Leveling up...'}
            </p>
          </div>
        </motion.div>

        {levelUpCount > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
          >
            <Star size={16} className="fill-amber-500 text-amber-500" />
            {levelUpCount} levels gained!
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: animationPhase === 'complete' ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            size="lg" 
            className="w-full h-14 px-12 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/10"
            onClick={onComplete}
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}

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
  const [step, setStep] = useState<'active' | 'results' | 'levelup'>('active');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [_, setLocation] = useLocation();
  const { currentTier, saveSession, settings } = useStore();
  const revealRun = React.useRef(false);
  const levelUpShownRef = React.useRef(false);

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

  if (step === 'levelup' && results && (results.levelUpCount ?? 0) > 0) {
    return (
      <LevelUpCelebration
        levelBefore={results.levelBefore ?? 1}
        levelAfter={results.levelAfter ?? 1}
        xpIntoLevelBefore={results.xpIntoLevelBefore ?? 0}
        xpIntoLevelAfter={results.xpIntoLevelAfter ?? 0}
        levelUpCount={results.levelUpCount ?? 1}
        onComplete={() => setLocation('/train')}
        soundOn={settings.soundOn}
      />
    );
  }

  const hasLevelUp = results && (results.levelUpCount ?? 0) > 0;

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
            onClick={() => {
              if (hasLevelUp && !levelUpShownRef.current) {
                levelUpShownRef.current = true;
                setStep('levelup');
              } else {
                setLocation('/train');
              }
            }}
          >
            {hasLevelUp && !levelUpShownRef.current ? 'View Level Up!' : 'Continue'}
          </Button>
        </motion.div>

        {settings.showDebugOverlay && results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            className="mt-8 p-4 bg-slate-900 rounded-xl text-xs text-slate-300 font-mono space-y-2"
          >
            <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-3">Debug: XP Calculation</div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-500">sessionType:</span>
              <span>{results.sessionType ?? 'daily'}</span>
              
              <span className="text-slate-500">duration (D):</span>
              <span>{results.durationSecondsActual}s</span>
              
              <span className="text-slate-500">questions (N):</span>
              <span>{results.totalQuestions}</span>
              
              <span className="text-slate-500">correct (C):</span>
              <span>{results.correctQuestions}</span>
              
              <span className="text-slate-500">accuracy (A):</span>
              <span>{(results.accuracy * 100).toFixed(1)}%</span>
              
              <span className="text-slate-500">medianMs:</span>
              <span>{results.medianMs?.toFixed(0) ?? 'N/A'}</span>
              
              <span className="text-slate-500">variabilityMs:</span>
              <span>{results.variabilityMs?.toFixed(0) ?? 'N/A'}</span>
              
              <span className="text-slate-500">qps:</span>
              <span>{results.throughputQps?.toFixed(3) ?? 'N/A'}</span>
            </div>

            <div className="border-t border-slate-700 my-2 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-slate-500">speedScore (S):</span>
                <span>{results.speedScore?.toFixed(3) ?? 'N/A'}</span>
                
                <span className="text-slate-500">consistencyScore (Cns):</span>
                <span>{results.consistencyScore?.toFixed(3) ?? 'N/A'}</span>
                
                <span className="text-slate-500">throughputScore (T):</span>
                <span>{results.throughputScore?.toFixed(3) ?? 'N/A'}</span>
                
                <span className="text-slate-500">fluencyScore (F):</span>
                <span>{results.fluencyScore?.toFixed(1) ?? 'N/A'}</span>
              </div>
            </div>

            <div className="border-t border-slate-700 my-2 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-slate-500">baseSessionXP:</span>
                <span>{results.baseSessionXP ?? 'N/A'}</span>
                
                <span className="text-slate-500">modeMultiplier:</span>
                <span>{results.modeMultiplier?.toFixed(2) ?? '1.00'}</span>
                
                <span className="text-slate-500">excellenceMultiplier:</span>
                <span>{results.excellenceMultiplierApplied?.toFixed(2) ?? '1.00'}</span>
                
                <span className="text-slate-500">eliteMultiplier:</span>
                <span>{results.eliteMultiplierApplied?.toFixed(2) ?? '1.00'}</span>
                
                <span className="text-slate-500 font-bold">finalSessionXP:</span>
                <span className="text-primary font-bold">{results.finalSessionXP ?? results.xpEarned}</span>
              </div>
            </div>

            <div className="border-t border-slate-700 my-2 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-slate-500">levelBefore:</span>
                <span>{results.levelBefore ?? 'N/A'}</span>
                
                <span className="text-slate-500">levelAfter:</span>
                <span className="text-primary">{results.levelAfter ?? 'N/A'}</span>
                
                <span className="text-slate-500">levelUpCount:</span>
                <span>{results.levelUpCount ?? 0}</span>
                
                <span className="text-slate-500">xpIntoLevel (before):</span>
                <span>{results.xpIntoLevelBefore ?? 'N/A'}</span>
                
                <span className="text-slate-500">xpIntoLevel (after):</span>
                <span>{results.xpIntoLevelAfter ?? 'N/A'}</span>
              </div>
            </div>

            <div className="border-t border-slate-700 my-2 pt-2">
              <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-2">Next 5 Level Requirements</div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[0, 1, 2, 3, 4].map(i => {
                  const lvl = (results.levelAfter ?? 1) + i;
                  return (
                    <div key={i}>
                      <div className="text-slate-500">L{lvl}</div>
                      <div className="text-slate-300">{xpRequiredToAdvance(lvl)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-slate-500 text-[10px] mt-2">valid: {results.valid ? 'true' : 'false'}</div>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
}

