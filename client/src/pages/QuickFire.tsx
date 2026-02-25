import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useLocation } from 'wouter';
import { useStore, SessionStats } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Clock, Trophy, Flame, Plus, AlertTriangle } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';
import { clsx } from 'clsx';
import { generateQuestionForLevel, resetOperationScheduler } from '@/lib/logic/generator_adapter';
import { KeypadModern } from '@/components/game/Keypad';
import { computeFluency, calculateCombinedSessionXP } from '@/lib/logic/xp-system';
import { MODE_MULTIPLIERS } from '@/config/progression';
import { Card } from '@/components/ui/card';
import { validateAnswer, DEFAULT_ANSWER_FORMAT, AnswerFormat, QuestionTier, selectQuestionTier, getAnswerFormatLabel, calculateXP, getTierXpMultiplier } from '@/lib/game-logic';

interface Question {
  id: string;
  text: string;
  answer: number;
  operation: string;
  answerFormat?: AnswerFormat;
  tier?: QuestionTier;
}

interface QuickFireResult {
  score: number;
  attemptedN: number;
  correctC: number;
  accuracy: number;
  medianMs: number;
  remainingTimeAtEnd: number;
  inGameXP: number;
  bonusXP: number;
  finalSessionXP: number;
  highestLevelReached: number;
  startingLevel: number;
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

function getQuickFireEncouragement(levelsAboveStart: number): string {
  if (levelsAboveStart >= 30) return "Elite performance. Very few get this far.";
  if (levelsAboveStart >= 20) return "Exceptional. That's serious mental agility.";
  if (levelsAboveStart >= 12) return "Impressive range. You're sharper than you think.";
  if (levelsAboveStart >= 6) return "Nice push! You handled the pressure well.";
  if (levelsAboveStart >= 3) return "Solid warm-up. You're just getting started.";
  return "Every run builds speed. Keep going.";
}

export default function QuickFire() {
  const [step, setStep] = useState<GameStep>('intro');
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [remainingTime, setRemainingTime] = useState(5.0);
  const [score, setScore] = useState(0);
  const [inGameXP, setInGameXP] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [results, setResults] = useState<QuickFireResult | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showFlash, setShowFlash] = useState<'correct' | 'wrong' | null>(null);
  
  const [_, setLocation] = useLocation();
  const { 
    level, 
    settings, 
    quickFireHighScore,
    updateQuickFireHighScore,
    saveSession,
    hasCompletedAssessment 
  } = useStore();

  const [currentEffectiveLevel, setCurrentEffectiveLevel] = useState(level);
  
  const scoreRef = useRef(0);
  const inGameXPRef = useRef(0);
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const responseTimesRef = useRef<number[]>([]);
  const questionStartTimeRef = useRef<number>(performance.now());
  const startTimeRef = useRef<number>(performance.now());
  const remainingTimeRef = useRef(5.0);
  const lastTickRef = useRef<number>(performance.now());
  const timerRef = useRef<number | null>(null);
  const tickSoundRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const gameActiveRef = useRef(false);
  const hasEndedRef = useRef(false);
  const highestLevelRef = useRef(level);
  const effectiveLevelRef = useRef(level);

  useEffect(() => {
    AudioManager.init();
    if (!hasCompletedAssessment) {
      setLocation('/train');
    }
  }, [hasCompletedAssessment, setLocation]);

  const questionCountRef = useRef(0);
  
