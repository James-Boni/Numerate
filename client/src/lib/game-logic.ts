// --- Constants ---
export const TIERS = 10;

export interface AnswerFormat {
  dpRequired: 0 | 1 | 2;
  roundingMode: 'exact' | 'round';
  allowNegative: boolean;
}

export type QuestionTier = 'review' | 'core' | 'stretch';

export interface Question {
  id: string;
  text: string;
  answer: number;
  operation: 'add' | 'sub' | 'mul' | 'div';
  answerFormat?: AnswerFormat;
  tier?: QuestionTier;
}

export function selectQuestionTier(sessionQuestionIndex: number): QuestionTier {
  if (sessionQuestionIndex < 2) {
    return 'review';
  }
  
  const roll = Math.random();
  if (roll < 0.80) return 'core';
  if (roll < 0.95) return 'stretch';
  return 'review';
}

export function getTierXpMultiplier(tier: QuestionTier): number {
  switch (tier) {
    case 'stretch': return 1.5;
    case 'core': return 1.0;
    case 'review': return 0.5;
  }
}

export function validateAnswer(userInput: string, correctAnswer: number, format: AnswerFormat): boolean {
  const userValue = parseFloat(userInput);
  if (isNaN(userValue)) return false;
  
  if (!format.allowNegative && userValue < 0) return false;
  
  if (format.dpRequired === 0) {
    if (!Number.isInteger(userValue)) return false;
    return userValue === Math.round(correctAnswer);
  }
  
  if (!userInput.includes('.')) {
    return false;
  }
  
  const decimalPart = userInput.split('.')[1] || '';
  if (decimalPart.length < format.dpRequired) {
    return false;
  }
  
  if (format.roundingMode === 'round') {
    const factor = Math.pow(10, format.dpRequired);
    const userRounded = Math.round(userValue * factor) / factor;
    const correctRounded = Math.round(correctAnswer * factor) / factor;
    return userRounded === correctRounded;
  } else {
    const tolerance = Math.pow(10, -(format.dpRequired + 1));
    return Math.abs(userValue - correctAnswer) <= tolerance;
  }
}

export const DEFAULT_ANSWER_FORMAT: AnswerFormat = {
  dpRequired: 0,
  roundingMode: 'exact',
  allowNegative: false
};

export function getAnswerFormatLabel(format: AnswerFormat): string | null {
  if (format.dpRequired === 0) {
    return null;
  }
  const dpText = format.dpRequired === 1 ? "1 decimal place" : "2 decimal places";
  if (format.roundingMode === 'round') {
    return `Round to ${dpText}`;
  }
  return `Answer to ${dpText}`;
}

// --- Generators ---

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateQuestion(tier: number): Question {
  // Simple tiered logic
  const ops = ['add', 'sub', 'mul', 'div'];
  // Weight operations based on tier (simplified for MVP)
  let allowedOps: string[] = ['add', 'sub'];
  
  if (tier >= 2) allowedOps.push('mul');
  if (tier >= 4) allowedOps.push('div');
  
  // Higher tiers = more complex ops
  const op = allowedOps[randomInt(0, allowedOps.length - 1)] as 'add' | 'sub' | 'mul' | 'div';
  
  let a = 0, b = 0, ans = 0, text = "";
  
  switch (op) {
    case 'add':
      if (tier === 0) { a = randomInt(1, 9); b = randomInt(1, 9); } // Sum < 20
      else if (tier === 1) { a = randomInt(5, 20); b = randomInt(2, 15); }
      else if (tier <= 3) { a = randomInt(10, 50); b = randomInt(10, 50); }
      else { a = randomInt(20, 100); b = randomInt(20, 100); }
      ans = a + b;
      text = `${a} + ${b}`;
      break;
      
    case 'sub':
      // Ensure positive result
      if (tier === 0) { a = randomInt(5, 15); b = randomInt(1, a); }
      else if (tier <= 2) { a = randomInt(10, 30); b = randomInt(1, a); }
      else { a = randomInt(20, 100); b = randomInt(10, a); }
      ans = a - b;
      text = `${a} − ${b}`;
      break;
      
    case 'mul':
      if (tier <= 2) { a = randomInt(2, 5); b = randomInt(2, 5); }
      else if (tier <= 4) { a = randomInt(2, 9); b = randomInt(2, 9); } // Basic tables
      else { a = randomInt(3, 12); b = randomInt(3, 12); }
      ans = a * b;
      text = `${a} × ${b}`;
      break;
      
    case 'div':
      // Exact division: generate factors first
      if (tier <= 4) { b = randomInt(2, 5); ans = randomInt(2, 5); }
      else { b = randomInt(2, 9); ans = randomInt(2, 9); }
      a = b * ans;
      text = `${a} ÷ ${b}`;
      break;
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    text,
    answer: ans,
    operation: op
  };
}

export function calculateXP(isCorrect: boolean, timeMs: number, streak: number): number {
  if (!isCorrect) return 0;
  
  let base = 10;
  // Speed bonus
  if (timeMs < 2000) base += 5;
  if (timeMs < 1000) base += 5;
  
  // Streak multiplier (capped at 2.0x)
  const multiplier = Math.min(1 + (streak * 0.1), 2.0);
  
  return Math.round(base * multiplier);
}
