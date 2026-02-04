import { motion } from 'framer-motion';
import { Plus, Minus, X, Divide, Star } from 'lucide-react';
import { SessionStats, QuestionResult } from '@/lib/store';

interface SkillBreakdownProps {
  sessions: SessionStats[];
  currentLevel: number;
}

interface OperationStats {
  operation: 'add' | 'sub' | 'mul' | 'div';
  label: string;
  icon: React.ElementType;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgSpeedMs: number;
  starRating: number;
  unlocked: boolean;
}

function calculateStarRating(accuracy: number, attempts: number): number {
  // Need at least 3 attempts for meaningful rating
  if (attempts < 3) return 0;
  
  // Pure accuracy-based star rating
  // 100% = 5 stars, 90% = 4.5 stars, 80% = 4 stars, etc.
  // Formula: accuracy * 5, rounded to nearest 0.5
  const rawStars = accuracy * 5;
  return Math.round(rawStars * 2) / 2;
}

function analyzeOperationStats(sessions: SessionStats[], level: number): OperationStats[] {
  const opData: Record<string, { correct: number; total: number; times: number[] }> = {
    add: { correct: 0, total: 0, times: [] },
    sub: { correct: 0, total: 0, times: [] },
    mul: { correct: 0, total: 0, times: [] },
    div: { correct: 0, total: 0, times: [] },
  };
  
  const dailySessions = sessions.filter(s => s.sessionType === 'daily' && s.valid !== false);
  
  dailySessions.forEach(session => {
    if (session.questionResults && session.questionResults.length > 0) {
      session.questionResults.forEach(qr => {
        const op = qr.operation;
        if (opData[op]) {
          opData[op].total++;
          if (qr.isCorrect) opData[op].correct++;
          opData[op].times.push(qr.responseTimeMs);
        }
      });
    }
  });
  
  const operations: { op: 'add' | 'sub' | 'mul' | 'div'; label: string; icon: React.ElementType }[] = [
    { op: 'add', label: 'Addition', icon: Plus },
    { op: 'sub', label: 'Subtraction', icon: Minus },
    { op: 'mul', label: 'Multiplication', icon: X },
    { op: 'div', label: 'Division', icon: Divide },
  ];
  
  return operations.map(({ op, label, icon }) => {
    const data = opData[op];
    const accuracy = data.total > 0 ? data.correct / data.total : 0;
    const avgSpeedMs = data.times.length > 0 
      ? data.times.reduce((a, b) => a + b, 0) / data.times.length 
      : 0;
    const starRating = calculateStarRating(accuracy, data.total);
    
    return {
      operation: op,
      label,
      icon,
      totalAttempts: data.total,
      correctAttempts: data.correct,
      accuracy,
      avgSpeedMs,
      starRating,
      unlocked: true, // Always unlocked - show all operations
    };
  });
}

function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = max - fullStars - (hasHalf ? 1 : 0);
  
  return (
    <div className="flex gap-0.5">
      {Array(fullStars).fill(0).map((_, i) => (
        <Star key={`full-${i}`} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
      {hasHalf && (
        <div className="relative w-4 h-4">
          <Star className="absolute w-4 h-4 text-slate-200" />
          <div className="absolute overflow-hidden w-2 h-4">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
        </div>
      )}
      {Array(Math.max(0, emptyStars)).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 text-slate-200" />
      ))}
    </div>
  );
}

export function SkillBreakdown({ sessions, currentLevel }: SkillBreakdownProps) {
  const stats = analyzeOperationStats(sessions, currentLevel);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
    >
      <h3 className="font-semibold text-slate-800">Skill Breakdown</h3>
      
      <div className="space-y-3">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          
          return (
            <motion.div
              key={stat.operation}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-800">{stat.label}</span>
                  {stat.totalAttempts >= 3 ? (
                    <StarDisplay rating={stat.starRating} />
                  ) : (
                    <span className="text-xs text-slate-400">Need {3 - stat.totalAttempts} more</span>
                  )}
                </div>
                {stat.totalAttempts > 0 ? (
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{Math.round(stat.accuracy * 100)}% accuracy</span>
                    <span>{(stat.avgSpeedMs / 1000).toFixed(1)}s avg</span>
                    <span>{stat.totalAttempts} attempts</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No data yet</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <p className="text-xs text-slate-400 text-center pt-2">
        Star ratings based on accuracy (100% = 5 stars)
      </p>
    </motion.div>
  );
}
