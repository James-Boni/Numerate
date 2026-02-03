import React, { useState, useMemo } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { TrendingUp, Award, Clock, Target, Info } from 'lucide-react';
import { WeeklyInsights } from '@/components/progress/WeeklyInsights';
import { SkillBreakdown } from '@/components/progress/SkillBreakdown';
import { JourneyComparison } from '@/components/progress/JourneyComparison';

type TimeRange = '7D' | '30D' | 'all';
type TrendDirection = 'improving' | 'stable' | 'dipping';

interface DailyAggregate {
  date: string;
  dateLabel: string;
  totalCorrect: number;
  totalAttempted: number;
  accuracy: number;
  responseTimes: number[];
  medianMs: number;
  p25Ms: number;
  p75Ms: number;
  totalQuestions: number;
  totalActiveTimeMs: number;
  throughputQpm: number;
  levelAtEnd: number;
}

interface TrendAnalysis {
  accuracyTrend: TrendDirection;
  speedTrend: TrendDirection;
  throughputTrend: TrendDirection;
  difficultyChange: boolean;
  consistencyImproving: boolean;
  startAccuracy: number;
  endAccuracy: number;
  startSpeedSec: number;
  endSpeedSec: number;
  startThroughput: number;
  endThroughput: number;
}

function getPercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

function getDateRange(range: TimeRange, sessions?: SessionStats[]): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  if (range === '7D') {
    start.setDate(start.getDate() - 6);
  } else if (range === '30D') {
    start.setDate(start.getDate() - 29);
  } else {
    if (sessions && sessions.length > 0) {
      const dailySessions = sessions.filter(s => s.sessionType === 'daily');
      if (dailySessions.length > 0) {
        const earliest = dailySessions.reduce((min, s) => 
          new Date(s.date) < new Date(min.date) ? s : min, dailySessions[0]);
        const earliestDate = new Date(earliest.date);
        earliestDate.setHours(0, 0, 0, 0);
        return { start: earliestDate, end };
      }
    }
    start.setFullYear(2020);
  }
  
  return { start, end };
}

function filterDailySessions(sessions: SessionStats[], range: TimeRange): SessionStats[] {
  const { start, end } = getDateRange(range, sessions);
  
  return sessions.filter(s => {
    if (s.sessionType !== 'daily') return false;
    const sessionDate = new Date(s.date);
    return sessionDate >= start && sessionDate <= end;
  });
}

