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
import { ContextualMessage } from '@/components/game/ContextualMessage';
import { SparkleEffect } from '@/components/game/SparkleEffect';
import { Confetti } from '@/components/game/Confetti';
import { PaywallScreen } from '@/components/game/PaywallScreen';
import { DailyChallengeIntro } from '@/components/game/DailyChallengeIntro';
import { StrategyLesson } from '@/components/game/StrategyLesson';
import { PersonalRecordCelebration, PersonalRecord } from '@/components/game/PersonalRecordCelebration';
import { useAccountStore, isPremiumActive } from '@/lib/services/account-store';
import { detectWeakness, WeaknessPattern } from '@/lib/logic/weakness-detector';
import { DailyStreakCelebration, isMilestone } from '@/components/game/DailyStreakCelebration';

const MILESTONE_DATA: Record<number, { title: string; subtitle: string; tier: number }> = {
  10: { title: "Double Digits!", subtitle: "You've built a real foundation. This is where it starts to click.", tier: 1 },
  25: { title: "Quarter Century!", subtitle: "Most people never get this far. Your dedication is paying off.", tier: 2 },
  50: { title: "Half Century!", subtitle: "You're in the top tier. Your number skills are genuinely impressive now.", tier: 3 },
  75: { title: "Diamond Level!", subtitle: "Extraordinary commitment. You should feel proud of how far you've come.", tier: 4 },
  100: { title: "Century!", subtitle: "One hundred levels. You've mastered what most adults avoid. Incredible.", tier: 5 },
};

