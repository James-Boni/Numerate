import { Question, AnswerFormat, QuestionTier } from '../game-logic';
import { getDifficultyProfile, DifficultyProfile, computeQuestionComplexity } from './difficulty-profile';
import { getLevelCapabilities, LevelCapabilities } from './level-capabilities';

function getEffectiveLevelForTier(level: number, tier: QuestionTier): number {
  switch (tier) {
    case 'review':
      return Math.max(1, level - 3);
    case 'core':
      return level;
    case 'stretch':
      return Math.min(100, level + 2);
  }
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, decimals: number) => {
  const val = min + Math.random() * (max - min);
  return parseFloat(val.toFixed(decimals));
};

const generateSignature = (text: string): string => {
  const match = text.match(/([\d.]+)\s*([+\-×÷%])\s*([\d.]+)/);
  if (!match) return text;
  const [, a, op, b] = match;
  if (op === '+' || op === '×') {
    const sorted = [parseFloat(a), parseFloat(b)].sort((x, y) => x - y);
    return `${op}:${sorted[0]}:${sorted[1]}`;
  }
  return `${op}:${a}:${b}`;
};

function hasCarryOrBorrow(a: number, b: number, op: 'add' | 'sub'): boolean {
  const aStr = Math.abs(a).toString();
  const bStr = Math.abs(b).toString();
  const maxLen = Math.max(aStr.length, bStr.length);
  
  if (op === 'add') {
    let carry = 0;
    for (let i = 0; i < maxLen; i++) {
      const dA = parseInt(aStr[aStr.length - 1 - i] || '0');
      const dB = parseInt(bStr[bStr.length - 1 - i] || '0');
      const sum = dA + dB + carry;
      if (sum >= 10) {
        return true;
      }
      carry = Math.floor(sum / 10);
    }
    return false;
  } else {
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    const lStr = larger.toString();
    const sStr = smaller.toString();
    let borrow = 0;
    for (let i = 0; i < lStr.length; i++) {
      const dL = parseInt(lStr[lStr.length - 1 - i] || '0') - borrow;
      const dS = parseInt(sStr[sStr.length - 1 - i] || '0');
      if (dL < dS) {
        return true;
      }
      borrow = dL < dS ? 1 : 0;
    }
    return false;
  }
}

function generateAddQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  const { min, max, allowNegatives, requireCarryBorrow, decimals } = profile.addSub;
  
  let a: number, b: number;
  let attempts = 0;
  
  do {
    if (decimals > 0) {
      a = randomFloat(min, max, decimals);
      b = randomFloat(min, max, decimals);
    } else {
      a = randomInt(min, max);
      b = randomInt(min, max);
    }
    
    if (allowNegatives && Math.random() < 0.25) {
      if (Math.random() < 0.5) a = -a;
      else b = -b;
    }
    
    attempts++;
    if (!requireCarryBorrow || attempts > 10) break;
  } while (!hasCarryOrBorrow(Math.abs(Math.floor(a)), Math.abs(Math.floor(b)), 'add'));
  
  const answer = parseFloat((a + b).toFixed(decimals));
  const aDisplay = a < 0 ? `(${a})` : `${a}`;
  const bDisplay = b < 0 ? `(${b})` : `${b}`;
  
  return { 
    text: `${aDisplay} + ${bDisplay}`, 
    answer,
    operandA: a,
    operandB: b
  };
}

function generateSubQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  const { min, max, allowNegatives, requireCarryBorrow, decimals } = profile.addSub;
  
  let a: number, b: number;
  let attempts = 0;
  
  do {
    if (decimals > 0) {
      a = randomFloat(min, max, decimals);
      b = randomFloat(min, Math.min(a * 1.2, max), decimals);
    } else {
      a = randomInt(min, max);
      b = randomInt(min, Math.max(min, Math.floor(a * 0.9)));
    }
    
    if (b > a && !allowNegatives) {
      [a, b] = [b, a];
    }
    
    attempts++;
    if (!requireCarryBorrow || attempts > 10) break;
  } while (!hasCarryOrBorrow(Math.abs(Math.floor(a)), Math.abs(Math.floor(b)), 'sub'));
  
  if (allowNegatives && Math.random() < 0.15) {
    a = -a;
  }
  
  const answer = parseFloat((a - b).toFixed(decimals));
  const aDisplay = a < 0 ? `(${a})` : `${a}`;
  
  return { 
    text: `${aDisplay} - ${b}`, 
    answer,
    operandA: a,
    operandB: b
  };
}

function generateMulQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  if (!profile.mul.enabled) {
    return generateAddQuestion(profile);
  }
  
  const { aMin, aMax, bMin, bMax } = profile.mul;
  
  const a = randomInt(aMin, aMax);
  const b = randomInt(bMin, bMax);
  
  return { 
    text: `${a} × ${b}`, 
    answer: a * b,
    operandA: a,
    operandB: b
  };
}

function generateDivQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  if (!profile.div.enabled) {
    return profile.mul.enabled ? generateMulQuestion(profile) : generateSubQuestion(profile);
  }
  
  const { divisorMin, divisorMax, allowRemainder } = profile.div;
  
  const divisor = randomInt(divisorMin, divisorMax);
  
  let dividend: number;
  let answer: number;
  
  if (allowRemainder && Math.random() < 0.3) {
    const baseQuotient = randomInt(Math.max(2, Math.floor(profile.div.dividendMin / divisor)), 
                                    Math.floor(profile.div.dividendMax / divisor));
    const remainder = randomInt(1, divisor - 1);
    dividend = divisor * baseQuotient + remainder;
    answer = dividend / divisor;
  } else {
    const quotient = randomInt(Math.max(2, Math.floor(profile.div.dividendMin / divisor)), 
                         Math.floor(profile.div.dividendMax / divisor));
    dividend = divisor * quotient;
    answer = quotient;
  }
  
  return { 
    text: `${dividend} ÷ ${divisor}`, 
    answer,
    operandA: dividend,
    operandB: divisor
  };
}

function generatePercentQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  if (!profile.percent.enabled) {
    return generateMulQuestion(profile);
  }
  
  const { baseMin, baseMax, percentValues, allowChange } = profile.percent;
  
  const base = randomInt(baseMin, baseMax);
  const pct = percentValues[randomInt(0, percentValues.length - 1)];
  
  if (allowChange && Math.random() < 0.4) {
    const increase = Math.random() < 0.5;
    const result = increase ? base * (1 + pct / 100) : base * (1 - pct / 100);
    return {
      text: `${increase ? 'Increase' : 'Decrease'} ${base} by ${pct}%`,
      answer: Math.round(result),
      operandA: base,
      operandB: pct
    };
  }
  
  const answer = Math.round(base * pct / 100);
  return {
    text: `${pct}% of ${base}`,
    answer,
    operandA: base,
    operandB: pct
  };
}

function generateMultiStepQuestion(profile: DifficultyProfile): { text: string; answer: number; operandA: number; operandB: number } {
  const simpler = { ...profile, multiStep: { enabled: false, maxSteps: 1, probability: 0 } };
  
  const q1 = Math.random() < 0.6 ? generateMulQuestion(simpler) : generateAddQuestion(simpler);
  
  const intermediateResult = q1.answer;
  
  const secondOp = Math.random() < 0.5 ? 'add' : 'sub';
  const secondOperand = randomInt(
    Math.max(5, Math.floor(Math.abs(intermediateResult) * 0.1)),
    Math.min(500, Math.floor(Math.abs(intermediateResult) * 0.5))
  );
  
  let finalAnswer: number;
  let text: string;
  
  if (secondOp === 'add') {
    finalAnswer = intermediateResult + secondOperand;
    text = `(${q1.text}) + ${secondOperand}`;
  } else {
    finalAnswer = intermediateResult - secondOperand;
    text = `(${q1.text}) - ${secondOperand}`;
  }
  
  return {
    text,
    answer: finalAnswer,
    operandA: q1.operandA,
    operandB: q1.operandB
  };
}

export interface GeneratedQuestionMeta {
  operation: 'add' | 'sub' | 'mul' | 'div' | 'percent' | 'multi';
  operandA: number;
  operandB: number;
  answer: number;
  level: number;
  complexityScore: number;
  difficultyProfile: DifficultyProfile;
}

let lastGeneratedMeta: GeneratedQuestionMeta | null = null;

export const getLastGeneratedMeta = () => lastGeneratedMeta;

