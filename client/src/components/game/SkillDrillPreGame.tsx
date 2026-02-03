import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Flame, Target, Play, ChevronLeft, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';

interface SkillDrillPreGameProps {
  gameType: 'rounding' | 'doubling' | 'halving';
  title: string;
  description: string;
  icon: React.ReactNode;
  onStart: (durationSeconds: number) => void;
  onBack: () => void;
}

const DURATION_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
];

export function SkillDrillPreGame({ 
  gameType, 
  title, 
  description, 
  icon, 
  onStart, 
  onBack 
}: SkillDrillPreGameProps) {
  const { skillDrillBests, sessions } = useStore();
  const stats = skillDrillBests[gameType];
  const [selectedDuration, setSelectedDuration] = useState(60);
  
  const avgScore = stats.gamesPlayed > 0 
    ? Math.round(stats.totalCorrect / stats.gamesPlayed) 
    : 0;

  const sessionTypeMap = {
    rounding: 'rounding_practice',
    doubling: 'doubling_practice',
    halving: 'halving_practice'
  };
  
  const recentSessions = sessions
    .filter(s => s.sessionType === sessionTypeMap[gameType])
    .slice(-5)
    .reverse();

  return (
    <div className="flex flex-col h-full px-6 py-8 overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-500 mb-6 -ml-1"
        data-testid="button-back"
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex-1 flex flex-col items-center justify-start pt-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3"
        >
          {icon}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-xl font-bold text-slate-900 mb-1"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-slate-500 text-center text-sm max-w-xs mb-5"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-full max-w-sm mb-4"
        >
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
            Session Length
          </h3>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                onClick={() => setSelectedDuration(option.seconds)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedDuration === option.seconds
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                data-testid={`button-duration-${option.seconds}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Clock size={14} />
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {stats.gamesPlayed > 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="w-full max-w-sm space-y-3 mb-4"
          >
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Your Personal Bests
            </h3>
            
            <Card className="p-3 border-none shadow-sm bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Trophy className="text-amber-500" size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Best Score</p>
                    <p className="text-base font-bold text-slate-900" data-testid="text-best-score">
                      {stats.bestScore}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Flame className="text-orange-500" size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Best Streak</p>
                    <p className="text-base font-bold text-slate-900" data-testid="text-best-streak">
                      {stats.bestStreak}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-3 border-none shadow-sm bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="text-primary" size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Games Played</p>
                    <p className="text-base font-bold text-slate-900" data-testid="text-games-played">
                      {stats.gamesPlayed}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-xs">AVG</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Avg Score</p>
                    <p className="text-base font-bold text-slate-900" data-testid="text-avg-score">
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
            transition={{ delay: 0.25, duration: 0.3 }}
            className="w-full max-w-sm mb-4"
          >
            <Card className="p-4 border-none shadow-sm bg-white text-center">
              <Trophy className="text-slate-300 mx-auto mb-2" size={28} />
              <p className="text-slate-500 text-sm">
                Play your first game to set your personal bests!
              </p>
            </Card>
          </motion.div>
        )}

        {recentSessions.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="w-full max-w-sm mb-4"
          >
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
              Recent Sessions
            </h3>
            <Card className="p-3 border-none shadow-sm bg-white">
              <div className="space-y-2">
                {recentSessions.map((session, i) => (
                  <div key={session.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 text-xs">
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600">
                        {session.correctQuestions} correct
                      </span>
                      <span className={`font-semibold ${
                        session.accuracy >= 0.9 ? 'text-emerald-600' : 
                        session.accuracy >= 0.7 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {Math.round(session.accuracy * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="w-full max-w-sm mt-auto pt-4"
        >
          <Button
            onClick={() => onStart(selectedDuration)}
            size="lg"
            className="w-full h-12 text-base font-bold gap-2"
            data-testid="button-start-game"
          >
            <Play size={18} />
            Play
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
