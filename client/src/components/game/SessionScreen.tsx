import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { KeypadModern } from '@/components/game/Keypad';
import { generateQuestion, calculateXP, Question, TIERS, getAnswerFormatLabel, AnswerFormat, validateAnswer, DEFAULT_ANSWER_FORMAT } from '@/lib/game-logic';
import { generateQuestionForLevel, GeneratedQuestionMeta } from '@/lib/logic/generator_adapter';
import { useStore, SessionStats, QuestionResult } from '@/lib/store';

import { AudioManager } from '@/lib/audio';
import { computeFluencyComponents, computeFluencyScore, computeSessionXP } from '@/lib/logic/progression';
import { PROGRESSION_CONFIG as CFG } from '@/config/progression';
import { calculateCombinedSessionXP, applyXPAndLevelUp, CombinedXPResult } from '@/lib/logic/xp-system';
import { getDifficultyParams, DifficultyParams } from '@/lib/logic/difficulty';
import { DebugOverlay } from './DebugOverlay';
import { SessionDiagnosticsOverlay } from './SessionDiagnosticsOverlay';
import { AnswerFeedback } from './AnswerFeedback';
import { StreakIndicator } from './StreakIndicator';
import { AnimatedXP } from './AnimatedXP';

interface OpCounts {
  add: number;
  sub: number;
  mul: number;
  div: number;
}