type Operation = 'add' | 'sub' | 'mul' | 'div' | 'percent';
const recentOperations: Operation[] = [];
const MAX_STREAK = 3;

function selectOperation(profile: DifficultyProfile): Operation {
  const { opWeights } = profile;
  
  const adjustedWeights = { ...opWeights };
  
  if (recentOperations.length >= MAX_STREAK) {
    const lastOps = recentOperations.slice(-MAX_STREAK);
    const isStreak = lastOps.every(op => op === lastOps[0]);
    if (isStreak) {
      const streakOp = lastOps[0];
      adjustedWeights[streakOp] = 0;
    }
  }
  
  if (recentOperations.length >= 2) {
    const last2 = recentOperations.slice(-2);
    if (last2[0] === last2[1]) {
      adjustedWeights[last2[0]] *= 0.3;
    }
  }
  
  const total = adjustedWeights.add + adjustedWeights.sub + adjustedWeights.mul + adjustedWeights.div + adjustedWeights.percent;
  if (total === 0) {
    const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
    const result = ops[Math.floor(Math.random() * ops.length)];
    recordOperation(result);
    return result;
  }
  
  const rand = Math.random() * total;
  let cumulative = 0;
  
  cumulative += adjustedWeights.add;
  if (rand < cumulative) { recordOperation('add'); return 'add'; }
  
  cumulative += adjustedWeights.sub;
  if (rand < cumulative) { recordOperation('sub'); return 'sub'; }
  
  cumulative += adjustedWeights.mul;
  if (rand < cumulative) { recordOperation('mul'); return 'mul'; }
  
  cumulative += adjustedWeights.div;
  if (rand < cumulative) { recordOperation('div'); return 'div'; }
  
  recordOperation('percent');
  return 'percent';
}

function recordOperation(op: Operation) {
  recentOperations.push(op);
  if (recentOperations.length > 10) {
    recentOperations.shift();
  }
}

export function resetOperationScheduler() {
  recentOperations.length = 0;
}

function validateAgainstCapabilities(
  answer: number, 
  op: string, 
  caps: LevelCapabilities
): boolean {
  if (answer < 0 && !caps.allowNegativeAnswers) {
    return false;
  }
  
  if (answer < 0 && caps.negativeMagnitudeLimit && Math.abs(answer) > caps.negativeMagnitudeLimit) {
    return false;
  }
  
  const hasDecimals = answer !== Math.floor(answer);
  if (hasDecimals && !caps.allowDecimals) {
    return false;
  }
  
  if (hasDecimals) {
    const decimalPart = Math.abs(answer) - Math.floor(Math.abs(answer));
    const dpCount = decimalPart.toString().split('.')[1]?.length || 0;
    if (dpCount > caps.decimalDpMax) {
      return false;
    }
  }
  
  if (op === 'div' && hasDecimals && caps.divisionMode === 'integerOnly') {
    return false;
  }
  
  if (op === 'percent' && !caps.percentEnabled) {
    return false;
  }
  
  return true;
}

function deriveAnswerFormatFromCaps(caps: LevelCapabilities, op: string, answer: number): AnswerFormat {
  const allowNegative = caps.allowNegativeAnswers;
  
  if (op === 'div' && caps.divisionMode !== 'integerOnly') {
    const dpRequired = caps.divisionMode === 'round2dp' ? 2 : 1;
    return {
      dpRequired: dpRequired as 0 | 1 | 2,
      roundingMode: 'round',
      allowNegative
    };
  }
  
  if (caps.allowDecimals && answer !== Math.floor(answer)) {
    return {
      dpRequired: caps.decimalDpMax,
      roundingMode: 'exact',
      allowNegative
    };
  }
  
  return {
    dpRequired: 0,
    roundingMode: 'exact',
    allowNegative
  };
}

