import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Clock, CircleDot, Zap, ChevronRight, ChevronLeft, Target } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency } from '@/lib/logic/xp-system';
import { Card } from '@/components/ui/card';

interface RoundingQuestion {
  id: string;
  number: number;
  roundTo: string;
  answer: number;
  text: string;
}

interface GameResult {
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  medianMs: number;
  xpEarned: number;
}

type GameStep = 'intro' | 'countdown' | 'active' | 'results';

function generateRoundingQuestion(level: number): RoundingQuestion {
  // Determine complexity based on level
  // L1-10: Round whole numbers to nearest 10
  // L11-20: Round to nearest 10 or 100
  // L21-30: Add decimals, round to nearest 10, 100, or 1dp
  // L31-50: Round to 10, 100, 1000, 1dp, 2dp
  // L51+: All rounding types including more complex decimals
  
  const roundingTypes: { target: string; divisor: number; decimals: number }[] = [];
  
  // Always available
  roundingTypes.push({ target: '10', divisor: 10, decimals: 0 });
  
  if (level >= 11) {
    roundingTypes.push({ target: '100', divisor: 100, decimals: 0 });
  }
  if (level >= 21) {
    roundingTypes.push({ target: '1 decimal place', divisor: 0.1, decimals: 1 });
  }
  if (level >= 31) {
    roundingTypes.push({ target: '1000', divisor: 1000, decimals: 0 });
    roundingTypes.push({ target: '2 decimal places', divisor: 0.01, decimals: 2 });
  }
  
  const selectedType = roundingTypes[Math.floor(Math.random() * roundingTypes.length)];
  
  // Generate a number appropriate for the rounding type
  let number: number;
  let answer: number;
  
  if (selectedType.divisor >= 1) {
    // Rounding to nearest 10, 100, 1000
    const maxBase = Math.min(100 + level * 20, 10000);
    const minBase = selectedType.divisor;
    number = Math.floor(Math.random() * (maxBase - minBase) + minBase);
    
    // Add some decimals at higher levels
    if (level >= 21 && Math.random() < 0.5) {
      number = number + Math.round(Math.random() * 99) / 100;
    }
    
    answer = Math.round(number / selectedType.divisor) * selectedType.divisor;
  } else {
    // Rounding to decimal places
    const decimalPlaces = selectedType.decimals;
    const maxBase = Math.min(10 + level * 5, 1000);
    
    // Generate number with more decimal places than we're rounding to
    const extraDecimals = decimalPlaces + 1 + Math.floor(Math.random() * 2);
    number = Math.floor(Math.random() * maxBase) + 
             Math.round(Math.random() * Math.pow(10, extraDecimals)) / Math.pow(10, extraDecimals);
    
    answer = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
  }
  
  // Format the display number appropriately
  const displayNumber = selectedType.divisor >= 1 
    ? (level >= 21 && number % 1 !== 0 ? number.toFixed(2) : number.toString())
    : number.toFixed(selectedType.decimals + Math.floor(Math.random() * 2) + 1);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    number: parseFloat(displayNumber),
    roundTo: selectedType.target,
    answer,
    text: `Round ${displayNumber} to the nearest ${selectedType.target}`
  };
}

function FullScreenFlash({ type }: { type: 'correct' | 'wrong' }) {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "fixed inset-0 pointer-events-none z-50",
        type === 'correct' ? "bg-emerald-400" : "bg-red-400"
      )}
    />
  );
}

