import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Flame, TrendingUp, Calendar, Play } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';

interface DailyChallengeIntroProps {
  onStart: () => void;
  streakCount?: number;
}

export function DailyChallengeIntro({ onStart, streakCount = 0 }: DailyChallengeIntroProps) {
  return (
    <MobileLayout className="bg-gradient-to-b from-primary/5 to-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-primary/20"
        >
          <Calendar className="w-12 h-12 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-slate-800 text-center mb-3"
        >
          Daily Challenge
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-600 text-center text-lg mb-10 max-w-xs"
        >
          3 minutes of focused practice, every day
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-4 mb-10"
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Build Your Streak</h3>
              <p className="text-sm text-slate-500">Complete the daily challenge every day to grow your streak and stay consistent</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Grow Through Time</h3>
              <p className="text-sm text-slate-500">Your skills will steadily improve as you practice a little each day</p>
            </div>
          </div>
        </motion.div>

        {streakCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mb-6 text-orange-500"
          >
            <Flame className="w-5 h-5" />
            <span className="font-semibold">{streakCount} day streak</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm"
        >
          <Button
            onClick={onStart}
            className="w-full h-14 bg-primary text-white hover:opacity-90 font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/20 text-lg"
            data-testid="button-start-daily-challenge"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            Start Daily Challenge
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-slate-400 text-sm mt-6 text-center"
        >
          Just 3 minutes to improve your mental math
        </motion.p>
      </div>
    </MobileLayout>
  );
}
