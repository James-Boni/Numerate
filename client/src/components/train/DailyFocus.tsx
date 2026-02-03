import { motion } from 'framer-motion';
import { Target, TrendingUp, Clock, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SessionStats, QuestionResult } from '@/lib/store';
import { xpRequiredToAdvance } from '@/lib/logic/xp-system';

interface DailyFocusProps {
  sessions: SessionStats[];
  currentLevel: number;
  xpIntoLevel: number;
}

interface FocusInsight {
  type: 'strength' | 'focus' | 'goal';
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

interface WeakArea {
  operation: 'add' | 'sub' | 'mul' | 'div';
  accuracy: number;
  label: string;
}

function findWeakAreas(sessions: SessionStats[]): WeakArea[] {
  const recentSessions = sessions
    .filter(s => s.sessionType === 'daily' && s.valid !== false)
    .slice(-10);
  
  const opStats: Record<string, { correct: number; total: number }> = {
    add: { correct: 0, total: 0 },
    sub: { correct: 0, total: 0 },
    mul: { correct: 0, total: 0 },
    div: { correct: 0, total: 0 },
  };
  
  const opLabels: Record<string, string> = {
    add: 'Addition',
    sub: 'Subtraction',
    mul: 'Multiplication',
    div: 'Division',
  };
  
  recentSessions.forEach(session => {
    if (session.questionResults && session.questionResults.length > 0) {
      session.questionResults.forEach(qr => {
        const op = qr.operation;
        if (opStats[op]) {
          opStats[op].total++;
          if (qr.isCorrect) opStats[op].correct++;
        }
      });
    }
  });
  
  const weakAreas: WeakArea[] = [];
  
  Object.entries(opStats).forEach(([op, stats]) => {
    if (stats.total >= 5) {
      const accuracy = stats.correct / stats.total;
      if (accuracy < 0.85) {
        weakAreas.push({
          operation: op as 'add' | 'sub' | 'mul' | 'div',
          accuracy,
          label: opLabels[op],
        });
      }
    }
  });
  
  return weakAreas.sort((a, b) => a.accuracy - b.accuracy);
}

function estimateSessionsToLevel(xpIntoLevel: number, currentLevel: number, sessions: SessionStats[]): number {
  const xpNeeded = xpRequiredToAdvance(currentLevel);
  const remaining = xpNeeded - xpIntoLevel;
  
  if (remaining <= 0) return 0;
  
  const recentDailySessions = sessions
    .filter(s => s.sessionType === 'daily' && s.valid !== false)
    .slice(-5);
  
  if (recentDailySessions.length === 0) {
    return Math.ceil(remaining / 300);
  }
  
  const avgXP = recentDailySessions.reduce((sum, s) => sum + s.xpEarned, 0) / recentDailySessions.length;
  return Math.ceil(remaining / Math.max(avgXP, 100));
}

function generateInsights(sessions: SessionStats[], level: number, xpIntoLevel: number): FocusInsight[] {
  const insights: FocusInsight[] = [];
  const weakAreas = findWeakAreas(sessions);
  const sessionsToLevel = estimateSessionsToLevel(xpIntoLevel, level, sessions);
  
  const recentSessions = sessions
    .filter(s => s.sessionType === 'daily' && s.valid !== false)
    .slice(-5);
  
  if (recentSessions.length > 0) {
    const avgAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length;
    const avgSpeed = recentSessions.reduce((sum, s) => sum + s.avgResponseTimeMs, 0) / recentSessions.length;
    
    if (avgAccuracy >= 0.95) {
      insights.push({
        type: 'strength',
        icon: CheckCircle2,
        title: 'Accuracy on point',
        description: `${Math.round(avgAccuracy * 100)}% accuracy in recent sessions`,
        color: 'emerald',
      });
    }
    
    if (avgSpeed <= 2500) {
      insights.push({
        type: 'strength',
        icon: Zap,
        title: 'Quick reflexes',
        description: `${(avgSpeed / 1000).toFixed(1)}s average response`,
        color: 'amber',
      });
    }
  }
  
  if (weakAreas.length > 0) {
    const weakest = weakAreas[0];
    insights.push({
      type: 'focus',
      icon: Target,
      title: `Focus on ${weakest.label}`,
      description: `Currently at ${Math.round(weakest.accuracy * 100)}% - let's improve this`,
      color: 'orange',
    });
  }
  
  if (sessionsToLevel <= 3 && sessionsToLevel > 0) {
    insights.push({
      type: 'goal',
      icon: TrendingUp,
      title: 'Level up soon!',
      description: `About ${sessionsToLevel} session${sessionsToLevel === 1 ? '' : 's'} to reach level ${level + 1}`,
      color: 'violet',
    });
  }
  
  return insights.slice(0, 2);
}

export function DailyFocus({ sessions, currentLevel, xpIntoLevel }: DailyFocusProps) {
  const insights = generateInsights(sessions, currentLevel, xpIntoLevel);
  const sessionsToLevel = estimateSessionsToLevel(xpIntoLevel, currentLevel, sessions);
  
  if (insights.length === 0 && sessions.filter(s => s.sessionType === 'daily').length < 3) {
    return null;
  }
  
  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            const colors = colorClasses[insight.color] || colorClasses.blue;
            
            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${colors.bg}`}
              >
                <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${colors.text}`}>{insight.title}</div>
                  <div className="text-xs text-slate-500 truncate">{insight.description}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {sessionsToLevel > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 text-xs text-slate-400"
        >
          <Clock className="w-3 h-3" />
          <span>~{sessionsToLevel} session{sessionsToLevel === 1 ? '' : 's'} to level {currentLevel + 1}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