export const generateQuestionForLevel = (
  level: number,
  history: { templateId?: string, text?: string }[] = [],
  tier: QuestionTier = 'core'
): Question & { targetTimeMs: number; dp: number; meta: GeneratedQuestionMeta; answerFormat: AnswerFormat; tier: QuestionTier } => {
  const effectiveLevel = getEffectiveLevelForTier(level, tier);
  const profile = getDifficultyProfile(effectiveLevel);
  const caps = getLevelCapabilities(effectiveLevel);
  
  const recentSignatures = new Set(
    history.slice(0, 10).map(h => h.text ? generateSignature(h.text) : '')
  );
  
  let generated: { text: string; answer: number; operandA: number; operandB: number };
  let op: 'add' | 'sub' | 'mul' | 'div' | 'percent' | 'multi';
  let attempts = 0;
  const MAX_ATTEMPTS = 50;
  
  do {
    if (profile.multiStep.enabled && Math.random() < profile.multiStep.probability) {
      generated = generateMultiStepQuestion(profile);
      op = 'multi';
    } else {
      op = selectOperation(profile);
      
      if (op === 'percent' && !caps.percentEnabled) {
        op = 'mul';
      }
      
      switch (op) {
        case 'add':
          generated = generateAddQuestion(profile);
          break;
        case 'sub':
          generated = generateSubQuestion(profile);
          break;
        case 'mul':
          generated = generateMulQuestion(profile);
          break;
        case 'div':
          generated = generateDivQuestion(profile);
          break;
        case 'percent':
          generated = generatePercentQuestion(profile);
          break;
      }
    }
    
    attempts++;
    
    if (!validateAgainstCapabilities(generated.answer, op, caps)) {
      continue;
    }
    
    const sig = generateSignature(generated.text);
    if (!recentSignatures.has(sig)) {
      const complexity = computeQuestionComplexity(
        op,
        generated.operandA,
        generated.operandB,
        profile.addSub.requireCarryBorrow,
        profile.addSub.decimals > 0,
        profile.addSub.allowNegatives && (generated.operandA < 0 || generated.operandB < 0),
        op === 'multi',
        op === 'multi' ? 2 : 1
      );
      
      if (complexity >= profile.minComplexityScore || attempts >= MAX_ATTEMPTS) {
        break;
      }
    }
  } while (attempts < MAX_ATTEMPTS);
  
  const targetTimeMs = getTargetTimeForLevel(effectiveLevel, op);
  const dp = getDpForLevel(effectiveLevel, op);
  
  const complexity = computeQuestionComplexity(
    op,
    generated.operandA,
    generated.operandB,
    profile.addSub.requireCarryBorrow,
    profile.addSub.decimals > 0,
    generated.operandA < 0 || generated.operandB < 0,
    op === 'multi',
    op === 'multi' ? 2 : 1
  );
  
  const meta: GeneratedQuestionMeta = {
    operation: op,
    operandA: generated.operandA,
    operandB: generated.operandB,
    answer: generated.answer,
    level: effectiveLevel,
    complexityScore: complexity,
    difficultyProfile: profile
  };
  
  lastGeneratedMeta = meta;
  
  const baseOp = op === 'multi' ? 'mul' : op === 'percent' ? 'mul' : op;
  const answerFormat = deriveAnswerFormatFromCaps(caps, op, generated.answer);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    text: generated.text,
    answer: generated.answer,
    operation: baseOp as 'add' | 'sub' | 'mul' | 'div',
    answerFormat,
    tier,
    targetTimeMs,
    dp,
    meta
  };
};

const getTargetTimeForLevel = (level: number, op: string): number => {
  const baseTimes: Record<string, number> = {
    add: 2000,
    sub: 2500,
    mul: 4000,
    div: 5000,
    percent: 5500,
    multi: 8000
  };
  const base = baseTimes[op] || 3000;
  
  const levelFactor = 1 + Math.min(level / 50, 1.5);
  
  return Math.round(base * levelFactor);
};

const getDpForLevel = (level: number, op: string): number => {
  const opBonus: Record<string, number> = { add: 0, sub: 1, mul: 3, div: 4, percent: 5, multi: 7 };
  return Math.floor(level / 5) + 1 + (opBonus[op] || 0);
};

export const generateQuestionForProgression = (
  band: number, 
  difficultyStep: number,
  history: { templateId?: string, text?: string }[] = []
): Question & { targetTimeMs: number; dp: number } => {
  const level = band * 10 + difficultyStep + 1;
  const result = generateQuestionForLevel(level, history);
  return {
    id: result.id,
    text: result.text,
    answer: result.answer,
    operation: result.operation,
    targetTimeMs: result.targetTimeMs,
    dp: result.dp
  };
};
