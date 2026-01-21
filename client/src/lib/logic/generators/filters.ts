// Triviality Filter Logic
// "Once band >= 1, reject generation of questions that are obviously trivial"

export const isTrivial = (
  op: 'add' | 'sub' | 'mul' | 'div',
  operands: number[],
  band: number
): boolean => {
  // Always trivial if any operand is 0 or 1 (except maybe advanced algebra later, but for arithmetic yes)
  if (operands.some(n => n === 0)) return true; // Identity/Zero property
  
  if (band === 0) {
    // Band 0: Allow small sums but filter super obvious ones if you want
    // But spec says "Band 0 (1-10): non-trivial 1-digit add/sub"
    // "Tiny operands (e.g. both <= 3)"
    if (op === 'add' && operands[0] <= 3 && operands[1] <= 3) return true;
    if (op === 'sub' && operands[1] <= 2) return true; // -1, -2 are very easy
    return false;
  }

  // Band >= 1 (Level 11+)
  
  // ADD/SUB
  if (op === 'add' || op === 'sub') {
    // "Tiny operands (e.g. both <= 3)" -> Scale this up. 
    // Maybe reject if BOTH are < 5 at Band 1?
    if (operands.every(n => n <= 5)) return true;
    
    // "Repeated toy patterns like 10+7, 9-3"
    if (op === 'add' && (operands[0] === 10 || operands[1] === 10)) return true; // Base 10 is easy
    if (op === 'sub' && operands[1] === 10) return true;
  }

  // MUL
  if (op === 'mul') {
     // x1, x2, x10 are often considered trivial.
     if (operands.some(n => n === 1 || n === 10)) return true;
     if (operands.some(n => n === 2) && band >= 3) return true; // By Band 3, x2 is trivial
  }

  // DIV
  if (op === 'div') {
    // operands[0] is Dividend, operands[1] is Divisor
    // "Division that collapses to memorized tiny facts repeatedly"
    const divisor = operands[1];
    const quotient = operands[0] / operands[1];
    
    if (divisor === 1 || divisor === 10) return true;
    if (divisor === 2 && band >= 3) return true;
    if (quotient <= 5 && divisor <= 5 && band >= 2) return true; // Tiny table facts
  }

  return false;
};