  const generateNextQuestion = useCallback(() => {
    const correctSoFar = correctCountRef.current;
    const rampSteps = Math.floor(correctSoFar / 3);
    const effectiveLevel = Math.max(1, level + rampSteps * 3);
    effectiveLevelRef.current = effectiveLevel;
    if (effectiveLevel > highestLevelRef.current) {
      highestLevelRef.current = effectiveLevel;
    }
    setCurrentEffectiveLevel(effectiveLevel);
    
    const tier = selectQuestionTier(questionCountRef.current);
    questionCountRef.current++;
    const result = generateQuestionForLevel(effectiveLevel, [], tier);
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: result.text,
      answer: result.answer,
      operation: result.operation,
      answerFormat: result.answerFormat,
      tier: result.tier,
    };
    setQuestion(newQuestion);
    setInput('');
    setFeedback(null);
    questionStartTimeRef.current = performance.now();
    isSubmittingRef.current = false;
  }, [level]);

  const stopAllTimers = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    if (tickSoundRef.current) {
      clearInterval(tickSoundRef.current);
      tickSoundRef.current = null;
    }
  }, []);

  const endRun = useCallback((reason: 'wrong' | 'timeout') => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    gameActiveRef.current = false;
    stopAllTimers();
    
    const durationSeconds = (performance.now() - startTimeRef.current) / 1000;
    const finalScore = scoreRef.current;
    const finalInGameXP = inGameXPRef.current;
    const correctC = correctCountRef.current;
    const attemptedN = totalCountRef.current;
    const remainingTimeAtEnd = Math.max(0, remainingTimeRef.current);
    
    const accuracy = attemptedN > 0 ? correctC / attemptedN : 0;
    const { fluencyMetrics, xpResult } = calculateCombinedSessionXP(
      'quick_fire',
      finalInGameXP,
      attemptedN,
      correctC,
      durationSeconds,
      responseTimesRef.current
    );
    
    const bonusXP = xpResult.bonusXP;
    const finalSessionXP = xpResult.finalSessionXP;
    
    console.log("QUICKFIRE_SUMMARY", 
      `score=${finalScore}`,
      `attempts=${attemptedN}`,
      `correct=${correctC}`,
      `finalSessionXP=${finalSessionXP}`,
      `appliedXP=${finalSessionXP}`
    );

    const isNewBest = updateQuickFireHighScore(finalScore);
    setIsNewHighScore(isNewBest);
    
    if (isNewBest) {
      if (settings.soundOn) setTimeout(() => AudioManager.playCheer(), 300);
      if (settings.hapticsOn) HapticsManager.highScore();
    }

    const resultObj: QuickFireResult = {
      score: finalScore,
      attemptedN,
      correctC,
      accuracy,
      medianMs: fluencyMetrics.medianMs,
      remainingTimeAtEnd,
      inGameXP: finalInGameXP,
      bonusXP,
      finalSessionXP,
      highestLevelReached: highestLevelRef.current,
      startingLevel: level,
    };

    const sessionStats: SessionStats = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      sessionType: 'quick_fire',
      durationMode: 'unlimited',
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
      modeMultiplier: xpResult.modeMultiplier,
      excellenceMultiplierApplied: xpResult.meetsExcellence ? 1.0 : 0,
      eliteMultiplierApplied: xpResult.meetsElite ? 1.0 : 0,
      finalSessionXP,
      responseTimes: [...responseTimesRef.current],
    };

    saveSession(sessionStats);
    setResults(resultObj);
    setStep('results');
  }, [settings.soundOn, updateQuickFireHighScore, saveSession, stopAllTimers]);

  const startTimerLoop = useCallback(() => {
    lastTickRef.current = performance.now();
    
    const tick = () => {
      if (!gameActiveRef.current) return;
      
      const now = performance.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - delta);
      setRemainingTime(remainingTimeRef.current);
      
      if (remainingTimeRef.current <= 0) {
        totalCountRef.current += 1;
        setShowFlash('wrong');
        if (settings.soundOn) AudioManager.playWrong();
        if (settings.hapticsOn) HapticsManager.wrongAnswer();
        endRun('timeout');
        return;
      }
      
      timerRef.current = requestAnimationFrame(tick);
    };
    
    timerRef.current = requestAnimationFrame(tick);
    
    tickSoundRef.current = setInterval(() => {
      if (settings.soundOn && gameActiveRef.current) {
        AudioManager.playQuickTick();
      }
    }, 800);
  }, [settings.soundOn, endRun]);

  const handleSubmit = useCallback(() => {
    if (!question || isSubmittingRef.current || !gameActiveRef.current) return;
    if (!input) return;
    if (settings.hapticsOn) HapticsManager.submitTap();
    
    isSubmittingRef.current = true;
    
    const now = performance.now();
    const responseTime = now - questionStartTimeRef.current;
    
    const answerFormat = question.answerFormat ?? DEFAULT_ANSWER_FORMAT;
    const isCorrect = validateAnswer(input, question.answer, answerFormat);
    
    totalCountRef.current += 1;
    responseTimesRef.current.push(responseTime);
    
    if (isCorrect) {
      correctCountRef.current += 1;
      scoreRef.current += 1;
      const streak = scoreRef.current;
      const tier = question.tier || 'core';
      const tierMultiplier = getTierXpMultiplier(tier);
      const modeMultiplier = MODE_MULTIPLIERS['quick_fire'] ?? 0.5;
      const baseXp = calculateXP(true, responseTime, streak);
      const xp = Math.round(baseXp * tierMultiplier * modeMultiplier);
      inGameXPRef.current += xp;
      
      remainingTimeRef.current = remainingTimeRef.current + 5.0;
      
      setScore(scoreRef.current);
      setInGameXP(inGameXPRef.current);
      setRemainingTime(remainingTimeRef.current);
      setFeedback('correct');
      setShowFlash('correct');
      
      if (settings.soundOn) AudioManager.playCorrect();
      if (settings.hapticsOn) HapticsManager.correctAnswer();
      
      setTimeout(() => {
        setShowFlash(null);
        if (gameActiveRef.current) {
          generateNextQuestion();
        }
      }, 150);
    } else {
      setFeedback('wrong');
      setShowFlash('wrong');
      if (settings.soundOn) AudioManager.playWrong();
      if (settings.hapticsOn) HapticsManager.wrongAnswer();
      
      setTimeout(() => {
        endRun('wrong');
      }, 200);
    }
  }, [question, input, settings.soundOn, generateNextQuestion, endRun]);

  const handleKeypadPress = useCallback((key: string) => {
    if (feedback) return;
    if (settings.soundOn) AudioManager.playTap();
    if (settings.hapticsOn) HapticsManager.keyTap();
    setInput(prev => prev + key);
  }, [feedback, settings.soundOn, settings.hapticsOn]);

  const handleKeypadDelete = useCallback(() => {
    if (feedback) return;
    setInput(prev => prev.slice(0, -1));
  }, [feedback]);

  const handleAreaTap = useCallback(() => {
    if (input && !feedback && gameActiveRef.current) {
      handleSubmit();
    }
  }, [input, feedback, handleSubmit]);

  const startCountdown = useCallback(() => {
    resetOperationScheduler();
    questionCountRef.current = 0;
    setStep('countdown');
    setCountdownNumber(3);
    
    if (settings.soundOn) AudioManager.playCountdownHorn();
    if (settings.hapticsOn) HapticsManager.countdownTick();
    
    setTimeout(() => {
      setCountdownNumber(2);
      if (settings.soundOn) AudioManager.playCountdownHorn();
      if (settings.hapticsOn) HapticsManager.countdownTick();
    }, 1000);
    
    setTimeout(() => {
      setCountdownNumber(1);
      if (settings.soundOn) AudioManager.playCountdownHorn();
      if (settings.hapticsOn) HapticsManager.countdownTick();
    }, 2000);
    
    setTimeout(() => {
      if (settings.soundOn) AudioManager.playGoHorn();
      if (settings.hapticsOn) HapticsManager.goSignal();
      
      hasEndedRef.current = false;
      gameActiveRef.current = true;
      startTimeRef.current = performance.now();
      scoreRef.current = 0;
      inGameXPRef.current = 0;
      correctCountRef.current = 0;
      totalCountRef.current = 0;
      responseTimesRef.current = [];
      remainingTimeRef.current = 5.0;
      highestLevelRef.current = level;
      effectiveLevelRef.current = level;
      
      setScore(0);
      setInGameXP(0);
      setRemainingTime(5.0);
      setCurrentEffectiveLevel(level);
      setShowFlash(null);
      generateNextQuestion();
      startTimerLoop();
      setStep('active');
    }, 3000);
  }, [settings.soundOn, generateNextQuestion, startTimerLoop]);

  const handleCancelIntro = useCallback(() => {
    setLocation('/train');
  }, [setLocation]);

  useEffect(() => {
    return () => {
      stopAllTimers();
    };
  }, [stopAllTimers]);

  if (step === 'intro') {
    return (
      <MobileLayout className="bg-white">
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl" data-testid="modal-quickfire-intro">
            <button
              onClick={handleCancelIntro}
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
              data-testid="button-quickfire-cancel"
            >
              <X size={20} className="text-slate-400" />
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Flame size={32} className="text-orange-500" />
              </div>
            </div>
            
            <h2 className="text-center text-2xl font-bold text-slate-900">Quick Fire</h2>
            
            <div className="text-center space-y-3 pt-4 text-slate-600">
              <p className="flex items-center justify-center gap-2">
                <Clock size={16} className="text-primary" />
                You start with 5 seconds.
              </p>
              <p className="flex items-center justify-center gap-2">
                <Plus size={16} className="text-green-500" />
                Each correct answer adds 5 more seconds.
              </p>
              <p className="flex items-center justify-center gap-2">
                <Flame size={16} className="text-orange-500" />
                Difficulty increases every 3 questions.
              </p>
              <p className="flex items-center justify-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                One mistake or timeout ends the run.
              </p>
            </div>
            
            <Button 
              onClick={startCountdown}
              className="w-full h-12 rounded-2xl font-bold mt-6"
              data-testid="button-quickfire-start"
            >
              Okay
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
              className="text-9xl font-black text-primary"
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
            <p className="text-slate-500">Speed training for Daily challenges.</p>
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
              data-testid="text-quickfire-score"
            >
              <CountUp 
                value={results.score} 
                duration={0.8} 
                delay={0.2} 
                onTick={() => settings.soundOn && AudioManager.playTallyTick()} 
              />
            </motion.div>
            {!isNewHighScore && quickFireHighScore > 0 && (
              <p className="text-slate-400 text-sm">Personal best: {quickFireHighScore}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-6 text-center space-y-2"
            data-testid="card-quickfire-level-reached"
          >
            <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">You Reached</span>
            <div className="text-5xl font-black text-primary" data-testid="text-quickfire-level-reached">
              Level {results.highestLevelReached}
            </div>
            <p className="text-sm text-slate-500 pt-1" data-testid="text-quickfire-encouragement">
              {getQuickFireEncouragement(results.highestLevelReached - results.startingLevel)}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-50 border-none rounded-3xl p-6 text-center"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">XP Earned</span>
            <div className="text-4xl font-bold text-primary mt-2" data-testid="text-quickfire-xp">
              <CountUp 
                value={results.finalSessionXP} 
                duration={0.6} 
                delay={0.6} 
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
                <span className="text-lg font-bold text-slate-900" data-testid="text-quickfire-attempted">{results.attemptedN}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Attempted</span>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
                <span className="text-lg font-bold text-slate-900" data-testid="text-quickfire-accuracy">{Math.round(results.accuracy * 100)}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</span>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="p-4 flex flex-col items-center justify-center space-y-1 bg-slate-50 border-none shadow-none rounded-2xl">
                <span className="text-lg font-bold text-slate-900" data-testid="text-quickfire-median">{(results.medianMs / 1000).toFixed(1)}s</span>
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
      {showFlash && <FullScreenFlash type={showFlash} />}
      
      <div className="flex-1 flex flex-col pointer-events-none">
        <div className="px-4 pt-4 pb-2 flex justify-between items-center relative z-50 pointer-events-auto">
          <button
            onClick={() => {
              stopAllTimers();
              gameActiveRef.current = false;
              setLocation('/train');
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
            data-testid="button-quickfire-exit"
          >
            <X size={20} />
          </button>
          
          <motion.div
            animate={remainingTime < 2 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3, repeat: remainingTime < 2 ? Infinity : 0 }}
            className={clsx(
              "text-2xl font-bold tabular-nums px-4 py-2 rounded-xl",
              remainingTime <= 2 ? "text-red-500 bg-red-50" : "text-red-400 bg-slate-50"
            )}
            data-testid="text-quickfire-timer"
          >
            {remainingTime.toFixed(1)}s
          </motion.div>
          
          <div className="text-sm font-bold text-primary w-11 text-right" data-testid="text-quickfire-ingame-xp">
            +{inGameXP}
          </div>
        </div>
        
        <div className="px-4 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEffectiveLevel}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100"
              data-testid="text-quickfire-effective-level"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level</span>
              <span className="text-sm font-bold text-slate-700 tabular-nums">{currentEffectiveLevel}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div 
          className="flex-1 flex flex-col items-center justify-center px-8 relative cursor-pointer pointer-events-auto"
          onClick={handleAreaTap}
          data-testid="area-quickfire-submit"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-[12rem] font-black text-primary/5 tabular-nums">
              {score}
            </span>
          </div>
          
          <div className="relative z-10 w-full space-y-8 pointer-events-none">
            <div className="text-center">
              <motion.div 
                key={question?.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-black text-slate-900 tracking-tight"
              >
                {question?.text} = ?
              </motion.div>
              {question?.answerFormat && getAnswerFormatLabel(question.answerFormat) && (
                <p className="text-sm text-slate-500 mt-2">
                  {getAnswerFormatLabel(question.answerFormat)}
                </p>
              )}
            </div>

            <div className="text-center bg-white">
              <div className="text-5xl font-bold tabular-nums text-slate-900 min-h-[4rem] flex items-center justify-center">
                {input || <span className="text-slate-300">_</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 pointer-events-auto">
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
