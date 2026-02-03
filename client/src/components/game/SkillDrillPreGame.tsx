import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Flame, Target, Play, ChevronLeft } from 'lucide-react';
import { useStore } from '@/lib/store';

interface SkillDrillPreGameProps {
  gameType: 'rounding' | 'doubling' | 'halving';
  title: string;
  description: string;
  icon: React.ReactNode;
  onStart: () => void;
  onBack: () => void;
}

export function SkillDrillPreGame({ 
  gameType, 
  title, 
  description, 
  icon, 
  onStart, 
  onBack 
}: SkillDrillPreGameProps) {
  const { skillDrillBests } = useStore();
  const stats = skillDrillBests[gameType];
  
  const avgScore = stats.gamesPlayed > 0 
    ? Math.round(stats.totalCorrect / stats.gamesPlayed) 
    : 0;

  return (
    <div className="flex flex-col h-full px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-500 mb-6 -ml-1"
        data-testid="button-back"
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
        >
          {icon}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-2xl font-bold text-slate-900 mb-2"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-slate-500 text-center max-w-xs mb-8"
        >
          {description}
        </motion.p>

        {stats.gamesPlayed > 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full max-w-sm space-y-3 mb-8"
          >
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Your Personal Bests
            </h3>
            
            <Card className="p-4 border-none shadow-sm bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Trophy className="text-amber-500" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Best Score</p>
                    <p className="text-lg font-bold text-slate-900" data-testid="text-best-score">
                      {stats.bestScore}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Flame className="text-orange-500" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Best Streak</p>
                    <p className="text-lg font-bold text-slate-900" data-testid="text-best-streak">
                      {stats.bestStreak}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-none shadow-sm bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="text-primary" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Games Played</p>
                    <p className="text-lg font-bold text-slate-900" data-testid="text-games-played">
                      {stats.gamesPlayed}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-sm">AVG</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Avg Score</p>
                    <p className="text-lg font-bold text-slate-900" data-testid="text-avg-score">
                      {avgScore}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full max-w-sm mb-8"
          >
            <Card className="p-6 border-none shadow-sm bg-white text-center">
              <Trophy className="text-slate-300 mx-auto mb-2" size={32} />
              <p className="text-slate-500 text-sm">
                Play your first game to set your personal bests!
              </p>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <Button
            onClick={onStart}
            size="lg"
            className="w-full h-14 text-lg font-bold gap-2"
            data-testid="button-start-game"
          >
            <Play size={20} />
            Play
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
