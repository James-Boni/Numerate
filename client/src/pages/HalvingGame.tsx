import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Scissors } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { clsx } from 'clsx';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency, applyXPAndLevelUp } from '@/lib/logic/xp-system';
import { Card } from '@/components/ui/card';
import { AnswerFeedback } from '@/components/game/AnswerFeedback';
import { StreakIndicator } from '@/components/game/StreakIndicator';
import { AnimatedXP } from '@/components/game/AnimatedXP';
import { SkillDrillPreGame } from '@/components/game/SkillDrillPreGame';
import { generateHalvingQuestion, getTier } from '@/lib/skill-drill-difficulty';

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
  highestTier: number;
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

export default function HalvingGame() {
  const [, navigate] = useLocation();
  const { settings, level, saveSession, xpIntoLevel, updateSkillDrillBests, skillDrillBests } = useStore();
  
  const [step, setStep] = useState<GameStep>('pregame');
  const [countdown, setCountdown] = useState(3);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<HalvingQuestion | null>(null);
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
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const bestStreakRef = useRef(0);
  const highestTierRef = useRef(0);
  
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
    correctCountRef.current = 0;
    totalCountRef.current = 0;
    bestStreakRef.current = 0;
    highestTierRef.current = 0;
    setResult(null);
  }, [selectedDuration]);
  
  const nextQuestion = useCallback(() => {
    const tier = getTier(correctCountRef.current);
    setCurrentTier(tier);
    if (tier > highestTierRef.current) {
      highestTierRef.current = tier;
      setHighestTier(tier);
    }
    const q = generateHalvingQuestion(tier);
    setQuestion(q);
    setInput('');
    questionStartRef.current = Date.now();
  }, []);
  
  // Countdown effect
  useEffect(() => {
    if (step !== 'countdown') return;
    if (countdown > 0 && countdown <= 3) {
      if (settings.soundOn) AudioManager.playCountdownHorn();
    }
    if (countdown <= 0) {
      if (settings.soundOn) AudioManager.playGoHorn();
      setStep('active');
      startTimeRef.current = Date.now();
      nextQuestion();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, nextQuestion, settings.soundOn]);
  
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
    totalCountRef.current += 1;
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      correctCountRef.current += 1;
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        bestStreakRef.current = newStreak;
      }
      setFlash('correct');
      setFeedback('correct');
      
      const newTier = getTier(correctCountRef.current);
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
    const finalCorrect = correctCountRef.current;
    const finalTotal = totalCountRef.current;
    const finalBestStreak = bestStreakRef.current;
    const finalHighestTier = highestTierRef.current;
    
    const times = responseTimesRef.current;
    const medianMs = times.length > 0 
      ? times.sort((a, b) => a - b)[Math.floor(times.length / 2)] 
      : 3000;
    
    const accuracy = finalTotal > 0 ? finalCorrect / finalTotal : 0;
    const xpEarned = finalCorrect * 5 + (finalBestStreak >= 5 ? 35 : 0);
    
    const fluencyMetrics = computeFluency(finalTotal, finalCorrect, selectedDuration, times);
    
    const levelResult = applyXPAndLevelUp(level, xpIntoLevel, xpEarned);
    
    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      sessionType: 'halving_practice',
      durationMode: selectedDuration as 60 | 120 | 180,
      durationSecondsActual: selectedDuration,
      totalQuestions: finalTotal,
      correctQuestions: finalCorrect,
      accuracy,
      avgResponseTimeMs: medianMs,
      medianMs,
      xpEarned,
      fluencyScore: fluencyMetrics.fluencyScore,
      levelBefore: levelResult.levelBefore,
      levelAfter: levelResult.levelAfter,
      levelUpCount: levelResult.levelUpCount,
      xpIntoLevelBefore: levelResult.xpIntoLevelBefore,
      xpIntoLevelAfter: levelResult.xpIntoLevelAfter,
      bestStreak: finalBestStreak
    };
    
    saveSession(sessionStats);
    updateSkillDrillBests('halving', finalCorrect, finalBestStreak);
    
    const computedHighestTier = Math.max(finalHighestTier, getTier(finalCorrect));
    
    setResult({
      totalQuestions: finalTotal,
      correctQuestions: finalCorrect,
      accuracy,
      medianMs,
      xpEarned,
      highestTier: computedHighestTier
    });
    setStep('results');
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const isNewPersonalBest = result && result.correctQuestions > 0 && 
    result.correctQuestions > (skillDrillBests.halving.bestScore || 0);
  
  const getEncouragingMessage = (correct: number, accuracy: number) => {
    if (accuracy >= 0.95 && correct >= 20) return "Outstanding performance! 🌟";
    if (accuracy >= 0.9 && correct >= 15) return "Excellent work!";
    if (accuracy >= 0.8 && correct >= 10) return "Great job!";
    if (correct >= 5) return "Good practice session!";
    return "Keep practicing!";
  };
  
  // Pregame screen
  if (step === 'pregame') {
    return (
      <MobileLayout className="bg-gradient-to-b from-purple-50 to-white">
        <SkillDrillPreGame
          gameType="halving"
          title="Halving Practice"
          description="Halve numbers as fast as you can. Difficulty increases as you go!"
          icon={<Scissors size={40} className="text-primary" />}
          onStart={(duration) => { setSelectedDuration(duration); setStep('countdown'); }}
          onBack={() => navigate('/train')}
        />
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
            {isNewPersonalBest ? (
              <motion.p 
                initial={{ scale: 0.9 }} 
                animate={{ scale: [0.9, 1.1, 1] }}
                className="text-lg font-semibold text-amber-600"
              >
                🎉 New Personal Best! 🎉
              </motion.p>
            ) : (
              <p className="text-slate-600">{getEncouragingMessage(result.correctQuestions, result.accuracy)}</p>
            )}
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
            
            <div className="text-center pt-2 border-t border-slate-100">
              <div className="text-sm text-slate-500">Highest Tier: <span className="font-semibold text-slate-700">{result.highestTier + 1}</span></div>
            </div>
          </Card>
          
          <div className="space-y-3 mt-6 w-full max-w-sm">
            <Button
              onClick={() => { resetGameState(); setStep('countdown'); }}
              className="w-full h-12 font-bold bg-purple-500 hover:bg-purple-600"
            >
              Play Again ({selectedDuration >= 60 ? `${selectedDuration / 60}min` : `${selectedDuration}s`})
            </Button>
            <Button
              variant="outline"
              onClick={() => { resetGameState(); setStep('pregame'); }}
              className="w-full h-12"
            >
              Change Duration
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/train')}
              className="w-full h-12 text-slate-500"
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
            {skillDrillBests.halving.bestScore > 0 && correctCount >= skillDrillBests.halving.bestScore - 3 && correctCount < skillDrillBests.halving.bestScore && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xs text-amber-600 font-medium">
                {skillDrillBests.halving.bestScore - correctCount} more to beat your best!
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StreakIndicator streak={streak} />
            <AnimatedXP value={correctCount * 5} soundEnabled={settings.soundOn} />
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
                <div className="text-lg text-slate-500 font-medium">Halve this number</div>
                <div className="text-6xl font-bold text-slate-900">
                  {question.number % 1 === 0 ? question.number : question.number.toFixed(1)}
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
