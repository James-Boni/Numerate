import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Zap, Target, TrendingUp } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';

function CountUp({ value, duration = 1, delay = 0, onTick, prefix = '', suffix = '' }: { 
  value: number, 
  duration?: number, 
  delay?: number, 
  onTick?: () => void,
  prefix?: string,
  suffix?: string
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timer = setTimeout(() => {
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate: (latest) => {
          const rounded = Math.round(latest);
          if (rounded !== displayValue) {
            setDisplayValue(rounded);
            onTick?.();
          }
        }
      });
      return () => controls.stop();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, duration, delay]);

  return <span>{prefix}{displayValue}{suffix}</span>;
}

export default function Assessment() {
  const [step, setStep] = useState<'intro' | 'active' | 'results'>('intro');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [_, setLocation] = useLocation();
  const completeAssessment = useStore(s => s.completeAssessment);
  const settings = useStore(s => s.settings);
  const revealRun = React.useRef(false);

  // Pre-initialize audio context on mount
  useEffect(() => {
    AudioManager.init();
  }, []);

  const handleComplete = (stats: SessionStats) => {
    console.log(`[SESSION_FLOW] Assessment complete: ${Date.now()}`, stats);
    setResults(stats);
    setStep('results');
    
    let tier = 0;
    if (stats.accuracy > 0.85 && stats.avgResponseTimeMs < 1800) tier = 8;
    else if (stats.accuracy > 0.7) tier = 5;
    else if (stats.accuracy > 0.5) tier = 3;
    else if (stats.accuracy > 0.3) tier = 1;
    
    completeAssessment(tier, stats);
  };

  useEffect(() => {
    if (step === 'results') {
      console.log(`[SESSION_FLOW] Results step entered: ${Date.now()}`);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'results' && results && !revealRun.current) {
      revealRun.current = true;
      console.log(`[SESSION_FLOW] Reveal sequence started: ${Date.now()}`);
      
      if (settings.soundOn) {
        AudioManager.playCompletion();
        setTimeout(() => AudioManager.playEnergyRise(0.8), 200);
        
        // Accuracy reveal overlap
        setTimeout(() => {
          AudioManager.playThud();
          if (results.accuracy >= 0.95) {
            setTimeout(() => AudioManager.playSuccessBell(), 600);
          }
        }, 900);
      }
    }
  }, [step, results, settings.soundOn]);

  const getEncouragingMessage = (tier: number) => {
    if (tier >= 8) return "You have a clear talent for mental arithmetic. We'll provide the challenges to help you reach elite fluency.";
    if (tier >= 5) return "Your foundations are solid and your speed is promising. Focused daily practice will build your confidence quickly.";
    if (tier >= 3) return "You're off to a strong start. With consistent training, these operations will soon become second nature.";
    return "Great job completing the assessment. We'll start with the basics to build a rock-solid foundation for your future progress.";
  };

  if (step === 'intro') {
    return (
      <MobileLayout className="bg-white">
        <div className="flex-1 flex flex-col p-8 space-y-8 justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Initial Assessment</h1>
            <p className="text-slate-500 text-lg">
              3 minutes to determine your starting level. Work at a pace that feels comfortable.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, text: "Mixed operations", color: "text-amber-500" },
              { icon: Target, text: "Focus on accuracy", color: "text-blue-500" },
              { icon: TrendingUp, text: "Progressive difficulty", color: "text-emerald-500" },
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
          <h1 className="text-3xl font-bold">Assessment Complete</h1>
          <p className="text-slate-500">Your personalised training plan is ready.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-3xl">
            <span className="text-2xl font-bold">
              <CountUp 
                value={results?.correctQuestions || 0} 
                duration={0.7} 
                delay={0.2} 
                onTick={() => settings.soundOn && AudioManager.playTallyTick()}
              />
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Correct Answers</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-3xl">
            <span className={clsx(
              "text-2xl font-bold transition-colors duration-300",
              (results?.accuracy || 0) >= 0.95 ? "text-primary" : "text-slate-900"
            )}>
              <CountUp 
                value={Math.round((results?.accuracy || 0) * 100)} 
                duration={0.7} 
                delay={0.3} 
                onTick={() => settings.soundOn && AudioManager.playTallyTick()}
                suffix="%"
              />
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Accuracy</span>
          </Card>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center space-y-6 shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assessment XP Earned</span>
            <div className="text-6xl font-black text-primary mt-2">
              <CountUp 
                value={results?.xpEarned || 0} 
                duration={0.9} 
              />
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm">
            {getEncouragingMessage(currentTier)}
          </p>
        </div>

        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20"
          onClick={() => setLocation('/train')}
        >
          Start Daily Training
        </Button>
      </div>
    </MobileLayout>
  );
}
