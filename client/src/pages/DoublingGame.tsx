import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Clock, Copy, Zap, Lock } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency } from '@/lib/logic/xp-system';
import { Card } from '@/components/ui/card';

interface DoublingQuestion {
  id: string;
  multiplier: number;
  base: number;
  answer: number;
  text: string;
  hint: string;
  doublingSteps: string[];
}

interface GameResult {
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  medianMs: number;
  xpEarned: number;
}

type GameStep = 'intro' | 'locked' | 'countdown' | 'active' | 'results';

function generateDoublingQuestion(level: number): DoublingQuestion {
  const doublingMultipliers = [2, 4, 8, 16];
  const multiplierIndex = Math.min(Math.floor((level - 13) / 10), doublingMultipliers.length - 1);
  const availableMultipliers = doublingMultipliers.slice(0, multiplierIndex + 2);
  
  const multiplier = availableMultipliers[Math.floor(Math.random() * availableMultipliers.length)];
  
  const maxBase = Math.min(12 + Math.floor((level - 13) / 2), 25);
  const base = Math.floor(Math.random() * (maxBase - 2)) + 2;
  
  const answer = base * multiplier;
  const text = `${base} × ${multiplier}`;
  
  const doublingSteps: string[] = [];
  let current = base;
  let remaining = multiplier;
  
  while (remaining > 1) {
    const doubled = current * 2;
    doublingSteps.push(`${current} × 2 = ${doubled}`);
    current = doubled;
    remaining = remaining / 2;
  }
  
  const hint = `Double ${doublingSteps.length} time${doublingSteps.length > 1 ? 's' : ''}: ${doublingSteps.join(', then ')}`;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    multiplier,
    base,
    answer,
    text,
    hint,
    doublingSteps
  };
}

function FullScreenFlash({ type }: { type: 'correct' | 'wrong' }) {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "fixed inset-0 z-40 pointer-events-none",
        type === 'correct' ? "bg-green-400" : "bg-red-400"
      )}
    />
  );
}

