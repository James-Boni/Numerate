import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Confetti } from './Confetti';
import { SparkleEffect } from './SparkleEffect';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';
import { Hash, Zap } from 'lucide-react';

interface QuestionsMilestoneCelebrationProps {
  milestone: number;
  onContinue: () => void;
  soundOn?: boolean;
  hapticsOn?: boolean;
}

const MILESTONE_COPY: Record<number, { headline: string; subtitle: string }> = {
  1: { headline: "One thousand questions answered.", subtitle: "You're building real skill." },
  2: { headline: "Two thousand and counting.", subtitle: "Your effort is paying off." },
  3: { headline: "Three thousand questions deep.", subtitle: "This is becoming second nature." },
  4: { headline: "Four thousand questions.", subtitle: "You're sharper than you think." },
  5: { headline: "Five thousand questions.", subtitle: "That's dedication." },
};

function getMilestoneCopy(milestone: number) {
  if (MILESTONE_COPY[milestone]) return MILESTONE_COPY[milestone];
  if (milestone >= 10) {
    return {
      headline: `${(milestone * 1000).toLocaleString()} questions.`,
      subtitle: "You've put in the work — and it shows.",
    };
  }
  return {
    headline: `${(milestone * 1000).toLocaleString()} questions answered.`,
    subtitle: "Every question makes you stronger.",
  };
}

function isBigMilestone(milestone: number) {
  return milestone >= 5 && milestone % 5 === 0;
}

export function QuestionsMilestoneCelebration({
  milestone,
  onContinue,
  soundOn = true,
  hapticsOn = true,
}: QuestionsMilestoneCelebrationProps) {
  const [showButton, setShowButton] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const audioPlayed = useState(false);

  const big = isBigMilestone(milestone);
  const copy = getMilestoneCopy(milestone);
  const confettiCount = big ? 80 : 50;

  useEffect(() => {
    if (!audioPlayed[0]) {
      audioPlayed[0] = true;
      if (soundOn) {
        AudioManager.playMilestoneFanfare(big ? 3 : 1);
      }
      if (hapticsOn) {
        HapticsManager.milestoneFanfare(big ? 3 : 1);
      }
    }

    const t1 = setTimeout(() => setShowNumber(true), 200);
    const t2 = setTimeout(() => setShowXP(true), 900);
    const t3 = setTimeout(() => setShowButton(true), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <MobileLayout className={big
      ? "bg-gradient-to-b from-amber-50 via-yellow-50/80 to-white"
      : "bg-gradient-to-b from-primary/10 via-teal-50 to-white"
    }>
      <Confetti active={true} originX={50} originY={35} count={confettiCount} />

      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 relative">
        {big && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.15),transparent_60%)]" />
          </motion.div>
        )}

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center ${
            big ? 'bg-amber-100' : 'bg-primary/15'
          }`}
        >
          <Hash size={40} className={big ? 'text-amber-600' : 'text-primary'} />
        </motion.div>

        <AnimatePresence>
          {showNumber && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 12 }}
              className="text-center space-y-2 relative"
            >
              <SparkleEffect active={true} color={big ? '#F59E0B' : '#14B8A6'} />

              <div className={`text-7xl font-black tabular-nums ${
                big
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                  : 'text-primary'
              }`}
                data-testid="text-milestone-number"
              >
                {(milestone * 1000).toLocaleString()}
              </div>
              <div className={`text-lg font-bold uppercase tracking-widest ${
                big ? 'text-amber-600' : 'text-primary/70'
              }`}>
                Questions
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNumber && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-1 max-w-xs"
            >
              <p className="text-xl font-bold text-slate-800" data-testid="text-milestone-headline">
                {copy.headline}
              </p>
              <p className="text-slate-500 text-sm">
                {copy.subtitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showXP && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 ${
                big
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 shadow-lg shadow-amber-200/50'
                  : 'bg-gradient-to-r from-primary to-teal-400 shadow-lg shadow-primary/20'
              }`}
              data-testid="badge-milestone-xp"
            >
              <Zap size={20} className="text-white fill-white" />
              <span className="text-white font-black text-2xl">+500 XP</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs"
            >
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/10"
                onClick={onContinue}
                data-testid="button-milestone-continue"
              >
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
}
