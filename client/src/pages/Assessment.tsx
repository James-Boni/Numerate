import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, useSpring, useTransform, animate, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Zap, Target, TrendingUp } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';
import { clsx } from 'clsx';
import { computeStartingPlacement, getPlacementMessageByLevel, PlacementResult } from '@/lib/logic/placement';

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

const MIN_QUESTIONS_FOR_VALID_ASSESSMENT = 12;

export default function Assessment() {
  const [step, setStep] = useState<'intro' | 'active' | 'results'>('intro');
  const [results, setResults] = useState<SessionStats | null>(null);
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [_, setLocation] = useLocation();
  const completeAssessment = useStore(s => s.completeAssessment);
  const settings = useStore(s => s.settings);
  const revealRun = React.useRef(false);
  const [assessmentKey, setAssessmentKey] = useState(0);
  const [revealPhase, setRevealPhase] = useState<'title' | 'level' | 'stats' | 'complete'>('title');

  const isValidAssessment = results ? results.totalQuestions >= MIN_QUESTIONS_FOR_VALID_ASSESSMENT : false;

  const handleRetry = () => {
    setResults(null);
    setPlacement(null);
    revealRun.current = false;
    setRevealPhase('title');
    setAssessmentKey(prev => prev + 1);
    setStep('active');
  };

  useEffect(() => {
    AudioManager.init();
  }, []);

  const handleComplete = (stats: SessionStats) => {
    console.log(`[SESSION_FLOW] Assessment complete: ${Date.now()}`, stats);
    
    // PURE FUNCTION CALL - no global state access
    const placementResult = computeStartingPlacement({
      totalAnswers: stats.totalQuestions,
      correctAnswers: stats.correctQuestions,
      responseTimes: stats.responseTimes || [],
      assessmentDurationSeconds: stats.durationSecondsActual,
    });
    
    // Comprehensive placement logging
    console.log("[PLACEMENT_INPUT]", {
      N: stats.totalQuestions,
      C: stats.correctQuestions,
      D: stats.durationSecondsActual,
      responseTimesCount: (stats.responseTimes || []).length,
    });
    console.log("[PLACEMENT_RESULT]", {
      competenceGroup: placementResult.competenceGroup,
      startingLevel: placementResult.startingLevel,
      metrics: placementResult.metrics,
    });
    console.log("[PLACEMENT_DEBUG]", placementResult.debug);
    console.log("[LEVEL_ASSIGNMENT]", {
      previousLevel: 1, // First time assessment
      newLevel: placementResult.startingLevel,
      reason: `Assessment placed user in Group ${placementResult.competenceGroup} -> Level ${placementResult.startingLevel}`,
    });
    
    setResults(stats);
    setPlacement(placementResult);
    setStep('results');
    
    // Only lock placement if assessment is valid (>= 12 questions)
    if (stats.totalQuestions >= MIN_QUESTIONS_FOR_VALID_ASSESSMENT) {
      completeAssessment(placementResult.competenceGroup, placementResult.startingLevel, stats);
    }
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
      
      // Cinematic reveal sequence (total ~1.5-2s)
      setRevealPhase('title');
      
      // After 400ms, reveal the level
      setTimeout(() => {
        setRevealPhase('level');
        if (settings.soundOn) {
          AudioManager.playPlacementReveal();
        }
        HapticsManager.placementReveal();
      }, 400);
      
      // After 1200ms, show stats
      setTimeout(() => {
        setRevealPhase('stats');
      }, 1200);
      
      // After 1800ms, complete reveal
      setTimeout(() => {
        setRevealPhase('complete');
      }, 1800);
    }
  }, [step, results, settings.soundOn]);


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
        key={assessmentKey}
        mode="assessment"
        durationSeconds={180}
        initialTier={1}
        onComplete={handleComplete}
        onExit={() => setLocation('/')}
      />
    );
  }

  const showDebug = settings.showDebugOverlay;

  return (
    <MobileLayout className="bg-gradient-to-b from-slate-50 to-white">
      <div className="flex-1 p-6 space-y-6 flex flex-col justify-center overflow-y-auto">
        {/* Cinematic Header with Logo */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div 
            className="w-16 h-16 mx-auto mb-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src="/numerate-logo.png" 
              alt="" 
              className="w-full h-full object-contain" 
              style={{ opacity: 0.7 }} 
            />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-800">Assessment Complete</h1>
        </motion.div>

        {/* Level Reveal Card - Cinematic */}
        <motion.div 
          className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-lg shadow-slate-100/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: revealPhase !== 'title' ? 1 : 0.3, 
            scale: revealPhase !== 'title' ? 1 : 0.95 
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starting Level</span>
          <motion.div 
            className="text-7xl font-black text-primary mt-3"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: revealPhase !== 'title' ? 1 : 0.5, 
              opacity: revealPhase !== 'title' ? 1 : 0 
            }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {placement?.startingLevel || 1}
          </motion.div>
          <motion.p 
            className="text-slate-500 text-sm mt-3 leading-relaxed max-w-xs mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: revealPhase === 'stats' || revealPhase === 'complete' ? 1 : 0,
              y: revealPhase === 'stats' || revealPhase === 'complete' ? 0 : 10
            }}
            transition={{ duration: 0.3 }}
          >
            {isValidAssessment && placement ? getPlacementMessageByLevel(placement.startingLevel) : ''}
          </motion.p>
        </motion.div>

        {/* Stats Grid - Reveals with phase */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: revealPhase === 'stats' || revealPhase === 'complete' ? 1 : 0,
            y: revealPhase === 'stats' || revealPhase === 'complete' ? 0 : 20
          }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-2xl">
            <span className="text-2xl font-bold">{results?.correctQuestions || 0}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Correct</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-2xl">
            <span className="text-2xl font-bold">{results?.totalQuestions || 0}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Attempted</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-2xl">
            <span className={clsx(
              "text-2xl font-bold",
              (results?.accuracy || 0) >= 0.95 ? "text-primary" : "text-slate-900"
            )}>
              {Math.round((results?.accuracy || 0) * 100)}%
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Accuracy</span>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-white border-none shadow-sm rounded-2xl">
            <span className="text-2xl font-bold">
              {placement?.metrics.medianMs ? `${(placement.metrics.medianMs / 1000).toFixed(1)}s` : '-'}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Median Time</span>
          </Card>
        </motion.div>

        {/* Message section - only shows for incomplete assessments */}
        {!isValidAssessment && (
          <motion.div 
            className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: revealPhase === 'complete' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-amber-700 text-sm font-medium">
              Answer a few more questions for a more accurate placement.
            </p>
            <p className="text-amber-600/70 text-xs mt-1">
              You answered {results?.totalQuestions || 0} of {MIN_QUESTIONS_FOR_VALID_ASSESSMENT} recommended questions.
            </p>
          </motion.div>
        )}

        {/* Assessment Debug Block - DEV ONLY (gated behind showDebugOverlay) */}
        {showDebug && placement && (
          <div className="bg-slate-800 text-slate-200 rounded-xl p-4 text-xs font-mono space-y-1">
            <div className="font-bold text-primary mb-2">Assessment Debug (Dev Only)</div>
            <div className="grid grid-cols-2 gap-x-4">
              <div>N (attempted):</div><div>{placement.debug.N}</div>
              <div>C (correct):</div><div>{placement.debug.C}</div>
              <div>A (accuracy):</div><div>{(placement.debug.A * 100).toFixed(1)}%</div>
              <div>D (duration):</div><div>{results?.durationSecondsActual}s</div>
              <div>CPM:</div><div>{placement.debug.CPM.toFixed(2)}</div>
              <div>medianMs:</div><div>{placement.debug.medianMs}</div>
            </div>
            <div className="border-t border-slate-600 my-2 pt-2">
              <div className="grid grid-cols-2 gap-x-4">
                <div>G0 (from CPM):</div><div>{placement.debug.G0}</div>
                <div>Gcap (acc cap):</div><div>{placement.debug.Gcap}</div>
                <div>G1 (min G0,Gcap):</div><div>{placement.debug.G1}</div>
                <div>G2 (speed adj):</div><div>{placement.debug.G2}</div>
                <div className="font-bold">Gfinal:</div><div className="font-bold text-primary">{placement.debug.G}</div>
                <div className="font-bold">startingLevel:</div><div className="font-bold text-primary">{placement.debug.Lstart}</div>
                <div>valid:</div><div className={placement.debug.isValidPlacement ? "text-green-400" : "text-red-400"}>{String(placement.debug.isValidPlacement)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Animate in last */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: revealPhase === 'complete' ? 1 : 0,
            y: revealPhase === 'complete' ? 0 : 20
          }}
          transition={{ duration: 0.4 }}
        >
          {isValidAssessment ? (
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20"
              onClick={() => setLocation('/game')}
              data-testid="button-start-training"
            >
              Start Daily Training
            </Button>
          ) : (
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20"
                onClick={handleRetry}
                data-testid="button-retry-assessment"
              >
                Retry Assessment
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-12 text-base font-medium rounded-xl border-slate-200"
                onClick={() => {
                  if (placement) {
                    completeAssessment(placement.competenceGroup, placement.startingLevel, results!);
                  }
                  setLocation('/game');
                }}
                data-testid="button-continue-anyway"
              >
                Continue Anyway
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}
