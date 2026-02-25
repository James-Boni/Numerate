import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Target, Flame, ChevronUp, Minus } from 'lucide-react';
import { SessionStats } from '@/lib/store';
import { xpRequiredToAdvance } from '@/lib/logic/xp-system';

interface DailyRecapProps {
  sessions: SessionStats[];
  streakCount: number;
  currentLevel: number;
  xpIntoLevel: number;
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sessionLocalDate(s: SessionStats): string {
  return localDateStr(new Date(s.date));
}

function isDailyValid(s: SessionStats): boolean {
  return s.sessionType === 'daily' && s.valid !== false;
}

function getYesterdaySessions(sessions: SessionStats[]): SessionStats[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = localDateStr(yesterday);
  return sessions.filter(s => isDailyValid(s) && sessionLocalDate(s) === yStr);
}

function getTodaySessions(sessions: SessionStats[]): SessionStats[] {
  const tStr = localDateStr(new Date());
  return sessions.filter(s => isDailyValid(s) && sessionLocalDate(s) === tStr);
}

function computeTrend(sessions: SessionStats[]): { accuracyChange: number | null; speedChange: number | null } {
  const now = new Date();
  const thisWeekCutoff = new Date(now);
  thisWeekCutoff.setDate(thisWeekCutoff.getDate() - 7);
  const lastWeekCutoff = new Date(now);
  lastWeekCutoff.setDate(lastWeekCutoff.getDate() - 14);

  const dailySessions = sessions.filter(isDailyValid);

  const thisWeek = dailySessions.filter(s => new Date(s.date) >= thisWeekCutoff);
  const lastWeek = dailySessions.filter(s => {
    const d = new Date(s.date);
    return d >= lastWeekCutoff && d < thisWeekCutoff;
  });

  let accuracyChange: number | null = null;
  if (thisWeek.length >= 2 && lastWeek.length >= 2) {
    const thisAvg = thisWeek.reduce((sum, x) => sum + x.accuracy, 0) / thisWeek.length;
    const lastAvg = lastWeek.reduce((sum, x) => sum + x.accuracy, 0) / lastWeek.length;
    accuracyChange = Math.round((thisAvg - lastAvg) * 100);
  }

  let speedChange: number | null = null;
  const getMedian = (arr: SessionStats[]) => {
    const speeds = arr.map(s => s.medianMs ?? s.avgResponseTimeMs).sort((a, b) => a - b);
    if (speeds.length === 0) return null;
    const mid = Math.floor(speeds.length / 2);
    return speeds.length % 2 ? speeds[mid] : (speeds[mid - 1] + speeds[mid]) / 2;
  };

  if (thisWeek.length >= 2 && lastWeek.length >= 2) {
    const thisMedian = getMedian(thisWeek);
    const lastMedian = getMedian(lastWeek);
    if (thisMedian && lastMedian && lastMedian > 0) {
      speedChange = Math.round(((lastMedian - thisMedian) / lastMedian) * 100);
    }
  }

  return { accuracyChange, speedChange };
}

function findWeakestOperation(sessions: SessionStats[]): string | null {
  const recent = sessions.filter(isDailyValid).slice(-10);

  const opStats: Record<string, { correct: number; total: number }> = {};
  const opLabels: Record<string, string> = {
    add: 'addition',
    sub: 'subtraction',
    mul: 'multiplication',
    div: 'division',
  };

  recent.forEach(session => {
    session.questionResults?.forEach(qr => {
      if (!opStats[qr.operation]) opStats[qr.operation] = { correct: 0, total: 0 };
      opStats[qr.operation].total++;
      if (qr.isCorrect) opStats[qr.operation].correct++;
    });
  });

  let weakest: string | null = null;
  let lowestAcc = 1;

  Object.entries(opStats).forEach(([op, stats]) => {
    if (stats.total >= 5) {
      const acc = stats.correct / stats.total;
      if (acc < 0.85 && acc < lowestAcc) {
        lowestAcc = acc;
        weakest = opLabels[op] || op;
      }
    }
  });

  return weakest;
}

function estimateSessions(xpIntoLevel: number, currentLevel: number, sessions: SessionStats[]): number {
  const xpNeeded = xpRequiredToAdvance(currentLevel);
  const remaining = xpNeeded - xpIntoLevel;
  if (remaining <= 0) return 0;

  const recent = sessions.filter(isDailyValid).slice(-5);
  if (recent.length === 0) return Math.ceil(remaining / 300);
  const avgXP = recent.reduce((sum, s) => sum + s.xpEarned, 0) / recent.length;
  return Math.ceil(remaining / Math.max(avgXP, 100));
}

function getDaysActiveThisWeek(sessions: SessionStats[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const days = new Set<string>();
  sessions
    .filter(s => isDailyValid(s) && new Date(s.date) >= cutoff)
    .forEach(s => days.add(sessionLocalDate(s)));
  return days.size;
}

export function shouldShowDailyRecap(sessions: SessionStats[]): boolean {
  const totalDaily = sessions.filter(isDailyValid).length;
  if (totalDaily < 1) return false;
  const todayStr = localDateStr(new Date());
  const trainedToday = sessions.some(s => isDailyValid(s) && sessionLocalDate(s) === todayStr);
  return !trainedToday;
}

export function DailyRecap({ sessions, streakCount, currentLevel, xpIntoLevel }: DailyRecapProps) {
  if (!shouldShowDailyRecap(sessions)) return null;

  const yesterdaySessions = getYesterdaySessions(sessions);
  const hadYesterday = yesterdaySessions.length > 0;
  const trend = computeTrend(sessions);
  const weakOp = findWeakestOperation(sessions);
  const sessionsToLevel = estimateSessions(xpIntoLevel, currentLevel, sessions);
  const daysThisWeek = getDaysActiveThisWeek(sessions);

  let yesterdayAccuracy = 0;
  let yesterdaySpeed = 0;
  if (hadYesterday) {
    yesterdayAccuracy = yesterdaySessions.reduce((s, x) => s + x.accuracy, 0) / yesterdaySessions.length;
    const speeds = yesterdaySessions.map(s => s.medianMs ?? s.avgResponseTimeMs);
    yesterdaySpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  }

  const lines: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (hadYesterday) {
    lines.push({
      icon: <Target size={14} />,
      text: `Yesterday: ${Math.round(yesterdayAccuracy * 100)}% accuracy, ${(yesterdaySpeed / 1000).toFixed(1)}s speed`,
      color: 'text-slate-600',
    });
  } else {
    lines.push({
      icon: <Minus size={14} />,
      text: "You didn't practise yesterday — no pressure, let's go today",
      color: 'text-slate-500',
    });
  }

  if (trend.accuracyChange !== null && Math.abs(trend.accuracyChange) >= 2) {
    const improving = trend.accuracyChange > 0;
    lines.push({
      icon: improving ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-orange-500" />,
      text: improving
        ? `Accuracy up ${trend.accuracyChange}% over the last 7 days`
        : `Accuracy dipped ${Math.abs(trend.accuracyChange)}% this week — today's a chance to bounce back`,
      color: improving ? 'text-emerald-700' : 'text-orange-700',
    });
  } else if (trend.speedChange !== null && Math.abs(trend.speedChange) >= 5) {
    const faster = trend.speedChange > 0;
    lines.push({
      icon: faster ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-orange-500" />,
      text: faster
        ? `Speed improved ${trend.speedChange}% over the last 7 days`
        : `Speed dipped ${Math.abs(trend.speedChange)}% this week — keep at it`,
      color: faster ? 'text-emerald-700' : 'text-orange-700',
    });
  }

  if (streakCount >= 2) {
    lines.push({
      icon: <Flame size={14} className="text-orange-500" />,
      text: `${streakCount}-day streak going strong`,
      color: 'text-slate-600',
    });
  } else if (daysThisWeek > 0) {
    lines.push({
      icon: <Clock size={14} />,
      text: `${daysThisWeek} day${daysThisWeek === 1 ? '' : 's'} active this week`,
      color: 'text-slate-600',
    });
  }

  if (weakOp) {
    lines.push({
      icon: <Target size={14} className="text-primary" />,
      text: `Today's focus: ${weakOp}`,
      color: 'text-primary',
    });
  }

  if (sessionsToLevel > 0 && sessionsToLevel <= 5) {
    lines.push({
      icon: <ChevronUp size={14} className="text-violet-500" />,
      text: `~${sessionsToLevel} session${sessionsToLevel === 1 ? '' : 's'} to Level ${currentLevel + 1}`,
      color: 'text-violet-600',
    });
  }

  const displayLines = lines.slice(0, 4);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-2xl p-4 space-y-2 border border-slate-100"
        data-testid="card-daily-recap"
      >
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Recap</h4>

        <div className="space-y-1.5">
          {displayLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-start gap-2 text-sm ${line.color}`}
            >
              <span className="mt-0.5 shrink-0">{line.icon}</span>
              <span>{line.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