export default function RoundingGame() {
  const [, navigate] = useLocation();
  const { settings, level, saveSession, xpIntoLevel } = useStore();
  
  const [step, setStep] = useState<GameStep>('intro');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(180);
  const [question, setQuestion] = useState<RoundingQuestion | null>(null);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  
  const responseTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());
  const sessionEndedRef = useRef(false);
  
  const [result, setResult] = useState<GameResult | null>(null);
  
  const nextQuestion = useCallback(() => {
    const q = generateRoundingQuestion(level);
    setQuestion(q);
    setInput('');
    questionStartRef.current = Date.now();
  }, [level]);
  
  // Countdown effect
  useEffect(() => {
    if (step !== 'countdown') return;
    if (countdown <= 0) {
      setStep('active');
      startTimeRef.current = Date.now();
      nextQuestion();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, nextQuestion]);
  
  // Game timer
  useEffect(() => {
    if (step !== 'active') return;
    
    const tick = () => {
      if (sessionEndedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 180000 - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      setTimeLeft(remainingSeconds);
      
      if (remaining <= 0 && !sessionEndedRef.current) {
        sessionEndedRef.current = true;
        endSession();
      }
    };
    
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [step]);
  
  const handleKeyPress = (val: string) => {
    if (step !== 'active') return;
    
    // Handle decimal point
    if (val === '.') {
      if (!input.includes('.')) {
        setInput(prev => prev + '.');
      }
      return;
    }
    
    // Handle negative sign
    if (val === '-') {
      if (input === '') {
        setInput('-');
      }
      return;
    }
    
    setInput(prev => prev + val);
  };
  
  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
  };
  
  const handleSubmit = () => {
    if (!question || input === '' || step !== 'active') return;
    
    const userAnswer = parseFloat(input);
    const isCorrect = Math.abs(userAnswer - question.answer) < 0.001;
    const responseTime = Date.now() - questionStartRef.current;
    responseTimesRef.current.push(responseTime);
    
    setTotalCount(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setFlash('correct');
      if (settings.soundOn) AudioManager.playCorrect();
    } else {
      setStreak(0);
      setFlash('wrong');
      if (settings.soundOn) AudioManager.playWrong();
    }
    
    setTimeout(() => setFlash(null), 300);
    nextQuestion();
  };
  
  const endSession = () => {
    const times = responseTimesRef.current;
    const medianMs = times.length > 0 
      ? times.sort((a, b) => a - b)[Math.floor(times.length / 2)] 
      : 3000;
    
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const xpEarned = correctCount * 15 + (bestStreak >= 5 ? 25 : 0);
    
    const fluencyMetrics = computeFluency(totalCount, correctCount, 180, times);
    
    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      sessionType: 'rounding_practice',
      durationMode: 180,
      durationSecondsActual: 180,
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy,
      avgResponseTimeMs: medianMs,
      medianMs,
      xpEarned,
      fluencyScore: fluencyMetrics.fluencyScore,
      levelBefore: level,
      levelAfter: level,
      xpIntoLevelBefore: xpIntoLevel,
      xpIntoLevelAfter: xpIntoLevel + xpEarned,
      bestStreak
    };
    
    saveSession(sessionStats);
    
    setResult({
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy,
      medianMs,
      xpEarned
    });
    setStep('results');
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  // Intro screen
  if (step === 'intro') {
    return (
      <MobileLayout className="bg-gradient-to-b from-orange-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg"
          >
            <Target size={48} className="text-white" />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Rounding Practice</h1>
            <p className="text-slate-600">Round numbers quickly and accurately</p>
          </div>
          
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-orange-500" />
                <span>3 minutes of focused practice</span>
              </div>
              <div className="flex items-center gap-3">
                <CircleDot size={18} className="text-orange-500" />
                <span>Round to nearest 10, 100, decimals</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-orange-500" />
                <span>15 XP per correct answer</span>
              </div>
            </div>
          </Card>
          
          <Button
            size="lg"
            className="w-full max-w-sm h-14 text-lg bg-orange-500 hover:bg-orange-600"
            onClick={() => setStep('countdown')}
          >
            Start Practice
          </Button>
          
          <Button
            variant="ghost"
            className="text-slate-500"
            onClick={() => navigate('/train')}
          >
            <ChevronLeft size={18} />
            Back to Train
          </Button>
        </div>
      </MobileLayout>
    );
  }
  
  // Countdown screen
  if (step === 'countdown') {
    return (
      <MobileLayout className="bg-gradient-to-b from-orange-50 to-white">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-8xl font-black text-orange-500"
          >
            {countdown || 'Go!'}
          </motion.div>
        </div>
      </MobileLayout>
    );
  }
  
  // Results screen
  if (step === 'results' && result) {
    return (
      <MobileLayout className="bg-gradient-to-b from-orange-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold text-slate-900">Practice Complete!</h1>
            <p className="text-slate-600">Great work on your rounding skills</p>
          </motion.div>
          
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-3xl font-bold text-slate-900">{result.correctQuestions}</div>
                <div className="text-sm text-slate-600">Correct</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-3xl font-bold text-slate-900">{Math.round(result.accuracy * 100)}%</div>
                <div className="text-sm text-slate-600">Accuracy</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-3xl font-bold text-slate-900">{(result.medianMs / 1000).toFixed(1)}s</div>
                <div className="text-sm text-slate-600">Avg Speed</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <div className="text-3xl font-bold text-orange-600">+{result.xpEarned}</div>
                <div className="text-sm text-orange-600">XP Earned</div>
              </div>
            </div>
          </Card>
          
          <div className="flex gap-3 w-full max-w-sm">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => navigate('/train')}
            >
              Done
            </Button>
            <Button
              className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                setStep('intro');
                setCorrectCount(0);
                setTotalCount(0);
                setStreak(0);
                setBestStreak(0);
                responseTimesRef.current = [];
                sessionEndedRef.current = false;
                setResult(null);
              }}
            >
              Practice Again
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }
  
  // Active game screen
  return (
    <MobileLayout className="bg-white">
      <AnimatePresence>
        {flash && <FullScreenFlash type={flash} />}
      </AnimatePresence>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => navigate('/train')} className="p-2 -ml-2">
          <X size={24} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Clock size={20} className="text-orange-500" />
          <span className={clsx(timeLeft <= 10 && "text-red-500")}>{formatTime(timeLeft)}</span>
        </div>
        <div className="flex items-center gap-1 text-orange-600 font-medium">
          <Zap size={18} />
          <span>{correctCount * 15}</span>
        </div>
      </div>
      
      {/* Question display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-5xl font-bold text-slate-900">
              {question.number}
            </div>
            <div className="text-xl text-slate-600">
              to the nearest <span className="font-semibold text-orange-600">{question.roundTo}</span>
            </div>
            
            {/* Answer display */}
            <div className="h-16 flex items-center justify-center">
              <div className={clsx(
                "text-4xl font-bold min-w-[120px] border-b-4 pb-2",
                input ? "text-slate-900 border-orange-400" : "text-slate-300 border-slate-200"
              )}>
                {input || '?'}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Stats row */}
        <div className="flex gap-6 mt-8 text-sm text-slate-500">
          <div>Correct: <span className="font-semibold text-slate-900">{correctCount}</span></div>
          <div>Streak: <span className="font-semibold text-orange-600">{streak}</span></div>
        </div>
      </div>
      
      {/* Keypad */}
      <KeypadModern
        onPress={handleKeyPress}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        submitDisabled={!input}
      />
    </MobileLayout>
  );
}
