import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Copy } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency } from '@/lib/logic/xp-system';
import { Card } from '@/components/ui/card';
import { AnswerFeedback } from '@/components/game/AnswerFeedback';
import { StreakIndicator } from '@/components/game/StreakIndicator';
import { AnimatedXP } from '@/components/game/AnimatedXP';
import { SkillDrillPreGame } from '@/components/game/SkillDrillPreGame';
import { generateDoublingQuestion, getTier } from '@/lib/skill-drill-difficulty';

interface DoublingQuestion {
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
  highestTier: number;
  isNewBest: boolean;
}

type GameStep = 'pregame' | 'countdown' | 'active' | 'results';

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

export default function DoublingGame() {
  const [, navigate] = useLocation();
  const { settings, level, saveSession, xpIntoLevel, updateSkillDrillBests, skillDrillBests } = useStore();
  
  const [step, setStep] = useState<GameStep>('pregame');
  const [countdown, setCountdown] = useState(3);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<DoublingQuestion | null>(null);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentTier, setCurrentTier] = useState(0);
  const [highestTier, setHighestTier] = useState(0);
  
  const responseTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());
  const sessionEndedRef = useRef(false);
  
  const [result, setResult] = useState<GameResult | null>(null);
  
  const resetGameState = useCallback(() => {
    setCorrectCount(0);
    setTotalCount(0);
    setStreak(0);
    setBestStreak(0);
    setCurrentTier(0);
    setHighestTier(0);
    setCountdown(3);
    setTimeLeft(selectedDuration);
    setQuestion(null);
    setInput('');
    setFlash(null);
    setFeedback(null);
    responseTimesRef.current = [];
    sessionEndedRef.current = false;
    setResult(null);
  }, [selectedDuration]);
  
  const nextQuestion = useCallback(() => {
    const tier = getTier(correctCount);
    setCurrentTier(tier);
    if (tier > highestTier) setHighestTier(tier);
    
    const q = generateDoublingQuestion(tier);
    setQuestion(q);
    setInput('');
    questionStartRef.current = Date.now();
  }, [correctCount, highestTier]);
  
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
      const remaining = Math.max(0, selectedDuration * 1000 - elapsed);
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
  }, [step, selectedDuration]);
  
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
    if (!question || input === '' || step !== 'active' || feedback) return;
    
    const userAnswer = parseFloat(input);
    const isCorrect = Math.abs(userAnswer - question.answer) < 0.001;
    const responseTime = Date.now() - questionStartRef.current;
    responseTimesRef.current.push(responseTime);
    
    setTotalCount(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFlash('correct');
      setFeedback('correct');
      
      const newTier = getTier(correctCount + 1);
      if (newTier > currentTier && settings.soundOn) {
        AudioManager.playStreakCelebration(3);
      }
      
      if (settings.soundOn) {
        AudioManager.playCorrect(newStreak);
        if ([3, 5, 10, 15, 20].includes(newStreak)) {
          AudioManager.playStreakCelebration(newStreak);
        }
      }
      
      const delay = [3, 5, 10, 15, 20].includes(newStreak) ? 300 : 100;
      setTimeout(() => {
        setFlash(null);
        setFeedback(null);
        nextQuestion();
      }, delay);
    } else {
      setStreak(0);
      setFlash('wrong');
      setFeedback('wrong');
      if (settings.soundOn) AudioManager.playWrong();
      
      setTimeout(() => {
        setFlash(null);
        setFeedback(null);
        nextQuestion();
      }, 400);
    }
  };
  
  const endSession = () => {
    const times = responseTimesRef.current;
    const medianMs = times.length > 0 
      ? times.sort((a, b) => a - b)[Math.floor(times.length / 2)] 
      : 3000;
    
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const xpEarned = correctCount * 4 + (bestStreak >= 5 ? 30 : 0);
    
    const fluencyMetrics = computeFluency(totalCount, correctCount, selectedDuration, times);
    
    const isNewBest = correctCount > skillDrillBests.doubling.bestScore;
    
    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      sessionType: 'doubling_practice',
      durationMode: selectedDuration as 60 | 120 | 180,
      durationSecondsActual: selectedDuration,
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
    updateSkillDrillBests('doubling', correctCount, bestStreak);
    
    setResult({
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy,
      medianMs,
      xpEarned,
      highestTier: highestTier,
      isNewBest
    });
    setStep('results');
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const getPerformanceMessage = (correct: number, accuracy: number, tier: number) => {
    if (tier >= 5 && accuracy >= 0.9) return "Outstanding performance! You're a doubling master! 🏆";
    if (tier >= 4 && accuracy >= 0.85) return "Excellent work! You've reached advanced levels! ⭐";
    if (tier >= 3 && accuracy >= 0.8) return "Great job! You're building strong doubling skills! 💪";
    if (tier >= 2 && accuracy >= 0.7) return "Nice progress! Keep practicing to level up! 📈";
    if (correct >= 10) return "Good start! Practice more to improve your speed! 🎯";
    return "Keep going! Every practice session makes you stronger! 💫";
  };
  
  // Pregame screen
  if (step === 'pregame') {
    return (
      <MobileLayout className="bg-gradient-to-b from-blue-50 to-white">
        <SkillDrillPreGame
          gameType="doubling"
          title="Doubling Practice"
          description="Double numbers as fast as you can. Difficulty increases as you go!"
          icon={<Copy size={40} className="text-primary" />}
          onStart={(duration) => { setSelectedDuration(duration); setStep('countdown'); }}
          onBack={() => navigate('/train')}
        />
      </MobileLayout>
    );
  }
  
  // Countdown screen
  if (step === 'countdown') {
    return (
      <MobileLayout className="bg-gradient-to-b from-blue-50 to-white">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-8xl font-black text-blue-500"
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
      <MobileLayout className="bg-gradient-to-b from-blue-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold text-slate-900">Practice Complete!</h1>
            {result.isNewBest && (
              <motion.p 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="text-lg font-semibold text-amber-600"
              >
                🎉 New Personal Best! 🎉
              </motion.p>
            )}
            <p className="text-slate-600">{getPerformanceMessage(result.correctQuestions, result.accuracy, result.highestTier)}</p>
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
                <div className="text-3xl font-bold text-purple-600">{result.highestTier + 1}</div>
                <div className="text-sm text-purple-600">Highest Tier</div>
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">+{result.xpEarned}</div>
              <div className="text-sm text-blue-600">XP Earned</div>
            </div>
          </Card>
          
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <Button
              className="w-full h-12 bg-blue-500 hover:bg-blue-600"
              onClick={() => { resetGameState(); setStep('countdown'); }}
            >
              Play Again ({selectedDuration >= 60 ? `${selectedDuration / 60}min` : `${selectedDuration}s`})
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                resetGameState();
                setStep('pregame');
              }}
            >
              Change Duration
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12"
              onClick={() => navigate('/train')}
            >
              Done
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }
  
  // Active game screen
  return (
    <MobileLayout className="bg-white overflow-hidden">
      {/* Background Flash Layer */}
      <div 
        className={clsx(
          "absolute inset-x-0 top-0 bottom-[320px] z-0 transition-colors duration-150",
          flash === 'correct' ? "bg-teal-500/10" : 
          flash === 'wrong' ? "bg-amber-500/10" : 
          "bg-transparent"
        )}
      />
      
      {/* Answer Feedback Overlay */}
      <AnswerFeedback type={feedback} streak={streak} />
      
      {/* Tap anywhere to submit layer */}
      <div 
        className="absolute inset-x-0 top-0 bottom-[320px] z-10 cursor-pointer"
        onClick={() => input && handleSubmit()}
      />
      
      <div className="relative z-20 flex flex-col h-full pointer-events-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 pointer-events-auto">
          <button onClick={() => navigate('/train')} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600">
            <X size={24} />
          </button>
          <div className="flex flex-col items-center">
            <motion.div 
              animate={timeLeft <= 10 ? { scale: [1, 1.06, 1], color: ['#ef4444', '#f87171', '#ef4444'] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className={clsx(
                "font-mono text-xl font-bold tabular-nums",
                timeLeft <= 10 ? "text-rose-500" : "text-zinc-400"
              )}
            >
              {formatTime(timeLeft)}
            </motion.div>
            <div className="text-xs text-slate-400 font-medium">Tier {currentTier + 1}</div>
            {skillDrillBests.doubling.bestScore > 0 && correctCount >= skillDrillBests.doubling.bestScore - 3 && correctCount < skillDrillBests.doubling.bestScore && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xs text-amber-600 font-medium">
                {skillDrillBests.doubling.bestScore - correctCount} more to beat your best!
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StreakIndicator streak={streak} />
            <AnimatedXP value={correctCount * 4} soundEnabled={settings.soundOn} />
          </div>
        </div>
        
        {/* Question display */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AnimatePresence mode="wait">
            {question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6"
              >
                <div className="text-lg text-slate-500 font-medium">Double this number</div>
                <div className="text-6xl font-bold text-slate-900">
                  {question.number % 1 === 0 ? question.number : question.number.toFixed(2)}
                </div>
                
                {/* Answer display */}
                <div className="h-16 flex items-center justify-center">
                  <div className={clsx(
                    "text-4xl font-bold min-w-[120px] border-b-4 pb-2",
                    input ? "text-slate-900 border-primary" : "text-slate-300 border-slate-200"
                  )}>
                    {input || '?'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Keypad */}
      <div className="relative z-20 pointer-events-auto">
        <KeypadModern
          onPress={handleKeyPress}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          submitDisabled={!input || !!feedback}
        />
      </div>
    </MobileLayout>
  );
}