function getMilestoneForRange(levelBefore: number, levelAfter: number) {
  const milestones = [10, 25, 50, 75, 100];
  for (let i = milestones.length - 1; i >= 0; i--) {
    const m = milestones[i];
    if (levelBefore < m && levelAfter >= m) {
      return MILESTONE_DATA[m];
    }
  }
  return null;
}

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
  const [showGlow, setShowGlow] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const animatedRef = useRef(false);

  const milestone = getMilestoneForRange(levelBefore, levelAfter);
  const isMilestoneLevel = !!milestone;
  const milestoneTier = milestone?.tier ?? 0;
  const confettiCount = isMilestoneLevel ? 60 + milestoneTier * 30 : (levelUpCount > 1 ? 80 : 50);
  const particleCount = isMilestoneLevel ? 16 + milestoneTier * 4 : 16;
  const particleSpread = isMilestoneLevel ? 150 + milestoneTier * 20 : 150;
  const celebrationDelay = isMilestoneLevel ? 1.2 + milestoneTier * 0.15 : 0.8;

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;

    let currentLevel = levelBefore;
    let totalDuration = 0;
    const baseStepDuration = levelUpCount > 1 ? 600 : 900;

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
              if (soundOn) AudioManager.playLevelUpEnhanced(1);
              setAnimationPhase('leveling');
              setShowGlow(true);
              setShowParticles(true);
              setTimeout(() => {
                setShowGlow(false);
                setShowParticles(false);
              }, 400);
              setBarProgress(0);
            }, baseStepDuration * 0.6);
          } else {
            setTimeout(() => {
              if (soundOn) {
                if (isMilestoneLevel) {
                  AudioManager.playMilestoneFanfare(milestoneTier);
                } else {
                  AudioManager.playLevelUpEnhanced(levelUpCount);
                }
              }
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

  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (animationPhase === 'complete') {
      setShowConfetti(true);
      setShowGlow(true);
    }
  }, [animationPhase]);

  const bgGradient = isMilestoneLevel
    ? 'bg-gradient-to-b from-amber-50 via-yellow-50/80 to-white'
    : 'bg-gradient-to-b from-primary/5 to-white';

  const glowColor = isMilestoneLevel ? 'bg-amber-400/30' : 'bg-primary/20';
  const glowIntensity = isMilestoneLevel ? [0, 1, 0.8] : [0, 1, 0.6];

  return (
    <MobileLayout className={`${bgGradient} overflow-hidden`}>
      <Confetti active={showConfetti} originX={50} originY={40} count={confettiCount} />
      
      <AnimatePresence>
        {showGlow && (
          <motion.div
            className={`absolute inset-0 ${glowColor} pointer-events-none z-10`}
            initial={{ opacity: 0 }}
            animate={{ opacity: glowIntensity }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMilestoneLevel ? 0.8 : 0.5, times: [0, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      {isMilestoneLevel && animationPhase === 'complete' && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-radial from-amber-300/40 via-transparent to-transparent" 
               style={{ background: 'radial-gradient(circle at 50% 40%, rgba(251, 191, 36, 0.3), transparent 70%)' }} />
        </motion.div>
      )}
      
      <AnimatePresence>
        {showParticles && (
          <>
            {Array.from({ length: particleCount }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-3 h-3 rounded-full ${isMilestoneLevel ? (i % 2 === 0 ? 'bg-amber-400' : 'bg-yellow-300') : 'bg-primary'}`}
                style={{ left: '50%', top: '40%' }}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: 0, 
                  scale: isMilestoneLevel ? 2 : 1.5,
                  x: Math.cos((i / particleCount) * Math.PI * 2) * particleSpread,
                  y: Math.sin((i / particleCount) * Math.PI * 2) * particleSpread
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: isMilestoneLevel ? 0.9 : 0.6, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <motion.div
            animate={animationPhase === 'leveling' ? { 
              scale: [1, 1.3, 1], 
              rotate: [0, 10, -10, 0],
              y: [0, -10, 0]
            } : { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.5, repeat: animationPhase === 'leveling' ? Infinity : 0 }}
          >
            <ChevronUp size={isMilestoneLevel ? 56 : 48} className={isMilestoneLevel ? 'text-amber-500 mx-auto' : 'text-primary mx-auto'} />
          </motion.div>
          <motion.h1 
            className={`font-bold ${isMilestoneLevel ? 'text-4xl' : 'text-3xl'} ${isMilestoneLevel ? 'text-amber-700' : 'text-slate-900'}`}
            animate={animationPhase === 'complete' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {isMilestoneLevel && animationPhase === 'complete' ? milestone!.title : 'Level Up!'}
          </motion.h1>
        </motion.div>

        <motion.div 
          className={`w-full max-w-xs rounded-3xl p-8 shadow-lg text-center relative overflow-hidden ${
            isMilestoneLevel 
              ? 'bg-gradient-to-b from-amber-50 to-white shadow-amber-200/30 ring-2 ring-amber-200/50' 
              : 'bg-white shadow-primary/10'
          }`}
          initial={{ scale: isMilestoneLevel ? 0.8 : 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: isMilestoneLevel ? 'spring' : 'tween', stiffness: 200, damping: 15 }}
        >
          {animationPhase === 'complete' && (
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r from-transparent ${isMilestoneLevel ? 'via-amber-100/60' : 'via-white/40'} to-transparent`}
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1, repeat: isMilestoneLevel ? 4 : 2, repeatDelay: 0.5 }}
            />
          )}
          
          <motion.div 
            className={`font-black mb-4 relative ${
              isMilestoneLevel 
                ? 'text-8xl bg-gradient-to-b from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent' 
                : 'text-8xl text-primary'
            }`}
            key={displayLevel}
            initial={{ scale: isMilestoneLevel ? 0.3 : 0.5, opacity: 0, rotate: isMilestoneLevel ? -20 : -10 }}
            animate={{ 
              scale: animationPhase === 'complete' 
                ? (isMilestoneLevel ? [1, 1.35, 1.15] : [1, 1.25, 1.1]) 
                : 1, 
              opacity: 1, 
              rotate: 0 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: isMilestoneLevel ? 200 : 250, 
              damping: isMilestoneLevel ? 10 : 12,
              scale: { delay: 0.1, duration: isMilestoneLevel ? 0.9 : 0.6 }
            }}
          >
            {displayLevel}
            
            <motion.div
              className={`absolute inset-0 blur-xl -z-10 ${isMilestoneLevel ? 'bg-amber-400/40' : 'bg-primary/30'}`}
              animate={{ 
                opacity: animationPhase === 'complete' ? (isMilestoneLevel ? [0.4, 0.8, 0.4] : [0.3, 0.6, 0.3]) : 0,
                scale: animationPhase === 'complete' ? (isMilestoneLevel ? [1, 1.4, 1] : [1, 1.2, 1]) : 1
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          <div className="space-y-2">
            <div className={`relative h-4 rounded-full overflow-hidden ${isMilestoneLevel ? 'bg-amber-100' : 'bg-slate-100'}`}>
              <motion.div 
                className={`absolute inset-y-0 left-0 rounded-full ${
                  isMilestoneLevel 
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400' 
                    : 'bg-gradient-to-r from-primary to-primary/80'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${barProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              {animationPhase === 'leveling' && (
                <motion.div
                  className={`absolute inset-0 ${isMilestoneLevel ? 'bg-amber-400/50' : 'bg-primary/50'}`}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </div>
            <motion.p 
              className={`text-sm ${isMilestoneLevel ? 'text-amber-600' : 'text-slate-500'}`}
              animate={animationPhase === 'complete' ? { color: isMilestoneLevel ? '#b45309' : '#0d9488' } : {}}
            >
              {animationPhase === 'complete' ? `Level ${levelAfter} unlocked!` : 'Leveling up...'}
            </motion.p>
          </div>
        </motion.div>

        {isMilestoneLevel && animationPhase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 150, damping: 12 }}
            className="max-w-xs text-center px-4"
            data-testid="milestone-message"
          >
            <p className="text-base text-amber-800/80 leading-relaxed italic">
              {milestone!.subtitle}
            </p>
          </motion.div>
        )}

        {!isMilestoneLevel && levelUpCount > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 px-6 py-3 rounded-full text-base font-bold flex items-center gap-2 shadow-lg shadow-amber-200/50"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <Star size={20} className="fill-amber-500 text-amber-500" />
            </motion.div>
            {levelUpCount} levels gained!
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationPhase === 'complete' ? 1 : 0, y: animationPhase === 'complete' ? 0 : 20 }}
          transition={{ delay: celebrationDelay }}
        >
          <Button 
            size="lg" 
            className={`w-full h-14 px-12 text-lg font-semibold rounded-2xl shadow-lg ${
              isMilestoneLevel 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-amber-300/30' 
                : 'shadow-primary/20'
            }`}
            onClick={onComplete}
            data-testid="button-continue-levelup"
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
  const [step, setStep] = useState<'daily_intro' | 'active' | 'results' | 'streak_milestone' | 'strategy' | 'levelup' | 'paywall'>('daily_intro');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [detectedWeakness, setDetectedWeakness] = useState<WeaknessPattern | null>(null);
  const [newPersonalRecords, setNewPersonalRecords] = useState<PersonalRecord[]>([]);
  const [entitlementChecked, setEntitlementChecked] = useState(false);
  const [streakMilestoneReached, setStreakMilestoneReached] = useState<number | null>(null);
  const [_, setLocation] = useLocation();
  const { currentTier, saveSession, settings, seenStrategies, markStrategySeen, checkAndUpdatePersonalBests, streakCount } = useStore();
  const { entitlement, refreshEntitlement } = useAccountStore();
  const revealRun = React.useRef(false);
  const levelUpShownRef = React.useRef(false);
  const streakMilestoneShownRef = React.useRef(false);

  // Check entitlement on mount and determine if user should be blocked
  useEffect(() => {
    const checkAccess = async () => {
      await refreshEntitlement();
      setEntitlementChecked(true);
    };
    checkAccess();
    AudioManager.init();
  }, []);
  
  // Reset personal records state when going to a new session
  useEffect(() => {
    if (step === 'daily_intro' || step === 'active') {
      setNewPersonalRecords([]);
    }
  }, [step]);

  // Check if user has premium subscription
  const isPremium = isPremiumActive(entitlement);

  const handleComplete = (stats: SessionStats) => {
    console.log(`[SESSION_FLOW] Training complete: ${Date.now()}`, stats);
    saveSession(stats);
    setResults(stats);
    
    // Check for personal records
    const newRecords = checkAndUpdatePersonalBests(stats);
    if (newRecords.length > 0) {
      console.log('[PERSONAL_RECORDS] New records:', newRecords);
      setNewPersonalRecords(newRecords);
    }
    
    // Detect weakness patterns for coaching (filter out already-seen strategies)
    if (stats.questionResults && stats.questionResults.length > 0) {
      const weakness = detectWeakness(stats.questionResults, seenStrategies);
      if (weakness) {
        console.log('[COACHING] Weakness detected:', weakness);
        setDetectedWeakness(weakness);
      }
    }
    
    // Check for daily streak milestone (store would have updated after saveSession)
    const newStreakCount = useStore.getState().streakCount;
    if (isMilestone(newStreakCount)) {
      console.log('[STREAK] Milestone reached:', newStreakCount);
      setStreakMilestoneReached(newStreakCount);
    }
    
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
        // Use performance-based session complete sound
        AudioManager.playSessionComplete(results.accuracy);
        
        // Accuracy reveal overlap
        setTimeout(() => {
          AudioManager.playThud();
          if (results.accuracy >= 0.95) {
            setTimeout(() => AudioManager.playSuccessBell(), 400);
          }
        }, 900);

        // Speed reveal
        setTimeout(() => {
          AudioManager.playZap();
        }, 1300);
      }
    }
  }, [step, results, settings.soundOn]);

  // Show daily challenge intro before starting session
  if (step === 'daily_intro') {
    // Wait for entitlement check first
    if (!entitlementChecked) {
      return (
        <MobileLayout className="bg-white">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500">Loading...</p>
            </div>
          </div>
        </MobileLayout>
      );
    }
    
    return (
      <DailyChallengeIntro
        streakCount={useStore.getState().streakCount}
        onStart={() => {
          // Show paywall before starting daily session (if not premium)
          if (!isPremium) {
            setStep('paywall');
          } else {
            setStep('active');
          }
        }}
      />
    );
  }

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

  // Strategy lesson step (shown after results if weakness detected)
  if (step === 'strategy' && detectedWeakness) {
    return (
      <StrategyLesson
        strategyId={detectedWeakness.strategyId}
        onComplete={() => {
          // Mark strategy as seen so it won't show again
          markStrategySeen(detectedWeakness.strategyId);
          // Clear weakness so it doesn't show again, then continue flow
          setDetectedWeakness(null);
          const hasLevelUp = results && (results.levelUpCount ?? 0) > 0;
          if (hasLevelUp && !levelUpShownRef.current) {
            levelUpShownRef.current = true;
            setStep('levelup');
          } else {
            setLocation('/train');
          }
        }}
      />
    );
  }

  // Streak milestone celebration (shown after results, before strategy/levelup)
  if (step === 'streak_milestone' && streakMilestoneReached) {
    return (
      <DailyStreakCelebration
        streakCount={streakMilestoneReached}
        onContinue={() => {
          streakMilestoneShownRef.current = true;
          setStreakMilestoneReached(null);
          // Continue to next step in flow
          if (detectedWeakness) {
            setStep('strategy');
          } else {
            const hasLevelUp = results && (results.levelUpCount ?? 0) > 0;
            if (hasLevelUp && !levelUpShownRef.current) {
              levelUpShownRef.current = true;
              setStep('levelup');
            } else {
              setLocation('/train');
            }
          }
        }}
        soundOn={settings.soundOn}
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
        onComplete={() => {
          setLocation('/train');
        }}
        soundOn={settings.soundOn}
      />
    );
  }

  if (step === 'paywall') {
    return (
      <PaywallScreen 
        onSubscribed={() => {
          // After subscribing, start the daily session
          setStep('active');
        }}
        onRestore={() => {
          // After restoring purchase, start the daily session
          setStep('active');
        }}
        onDismiss={() => setLocation('/train')}
      />
    );
  }

  const hasLevelUp = results && (results.levelUpCount ?? 0) > 0;
  const accuracy = results?.accuracy || 0;
  const isExcellent = accuracy >= 0.9;
  const isGood = accuracy >= 0.7;

  return (
    <MobileLayout className="bg-white overflow-hidden">
      {/* Confetti for excellent performance */}
      <Confetti 
        active={isExcellent} 
        originX={50} 
        originY={30} 
        count={40} 
      />
      
      {/* Celebration glow for good performance */}
      {isGood && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        </motion.div>
      )}
      
      <div className="flex-1 p-8 space-y-8 flex flex-col justify-center relative z-10">
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={clsx(
              "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
              isExcellent ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
            )}
          >
            <motion.div
              animate={isExcellent ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: isExcellent ? 2 : 0 }}
            >
              <ClipboardCheck size={32} />
            </motion.div>
          </motion.div>
          <motion.h1 
            className="text-3xl font-bold text-slate-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isExcellent ? 'Excellent Work!' : isGood ? 'Great Session!' : 'Session Complete'}
          </motion.h1>
          <ContextualMessage 
            accuracy={results?.accuracy || 0}
            avgSpeed={results?.avgResponseTimeMs || 0}
            bestStreak={results?.bestStreak || 0}
            totalQuestions={results?.totalQuestions || 0}
          />
        </div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={clsx(
            "relative rounded-[2.5rem] p-8 text-center space-y-4 overflow-hidden",
            isExcellent ? "bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/10" : "bg-white border border-slate-100 shadow-sm"
          )}
        >
          {/* Shimmer effect for excellent */}
          {isExcellent && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -z-0"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.5, repeat: 2, repeatDelay: 1 }}
            />
          )}
          
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest relative z-10">XP Earned</span>
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className={clsx(
              "text-7xl font-black relative z-10",
              isExcellent ? "text-primary" : "text-primary"
            )}
          >
            <CountUp 
              value={results?.xpEarned || 0} 
              duration={1} 
              delay={0.3} 
              onTick={() => settings.soundOn && AudioManager.playXPTick()} 
            />
            
            {/* Glow behind XP for excellent */}
            {isExcellent && (
              <motion.div
                className="absolute inset-0 blur-xl bg-primary/20 -z-10"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>

          {results && (() => {
            const baseXP = results.baseSessionXP ?? results.xpEarned ?? 0;
            const totalXP = results.xpEarned ?? 0;
            const bonusXP = totalXP - baseXP;
            const hasExcellence = (results.excellenceMultiplierApplied ?? 0) > 0;
            const hasElite = (results.eliteMultiplierApplied ?? 0) > 0;
            const excellenceAmount = hasExcellence ? (accuracy >= 0.95 ? 100 : 50) : 0;
            const eliteAmount = hasElite ? 150 : 0;

            if (bonusXP <= 0) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="relative z-10 space-y-1.5 pt-2"
                data-testid="xp-breakdown"
              >
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Base XP</span>
                  <span className="font-semibold tabular-nums">{baseXP}</span>
                </div>
                {hasExcellence && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 }}
                    className="flex items-center justify-between text-sm"
                    data-testid="xp-excellence-bonus"
                  >
                    <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <Star size={14} className="fill-amber-500 text-amber-500" />
                      Excellence Bonus
                    </span>
                    <span className="font-bold text-amber-600 tabular-nums">+{excellenceAmount}</span>
                  </motion.div>
                )}
                {hasElite && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6 }}
                    className="flex items-center justify-between text-sm"
                    data-testid="xp-elite-bonus"
                  >
                    <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                      <Zap size={14} className="fill-purple-500 text-purple-500" />
                      Elite Bonus
                    </span>
                    <span className="font-bold text-purple-600 tabular-nums">+{eliteAmount}</span>
                  </motion.div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-sm font-bold text-primary">
                  <span>Total</span>
                  <span className="tabular-nums">{totalXP}</span>
                </div>
              </motion.div>
            );
          })()}
        </motion.div>

        {newPersonalRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <PersonalRecordCelebration newRecords={newPersonalRecords} />
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-5 flex flex-col items-center justify-center space-y-2 bg-slate-50 border-none shadow-none rounded-[2rem] relative overflow-visible">
              <SparkleEffect active={(results?.accuracy || 0) >= 0.95} color="#14B8A6" />
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
              // Flow: results → streak_milestone (if milestone) → strategy (if weakness) → levelup (if applicable) → reassurance/train
              if (streakMilestoneReached && !streakMilestoneShownRef.current) {
                setStep('streak_milestone');
              } else if (detectedWeakness) {
                setStep('strategy');
              } else if (hasLevelUp && !levelUpShownRef.current) {
                levelUpShownRef.current = true;
                setStep('levelup');
              } else {
                setLocation('/train');
              }
            }}
          >
            {streakMilestoneReached && !streakMilestoneShownRef.current ? 'View Streak!' : 
             detectedWeakness ? 'See Tip' : 
             hasLevelUp && !levelUpShownRef.current ? 'View Level Up!' : 
             'Continue'}
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