interface OperandStats {
  minOperand: number;
  maxOperand: number;
  operandSum: number;
  count: number;
}

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
  
  // Refs to track counts for timer callback (avoids stale closure)
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const bestStreakRef = useRef(0);
  const scoreRef = useRef(0); // Accumulated per-question XP
  
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<number[]>([]);
  
  const opCountsRef = useRef<OpCounts>({ add: 0, sub: 0, mul: 0, div: 0 });
  const operandStatsRef = useRef<OperandStats>({ minOperand: Infinity, maxOperand: 0, operandSum: 0, count: 0 });
  const questionResultsRef = useRef<QuestionResult[]>([]);
  const [difficultyParams, setDifficultyParams] = useState<DifficultyParams | null>(null);
  const [currentOpCounts, setCurrentOpCounts] = useState<OpCounts>({ add: 0, sub: 0, mul: 0, div: 0 });
  
  const settings = useStore(s => s.settings);
  const recordAnswer = useStore(s => s.recordAnswer);
  const currentLevel = useStore(s => s.level);
  const currentXpIntoLevel = useStore(s => s.xpIntoLevel);

  const progression = useStore(s => s.progression);
  
  useEffect(() => {
    const params = getDifficultyParams(currentLevel);
    console.log("[SESSION_START]", {
      sessionType: mode,
      requestedDuration: durationSeconds,
      userLevel: currentLevel,
      xpIntoLevel: currentXpIntoLevel,
      difficultyParams: {
        level: params.level,
        band: params.band,
        maxAddSub: params.maxAddSub,
        opWeights: params.opWeights,
        allowMul: params.allowMul,
        allowDiv: params.allowDiv,
        maxMulA: params.maxMulA,
        maxMulB: params.maxMulB,
        maxDivDivisor: params.maxDivDivisor,
        maxDivQuotient: params.maxDivQuotient
      }
    });
    setDifficultyParams(params);
  }, [currentLevel, mode, durationSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[TIMER]", {
        isActive,
        timeLeft,
        now: Date.now()
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);
  // END DIAGNOSTICS

  const currentQuestionMetaRef = useRef({ targetTimeMs: 3000, dp: 1, id: '' });
  const recentQuestionsRef = useRef<{ templateId?: string, text?: string }[]>([]);
  const sessionEndedRef = useRef(false);
  
  useEffect(() => {
    nextQuestion();
    setIsActive(true);
    startTimeRef.current = Date.now();
    sessionEndedRef.current = false;
  }, []);

  // Timer countdown using startTime as stable source of truth
  useEffect(() => {
    if (durationSeconds === 'unlimited') return;
    
    const targetDurationMs = typeof durationSeconds === 'number' ? durationSeconds * 1000 : 0;
    
    const tick = () => {
      if (sessionEndedRef.current) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, targetDurationMs - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      
      console.log("[TIMER_TICK]", { remainingSeconds, elapsed, remaining });
      
      setTimeLeft(remainingSeconds);
      
      if (remaining <= 0 && !sessionEndedRef.current) {
        sessionEndedRef.current = true;
        console.log("[TIMER_END] Session complete - calling endSession");
        endSession();
      }
    };
    
    tick();
    const interval = setInterval(tick, 250);
    
    return () => clearInterval(interval);
  }, [durationSeconds]);

  const nextQuestion = () => {
    if (mode === 'training') {
      const q = generateQuestionForLevel(
        currentLevel,
        recentQuestionsRef.current
      );
      setQuestion(q);
      currentQuestionMetaRef.current = { targetTimeMs: q.targetTimeMs, dp: q.dp, id: q.id };
      
      const opForCount = q.meta.operation === 'percent' || q.meta.operation === 'multi' ? 'mul' : q.meta.operation;
      opCountsRef.current[opForCount]++;
      setCurrentOpCounts({ ...opCountsRef.current });
      
      const maxOp = Math.max(q.meta.operandA, q.meta.operandB);
      const minOp = Math.min(q.meta.operandA, q.meta.operandB);
      operandStatsRef.current.maxOperand = Math.max(operandStatsRef.current.maxOperand, maxOp);
      operandStatsRef.current.minOperand = Math.min(operandStatsRef.current.minOperand, minOp);
      operandStatsRef.current.operandSum += (q.meta.operandA + q.meta.operandB);
      operandStatsRef.current.count += 2;
      
      if (!difficultyParams) {
        setDifficultyParams(getDifficultyParams(currentLevel));
      }
      
      recentQuestionsRef.current = [
        { templateId: q.id, text: q.text },
        ...recentQuestionsRef.current
      ].slice(0, 10);
      
      const profile = q.meta.difficultyProfile;
      console.log("[GEN_OUTPUT]", {
        question: q.text,
        operation: q.meta.operation,
        operandA: q.meta.operandA,
        operandB: q.meta.operandB,
        level: currentLevel,
        opWeights: profile?.opWeights ?? { add: 0, sub: 0, mul: 0, div: 0, percent: 0 },
        profileDesc: profile?.description ?? 'unknown'
      });
    } else {
       setQuestion(generateQuestion(tier));
       currentQuestionMetaRef.current = { targetTimeMs: 3000, dp: 1, id: 'legacy' };
    }
    
    setInput('');
    setFeedback(null);
    setFlash(null);
    questionStartTimeRef.current = Date.now();
  };

  const endSession = () => {
    setIsActive(false);
    const durationSecondsActual = durationSeconds === 'unlimited' ? 0 : Number(durationSeconds);
    
    // Use refs to avoid stale closure issue when called from timer
    const finalCorrectCount = correctCountRef.current;
    const finalTotalCount = totalCountRef.current;
    const finalBestStreak = bestStreakRef.current;
    const inGameXP = scoreRef.current; // XP accumulated during gameplay (shown top-right)
    
    // Use the actual mode prop for sessionType
    const sessionType = mode === 'assessment' ? 'assessment' : 'daily';
    
    // Calculate combined XP: inGameXP + bonusXP
    const { fluencyMetrics, xpResult } = calculateCombinedSessionXP(
      sessionType,
      inGameXP,
      finalTotalCount,
      finalCorrectCount,
      durationSecondsActual,
      responseTimesRef.current
    );
    
    // Calculate level progression using the combined finalSessionXP
    const levelResult = applyXPAndLevelUp(
      currentLevel,
      currentXpIntoLevel,
      xpResult.finalSessionXP
    );
    
    const opCounts = opCountsRef.current;
    const opTotal = opCounts.add + opCounts.sub + opCounts.mul + opCounts.div;
    const opPct = (n: number) => opTotal > 0 ? ((n / opTotal) * 100).toFixed(1) : '0';
    
    // XP_SUMMARY: Backend-only diagnostic logging
    console.log("[XP_SUMMARY]", {
      sessionType,
      inGameXP: xpResult.inGameXP,
      bonusXP: xpResult.bonusXP,
      finalSessionXP: xpResult.finalSessionXP,
      appliedToLeveling: xpResult.finalSessionXP,
      storedFinal: xpResult.finalSessionXP
    });
    
    // DEV assertion: finalSessionXP must equal inGameXP + bonusXP
    if (xpResult.finalSessionXP !== xpResult.inGameXP + xpResult.bonusXP) {
      console.error("[XP_MISMATCH_ERROR]", {
        expected: xpResult.inGameXP + xpResult.bonusXP,
        actual: xpResult.finalSessionXP,
        inGameXP: xpResult.inGameXP,
        bonusXP: xpResult.bonusXP
      });
    }
    
    console.log("[SESSION_END_REPORT]", {
      sessionType,
      durationSecondsActual,
      attempts: finalTotalCount,
      correct: finalCorrectCount,
      accuracy: fluencyMetrics.accuracy,
      medianMs: fluencyMetrics.medianMs,
      inGameXP: xpResult.inGameXP,
      bonusXP: xpResult.bonusXP,
      excellenceBonus: xpResult.excellenceBonus,
      eliteBonus: xpResult.eliteBonus,
      finalSessionXP: xpResult.finalSessionXP,
      levelBefore: levelResult.levelBefore,
      levelAfter: levelResult.levelAfter,
      levelUpCount: levelResult.levelUpCount,
      opCounts: {
        add: opCounts.add,
        sub: opCounts.sub,
        mul: opCounts.mul,
        div: opCounts.div
      }
    });

    const stats: SessionStats = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      sessionType,
      durationMode: durationSeconds === 'unlimited' ? 'unlimited' : (durationSeconds as any),
      durationSecondsActual,
      totalQuestions: finalTotalCount,
      correctQuestions: finalCorrectCount,
      accuracy: fluencyMetrics.accuracy,
      xpEarned: xpResult.finalSessionXP,
      bestStreak: finalBestStreak,
      avgResponseTimeMs: fluencyMetrics.medianMs,
      medianMs: fluencyMetrics.medianMs,
      variabilityMs: fluencyMetrics.variabilityMs,
      throughputQps: fluencyMetrics.qps,
      speedScore: fluencyMetrics.speedScore,
      consistencyScore: fluencyMetrics.consistencyScore,
      throughputScore: fluencyMetrics.throughputScore,
      fluencyScore: fluencyMetrics.fluencyScore,
      baseSessionXP: xpResult.inGameXP,
      modeMultiplier: xpResult.modeMultiplier,
      excellenceMultiplierApplied: xpResult.meetsExcellence ? 1.0 : 0,
      eliteMultiplierApplied: xpResult.meetsElite ? 1.0 : 0,
      finalSessionXP: xpResult.finalSessionXP,
      levelBefore: levelResult.levelBefore,
      levelAfter: levelResult.levelAfter,
      levelUpCount: levelResult.levelUpCount,
      xpIntoLevelBefore: levelResult.xpIntoLevelBefore,
      xpIntoLevelAfter: levelResult.xpIntoLevelAfter,
      metBonus: xpResult.meetsExcellence || xpResult.meetsElite,
      valid: xpResult.isValid,
      responseTimes: [...responseTimesRef.current],
      questionResults: [...questionResultsRef.current],
    };
    
    onComplete(stats);
  };

  const handleSubmit = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!question || feedback) return;
    if (!input) return;
    
    const answerFormat = question.answerFormat ?? DEFAULT_ANSWER_FORMAT;
    const isCorrect = validateAnswer(input, question.answer, answerFormat);
    const timeTaken = Date.now() - questionStartTimeRef.current;
    
    // Update refs FIRST (synchronous) before state
    totalCountRef.current += 1;
    setTotalCount(totalCountRef.current);
    responseTimesRef.current.push(timeTaken);

    // Record answer in Progression Engine
    recordAnswer(
      isCorrect, 
      timeTaken, 
      question?.id || 'unknown', 
      currentQuestionMetaRef.current.targetTimeMs
    );

    // Track question result for weakness detection
    if ((question as any)?.meta) {
      const meta = (question as any).meta;
      const op = meta.operation === 'percent' || meta.operation === 'multi' ? 'mul' : meta.operation;
      questionResultsRef.current.push({
        operation: op as 'add' | 'sub' | 'mul' | 'div',
        operandA: meta.operandA,
        operandB: meta.operandB,
        isCorrect,
        responseTimeMs: timeTaken,
      });
    }

    console.log("[ANSWER_RECORDED]", { 
      isCorrect, 
      totalCount: totalCountRef.current, 
      correctCount: correctCountRef.current 
    });

    if (isCorrect) {
      console.log(`[AUDIO_LOG] CORRECT_SUBMITTED: ${Date.now()}`);
      const newStreak = streak + 1;
      if (settings.soundOn) {
        AudioManager.playCorrect(newStreak);
        if ([3, 5, 10, 15, 20].includes(newStreak)) {
          setTimeout(() => AudioManager.playStreakMilestone(newStreak), 100);
        }
      }
      
      const xp = calculateXP(true, timeTaken, streak);
      scoreRef.current += xp;
      setScore(scoreRef.current);
      
      console.log("[XP_AWARD]", {
        questionId: question?.id,
        correct: true,
        baseXp: xp,
        bonusXp: 0,
        awardedXp: xp,
        sessionXpBefore: scoreRef.current - xp,
        sessionXpAfter: scoreRef.current,
      });
      
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        bestStreakRef.current = newStreak;
        setBestStreak(newStreak);
      }
      setFeedback('correct');
      setFlash('correct');
      
      const vibrateIntensity = Math.min(5 + newStreak, 15);
      if (settings.hapticsOn && navigator.vibrate) navigator.vibrate(vibrateIntensity);
      
      // Advance to next question - slightly longer for streak celebration
      const delay = [3, 5, 10, 15, 20].includes(newStreak) ? 300 : 100;
      setTimeout(nextQuestion, delay);
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
    if (settings.soundOn) AudioManager.playTap();
    
    if (k === '±') {
      setInput(prev => {
        if (prev.startsWith('-')) {
          return prev.slice(1);
        } else {
          return '-' + prev;
        }
      });
      return;
    }
    
    if (k === '.' && input.includes('.')) return;
    
    const maxLen = input.startsWith('-') ? 8 : 7;
    if (input.replace('-', '').length < maxLen) {
      setInput(prev => prev + k);
    }
  };

  return (
    <MobileLayout className="bg-white overflow-hidden">
      <DebugOverlay />
      
      {settings.showDebugOverlay && mode === 'training' && (
        <SessionDiagnosticsOverlay
          level={currentLevel}
          sessionType={mode}
          difficultyParams={difficultyParams}
          opCounts={currentOpCounts}
          totalQuestions={totalCount}
          correctCount={correctCount}
          accuracy={totalCount > 0 ? correctCount / totalCount : 0}
          minOperand={operandStatsRef.current.minOperand}
          maxOperand={operandStatsRef.current.maxOperand}
          avgOperand={operandStatsRef.current.count > 0 ? operandStatsRef.current.operandSum / operandStatsRef.current.count : 0}
        />
      )}
      
      {/* Background Flash Layer - Entire area except keypad */}
      <div 
        className={clsx(
          "absolute inset-x-0 top-0 bottom-[320px] z-0 transition-colors duration-150",
          flash === 'correct' ? "bg-teal-500/8" : 
          flash === 'wrong' ? "bg-amber-500/8" : 
          "bg-transparent"
        )}
      />
      
      {/* Enhanced Answer Feedback Overlay */}
      <AnswerFeedback type={feedback} streak={streak} />

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
          
          <div className="flex items-center gap-3">
            <StreakIndicator streak={streak} />
            <AnimatedXP value={score} soundEnabled={settings.soundOn} />
          </div>
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
                      
                      {question.answerFormat && getAnswerFormatLabel(question.answerFormat) && (
                        <p className="text-sm text-slate-500 -mt-8">
                          {getAnswerFormatLabel(question.answerFormat)}
                        </p>
                      )}
                      
                      <div className={clsx(
                        "h-24 flex items-center justify-center text-7xl font-mono font-medium transition-all",
                        feedback === 'correct' ? "text-teal-600" :
                        feedback === 'wrong' ? "text-amber-600" :
                        "text-slate-900"
                      )}>
                          {feedback === 'wrong' ? (
                              <span className="text-amber-600/80 text-3xl font-sans font-bold">Ans: {question.answer}</span>
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
            showNegative={question?.answerFormat?.allowNegative ?? false}
            showDecimal={(question?.answerFormat?.dpRequired ?? 0) > 0}
          />
        </div>
      </div>
    </MobileLayout>
  );
}
