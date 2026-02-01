import React from 'react';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Zap, Play, Flame, Target, Timer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Train() {
  const { level, lifetimeXP, streakCount, hasCompletedAssessment, quickFireHighScore } = useStore();
  const [_, setLocation] = useLocation();

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-12 pb-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/10">
                {level}
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">Daily Training</h2>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Zap size={14} className="text-primary fill-primary" />
                  <span>{lifetimeXP} XP Total</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100">
              <Flame size={18} className="text-primary fill-primary" />
              <span className="font-bold text-slate-700">{streakCount}</span>
            </div>
          </div>
        </div>

        {/* Hero Card - Daily */}
        <div className="px-6 pb-4">
          <Card className="p-6 bg-slate-50 border-none shadow-none rounded-3xl overflow-hidden relative group">
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h3 className="text-slate-900 font-bold text-2xl">Daily Focus</h3>
                <p className="text-slate-500 text-sm">Mixed arithmetic adaptation.</p>
              </div>

              <div className="flex gap-2">
                <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-slate-100">3 Minutes</span>
                <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-slate-100">Mixed Ops</span>
              </div>

              <Button 
                onClick={() => setLocation('/game')}
                className="w-full h-12 bg-primary text-white hover:opacity-90 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
              >
                <Play size={18} fill="currentColor" />
                Start Training
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Fire Card - Only shown after assessment */}
        {hasCompletedAssessment && (
          <div className="px-6 pb-6">
            <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-none shadow-none rounded-3xl overflow-hidden relative group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-slate-900 font-bold text-lg">Quick Fire</h3>
                      <Flame size={18} className="text-orange-500 fill-orange-500" />
                    </div>
                    <p className="text-slate-500 text-sm">Speed training drill.</p>
                  </div>
                  {quickFireHighScore > 0 && (
                    <div className="bg-white/80 px-3 py-1 rounded-full text-xs font-bold text-orange-600 border border-orange-100">
                      Best: {quickFireHighScore}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <span className="bg-white/80 text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-orange-100">5s + 5s/correct</span>
                  <span className="bg-white/80 text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-orange-100">1 Mistake = Done</span>
                </div>

                <Button 
                  onClick={() => setLocation('/quickfire')}
                  className="w-full h-11 bg-orange-500 text-white hover:bg-orange-600 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
                  data-testid="button-start-quickfire"
                >
                  <Timer size={16} />
                  Start Quick Fire
                </Button>
              </div>
            </Card>
          </div>
        )}

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