function aggregateByDay(sessions: SessionStats[], currentLevel: number): DailyAggregate[] {
  const byDay = new Map<string, SessionStats[]>();
  
  sessions.forEach(s => {
    const key = getDateKey(s.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  });
  
  const aggregates: DailyAggregate[] = [];
  
  byDay.forEach((daySessions, dateKey) => {
    let totalCorrect = 0;
    let totalAttempted = 0;
    const allResponseTimes: number[] = [];
    let totalQuestions = 0;
    let totalActiveTimeMs = 0;
    let levelAtEnd = currentLevel;
    
    daySessions.forEach(s => {
      totalCorrect += s.correctQuestions;
      totalAttempted += s.totalQuestions;
      totalQuestions += s.totalQuestions;
      totalActiveTimeMs += s.durationSecondsActual * 1000;
      
      if (s.responseTimes && s.responseTimes.length > 0) {
        allResponseTimes.push(...s.responseTimes);
      } else if (s.avgResponseTimeMs) {
        for (let i = 0; i < s.totalQuestions; i++) {
          allResponseTimes.push(s.avgResponseTimeMs);
        }
      }
      
      if (s.levelAfter !== undefined) {
        levelAtEnd = s.levelAfter;
      }
    });
    
    const accuracy = totalAttempted > 0 ? totalCorrect / totalAttempted : 0;
    const medianMs = getPercentile(allResponseTimes, 50);
    const p25Ms = getPercentile(allResponseTimes, 25);
    const p75Ms = getPercentile(allResponseTimes, 75);
    const activeMinutes = totalActiveTimeMs / 60000;
    const throughputQpm = activeMinutes > 0 ? totalQuestions / activeMinutes : 0;
    
    const date = new Date(dateKey);
    const dateLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    aggregates.push({
      date: dateKey,
      dateLabel,
      totalCorrect,
      totalAttempted,
      accuracy,
      responseTimes: allResponseTimes,
      medianMs,
      p25Ms,
      p75Ms,
      totalQuestions,
      totalActiveTimeMs,
      throughputQpm,
      levelAtEnd
    });
  });
  
  return aggregates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function analyzeTrends(dailyData: DailyAggregate[], startLevel: number, endLevel: number): TrendAnalysis {
  if (dailyData.length < 2) {
    return {
      accuracyTrend: 'stable',
      speedTrend: 'stable',
      throughputTrend: 'stable',
      difficultyChange: false,
      consistencyImproving: false,
      startAccuracy: 0,
      endAccuracy: 0,
      startSpeedSec: 0,
      endSpeedSec: 0,
      startThroughput: 0,
      endThroughput: 0
    };
  }
  
  const first = dailyData[0];
  const last = dailyData[dailyData.length - 1];
  
  const startAccuracy = first.accuracy;
  const endAccuracy = last.accuracy;
  const startSpeedSec = first.medianMs / 1000;
  const endSpeedSec = last.medianMs / 1000;
  const startThroughput = first.throughputQpm;
  const endThroughput = last.throughputQpm;
  
  let accuracyTrend: TrendDirection = 'stable';
  const accDelta = (endAccuracy - startAccuracy) * 100;
  if (accDelta >= 2) accuracyTrend = 'improving';
  else if (accDelta <= -2) accuracyTrend = 'dipping';
  
  let speedTrend: TrendDirection = 'stable';
  const speedDelta = startSpeedSec - endSpeedSec;
  if (speedDelta >= 0.3) speedTrend = 'improving';
  else if (speedDelta <= -0.3) speedTrend = 'dipping';
  
  let throughputTrend: TrendDirection = 'stable';
  const throughputDeltaPct = startThroughput > 0 
    ? ((endThroughput - startThroughput) / startThroughput) * 100 
    : 0;
  if (throughputDeltaPct >= 5) throughputTrend = 'improving';
  else if (throughputDeltaPct <= -5) throughputTrend = 'dipping';
  
  const difficultyChange = endLevel > startLevel;
  
  const startIQR = first.p75Ms - first.p25Ms;
  const endIQR = last.p75Ms - last.p25Ms;
  const consistencyImproving = endIQR < startIQR * 0.85 && speedTrend !== 'dipping';
  
  return {
    accuracyTrend,
    speedTrend,
    throughputTrend,
    difficultyChange,
    consistencyImproving,
    startAccuracy,
    endAccuracy,
    startSpeedSec,
    endSpeedSec,
    startThroughput,
    endThroughput
  };
}

function generateInsight(trends: TrendAnalysis, sparseData: boolean, range: TimeRange): { text: string; rule: string } {
  if (sparseData) {
    return { text: "More data will appear as you train.", rule: "sparse_data" };
  }
  
  const { accuracyTrend, speedTrend, throughputTrend, difficultyChange, consistencyImproving } = trends;
  
  if (accuracyTrend === 'improving' && difficultyChange) {
    return { text: "Accuracy is improving, even as questions become harder.", rule: "accuracy_up_difficulty_up" };
  }
  
  if (speedTrend === 'improving' && (accuracyTrend === 'stable' || accuracyTrend === 'improving')) {
    return { text: "You're answering faster without sacrificing accuracy.", rule: "speed_up_accuracy_stable" };
  }
  
  if (speedTrend === 'dipping' && difficultyChange) {
    return { text: "A temporary slowdown is normal when difficulty increases.", rule: "speed_down_difficulty_up" };
  }
  
  if (throughputTrend === 'improving') {
    return { text: "You're sustaining focus and answering more questions per session.", rule: "throughput_up" };
  }
  
  if (consistencyImproving) {
    return { text: "Your response times are becoming more consistent.", rule: "consistency_up" };
  }
  
  if (accuracyTrend === 'stable' && speedTrend === 'stable' && throughputTrend === 'stable') {
    return { text: "Stability is a sign you're consolidating skills.", rule: "plateau" };
  }
  
  if ((accuracyTrend === 'improving' || speedTrend === 'improving') && !difficultyChange) {
    return { text: "You're making steady progress across multiple areas.", rule: "general_improvement" };
  }
  
  return { text: "Keep training — patterns become clearer with more sessions.", rule: "fallback" };
}

export default function Progress() {
  const { sessions, level, startingLevel } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  
  const filteredSessions = useMemo(() => 
    filterDailySessions(sessions, timeRange),
    [sessions, timeRange]
  );
  
  const dailyData = useMemo(() => 
    aggregateByDay(filteredSessions, level),
    [filteredSessions, level]
  );
  
  const startLevel = useMemo(() => {
    if (dailyData.length === 0) return level;
    const firstDay = dailyData[0];
    const firstSession = filteredSessions.find(s => getDateKey(s.date) === firstDay.date);
    return firstSession?.levelBefore ?? startingLevel ?? level;
  }, [dailyData, filteredSessions, level, startingLevel]);
  
  const endLevel = level;
  const sparseData = dailyData.length < 3;
  
  const trends = useMemo(() => 
    analyzeTrends(dailyData, startLevel, endLevel),
    [dailyData, startLevel, endLevel]
  );
  
  const { text: insight, rule: chosenRule } = useMemo(() => 
    generateInsight(trends, sparseData, timeRange),
    [trends, sparseData, timeRange]
  );
  
  console.log(`PROGRESS_WINDOW range=${timeRange} days=${dailyData.length} dailySessions=${filteredSessions.length}`);
  console.log(`PROGRESS_INSIGHT range=${timeRange} accuracyTrend=${trends.accuracyTrend} speedTrend=${trends.speedTrend} throughputTrend=${trends.throughputTrend} difficultyChange=${trends.difficultyChange} chosenRule=${chosenRule}`);
  
  const personalBests = useMemo(() => {
    if (dailyData.length === 0) return null;
    
    const fastestDay = dailyData.reduce((best, d) => 
      d.medianMs < best.medianMs ? d : best, dailyData[0]);
    
    const mostAccurateDay = dailyData.reduce((best, d) =>
      d.accuracy > best.accuracy ? d : best, dailyData[0]);
    
    const highestThroughputDay = dailyData.reduce((best, d) =>
      d.throughputQpm > best.throughputQpm ? d : best, dailyData[0]);
    
    return {
      fastestMedian: fastestDay.medianMs / 1000,
      fastestDate: fastestDay.dateLabel,
      highestAccuracy: Math.round(mostAccurateDay.accuracy * 100),
      accuracyDate: mostAccurateDay.dateLabel,
      bestThroughput: Math.round(highestThroughputDay.throughputQpm * 10) / 10,
      throughputDate: highestThroughputDay.dateLabel
    };
  }, [dailyData]);
  
  const accuracyChartData = dailyData.map(d => ({
    date: d.dateLabel,
    accuracy: Math.round(d.accuracy * 100)
  }));
  
  const speedChartData = dailyData.map(d => ({
    date: d.dateLabel,
    median: Math.round(d.medianMs) / 1000,
    p25: Math.round(d.p25Ms) / 1000,
    p75: Math.round(d.p75Ms) / 1000,
    iqrRange: [Math.round(d.p25Ms) / 1000, Math.round(d.p75Ms) / 1000] as [number, number]
  }));
  
  const throughputChartData = dailyData.map(d => ({
    date: d.dateLabel,
    qpm: Math.round(d.throughputQpm * 10) / 10
  }));

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 flex flex-col p-6 space-y-5 pb-28 overflow-y-auto">
        <div className="pt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Progress</h1>
        </div>
        
        <div className="flex gap-2" data-testid="time-range-selector">
          {(['7D', '30D', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
              data-testid={`button-range-${range}`}
            >
              {range === 'all' ? 'All time' : range}
            </button>
          ))}
        </div>
        
        <p className="text-sm text-slate-500 italic" data-testid="text-insight">
          {insight}
        </p>
        
        {timeRange === '7D' && (
          <WeeklyInsights 
            sessions={sessions} 
            currentLevel={level} 
            startingLevel={startingLevel} 
          />
        )}
        
        {timeRange === 'all' && (
          <JourneyComparison 
            sessions={sessions} 
            startingLevel={startingLevel} 
            currentLevel={level} 
          />
        )}
        
        <Card className="p-5 bg-white border-none shadow-sm rounded-2xl" data-testid="card-level-journey">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="text-primary" size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Level Journey</h3>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Start of period</p>
              <p className="text-2xl font-bold text-slate-700">Level {startLevel}</p>
            </div>
            <div className="text-3xl text-slate-300">→</div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-medium">Current</p>
              <p className="text-2xl font-bold text-primary">Level {endLevel}</p>
            </div>
          </div>
          {startLevel === endLevel && (
            <p className="text-xs text-slate-400 mt-2 text-center">Level stable</p>
          )}
        </Card>
        
        {sparseData ? (
          <Card className="p-8 bg-white border-none shadow-sm rounded-2xl text-center" data-testid="card-sparse-data">
            <Target className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">More data will appear as you train.</p>
            <p className="text-xs text-slate-400 mt-2">Complete a few more daily sessions to see your trends.</p>
          </Card>
        ) : (
          <>
            <Card className="p-5 bg-white border-none shadow-sm rounded-2xl" data-testid="card-accuracy">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">Accuracy</h3>
                  <p className="text-xs text-slate-400">Percentage correct per day</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                    <span>Start: {Math.round(trends.startAccuracy * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-400">Now:</span>
                    <span className="text-lg font-bold text-primary">{Math.round(trends.endAccuracy * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Compared to the start of this period
                  </p>
                </div>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`${value}%`, 'Accuracy']}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-5 bg-white border-none shadow-sm rounded-2xl" data-testid="card-speed">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">Speed</h3>
                  <p className="text-xs text-slate-400">Median response time (seconds)</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                    <span>Start: {trends.startSpeedSec.toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-400">Now:</span>
                    <span className="text-lg font-bold text-primary">{trends.endSpeedSec.toFixed(1)}s</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Compared to earlier sessions
                  </p>
                </div>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={speedChartData}>
                    <defs>
                      <linearGradient id="iqrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis hide reversed />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(value: number | [number, number], name: string) => {
                        if (name === 'iqrRange') return null;
                        const labels: Record<string, string> = { median: 'Median', p25: '25th %ile', p75: '75th %ile' };
                        const val = typeof value === 'number' ? value : value[0];
                        return [`${val.toFixed(1)}s`, labels[name] || name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="iqrRange"
                      stroke="none"
                      fill="url(#iqrGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="median"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Shaded area shows your 25th-75th percentile range (consistency)
              </p>
            </Card>
            
            <Card className="p-5 bg-white border-none shadow-sm rounded-2xl" data-testid="card-throughput">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">Throughput</h3>
                  <p className="text-xs text-slate-400">Questions per minute</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                    <span>Start: {trends.startThroughput.toFixed(1)} QPM</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-400">Now:</span>
                    <span className="text-lg font-bold text-primary">{trends.endThroughput.toFixed(1)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Relative to earlier in the period
                  </p>
                </div>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={throughputChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`${value} QPM`, 'Throughput']}
                    />
                    <Line
                      type="monotone"
                      dataKey="qpm"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <div className="bg-slate-100 rounded-xl p-4 flex items-start gap-3" data-testid="context-difficulty">
              <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">
                As difficulty increases, temporary dips in speed or accuracy are normal.
              </p>
            </div>
            
            <SkillBreakdown sessions={sessions} currentLevel={level} />
            
            {personalBests && (
              <Card className="p-5 bg-white border-none shadow-sm rounded-2xl" data-testid="card-personal-bests">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Award className="text-amber-500" size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800">Personal Bests</h3>
                  </div>
                  <span className="text-xs text-slate-400 italic">Your best so far</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Fastest median</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{personalBests.fastestMedian.toFixed(1)}s</span>
                      <span className="text-xs text-slate-400 ml-2">{personalBests.fastestDate}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Highest accuracy</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{personalBests.highestAccuracy}%</span>
                      <span className="text-xs text-slate-400 ml-2">{personalBests.accuracyDate}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Best throughput</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{personalBests.bestThroughput} QPM</span>
                      <span className="text-xs text-slate-400 ml-2">{personalBests.throughputDate}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </MobileLayout>
  );
}
