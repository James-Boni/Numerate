import React, { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ChevronUp, Star } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { xpRequiredToAdvance } from '@/lib/logic/xp-system';
import { Confetti } from '@/components/game/Confetti';

const MILESTONE_DATA: Record<number, { title: string; subtitle: string; tier: number }> = {
  10: { title: "Double Digits!", subtitle: "You've built a real foundation. This is where it starts to click.", tier: 1 },
  25: { title: "Quarter Century!", subtitle: "Most people never get this far. Your dedication is paying off.", tier: 2 },
  50: { title: "Half Century!", subtitle: "You're in the top tier. Your number skills are genuinely impressive now.", tier: 3 },
  75: { title: "Diamond Level!", subtitle: "Extraordinary commitment. You should feel proud of how far you've come.", tier: 4 },
  100: { title: "Century!", subtitle: "One hundred levels. You've mastered what most adults avoid. Incredible.", tier: 5 },
};

export function getMilestoneForRange(levelBefore: number, levelAfter: number) {
  const milestones = [10, 25, 50, 75, 100];
  for (let i = milestones.length - 1; i >= 0; i--) {
    const m = milestones[i];
    if (levelBefore < m && levelAfter >= m) {
      return MILESTONE_DATA[m];
    }
  }
  return null;
}

export function LevelUpCelebration({ 
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
              HapticsManager.levelUp();
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
              if (isMilestoneLevel) {
                HapticsManager.milestoneFanfare(milestoneTier);
              } else {
                HapticsManager.levelUp();
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
