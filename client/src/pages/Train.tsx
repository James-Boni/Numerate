import React from 'react';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Zap, Play, Flame, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Train() {
  const { level, lifetimeXP, streakCount } = useStore();
  const [_, setLocation] = useLocation();

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-12 pb-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                {level}
              </div>
              <div>
                <h2 className="font-bold text-lg">Daily Training</h2>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Zap size={14} className="text-amber-500 fill-amber-500" />
                  <span>{lifetimeXP} XP Total</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
              <Flame size={18} className="text-orange-500 fill-orange-500" />
              <span className="font-bold text-slate-700">{streakCount}</span>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="px-6 pb-8">
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-xl shadow-slate-200 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <DumbbellIcon size={120} className="text-white" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h3 className="text-white font-bold text-2xl">Daily Focus</h3>
                <p className="text-slate-400 text-sm">Mixed arithmetic adaptation.</p>
              </div>

              <div className="flex gap-2">
                <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-xs font-medium">3 Minutes</span>
                <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-xs font-medium">Mixed Ops</span>
              </div>

              <Button 
                onClick={() => setLocation('/game')}
                className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                Start Training
              </Button>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="px-6 grid grid-cols-2 gap-4">
          <Card className="p-4 border-none shadow-sm space-y-2 bg-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Target size={18} className="text-emerald-500" />
            </div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accuracy</h4>
            <p className="text-xl font-bold">
              {useStore.getState().sessions.length > 0 
                ? `${Math.round((useStore.getState().sessions.reduce((acc, s) => acc + s.accuracy, 0) / useStore.getState().sessions.length) * 100)}%`
                : "--"}
            </p>
          </Card>
          <Card className="p-4 border-none shadow-sm space-y-2 bg-white">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Zap size={18} className="text-blue-500" />
            </div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Speed</h4>
            <p className="text-xl font-bold">
              {useStore.getState().sessions.length > 0
                ? `${(useStore.getState().sessions.reduce((acc, s) => acc + s.avgResponseTimeMs, 0) / useStore.getState().sessions.length / 1000).toFixed(1)}s`
                : "--"}
            </p>
          </Card>
        </div>
      </div>
      
      <BottomNav />
    </MobileLayout>
  );
}

function DumbbellIcon({ size, className }: any) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" /><path d="m3 21 18-18" /><path d="m3 3 18 18" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="6.5" r="2.5" />
    </svg>
  );
}
