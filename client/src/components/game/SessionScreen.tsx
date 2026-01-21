import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
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
  
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<number[]>([]);
  
  const settings = useStore(s => s.settings);

  useEffect(() => {
    nextQuestion();
    setIsActive(true);
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isActive || durationSeconds === 'unlimited') return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        // Subtle tick for last 10 seconds, only if no feedback active
        if (prev <= 11 && settings.soundOn && !feedback) {
          AudioManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, durationSeconds, feedback, settings.soundOn]);

  const nextQuestion = () => {
    setQuestion(generateQuestion(tier));
    setInput('');
    setFeedback(null);
    setFlash(null);
    questionStartTimeRef.current = Date.now();
  };

  const endSession = () => {
    setIsActive(false);
    const duration = (Date.now() - startTimeRef.current) / 1000;
    
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
      avgResponseTimeMs: responseTimesRef.current.length > 0 ? responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length : 0
    };
    onComplete(stats);
  };

  const handleSubmit = (overrideInput?: string) => {
    if (!question || feedback) return;
    const currentInput = overrideInput !== undefined ? overrideInput : input;
    if (!currentInput) return;
    
    const val = parseFloat(currentInput);
    const isCorrect = Math.abs(val - (question?.answer ?? 0)) < 0.001;
    const timeTaken = Date.now() - questionStartTimeRef.current;
    
    setTotalCount(prev => prev + 1);
    responseTimesRef.current.push(timeTaken);

    if (isCorrect) {
      if (settings.soundOn) AudioManager.playCorrect();
      const xp = calculateXP(true, timeTaken, streak);
      setScore(prev => prev + xp);
      setCorrectCount(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');
      setFlash('correct');
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(5); // Even softer haptic
      
      setTimeout(nextQuestion, 120); // Brief feedback ≤120ms flash duration essentially
    } else {
      if (settings.soundOn) AudioManager.playWrong();
      setStreak(0);
      setFeedback('wrong');
      setFlash('wrong');
      // No aggressive shake per requirements
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(20);
      setTimeout(nextQuestion, 900);
    }

    if (mode === 'assessment') {
        if (isCorrect && streak > 0 && streak % 3 === 0 && tier < TIERS - 1) setTier(t => t + 1);
        if (!isCorrect && tier > 0) setTier(t => Math.max(0, t - 1));
    }
  };

  return (
    <MobileLayout className={clsx(
      "transition-colors duration-100", // Faster transition
      flash === 'correct' ? "bg-emerald-500/10" : // Lower opacity
      flash === 'wrong' ? "bg-rose-500/10" : 
      "bg-zinc-50"
    )}>
      <div className="flex justify-between items-center px-6 py-4 safe-top">
        <button onClick={onExit} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600">
            <X size={24} />
        </button>
        
        {durationSeconds !== 'unlimited' && (
            <motion.div 
              animate={timeLeft <= 10 ? { scale: [1, 1.06, 1], color: ['#ef4444', '#f87171', '#ef4444'] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className={clsx(
                "font-mono text-xl font-bold tabular-nums",
                timeLeft <= 10 ? "text-rose-500" : "text-zinc-400"
              )}
            >
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </motion.div>
        )}
        
        <div className="text-sm font-bold text-primary">XP {score}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <AnimatePresence mode="wait">
            {question && (
                <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-8"
                >
                    <h2 className="text-6xl font-bold tracking-tight text-foreground/90">
                        {question.text}
                    </h2>
                    
                    <button 
                      onClick={() => handleSubmit()}
                      className={clsx(
                        "h-24 min-w-[200px] px-8 rounded-3xl flex items-center justify-center text-5xl font-mono font-medium transition-all border-2 active:scale-95",
                        feedback === 'correct' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                        feedback === 'wrong' ? "bg-rose-50 border-rose-100 text-rose-600" :
                        "bg-white border-zinc-100 text-foreground shadow-sm hover:border-primary/30"
                      )}
                    >
                        {feedback === 'wrong' ? (
                            <span className="text-rose-500 text-2xl">Ans: {question.answer}</span>
                        ) : (
                            input || <span className="opacity-10">?</span>
                        )}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <KeypadModern 
        onPress={(k) => {
            if (input.length < 6) setInput(prev => prev + k);
        }}
        onDelete={() => setInput(prev => prev.slice(0, -1))}
        onSubmit={() => handleSubmit()}
        submitDisabled={input.length === 0}
        disabled={feedback !== null}
      />
    </MobileLayout>
  );
}
