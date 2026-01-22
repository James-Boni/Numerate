import { TemplateFamily } from './curriculum';
import { ADD_FAMILIES, SUB_FAMILIES } from './generators/arithmetic';
import { Question } from '../game-logic';
import { getDifficultyParams, selectOperation, DifficultyParams, OperationWeights } from './difficulty';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateSignature = (text: string): string => {
  const match = text.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
  if (!match) return text;
  const [, a, op, b] = match;
  if (op === '+' || op === '×') {
    const sorted = [parseInt(a), parseInt(b)].sort((x, y) => x - y);
    return `${op}:${sorted[0]}:${sorted[1]}`;
  }
  return `${op}:${a}:${b}`;
};

const generateAddQuestion = (params: DifficultyParams): { text: string; answer: number } => {
  const min = Math.max(2, Math.round(params.maxAddSub * 0.15));
  const max = params.maxAddSub;
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  return { text: `${a} + ${b}`, answer: a + b };
};

const generateSubQuestion = (params: DifficultyParams): { text: string; answer: number } => {
  const min = Math.max(2, Math.round(params.maxAddSub * 0.15));
  const max = params.maxAddSub;
  const a = randomInt(min, max);
  const b = randomInt(min, Math.min(a, max));
  return { text: `${a} - ${b}`, answer: a - b };
};

const generateMulQuestion = (params: DifficultyParams): { text: string; answer: number } => {
  if (!params.allowMul) {
    return generateAddQuestion(params);
  }
  const a = randomInt(2, params.maxMulA);
  const b = randomInt(2, params.maxMulB);
  return { text: `${a} × ${b}`, answer: a * b };
};

const generateDivQuestion = (params: DifficultyParams): { text: string; answer: number } => {
  if (!params.allowDiv) {
    return params.allowMul ? generateMulQuestion(params) : generateSubQuestion(params);
  }
  const divisor = randomInt(2, params.maxDivDivisor);
  const quotient = randomInt(2, params.maxDivQuotient);
  const dividend = divisor * quotient;
  return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
};

export interface GeneratedQuestionMeta {
  operation: 'add' | 'sub' | 'mul' | 'div';
  operandA: number;
  operandB: number;
  answer: number;
  level: number;
  difficultyParams: DifficultyParams;
}

let lastGeneratedMeta: GeneratedQuestionMeta | null = null;

export const getLastGeneratedMeta = () => lastGeneratedMeta;

export const generateQuestionForLevel = (
  level: number,
  history: { templateId?: string, text?: string }[] = []
): Question & { targetTimeMs: number; dp: number; meta: GeneratedQuestionMeta } => {
  const params = getDifficultyParams(level);
  const op = selectOperation(params.opWeights);
  
  const recentSignatures = new Set(
    history.slice(0, 10).map(h => h.text ? generateSignature(h.text) : '')
  );
  
  let generated: { text: string; answer: number };
  let attempts = 0;
  const MAX_ATTEMPTS = 20;
  
  do {
    switch (op) {
      case 'add':
        generated = generateAddQuestion(params);
        break;
      case 'sub':
        generated = generateSubQuestion(params);
        break;
      case 'mul':
        generated = generateMulQuestion(params);
        break;
      case 'div':
        generated = generateDivQuestion(params);
        break;
    }
    attempts++;
    
    const sig = generateSignature(generated.text);
    if (!recentSignatures.has(sig)) break;
  } while (attempts < MAX_ATTEMPTS);
  
  const match = generated.text.match(/(\d+)\s*[+\-×÷]\s*(\d+)/);
  const operandA = match ? parseInt(match[1]) : 0;
  const operandB = match ? parseInt(match[2]) : 0;
  
  const targetTimeMs = getTargetTimeForLevel(level, op);
  const dp = getDpForLevel(level, op);
  
  const meta: GeneratedQuestionMeta = {
    operation: op,
    operandA,
    operandB,
    answer: generated.answer,
    level,
    difficultyParams: params
  };
  
  lastGeneratedMeta = meta;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    text: generated.text,
    answer: generated.answer,
    operation: op,
    targetTimeMs,
    dp,
    meta
  };
};

const getTargetTimeForLevel = (level: number, op: 'add' | 'sub' | 'mul' | 'div'): number => {
  const baseTimes: Record<string, number> = {
    add: 2000,
    sub: 2500,
    mul: 4000,
    div: 4500
  };
  const base = baseTimes[op];
  const levelFactor = 1 + (level - 1) * 0.03;
  return Math.round(base * levelFactor);
};

const getDpForLevel = (level: number, op: 'add' | 'sub' | 'mul' | 'div'): number => {
  const opBonus: Record<string, number> = { add: 0, sub: 1, mul: 3, div: 4 };
  return Math.floor(level / 5) + 1 + opBonus[op];
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
