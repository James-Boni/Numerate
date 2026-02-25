import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Zap, Target, Clock, Award, Sparkles } from 'lucide-react';
import { SessionStats } from '@/lib/store';

interface WeeklyInsightsProps {
  sessions: SessionStats[];
  currentLevel: number;
  startingLevel: number;
}

interface WeeklyStats {
  totalSessions: number;
  totalQuestions: number;
  avgAccuracy: number;
  medianSpeedMs: number;
  bestStreak: number;
  totalXP: number;
  levelsGained: number;
  accuracyTrend: 'up' | 'down' | 'stable';
  speedTrend: 'up' | 'down' | 'stable';
  accuracyChange: number;
  speedChange: number;
}

function collectResponseTimes(sessions: SessionStats[]): number[] {
  const allTimes: number[] = [];
  sessions.forEach(s => {
    if (s.responseTimes && s.responseTimes.length > 0) {
      allTimes.push(...s.responseTimes);
    } else if (s.avgResponseTimeMs) {
      for (let i = 0; i < s.totalQuestions; i++) {
        allTimes.push(s.avgResponseTimeMs);
      }
    }
  });
  return allTimes;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function analyzeWeeklyData(sessions: SessionStats[]): WeeklyStats | null {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const thisWeek = sessions.filter(s => 
    s.sessionType === 'daily' && 
    s.valid !== false &&
    new Date(s.date) >= weekAgo
  );
  
  const lastWeek = sessions.filter(s => 
    s.sessionType === 'daily' && 
    s.valid !== false &&
    new Date(s.date) >= twoWeeksAgo && 
    new Date(s.date) < weekAgo
  );
  
  if (thisWeek.length === 0) return null;
  
  const totalQuestions = thisWeek.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalCorrect = thisWeek.reduce((sum, s) => sum + s.correctQuestions, 0);
  const avgAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  
  const thisWeekTimes = collectResponseTimes(thisWeek);
  const medianSpeedMs = computeMedian(thisWeekTimes);
  
  const bestStreak = Math.max(...thisWeek.map(s => s.bestStreak), 0);
  const totalXP = thisWeek.reduce((sum, s) => sum + s.xpEarned, 0);
  
  const levelsBefore = thisWeek[0]?.levelBefore ?? 1;
  const levelsAfter = thisWeek[thisWeek.length - 1]?.levelAfter ?? levelsBefore;
  const levelsGained = levelsAfter - levelsBefore;
  
  let accuracyTrend: 'up' | 'down' | 'stable' = 'stable';
  let speedTrend: 'up' | 'down' | 'stable' = 'stable';
  let accuracyChange = 0;
  let speedChange = 0;
  
  if (lastWeek.length > 0) {
    const lastTotalQ = lastWeek.reduce((sum, s) => sum + s.totalQuestions, 0);
    const lastTotalC = lastWeek.reduce((sum, s) => sum + s.correctQuestions, 0);
    const lastAccuracy = lastTotalQ > 0 ? lastTotalC / lastTotalQ : 0;
    const lastWeekTimes = collectResponseTimes(lastWeek);
    const lastMedianSpeed = computeMedian(lastWeekTimes);
    
    accuracyChange = (avgAccuracy - lastAccuracy) * 100;
    speedChange = lastMedianSpeed > 0 ? ((lastMedianSpeed - medianSpeedMs) / lastMedianSpeed) * 100 : 0;
    
    if (accuracyChange > 2) accuracyTrend = 'up';
    else if (accuracyChange < -2) accuracyTrend = 'down';
    
    if (speedChange > 5) speedTrend = 'up';
    else if (speedChange < -5) speedTrend = 'down';
  }
  
  return {
    totalSessions: thisWeek.length,
    totalQuestions,
    avgAccuracy,
    medianSpeedMs,
    bestStreak,
    totalXP,
    levelsGained,
    accuracyTrend,
    speedTrend,
    accuracyChange,
    speedChange
  };
}

function generateWeeklySummary(stats: WeeklyStats): string {
  const highlights: string[] = [];
  
  if (stats.levelsGained > 0) {
    highlights.push(`leveled up ${stats.levelsGained} time${stats.levelsGained > 1 ? 's' : ''}`);
  }
  
  if (stats.accuracyTrend === 'up') {
    highlights.push(`improved accuracy by ${Math.abs(stats.accuracyChange).toFixed(0)}%`);
  } else if (stats.speedTrend === 'up') {
    highlights.push(`got ${Math.abs(stats.speedChange).toFixed(0)}% faster`);
  }
  
  if (stats.bestStreak >= 10) {
    highlights.push(`hit a ${stats.bestStreak} answer streak`);
  }
  
  if (highlights.length === 0) {
    if (stats.totalSessions >= 5) {
      return "Great consistency this week! Regular practice builds lasting skills.";
    }
    return "You practiced this week - every session builds your skills.";
  }
  
  return `This week you ${highlights.join(' and ')}. Keep it up!`;
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-amber-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

export function WeeklyInsights({ sessions, currentLevel, startingLevel }: WeeklyInsightsProps) {
  const stats = analyzeWeeklyData(sessions);
  
  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-slate-800">Weekly Insights</h3>
        </div>
        <p className="text-sm text-slate-600">
          Complete a few daily sessions this week to see your insights here.
        </p>
      </motion.div>
    );
  }
  
  const summary = generateWeeklySummary(stats);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-slate-800">Weekly Insights</h3>
      </div>
      
      <p className="text-sm text-slate-700 leading-relaxed">
        {summary}
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center justify-between">
            <Target className="w-4 h-4 text-primary" />
            <TrendIcon trend={stats.accuracyTrend} />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(stats.avgAccuracy * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">Avg Accuracy</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center justify-between">
            <Clock className="w-4 h-4 text-primary" />
            <TrendIcon trend={stats.speedTrend} />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(stats.medianSpeedMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-slate-500">Median Speed</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.bestStreak}
          </div>
          <div className="text-xs text-slate-500">Best Streak</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalXP.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">XP Earned</div>
        </motion.div>
      </div>
      
      <div className="pt-2 border-t border-primary/10">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''} this week</span>
          <span>{stats.totalQuestions} questions answered</span>
        </div>
      </div>
    </motion.div>
  );
}
