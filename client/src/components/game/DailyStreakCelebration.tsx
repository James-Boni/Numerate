import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Star, Crown, Sparkles } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Confetti } from './Confetti';
import { AudioManager } from '@/lib/audio';

interface DailyStreakCelebrationProps {
  streakCount: number;
  onContinue: () => void;
  soundOn?: boolean;
}

const MILESTONE_CONFIG: Record<number, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  confettiCount: number;
}> = {
  3: {
    title: "3-Day Streak!",
    subtitle: "You're building a habit. Keep it up!",
    icon: <Flame className="w-12 h-12" />,
    color: "text-orange-500",
    bgGradient: "from-orange-50 to-white",
    confettiCount: 30,
  },
  7: {
    title: "Week Warrior!",
    subtitle: "A full week of daily practice. Amazing dedication!",
    icon: <Trophy className="w-12 h-12" />,
    color: "text-amber-500",
    bgGradient: "from-amber-50 to-white",
    confettiCount: 50,
  },
  14: {
    title: "Two Week Champion!",
    subtitle: "14 days strong. You're truly committed!",
    icon: <Star className="w-12 h-12" />,
    color: "text-primary",
    bgGradient: "from-primary/10 to-white",
    confettiCount: 60,
  },
  30: {
    title: "Monthly Master!",
    subtitle: "A full month of daily practice. You're unstoppable!",
    icon: <Crown className="w-12 h-12" />,
    color: "text-amber-600",
    bgGradient: "from-amber-100 to-amber-50",
    confettiCount: 80,
  },
  60: {
    title: "Two Month Legend!",
    subtitle: "60 days of dedication. Truly exceptional!",
    icon: <Sparkles className="w-12 h-12" />,
    color: "text-purple-600",
    bgGradient: "from-purple-100 to-purple-50",
    confettiCount: 100,
  },
  100: {
    title: "Century Club!",
    subtitle: "100 days! You've achieved something incredible.",
    icon: <Crown className="w-12 h-12" />,
    color: "text-amber-500",
    bgGradient: "from-amber-200 to-amber-100",
    confettiCount: 120,
  },
};

export function isMilestone(streak: number): boolean {
  return streak in MILESTONE_CONFIG;
}

export function DailyStreakCelebration({ 
  streakCount, 
  onContinue, 
  soundOn = true 
}: DailyStreakCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'complete'>('intro');
  
  const config = MILESTONE_CONFIG[streakCount] || MILESTONE_CONFIG[3];
  
  useEffect(() => {
    if (soundOn) {
      AudioManager.playDailyStreakMilestone(streakCount);
    }
    
    setTimeout(() => setPhase('reveal'), 300);
    setTimeout(() => {
      setShowConfetti(true);
      setPhase('complete');
    }, 800);
  }, [streakCount, soundOn]);
  
  return (
    <MobileLayout className={`bg-gradient-to-b ${config.bgGradient} overflow-hidden`}>
      <Confetti active={showConfetti} originX={50} originY={30} count={config.confettiCount} />
      
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className={`relative mb-8`}
        >
          <motion.div
            className={`w-28 h-28 rounded-3xl flex items-center justify-center ${config.color}`}
            style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
            }}
            animate={phase === 'complete' ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            {config.icon}
          </motion.div>
          
          <motion.div
            className="absolute -inset-4 rounded-3xl opacity-30 blur-xl"
            style={{ backgroundColor: config.color.includes('orange') ? '#f97316' : config.color.includes('amber') ? '#f59e0b' : '#0d9488' }}
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-4 mb-8"
        >
          <motion.div
            className={`text-6xl font-black ${config.color}`}
            animate={phase === 'complete' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {streakCount}
          </motion.div>
          
          <motion.h1
            className="text-3xl font-bold text-slate-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {config.title}
          </motion.h1>
          
          <motion.p
            className="text-slate-600 text-lg max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {config.subtitle}
          </motion.p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase === 'complete' ? 1 : 0, y: phase === 'complete' ? 0 : 20 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