export default function DoublingGame() {
  const [step, setStep] = useState<GameStep>('intro');
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [question, setQuestion] = useState<DoublingQuestion | null>(null);
  const [input, setInput] = useState('');
  const [remainingTime, setRemainingTime] = useState(180);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [results, setResults] = useState<GameResult | null>(null);
  const [showFlash, setShowFlash] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  const [_, setLocation] = useLocation();
  const { level, settings, saveSession, hasCompletedAssessment } = useStore();

  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const responseTimesRef = useRef<number[]>([]);
  const questionStartTimeRef = useRef<number>(performance.now());
  const startTimeRef = useRef<number>(performance.now());
  const timerRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);
  const gameActiveRef = useRef(false);

  const isLocked = level < 13;

  useEffect(() => {
    AudioManager.init();
    if (!hasCompletedAssessment) {
      setLocation('/train');
      return;
    }
    if (isLocked) {
      setStep('locked');
    }
  }, [hasCompletedAssessment, setLocation, isLocked]);

  const generateNextQuestion = useCallback(() => {
    const newQuestion = generateDoublingQuestion(level);
    setQuestion(newQuestion);
    setInput('');
    setFeedback(null);
    setShowHint(false);
    questionStartTimeRef.current = performance.now();
    isSubmittingRef.current = false;
  }, [level]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endGame = useCallback(() => {
    gameActiveRef.current = false;
    stopTimer();
    
    const durationSeconds = (performance.now() - startTimeRef.current) / 1000;
    const correctC = correctCountRef.current;
    const attemptedN = totalCountRef.current;
    
    const accuracy = attemptedN > 0 ? correctC / attemptedN : 0;
    const fluencyMetrics = computeFluency(
      attemptedN,
      correctC,
      durationSeconds,
      responseTimesRef.current
    );
    
    const baseXP = correctC * 18;
    const bonusXP = Math.floor(accuracy * 60);
    const finalXP = baseXP + bonusXP;

    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      sessionType: 'doubling_practice',
      durationMode: 180,
      durationSecondsActual: Math.round(durationSeconds),
      totalQuestions: attemptedN,
      correctQuestions: correctC,
      accuracy,
      xpEarned: finalXP,
      bestStreak: correctC,
      avgResponseTimeMs: fluencyMetrics.medianMs,
      medianMs: fluencyMetrics.medianMs,
      variabilityMs: fluencyMetrics.variabilityMs,
      fluencyScore: fluencyMetrics.fluencyScore,
      baseSessionXP: baseXP,
      modeMultiplier: 1.0,
      finalSessionXP: finalXP,
      responseTimes: [...responseTimesRef.current],
    };

    saveSession(sessionStats);
    
    setResults({
      totalQuestions: attemptedN,
      correctQuestions: correctC,
      accuracy,
      medianMs: fluencyMetrics.medianMs,
      xpEarned: finalXP
    });
    setStep('results');
  }, [saveSession, stopTimer]);

  const startTimerLoop = useCallback(() => {
    let lastTick = performance.now();
    
    const tick = () => {
      if (!gameActiveRef.current) return;
      
      const now = performance.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;
      
      setRemainingTime(prev => {
        const newTime = Math.max(0, prev - delta);
        if (newTime <= 0) {
          endGame();
          return 0;
        }
        return newTime;
      });
      
      timerRef.current = requestAnimationFrame(tick);
    };
    
    timerRef.current = requestAnimationFrame(tick);
  }, [endGame]);

  const handleSubmit = useCallback(() => {
    if (!question || isSubmittingRef.current || !gameActiveRef.current) return;
    if (!input) return;
    
    isSubmittingRef.current = true;
    
    const now = performance.now();
    const responseTime = now - questionStartTimeRef.current;
    
    const val = parseInt(input, 10);
    const isCorrect = val === question.answer;
    
    totalCountRef.current += 1;
    responseTimesRef.current.push(responseTime);
    
    if (isCorrect) {
      correctCountRef.current += 1;
      setFeedback('correct');
      setShowFlash('correct');
      if (settings.soundOn) AudioManager.playCorrect();
      
      setTimeout(() => {
        setShowFlash(null);
        if (gameActiveRef.current) {
          generateNextQuestion();
        }
      }, 300);
    } else {
      setFeedback('wrong');
      setShowFlash('wrong');
      if (settings.soundOn) AudioManager.playWrong();
      
      setTimeout(() => {
        setShowFlash(null);
        if (gameActiveRef.current) {
          generateNextQuestion();
        }
      }, 800);
    }
  }, [question, input, settings.soundOn, generateNextQuestion]);

  const handleKeypadPress = useCallback((key: string) => {
    if (feedback) return;
    setInput(prev => prev + key);
  }, [feedback]);

  const handleKeypadDelete = useCallback(() => {
    if (feedback) return;
    setInput(prev => prev.slice(0, -1));
  }, [feedback]);

  const startCountdown = useCallback(() => {
    setStep('countdown');
    setCountdownNumber(3);
    
    if (settings.soundOn) AudioManager.playCountdownHorn();
    
    setTimeout(() => {
      setCountdownNumber(2);
      if (settings.soundOn) AudioManager.playCountdownHorn();
    }, 1000);
    
    setTimeout(() => {
      setCountdownNumber(1);
      if (settings.soundOn) AudioManager.playCountdownHorn();
    }, 2000);
    
    setTimeout(() => {
      if (settings.soundOn) AudioManager.playGoHorn();
      
      gameActiveRef.current = true;
      startTimeRef.current = performance.now();
      correctCountRef.current = 0;
      totalCountRef.current = 0;
      responseTimesRef.current = [];
      
      setRemainingTime(180);
      setShowFlash(null);
      generateNextQuestion();
      startTimerLoop();
      setStep('active');
    }, 3000);
  }, [settings.soundOn, generateNextQuestion, startTimerLoop]);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  if (step === 'locked') {
    return (
      <MobileLayout className="bg-white">
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
            <button
              onClick={() => setLocation('/train')}
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
            >
              <X size={20} className="text-slate-400" />
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Lock size={32} className="text-slate-400" />
              </div>
            </div>
            
            <h2 className="text-center text-2xl font-bold text-slate-900">Locked</h2>
            
            <div className="text-center space-y-4 pt-4 text-slate-600">
              <p>Doubling practice unlocks at <span className="font-bold text-purple-600">Level 13</span> when multiplication is introduced.</p>
              <p className="text-sm text-slate-500">You're currently at Level {level}. Keep practicing to unlock!</p>
            </div>
            
            <Button 
              onClick={() => setLocation('/train')}
              className="w-full h-12 rounded-2xl font-bold mt-6"
            >
              Back to Training
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'intro') {
    return (
      <MobileLayout className="bg-white">
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
            <button
              onClick={() => setLocation('/train')}
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
              data-testid="button-doubling-cancel"
            >
              <X size={20} className="text-slate-400" />
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Copy size={32} className="text-purple-500" />
              </div>
            </div>
            
            <h2 className="text-center text-2xl font-bold text-slate-900">Doubling Practice</h2>
            
            <div className="text-center space-y-4 pt-4 text-slate-600">
              <p className="text-sm">Master the doubling technique for faster multiplication:</p>
              
              <div className="bg-purple-50 rounded-2xl p-4 text-left space-y-2">
                <p className="font-medium text-purple-900">Example: 6 × 8</p>
                <div className="text-sm text-purple-700 space-y-1">
                  <p>1. 6 × 2 = 12</p>
                  <p>2. 12 × 2 = 24</p>
                  <p>3. 24 × 2 = <span className="font-bold">48</span></p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Clock size={16} className="text-primary" />
                <span>3 minutes to practice</span>
              </div>
            </div>
            
            <Button 
              onClick={startCountdown}
              className="w-full h-12 rounded-2xl font-bold mt-6 bg-purple-500 hover:bg-purple-600"
              data-testid="button-doubling-start"
            >
              Start Practice
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'countdown') {
    return (
      <MobileLayout className="bg-white">
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={countdownNumber}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-9xl font-black text-purple-500"
            >
              {countdownNumber}
            </motion.div>
          </AnimatePresence>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'results' && results) {
    return (
      <MobileLayout className="bg-white">
        <div className="flex-1 p-8 space-y-6 flex flex-col justify-center">
          <div className="text-center space-y-2">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-500 rounded-full mb-4"
            >
              <Copy size={32} />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900">Practice Complete</h1>
            <p className="text-slate-500">Great work on your doubling skills!</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-purple-50 rounded-3xl p-6 text-center space-y-1"
          >
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Questions Correct</span>
            <div className="text-5xl font-black text-purple-600">
              {results.correctQuestions}/{results.totalQuestions}
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
              <span className="text-lg font-bold text-slate-900">{Math.round(results.accuracy * 100)}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
              <span className="text-lg font-bold text-slate-900">{(results.medianMs / 1000).toFixed(1)}s</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Time</span>
            </Card>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-primary/10 rounded-2xl p-4 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <Zap size={20} className="text-primary fill-primary" />
              <span className="text-2xl font-bold text-primary">+{results.xpEarned} XP</span>
            </div>
          </motion.div>

          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-semibold rounded-2xl"
            onClick={() => setLocation('/train')}
            data-testid="button-doubling-continue"
          >
            Continue
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.floor(remainingTime % 60);

  return (
    <MobileLayout className="bg-white">
      {showFlash && <FullScreenFlash type={showFlash} />}
      
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2 flex justify-between items-center">
          <button
            onClick={() => {
              stopTimer();
              gameActiveRef.current = false;
              setLocation('/train');
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
            data-testid="button-doubling-exit"
          >
            <X size={20} />
          </button>
          
          <div className={clsx(
            "text-xl font-bold tabular-nums px-4 py-2 rounded-xl",
            remainingTime <= 30 ? "text-red-500 bg-red-50" : "text-slate-700 bg-slate-100"
          )}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          
          <div className="w-11 h-11 flex items-center justify-center">
            <span className="text-sm font-bold text-green-600">{correctCountRef.current}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {question && (
            <>
              <motion.div
                key={question.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="text-5xl font-bold text-slate-900 tracking-tight">
                  {question.text}
                </div>
                
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-purple-600 bg-purple-50 px-4 py-3 rounded-xl space-y-1"
                  >
                    {question.doublingSteps.map((step, i) => (
                      <div key={i}>{step}</div>
                    ))}
                  </motion.div>
                )}
                
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>
              </motion.div>

              <div className="mt-8 w-full max-w-xs">
                <div className={clsx(
                  "h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl font-bold transition-colors",
                  feedback === 'correct' && "bg-green-100 text-green-600",
                  feedback === 'wrong' && "bg-red-100 text-red-600",
                  !feedback && "text-slate-900"
                )}>
                  {input || <span className="text-slate-300">?</span>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="pb-8 px-4">
          <KeypadModern 
            onPress={handleKeypadPress}
            onDelete={handleKeypadDelete}
            onSubmit={handleSubmit}
            disabled={!!feedback}
          />
        </div>
      </div>
    </MobileLayout>
  );
}
