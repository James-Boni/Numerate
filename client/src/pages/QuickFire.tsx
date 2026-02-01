import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Zap, Target, Clock, Trophy, Flame } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { generateQuestionForLevel, GeneratedQuestionMeta } from '@/lib/logic/generator_adapter';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency } from '@/lib/logic/xp-system';

interface Question {
  id: string;
  text: string;
  answer: number;
  operation: string;
}

type GameStep = 'intro' | 'countdown' | 'active' | 'results';

function CountUp({ value, duration = 1, delay = 0, onTick, suffix = '' }: { 
  value: number, 
  duration?: number, 
  delay?: number, 
  onTick?: () => void,
  suffix?: string
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timer = setTimeout(() => {
      let start = 0;
      const step = value / (duration * 60);
      const animate = () => {
        start += step;
        if (start >= value) {
          setDisplayValue(value);
          return;
        }
        setDisplayValue(Math.round(start));
        onTick?.();
        requestAnimationFrame(animate);
      };
      animate();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, duration, delay, onTick]);

  return <span>{displayValue}{suffix}</span>;
}

function Confetti() {
  const colors = ['#14b8a6', '#0d9488', '#5eead4', '#99f6e4', '#2dd4bf'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
}

export default function QuickFire() {
  const [step, setStep] = useState<GameStep>('intro');
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(4.0);
  const [score, setScore] = useState(0);
  const [inGameXP, setInGameXP] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  
  const [_, setLocation] = useLocation();
  const { 
    level, 
    settings, 
    quickFireIntroSeen, 
    quickFireHighScore,
    setQuickFireIntroSeen,
    updateQuickFireHighScore,
    saveSession,
    hasCompletedAssessment 
  } = useStore();

  const scoreRef = useRef(0);
  const inGameXPRef = useRef(0);
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const responseTimesRef = useRef<number[]>([]);
  const questionStartTimeRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const gameActiveRef = useRef(false);

  useEffect(() => {
    AudioManager.init();
    if (!hasCompletedAssessment) {
      setLocation('/train');
    }
  }, [hasCompletedAssessment, setLocation]);


  const generateNextQuestion = useCallback(() => {
    const result = generateQuestionForLevel(level);
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: result.text,
      answer: result.answer,
      operation: result.operation,
    };
    setQuestion(newQuestion);
    setInput('');
    setFeedback(null);
    questionStartTimeRef.current = Date.now();
    setTimeLeft(4.0);
    isSubmittingRef.current = false;
  }, [level]);

  const stopAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const endRun = useCallback((reason: 'wrong' | 'timeout') => {
    gameActiveRef.current = false;
    stopAllTimers();
    
    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
    const finalScore = scoreRef.current;
    const finalInGameXP = inGameXPRef.current;
    const correctC = correctCountRef.current;
    const attemptedN = totalCountRef.current;
    
    const accuracy = attemptedN > 0 ? correctC / attemptedN : 0;
    const fluencyMetrics = computeFluency(
      attemptedN,
      correctC,
      durationSeconds,
      responseTimesRef.current
    );
    
    const bonusXP = Math.min(
      Math.floor(finalInGameXP * 0.25),
      Math.floor(fluencyMetrics.fluencyScore * 0.5)
    );
    const finalSessionXP = finalInGameXP + bonusXP;
    
    console.log("[XP_SUMMARY]", {
      mode: 'quick_fire',
      inGameXP: finalInGameXP,
      bonusXP,
      finalSessionXP,
      appliedToLeveling: finalSessionXP,
      storedFinal: finalSessionXP
    });

    const isNewBest = updateQuickFireHighScore(finalScore);
    setIsNewHighScore(isNewBest);
    
    if (isNewBest && settings.soundOn) {
      setTimeout(() => AudioManager.playCheer(), 300);
    }

    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      sessionType: 'quick_fire',
      durationMode: 60,
      durationSecondsActual: Math.round(durationSeconds),
      totalQuestions: attemptedN,
      correctQuestions: correctC,
      accuracy,
      xpEarned: finalSessionXP,
      bestStreak: finalScore,
      avgResponseTimeMs: fluencyMetrics.medianMs,
      medianMs: fluencyMetrics.medianMs,
      variabilityMs: fluencyMetrics.variabilityMs,
      fluencyScore: fluencyMetrics.fluencyScore,
      baseSessionXP: finalInGameXP,
      modeMultiplier: 1.0,
      excellenceMultiplierApplied: 1.0,
      eliteMultiplierApplied: 1.0,
      finalSessionXP,
      responseTimes: [...responseTimesRef.current],
    };

    saveSession(sessionStats);
    
    setResults({
      score: finalScore,
      attempted: attemptedN,
      correct: correctC,
      accuracy,
      medianMs: fluencyMetrics.medianMs,
      xpEarned: finalSessionXP,
      inGameXP: finalInGameXP,
      bonusXP,
      reason
    });
    
    setStep('results');
  }, [settings.soundOn, updateQuickFireHighScore, saveSession, stopAllTimers]);

  const startTimer = useCallback(() => {
    stopAllTimers();
    
    const startTime = Date.now();
    const endTime = startTime + 4000;
    
    timerRef.current = setInterval(() => {
      const remaining = (endTime - Date.now()) / 1000;
      if (remaining <= 0) {
        stopAllTimers();
        if (gameActiveRef.current) {
          totalCountRef.current += 1;
          endRun('timeout');
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
    
    tickIntervalRef.current = setInterval(() => {
      if (settings.soundOn && gameActiveRef.current) {
        AudioManager.playQuickTick();
      }
    }, 500);
  }, [settings.soundOn, endRun, stopAllTimers]);

  const handleSubmit = useCallback(() => {
    if (!question || isSubmittingRef.current || !gameActiveRef.current) return;
    if (!input) return;
    
    isSubmittingRef.current = true;
    stopAllTimers();
    
    const val = parseFloat(input);
    const isCorrect = Math.abs(val - question.answer) < 0.001;
    const responseTime = Date.now() - questionStartTimeRef.current;
    
    totalCountRef.current += 1;
    responseTimesRef.current.push(responseTime);
    
    if (isCorrect) {
      correctCountRef.current += 1;
      scoreRef.current += 1;
      inGameXPRef.current += 2;
      
      setScore(scoreRef.current);
      setInGameXP(inGameXPRef.current);
      setFeedback('correct');
      
      if (settings.soundOn) AudioManager.playCorrect();
      
      setTimeout(() => {
        if (gameActiveRef.current) {
          generateNextQuestion();
          startTimer();
        }
      }, 150);
    } else {
      setFeedback('wrong');
      if (settings.soundOn) AudioManager.playWrong();
      
      setTimeout(() => {
        endRun('wrong');
      }, 300);
    }
  }, [question, input, settings.soundOn, generateNextQuestion, startTimer, endRun, stopAllTimers]);

  const handleKeypadPress = useCallback((key: string) => {
    setInput(prev => prev + key);
  }, []);

  const handleKeypadDelete = useCallback(() => {
    setInput(prev => prev.slice(0, -1));
  }, []);

  const startCountdown = useCallback(() => {
    if (!quickFireIntroSeen) {
      setQuickFireIntroSeen();
    }
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
      startTimeRef.current = Date.now();
      scoreRef.current = 0;
      inGameXPRef.current = 0;
      correctCountRef.current = 0;
      totalCountRef.current = 0;
      responseTimesRef.current = [];
      
      setScore(0);
      setInGameXP(0);
      generateNextQuestion();
      startTimer();
      setStep('active');
    }, 3000);
  }, [settings.soundOn, generateNextQuestion, startTimer, setQuickFireIntroSeen, quickFireIntroSeen]);

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (quickFireIntroSeen && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startCountdown();
    }
  }, [quickFireIntroSeen, startCountdown]);

  useEffect(() => {
    return () => {
      stopAllTimers();
    };
  }, [stopAllTimers]);

  if (step === 'intro') {
    return (
      <MobileLayout className="bg-white">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-sm mx-auto rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Flame size={32} className="text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl font-bold">Quick Fire</DialogTitle>
              <DialogDescription className="text-center space-y-3 pt-4">
                <p className="flex items-center justify-center gap-2">
                  <Clock size={16} className="text-primary" />
                  You have 4 seconds per question.
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Target size={16} className="text-primary" />
                  Each correct answer increases your score.
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Zap size={16} className="text-red-500" />
                  One mistake ends the run.
                </p>
                <p className="text-slate-500 text-sm pt-2">
                  This is speed training to make Daily challenges feel easier.
                </p>
              </DialogDescription>
            </DialogHeader>
            <Button 
              onClick={startCountdown}
              className="w-full h-12 rounded-2xl font-bold mt-4"
              data-testid="button-quickfire-start"
            >
              Okay
            </Button>
          </DialogContent>
        </Dialog>
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
              className="text-9xl font-black text-primary"
            >
              {countdownNumber}
            </motion.div>
          </AnimatePresence>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'results') {
    return (
      <MobileLayout className="bg-white">
        {isNewHighScore && <Confetti />}
        
        <div className="flex-1 p-8 space-y-6 flex flex-col justify-center">
          <div className="text-center space-y-2">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4"
            >
              <Flame size={32} />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900">Quick Fire Complete</h1>
            <p className="text-slate-500">Speed training to strengthen Daily sessions.</p>
          </div>

          {isNewHighScore && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="flex items-center justify-center gap-2 text-primary font-bold text-lg"
            >
              <Trophy size={24} className="fill-primary" />
              New personal best!
            </motion.div>
          )}

          <motion.div 
            initial={{ scale: 1, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-2 shadow-sm"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
            <motion.div 
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-7xl font-black text-primary"
            >
              <CountUp 
                value={results?.score || 0} 
                duration={0.8} 
                delay={0.2} 
                onTick={() => settings.soundOn && AudioManager.playTallyTick()} 
              />
            </motion.div>
            {!isNewHighScore && (
              <p className="text-slate-400 text-sm">Personal best: {quickFireHighScore}</p>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-50 border-none rounded-3xl p-6 text-center"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">XP Earned</span>
            <div className="text-4xl font-bold text-primary mt-2">
              <CountUp 
                value={results?.xpEarned || 0} 
                duration={0.6} 
                delay={0.5} 
                onTick={() => settings.soundOn && AudioManager.playTallyTick()} 
              /> XP
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
                <span className="text-lg font-bold text-slate-900">{results?.attempted || 0}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Attempted</span>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
                <span className="text-lg font-bold text-slate-900">{Math.round((results?.accuracy || 0) * 100)}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</span>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
                <span className="text-lg font-bold text-slate-900">{((results?.medianMs || 0) / 1000).toFixed(1)}s</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Median</span>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/10"
              onClick={() => setLocation('/train')}
              data-testid="button-quickfire-continue"
            >
              Continue
            </Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-6 pb-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopAllTimers();
              gameActiveRef.current = false;
              setLocation('/train');
            }}
            className="text-slate-400"
          >
            Exit
          </Button>
          
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={clsx(
              "text-2xl font-bold tabular-nums px-4 py-2 rounded-xl",
              timeLeft <= 1.5 ? "text-red-500 bg-red-50" : "text-red-400 bg-slate-50"
            )}
          >
            {timeLeft.toFixed(1)}s
          </motion.div>
          
          <div className="text-sm font-bold text-primary">
            +{inGameXP} XP
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[12rem] font-black text-primary/5 tabular-nums select-none">
              {score}
            </span>
          </div>
          
          <div className="relative z-10 w-full space-y-8">
            <div className="text-center">
              <motion.div 
                key={question?.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-black text-slate-900 tracking-tight"
              >
                {question?.text} = ?
              </motion.div>
            </div>

            <div className={clsx(
              "relative bg-slate-50 rounded-3xl p-6 text-center border-2 transition-colors",
              feedback === 'correct' && "border-green-400 bg-green-50",
              feedback === 'wrong' && "border-red-400 bg-red-50",
              !feedback && "border-slate-100"
            )}>
              <div className="text-5xl font-bold tabular-nums text-slate-900 min-h-[4rem] flex items-center justify-center">
                {input || <span className="text-slate-300">_</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8">
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
