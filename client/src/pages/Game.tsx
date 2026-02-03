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
import { ReassuranceScreen } from '@/components/game/ReassuranceScreen';
import { PaywallScreen } from '@/components/game/PaywallScreen';
import { DailyChallengeIntro } from '@/components/game/DailyChallengeIntro';
import { StrategyLesson } from '@/components/game/StrategyLesson';
import { PersonalRecordCelebration } from '@/components/game/PersonalRecordCelebration';
import { useAccountStore, isPremiumActive } from '@/lib/services/account-store';
import { detectWeakness, WeaknessPattern } from '@/lib/logic/weakness-detector';
import { DailyStreakCelebration, isMilestone } from '@/components/game/DailyStreakCelebration';

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
              if (soundOn) AudioManager.playLevelUpEnhanced(levelUpCount);
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

  return (
    <MobileLayout className="bg-gradient-to-b from-primary/5 to-white overflow-hidden">
      <Confetti active={showConfetti} originX={50} originY={40} count={levelUpCount > 1 ? 80 : 50} />
      
      {/* Screen flash on level up */}
      <AnimatePresence>
        {showGlow && (
          <motion.div
            className="absolute inset-0 bg-primary/10 pointer-events-none z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      
      {/* Radial particles */}
      <AnimatePresence>
        {showParticles && (
          <>
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary"
                style={{ left: '50%', top: '40%' }}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: 0, 
                  scale: 1.5,
                  x: Math.cos((i / 16) * Math.PI * 2) * 150,
                  y: Math.sin((i / 16) * Math.PI * 2) * 150
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
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
            <ChevronUp size={48} className="text-primary mx-auto" />
          </motion.div>
          <motion.h1 
            className="text-3xl font-bold text-slate-900"
            animate={animationPhase === 'complete' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            Level Up!
          </motion.h1>
        </motion.div>

        <motion.div 
          className="w-full max-w-xs bg-white rounded-3xl p-8 shadow-lg shadow-primary/10 text-center relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Shimmer effect on complete */}
          {animationPhase === 'complete' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1, repeat: 2, repeatDelay: 0.5 }}
            />
          )}
          
          <motion.div 
            className="text-8xl font-black text-primary mb-4 relative"
            key={displayLevel}
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ 
              scale: animationPhase === 'complete' ? [1, 1.15, 1] : 1, 
              opacity: 1, 
              rotate: 0 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 15,
              scale: { delay: 0.1, duration: 0.4 }
            }}
          >
            {displayLevel}
            
            {/* Glow behind number */}
            <motion.div
              className="absolute inset-0 blur-xl bg-primary/30 -z-10"
              animate={{ 
                opacity: animationPhase === 'complete' ? [0.3, 0.6, 0.3] : 0,
                scale: animationPhase === 'complete' ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
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
                  className="absolute inset-0 bg-primary/50"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </div>
            <motion.p 
              className="text-sm text-slate-500"
              animate={animationPhase === 'complete' ? { color: '#0d9488' } : {}}
            >
              {animationPhase === 'complete' ? `Level ${levelAfter} unlocked!` : 'Leveling up...'}
            </motion.p>
          </div>
        </motion.div>

        {levelUpCount > 1 && (
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
          transition={{ delay: 0.3 }}
        >
          <Button 
            size="lg" 
            className="w-full h-14 px-12 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/20"
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
  const [step, setStep] = useState<'daily_intro' | 'active' | 'results' | 'streak_milestone' | 'strategy' | 'levelup' | 'reassurance' | 'paywall' | 'blocked'>('daily_intro');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [detectedWeakness, setDetectedWeakness] = useState<WeaknessPattern | null>(null);
  const [newPersonalRecords, setNewPersonalRecords] = useState<string[]>([]);
  const [entitlementChecked, setEntitlementChecked] = useState(false);
  const [streakMilestoneReached, setStreakMilestoneReached] = useState<number | null>(null);
  const [_, setLocation] = useLocation();
  const { currentTier, saveSession, settings, hasUsedFreeDaily, markFreeTrialUsed, seenStrategies, markStrategySeen, checkAndUpdatePersonalBests, streakCount } = useStore();
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

  // Determine if this is first free session AFTER entitlement is checked
  const isPremium = isPremiumActive(entitlement);
  const isFirstFreeSession = !hasUsedFreeDaily && !isPremium;
  const shouldBlockAccess = hasUsedFreeDaily && !isPremium;

  // Block access if user has used free trial and is not premium
  useEffect(() => {
    if (entitlementChecked && shouldBlockAccess && (step === 'daily_intro' || step === 'active')) {
      setStep('blocked');
    }
  }, [entitlementChecked, shouldBlockAccess, step]);

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
        onStart={() => setStep('active')}
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
          } else if (isFirstFreeSession) {
            markFreeTrialUsed();
            setStep('reassurance');
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
            } else if (isFirstFreeSession) {
              markFreeTrialUsed();
              setStep('reassurance');
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
          if (isFirstFreeSession) {
            markFreeTrialUsed();
            setStep('reassurance');
          } else {
            setLocation('/train');
          }
        }}
        soundOn={settings.soundOn}
      />
    );
  }

  if (step === 'reassurance') {
    return (
      <ReassuranceScreen 
        onContinue={() => setStep('paywall')}
      />
    );
  }

  if (step === 'paywall' || step === 'blocked') {
    return (
      <PaywallScreen 
        onSubscribed={() => {
          if (step === 'blocked') {
            setStep('active');
          } else {
            setLocation('/train');
          }
        }}
        onRestore={() => {
          if (step === 'blocked') {
            setStep('active');
          } else {
            setLocation('/train');
          }
        }}
        onDismiss={step === 'blocked' ? undefined : () => setLocation('/train')}
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
              } else if (isFirstFreeSession) {
                markFreeTrialUsed();
                setStep('reassurance');
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

