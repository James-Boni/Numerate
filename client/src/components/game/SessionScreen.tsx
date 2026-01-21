import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { clsx } from 'clsx';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { KeypadModern } from '@/components/game/Keypad';
import { generateQuestion, calculateXP, Question, TIERS } from '@/lib/game-logic';
import { useStore, SessionStats } from '@/lib/store';
import { AudioManager } from '@/lib/audio';

interface SessionScreenProps {
  mode: 'assessment' | 'training';
  durationSeconds: number | 'unlimited';
  initialTier: number;
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
}

export function SessionScreen({ mode, durationSeconds, initialTier, onComplete, onExit }: SessionScreenProps) {
  const [tier, setTier] = useState(initialTier);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(typeof durationSeconds === 'number' ? durationSeconds : 0);
  const [isActive, setIsActive] = useState(false);
  
  // Stats
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  
  // Feedback State
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [shake, setShake] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<number[]>([]);
  
  const settings = useStore(s => s.settings);

  // Init
  useEffect(() => {
    nextQuestion();
    setIsActive(true);
    startTimeRef.current = Date.now();
  }, []);

  // Timer
  useEffect(() => {
    if (!isActive || durationSeconds === 'unlimited') return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, durationSeconds]);

  const nextQuestion = () => {
    setQuestion(generateQuestion(tier));
    setInput('');
    setFeedback(null);
    questionStartTimeRef.current = Date.now();
  };

  const endSession = () => {
    setIsActive(false);
    const endTime = Date.now();
    const duration = (endTime - startTimeRef.current) / 1000;
    
    // Calculate stats
    const avgTime = responseTimesRef.current.length > 0 
      ? responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length 
      : 0;

    const stats: SessionStats = {
      id: Math.random().toString(36),
      date: new Date().toISOString(),
      durationMode: durationSeconds === 'unlimited' ? 'unlimited' : (durationSeconds as any),
      durationSecondsActual: duration,
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy: totalCount > 0 ? correctCount / totalCount : 0,
      xpEarned: score,
      bestStreak: bestStreak,
      avgResponseTimeMs: avgTime
    };
    
    onComplete(stats);
  };

  const handlePress = (key: string) => {
    if (feedback) return; // Block input during feedback
    if (key === '.') {
        if (!input.includes('.')) setInput(prev => prev + key);
    } else {
        if (input.length < 6) setInput(prev => prev + key);
    }
  };

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!question || feedback) return;
    
    const val = parseFloat(input);
    const isCorrect = Math.abs(val - (question?.answer ?? 0)) < 0.001;
    const timeTaken = Date.now() - questionStartTimeRef.current;
    
    setTotalCount(prev => prev + 1);
    responseTimesRef.current.push(timeTaken);

    if (isCorrect) {
      // Correct
      AudioManager.playCorrect();
      const xp = calculateXP(true, timeTaken, streak);
      setScore(prev => prev + xp);
      setCorrectCount(prev => prev + 1);
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      
      setFeedback('correct');
      // Play sound (mock)
      if (settings.soundOn) { /* play correct sound */ }
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(10);

      // Instant transition for correct
      setTimeout(() => {
        nextQuestion();
      }, 400); // Short delay to see checkmark

      // Adaptive Tier Logic (Simple)
      // Every 5 correct in a row -> tier up?
      if (mode === 'assessment' && newStreak % 3 === 0 && tier < TIERS - 1) {
          setTier(t => t + 1);
      }

    } else {
      // Wrong
      AudioManager.playWrong();
      setStreak(0);
      setFeedback('wrong');
      setShake(true);
      if (settings.soundOn) { /* play wrong sound */ }
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(50);
      
      // Delay to show correct answer or just shake?
      // Spec: "gentle shake animation + Correct: X shown briefly (600–900ms)"
      setTimeout(() => {
        setShake(false);
        nextQuestion();
      }, 900);
      
      if (mode === 'assessment' && tier > 0) {
          setTier(t => Math.max(0, t - 1));
      }
    }
  };

  return (
    <MobileLayout className="bg-zinc-50">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 safe-top">
        <button onClick={onExit} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600">
            <X size={24} />
        </button>
        
        {durationSeconds !== 'unlimited' && (
            <div className="font-mono text-xl font-bold text-zinc-400 tabular-nums">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
        )}
        
        <div className="flex items-center gap-1">
            <div className="text-sm font-bold text-primary">XP {score}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-200">
        <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: durationSeconds !== 'unlimited' ? `${((durationSeconds - timeLeft) / durationSeconds) * 100}%` : '100%' }}
        />
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <AnimatePresence mode="wait">
            {question && (
                <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={clsx("flex flex-col items-center gap-8", shake && "animate-shake")}
                >
                    <h2 className="text-6xl font-bold tracking-tight text-foreground/90">
                        {question.text}
                    </h2>
                    
                    <div className={clsx(
                        "h-20 min-w-[180px] px-6 rounded-2xl flex items-center justify-center text-4xl font-mono font-medium transition-colors border-2",
                        feedback === 'correct' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                        feedback === 'wrong' ? "bg-rose-50 border-rose-200 text-rose-600" :
                        "bg-white border-zinc-200 text-foreground shadow-sm"
                    )}>
                        {feedback === 'wrong' ? (
                            <span className="text-rose-500 text-xl">Ans: {question.answer}</span>
                        ) : (
                            input || <span className="opacity-20 animate-pulse">|</span>
                        )}
                        
                        {feedback === 'correct' && (
                            <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }}
                                className="absolute -right-8"
                            >
                                <Check className="text-emerald-500 w-8 h-8" strokeWidth={3} />
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Streak Indicator */}
        {streak > 2 && (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-10 flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
             >
                🔥 Streak {streak}
             </motion.div>
        )}
      </div>

      {/* Keypad */}
      <KeypadModern 
        onPress={handlePress}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        submitDisabled={input.length === 0}
        disabled={feedback !== null}
      />
    </MobileLayout>
  );
}
