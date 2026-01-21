import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { KeypadModern } from '@/components/game/Keypad';
import { generateQuestion, calculateXP, Question, TIERS } from '@/lib/game-logic';
import { generateQuestionForProgression } from '@/lib/logic/generator_adapter';
import { useStore, SessionStats } from '@/lib/store';

import { AudioManager } from '@/lib/audio';
import { computeFluencyComponents, computeFluencyScore, computeSessionXP } from '@/lib/logic/progression';
import { PROGRESSION_CONFIG as CFG } from '@/config/progression';
import { DebugOverlay } from './DebugOverlay';

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
  const recordAnswer = useStore(s => s.recordAnswer);

  const progression = useStore(s => s.progression);
  const currentQuestionMetaRef = useRef({ targetTimeMs: 3000, dp: 1, id: '' });

  useEffect(() => {
    nextQuestion();
    setIsActive(true);
    startTimeRef.current = Date.now();
  }, []);

  // ... useEffect for timer ...

  const nextQuestion = () => {
    // MVP: Use new generator if in training mode
    if (mode === 'training') {
      const q = generateQuestionForProgression(progression.band, progression.difficultyStep);
      setQuestion(q);
      currentQuestionMetaRef.current = { targetTimeMs: q.targetTimeMs, dp: q.dp, id: q.id };
    } else {
       setQuestion(generateQuestion(tier)); // Legacy for assessment
       currentQuestionMetaRef.current = { targetTimeMs: 3000, dp: 1, id: 'legacy' };
    }
    
    setInput('');
    setFeedback(null);
    setFlash(null);
    questionStartTimeRef.current = Date.now();
  };

  const endSession = () => {
// ... existing endSession logic ...
    setIsActive(false);
    const durationSecondsActual = durationSeconds === 'unlimited' ? 0 : Number(durationSeconds);
    
    const components = computeFluencyComponents(
      correctCount,
      totalCount,
      responseTimesRef.current,
      durationSecondsActual
    );
    
    const fluencyScore = computeFluencyScore(components);
    
    const isValid = totalCount >= CFG.MIN_QUESTIONS_FOR_VALID_SESSION && 
                  durationSecondsActual >= CFG.MIN_DURATION_FOR_VALID_SESSION_SEC;
                  
    const { totalXP, metBonus } = computeSessionXP(
      fluencyScore,
      totalCount,
      components,
      isValid
    );

    const stats: SessionStats = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      durationMode: durationSeconds === 'unlimited' ? 'unlimited' : (durationSeconds as any),
      durationSecondsActual,
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy: totalCount > 0 ? correctCount / totalCount : 0,
      xpEarned: totalXP,
      bestStreak,
      avgResponseTimeMs: components.medianMs, // Emphasizing median per spec
      medianMs: components.medianMs,
      variabilityMs: components.variabilityMs,
      throughputQps: components.qps,
      fluencyScore,
      metBonus,
      valid: isValid
    };
    
    onComplete(stats);
  };

  const handleSubmit = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!question || feedback) return;
    if (!input) return;
    
    const val = parseFloat(input);
    const isCorrect = Math.abs(val - (question?.answer ?? 0)) < 0.001;
    const timeTaken = Date.now() - questionStartTimeRef.current;
    
    setTotalCount(prev => prev + 1);
    responseTimesRef.current.push(timeTaken);

    // Record answer in Progression Engine
    recordAnswer(
      isCorrect, 
      timeTaken, 
      question?.id || 'unknown', 
      currentQuestionMetaRef.current.targetTimeMs
    );

    if (isCorrect) {
      console.log(`[AUDIO_LOG] CORRECT_SUBMITTED: ${Date.now()}`);
      if (settings.soundOn) AudioManager.playCorrect();
      
      const xp = calculateXP(true, timeTaken, streak);
      setScore(prev => prev + xp);
      setCorrectCount(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');
      setFlash('correct');
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(5);
      
      // Advance to next question quickly (80ms)
      setTimeout(nextQuestion, 80);
    } else {
      console.log(`[AUDIO_LOG] WRONG_SUBMITTED: ${Date.now()}`);
      if (settings.soundOn) AudioManager.playWrong();
      
      setStreak(0);
      setFeedback('wrong');
      setFlash('wrong');
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(20);
      
      // Hold wrong answer state (400ms) to allow sound to finish and user to see error
      setTimeout(nextQuestion, 400);
    }

    if (mode === 'assessment') {
        if (isCorrect && streak > 0 && streak % 3 === 0 && tier < TIERS - 1) setTier(t => t + 1);
        if (!isCorrect && tier > 0) setTier(t => Math.max(0, t - 1));
    }
  };

  const handleKeyPress = (k: string) => {
    if (feedback) return;
    // Play tap sound IMMEDIATELY on key press
    if (settings.soundOn) AudioManager.playTap();
    if (input.length < 6) setInput(prev => prev + k);
  };

  return (
    <MobileLayout className="bg-white overflow-hidden">
      <DebugOverlay />
      
      {/* Background Flash Layer - Entire area except keypad */}
      <div 
        className={clsx(
          "absolute inset-x-0 top-0 bottom-[320px] z-0 transition-colors duration-150",
          flash === 'correct' ? "bg-primary/5" : 
          flash === 'wrong' ? "bg-destructive/5" : 
          "bg-transparent"
        )}
      />

      {/* Touchable Submission Layer - Entire top area */}
      <div 
        className="absolute inset-x-0 top-0 bottom-[320px] z-10 cursor-pointer"
        onClick={() => handleSubmit()}
      />

      <div className="relative z-20 flex flex-col h-full pointer-events-none">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 safe-top pointer-events-auto">
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

        {/* Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <AnimatePresence mode="wait">
              {question && (
                  <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-12"
                  >
                      <h2 className="text-6xl font-bold tracking-tight text-foreground/80">
                          {question.text}
                      </h2>
                      
                      <div className={clsx(
                        "h-24 flex items-center justify-center text-7xl font-mono font-medium transition-all",
                        feedback === 'correct' ? "text-primary" :
                        feedback === 'wrong' ? "text-destructive" :
                        "text-slate-900"
                      )}>
                          {feedback === 'wrong' ? (
                              <span className="text-destructive/60 text-3xl font-sans font-bold">Ans: {question.answer}</span>
                          ) : (
                              input || <span className="text-slate-200 font-sans text-5xl">?</span>
                          )}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div className="pointer-events-auto mt-auto">
          <KeypadModern 
            onPress={handleKeyPress}
            onDelete={() => {
                if (settings.soundOn) AudioManager.playTap();
                setInput(prev => prev.slice(0, -1));
            }}
            onSubmit={() => handleSubmit()}
            submitDisabled={input.length === 0}
            disabled={feedback !== null}
          />
        </div>
      </div>
    </MobileLayout>
  );
}
