import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Clock, CircleDot, Zap, ChevronLeft, Lock, Scissors } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency } from '@/lib/logic/xp-system';
import { Card } from '@/components/ui/card';

interface HalvingQuestion {
  id: string;
  number: number;
  answer: number;
}

interface GameResult {
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  medianMs: number;
  xpEarned: number;
}

type GameStep = 'locked' | 'intro' | 'countdown' | 'active' | 'results';

function generateHalvingQuestion(level: number): HalvingQuestion {
  // Scale difficulty based on level
  // L21-30: Small whole numbers that halve nicely (4-100)
  // L31-40: Include odd numbers (results in .5)
  // L41-60: Larger numbers with decimals
  // L61+: Complex decimals
  
  let number: number;
  
  if (level < 31) {
    // Even numbers only - clean halves
    number = (Math.floor(Math.random() * 49) + 2) * 2; // 4 to 100, all even
  } else if (level < 41) {
    // Include odd numbers (results will be .5)
    if (Math.random() < 0.4) {
      // Odd number
      number = Math.floor(Math.random() * 97) + 3; // 3 to 100
      if (number % 2 === 0) number++; // Make odd
    } else {
      // Even number
      number = (Math.floor(Math.random() * 99) + 2) * 2; // 4 to 200, even
    }
  } else if (level < 61) {
    // Larger numbers, some decimals
    if (Math.random() < 0.3) {
      // Decimal that halves nicely
      const base = Math.floor(Math.random() * 200) + 10;
      number = base + 0.5;
    } else if (Math.random() < 0.5) {
      // Odd number
      number = Math.floor(Math.random() * 197) + 3;
      if (number % 2 === 0) number++;
    } else {
      // Even number
      number = (Math.floor(Math.random() * 199) + 2) * 2; // Up to 400
    }
  } else {
    // Complex - any number including decimals
    if (Math.random() < 0.4) {
      // Decimal
      const base = Math.floor(Math.random() * 300) + 10;
      const decimal = Math.round(Math.random() * 9) / 10;
      number = base + decimal;
    } else {
      number = Math.floor(Math.random() * 500) + 10;
    }
  }
  
  const answer = number / 2;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    number,
    answer
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

const UNLOCK_LEVEL = 21;

export default function HalvingGame() {
  const [, navigate] = useLocation();
  const { settings, level, saveSession, xpIntoLevel } = useStore();
  
  const isLocked = level < UNLOCK_LEVEL;
  
  const [step, setStep] = useState<GameStep>(isLocked ? 'locked' : 'intro');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(180);
  const [question, setQuestion] = useState<HalvingQuestion | null>(null);
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
    const q = generateHalvingQuestion(level);
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
    
    if (val === '.') {
      if (!input.includes('.')) {
        setInput(prev => prev + '.');
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
    const xpEarned = correctCount * 20 + (bestStreak >= 5 ? 35 : 0);
    
    const fluencyMetrics = computeFluency(totalCount, correctCount, 180, times);
    
    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      sessionType: 'halving_practice',
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
  
  // Locked screen
  if (step === 'locked') {
    return (
      <MobileLayout className="bg-gradient-to-b from-purple-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg"
          >
            <Lock size={48} className="text-white" />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Halving Practice</h1>
            <p className="text-slate-600">Unlocks at Level {UNLOCK_LEVEL}</p>
          </div>
          
          <Card className="w-full max-w-sm p-6 text-center">
            <p className="text-slate-600">
              You're currently at Level {level}. Keep practicing to unlock this skill drill!
            </p>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-400 rounded-full transition-all"
                style={{ width: `${(level / UNLOCK_LEVEL) * 100}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{UNLOCK_LEVEL - level} levels to go</p>
          </Card>
          
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
  
  // Intro screen
  if (step === 'intro') {
    return (
      <MobileLayout className="bg-gradient-to-b from-purple-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg"
          >
            <Scissors size={48} className="text-white" />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Halving Practice</h1>
            <p className="text-slate-600">Halve each number as fast as you can</p>
          </div>
          
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-purple-500" />
                <span>3 minutes of focused practice</span>
              </div>
              <div className="flex items-center gap-3">
                <CircleDot size={18} className="text-purple-500" />
                <span>See a number, halve it</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-purple-500" />
                <span>20 XP per correct answer</span>
              </div>
            </div>
          </Card>
          
          <Button
            size="lg"
            className="w-full max-w-sm h-14 text-lg bg-purple-500 hover:bg-purple-600"
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
      <MobileLayout className="bg-gradient-to-b from-purple-50 to-white">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-8xl font-black text-purple-500"
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
      <MobileLayout className="bg-gradient-to-b from-purple-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold text-slate-900">Practice Complete!</h1>
            <p className="text-slate-600">Great work on your halving skills</p>
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
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600">+{result.xpEarned}</div>
                <div className="text-sm text-purple-600">XP Earned</div>
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
              className="flex-1 h-12 bg-purple-500 hover:bg-purple-600"
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
    <MobileLayout className="bg-white overflow-hidden">
      <AnimatePresence>
        {flash && <FullScreenFlash type={flash} />}
      </AnimatePresence>
      
      {/* Tap anywhere to submit layer */}
      <div 
        className="absolute inset-x-0 top-0 bottom-[320px] z-10 cursor-pointer"
        onClick={() => input && handleSubmit()}
      />
      
      <div className="relative z-20 flex flex-col h-full pointer-events-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b pointer-events-auto">
          <button onClick={() => navigate('/train')} className="p-2 -ml-2">
            <X size={24} className="text-slate-400" />
          </button>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Clock size={20} className="text-purple-500" />
            <span className={clsx(timeLeft <= 10 && "text-red-500")}>{formatTime(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600 font-medium">
            <Zap size={18} />
            <span>{correctCount * 20}</span>
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
              <div className="text-lg text-slate-500 font-medium">Halve this number</div>
              <div className="text-6xl font-bold text-slate-900">
                {question.number % 1 === 0 ? question.number : question.number.toFixed(1)}
              </div>
              
              {/* Answer display */}
              <div className="h-16 flex items-center justify-center">
                <div className={clsx(
                  "text-4xl font-bold min-w-[120px] border-b-4 pb-2",
                  input ? "text-slate-900 border-purple-400" : "text-slate-300 border-slate-200"
                )}>
                  {input || '?'}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Stats row */}
          <div className="flex gap-6 mt-8 text-sm text-slate-500">
            <div>Correct: <span className="font-semibold text-slate-900">{correctCount}</span></div>
            <div>Streak: <span className="font-semibold text-purple-600">{streak}</span></div>
          </div>
        </div>
      </div>
      
      {/* Keypad */}
      <div className="relative z-20 pointer-events-auto">
        <KeypadModern
          onPress={handleKeyPress}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          submitDisabled={!input}
        />
      </div>
    </MobileLayout>
  );
}
