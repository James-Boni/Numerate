import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Target, Flame } from 'lucide-react';

export default function Progress() {
  const { sessions, level, streakCount } = useStore();

  const dailySessions = sessions.filter(s => s.sessionType !== 'quick_fire');

  const chartData = dailySessions.slice(0, 14).reverse().map(s => ({
    date: new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    accuracy: Math.round(s.accuracy * 100),
    speed: Math.round(s.avgResponseTimeMs / 100) / 10,
  }));

  const avgAccuracy = dailySessions.length > 0 
    ? Math.round((dailySessions.reduce((acc, s) => acc + s.accuracy, 0) / dailySessions.length) * 100)
    : 0;

  const avgSpeed = dailySessions.length > 0
    ? (dailySessions.reduce((acc, s) => acc + s.avgResponseTimeMs, 0) / dailySessions.length / 1000).toFixed(1)
    : "0.0";

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 flex flex-col p-6 space-y-6">
        <div className="pt-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Progress</h1>
          <p className="text-slate-500">Tracking your arithmetic journey.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border-none shadow-sm flex flex-col items-center text-center space-y-1 rounded-3xl">
            <Flame className="text-primary" size={20} />
            <span className="text-2xl font-bold text-slate-900">{streakCount}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Day Streak</span>
          </Card>
          <Card className="p-4 bg-white border-none shadow-sm flex flex-col items-center text-center space-y-1 rounded-3xl">
            <TrendingUp className="text-primary" size={20} />
            <span className="text-2xl font-bold text-slate-900">{level}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Level</span>
          </Card>
        </div>

        <Card className="p-6 border-none shadow-sm space-y-4 rounded-[2.5rem]">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-slate-800">Accuracy Trend</h3>
              <p className="text-xs text-slate-400">Last 14 sessions (%)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{avgAccuracy}%</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Average</p>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm space-y-4 rounded-[2.5rem]">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-slate-800">Speed Trend</h3>
              <p className="text-xs text-slate-400">Response time (seconds)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{avgSpeed}s</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Average</p>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide reversed />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="speed" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-slate-800">Recent Sessions</h3>
          {dailySessions.slice(0, 5).map((session, i) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-700">Daily Training</p>
                  <p className="text-xs text-slate-400">{new Date(session.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">+{session.xpEarned} XP</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{Math.round(session.accuracy * 100)}% Acc</p>
              </div>
            </div>
          ))}
          {dailySessions.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Target className="mx-auto opacity-20" size={48} />
              <p>No sessions recorded yet.</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
}
