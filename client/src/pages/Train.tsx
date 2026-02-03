import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Zap, Play, Flame, Timer, Trophy, ChevronRight, Lock, CircleDot, Copy, Scissors } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { xpRequiredToAdvance } from '@/lib/logic/xp-system';
import { useAccountStore, isPremiumActive } from '@/lib/services/account-store';
import { PaywallScreen } from '@/components/game/PaywallScreen';
import { DailyFocus } from '@/components/train/DailyFocus';

export default function Train() {
  const { level, lifetimeXP, streakCount, hasCompletedAssessment, quickFireHighScore, sessions, xpIntoLevel, hasUsedFreeDaily } = useStore();
  const { entitlement, refreshEntitlement } = useAccountStore();
  const [showPaywall, setShowPaywall] = useState(false);
  const [_, setLocation] = useLocation();
  
  const [entitlementChecked, setEntitlementChecked] = useState(false);
  
  useEffect(() => {
    const checkEntitlement = async () => {
      await refreshEntitlement();
      setEntitlementChecked(true);
    };
    checkEntitlement();
  }, []);
  
  const isPremium = isPremiumActive(entitlement);
  // Default to locked until entitlement is verified, then check actual status
  const needsSubscription = entitlementChecked ? (hasUsedFreeDaily && !isPremium) : false;
  const showLoadingButton = !entitlementChecked && hasUsedFreeDaily;
  
  const xpNeeded = xpRequiredToAdvance(level);
  const progressPercent = Math.min(100, (xpIntoLevel / xpNeeded) * 100);
  const xpRemaining = Math.max(0, xpNeeded - xpIntoLevel);

  const quickFireAttempts = sessions.filter(s => s.sessionType === 'quick_fire').length;

  if (showPaywall) {
    return (
      <PaywallScreen 
        onSubscribed={() => {
          setShowPaywall(false);
          setLocation('/game');
        }}
        onRestore={() => {
          setShowPaywall(false);
        }}
      />
    );
  }

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-12 pb-4 space-y-4">
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

          {/* XP Progress Bar */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Level {level}</span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="text-slate-500">Level {level + 1}</span>
              </div>
              <span className="text-primary font-medium">{xpRemaining} XP to go</span>
            </div>
            <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{xpIntoLevel} XP</span>
              <span>{xpNeeded} XP</span>
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

              <DailyFocus 
                sessions={sessions} 
                currentLevel={level} 
                xpIntoLevel={xpIntoLevel} 
              />

              <Button 
                onClick={() => {
                  if (needsSubscription) {
                    setShowPaywall(true);
                  } else {
                    setLocation('/game');
                  }
                }}
                disabled={showLoadingButton}
                className="w-full h-12 bg-primary text-white hover:opacity-90 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 disabled:opacity-50"
                data-testid="button-start-training"
              >
                {showLoadingButton ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : needsSubscription ? (
                  <>
                    <Lock size={18} />
                    Unlock Training
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    Start Training
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Skill Practice Section - Only shown after assessment */}
        {hasCompletedAssessment && (
          <div className="px-6 pb-4">
            <h3 className="text-slate-700 font-semibold text-sm uppercase tracking-wider mb-3">Skill Drills</h3>
            <div className="space-y-3">
              {/* Rounding Practice */}
              <Card 
                className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-none shadow-none rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setLocation('/rounding')}
                data-testid="card-rounding-practice"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CircleDot size={24} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-bold">Rounding</h4>
                    <p className="text-slate-500 text-xs">Round numbers for easier mental math</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </div>
              </Card>

              {/* Doubling Practice */}
              <Card 
                className={`p-4 border-none shadow-none rounded-2xl transition-transform ${
                  level >= 13 
                    ? 'bg-gradient-to-br from-purple-50 to-violet-50 cursor-pointer active:scale-[0.98]' 
                    : 'bg-slate-50 opacity-60'
                }`}
                onClick={() => level >= 13 && setLocation('/doubling')}
                data-testid="card-doubling-practice"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    level >= 13 ? 'bg-purple-100' : 'bg-slate-200'
                  }`}>
                    {level >= 13 ? (
                      <Copy size={24} className="text-purple-500" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-bold">Doubling</h4>
                    <p className="text-slate-500 text-xs">
                      {level >= 13 ? 'Double your way to faster multiplication' : 'Unlocks at Level 13'}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </div>
              </Card>

              {/* Halving Practice */}
              <Card 
                className={`p-4 border-none shadow-none rounded-2xl transition-transform ${
                  level >= 21 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 cursor-pointer active:scale-[0.98]' 
                    : 'bg-slate-50 opacity-60'
                }`}
                onClick={() => level >= 21 && setLocation('/halving')}
                data-testid="card-halving-practice"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    level >= 21 ? 'bg-green-100' : 'bg-slate-200'
                  }`}>
                    {level >= 21 ? (
                      <Scissors size={24} className="text-green-500" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-bold">Halving</h4>
                    <p className="text-slate-500 text-xs">
                      {level >= 21 ? 'Halve your way to faster division' : 'Unlocks at Level 21'}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </div>
              </Card>
            </div>
          </div>
        )}

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
                </div>

                {(quickFireHighScore > 0 || quickFireAttempts > 0) && (
                  <div className="flex gap-3">
                    {quickFireHighScore > 0 && (
                      <div className="flex items-center gap-1 bg-white/80 px-3 py-1.5 rounded-xl border border-orange-100">
                        <Trophy size={14} className="text-orange-500" />
                        <span className="text-xs font-bold text-orange-600">Best: {quickFireHighScore}</span>
                      </div>
                    )}
                    {quickFireAttempts > 0 && (
                      <div className="bg-white/80 px-3 py-1.5 rounded-xl border border-orange-100">
                        <span className="text-xs font-medium text-slate-600">{quickFireAttempts} attempts</span>
                      </div>
                    )}
                  </div>
                )}

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
      </div>
      
      <BottomNav />
    </MobileLayout>
  );
}
