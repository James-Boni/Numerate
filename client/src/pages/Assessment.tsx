import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Zap, Target, TrendingUp } from 'lucide-react';

export default function Assessment() {
  const [step, setStep] = useState<'intro' | 'active' | 'results'>('intro');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [_, setLocation] = useLocation();
  const completeAssessment = useStore(s => s.completeAssessment);

  const handleComplete = (stats: SessionStats) => {
    setResults(stats);
    setStep('results');
    
    let tier = 0;
    if (stats.accuracy > 0.9 && stats.avgResponseTimeMs < 1500) tier = 9;
    else if (stats.accuracy > 0.8) tier = 7;
    else if (stats.accuracy > 0.6) tier = 5;
    else if (stats.accuracy > 0.4) tier = 3;
    
    completeAssessment(tier, stats);
  };

  const getEncouragingMessage = (tier: number) => {
    if (tier >= 8) return "Incredible! You have a natural mathematical mind. Let's push those boundaries even further!";
    if (tier >= 5) return "Fantastic start! Your foundations are solid. Get ready to supercharge your mental agility!";
    if (tier >= 3) return "Great work! You've got the basics down. Time to sharpen those skills and feel the growth!";
    return "Excellent first step! We're going to build your confidence and make maths feel like a superpower!";
  };

  if (step === 'intro') {
    return (
      <MobileLayout className="bg-white">
        <div className="flex-1 flex flex-col p-8 space-y-8 justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Initial Assessment</h1>
            <p className="text-slate-500 text-lg">
              3 minutes to discover your power level. Show us what you can do!
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, text: "Mixed operations", color: "text-amber-500" },
              { icon: Target, text: "Accuracy matters", color: "text-blue-500" },
              { icon: TrendingUp, text: "Difficulty adjusts", color: "text-emerald-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                <item.icon className={item.color} size={24} />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-semibold rounded-xl mt-8"
            onClick={() => setStep('active')}
          >
            Begin Assessment
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'active') {
    return (
      <SessionScreen 
        mode="assessment"
        durationSeconds={180}
        initialTier={1}
        onComplete={handleComplete}
        onExit={() => setLocation('/')}
      />
    );
  }

  const currentTier = useStore.getState().currentTier;

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 p-8 space-y-8 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
            <ClipboardCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold">Great Work!</h1>
          <p className="text-slate-500">Your starting level is ready.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold">{results?.correctQuestions || 0}</span>
            <span className="text-xs text-slate-400 uppercase font-semibold">Score</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold">{Math.round((results?.accuracy || 0) * 100)}%</span>
            <span className="text-xs text-slate-400 uppercase font-semibold">Accuracy</span>
          </Card>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center space-y-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Calculated Skill Level</span>
            <div className="text-6xl font-black text-primary mt-2">
              Level {currentTier + 1}
            </div>
          </div>
          <p className="text-slate-700 font-medium italic">
            "{getEncouragingMessage(currentTier)}"
          </p>
        </div>

        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-semibold rounded-xl"
          onClick={() => setLocation('/train')}
        >
          Start Daily Training
        </Button>
      </div>
    </MobileLayout>
  );
}
