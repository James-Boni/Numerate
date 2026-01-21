// --- Constants ---
export const TIERS = 10;

export interface Question {
  id: string;
  text: string;
  answer: number;
  operation: 'add' | 'sub' | 'mul' | 'div';
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
