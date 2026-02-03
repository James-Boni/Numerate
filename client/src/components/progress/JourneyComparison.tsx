import { motion } from 'framer-motion';
import { TrendingUp, Zap, Target, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { SessionStats } from '@/lib/store';

interface JourneyComparisonProps {
  sessions: SessionStats[];
  startingLevel: number;
  currentLevel: number;
}

interface JourneyStats {
  firstSession: {
    date: string;
    accuracy: number;
    avgSpeedMs: number;
    level: number;
  };
  recentAvg: {
    accuracy: number;
    avgSpeedMs: number;
    level: number;
  };
  improvements: {
    accuracy: number;
    speed: number;
    levels: number;
  };
  daysActive: number;
}

function analyzeJourney(sessions: SessionStats[], startingLevel: number, currentLevel: number): JourneyStats | null {
  const dailySessions = sessions
    .filter(s => s.sessionType === 'daily' && s.valid !== false)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (dailySessions.length < 2) return null;
  
  const firstSession = dailySessions[0];
  
  const recentSessions = dailySessions.slice(-5);
  const recentAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length;
  const recentSpeed = recentSessions.reduce((sum, s) => sum + s.avgResponseTimeMs, 0) / recentSessions.length;
  
  const firstDate = new Date(firstSession.date);
  const today = new Date();
  const daysActive = Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const accuracyImprovement = ((recentAccuracy - firstSession.accuracy) / Math.max(firstSession.accuracy, 0.01)) * 100;
  const speedImprovement = ((firstSession.avgResponseTimeMs - recentSpeed) / firstSession.avgResponseTimeMs) * 100;
  const levelsGained = currentLevel - startingLevel;
  
  return {
    firstSession: {
      date: firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      accuracy: firstSession.accuracy,
      avgSpeedMs: firstSession.avgResponseTimeMs,
      level: firstSession.levelBefore ?? startingLevel,
    },
    recentAvg: {
      accuracy: recentAccuracy,
      avgSpeedMs: recentSpeed,
      level: currentLevel,
    },
    improvements: {
      accuracy: accuracyImprovement,
      speed: speedImprovement,
      levels: levelsGained,
    },
    daysActive,
  };
}

function ImprovementBadge({ value, label, isSpeed = false }: { value: number; label: string; isSpeed?: boolean }) {
  const isPositive = value > 0;
  const displayValue = Math.abs(value);
  
  if (displayValue < 1) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isPositive 
          ? 'bg-emerald-50 text-emerald-600' 
          : 'bg-amber-50 text-amber-600'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <span className="w-3 h-3 text-center">−</span>
      )}
      <span>{displayValue.toFixed(0)}% {isSpeed ? 'faster' : label}</span>
    </motion.div>
  );
}

export function JourneyComparison({ sessions, startingLevel, currentLevel }: JourneyComparisonProps) {
  const stats = analyzeJourney(sessions, startingLevel, currentLevel);
  
  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Your Journey</h3>
        </div>
        <p className="text-sm text-slate-600">
          Complete a few more sessions to see how far you've come!
        </p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Your Journey</h3>
        </div>
        <span className="text-xs text-slate-500">{stats.daysActive} days</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 rounded-xl p-4 space-y-3"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Day 1
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-slate-700">Level {stats.firstSession.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-slate-700">{Math.round(stats.firstSession.accuracy * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-slate-700">{(stats.firstSession.avgSpeedMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">{stats.firstSession.date}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 rounded-xl p-4 space-y-3 border-2 border-violet-200"
        >
          <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">
            Today
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-800">Level {stats.recentAvg.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-800">{Math.round(stats.recentAvg.accuracy * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-800">{(stats.recentAvg.avgSpeedMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
          <div className="text-xs text-violet-500 font-medium">Recent avg</div>
        </motion.div>
      </div>
      
      {(stats.improvements.levels > 0 || stats.improvements.accuracy > 2 || stats.improvements.speed > 5) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 pt-2"
        >
          {stats.improvements.levels > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.improvements.levels} levels</span>
            </div>
          )}
          <ImprovementBadge value={stats.improvements.accuracy} label="more accurate" />
          <ImprovementBadge value={stats.improvements.speed} label="faster" isSpeed />
        </motion.div>
      )}
      
      <p className="text-xs text-slate-500 text-center pt-1">
        Every session makes you stronger
      </p>
    </motion.div>
  );
}
