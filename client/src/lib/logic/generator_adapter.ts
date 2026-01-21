import { TemplateFamily } from './curriculum';
import { ADD_FAMILIES, SUB_FAMILIES } from './generators/arithmetic';
import { Question } from '../game-logic';

const getAllFamiliesForBand = (band: number): TemplateFamily[] => {
  if (band === 0) {
    return [ADD_FAMILIES.ADD_1D_1D];
  }
  if (band === 1) {
    return [ADD_FAMILIES.ADD_1D_1D, SUB_FAMILIES.SUB_1D_1D];
  }
  if (band >= 2) {
    return [ADD_FAMILIES.ADD_2D_2D, SUB_FAMILIES.SUB_1D_1D];
  }
  return [ADD_FAMILIES.ADD_1D_1D];
};

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

export const generateQuestionForProgression = (
  band: number, 
  difficultyStep: number,
  history: { templateId?: string, text?: string }[] = []
): Question & { targetTimeMs: number; dp: number } => {
  const families = getAllFamiliesForBand(band);
  const family = families[Math.floor(Math.random() * families.length)];
  
  const variantIndex = Math.min(difficultyStep, family.variants.length - 1);
  const variant = family.variants[variantIndex];
  
  const recentSignatures = new Set(
    history.slice(0, 10).map(h => h.text ? generateSignature(h.text) : '')
  );
  
  let generated: { text: string; answer: number };
  let attempts = 0;
  const MAX_ATTEMPTS = 20;
  
  do {
    generated = variant.generate();
    attempts++;
    
    const sig = generateSignature(generated.text);
    if (!recentSignatures.has(sig)) break;
    
    if (attempts >= MAX_ATTEMPTS / 2 && families.length > 1) {
      const altFamily = families[(families.indexOf(family) + 1) % families.length];
      const altVariant = altFamily.variants[Math.min(difficultyStep, altFamily.variants.length - 1)];
      generated = altVariant.generate();
      const altSig = generateSignature(generated.text);
      if (!recentSignatures.has(altSig)) break;
    }
  } while (attempts < MAX_ATTEMPTS);
  
  const opMatch = generated.text.match(/[+\-×÷]/);
  const opMap: Record<string, string> = { '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div' };
  const operation = opMatch ? (opMap[opMatch[0]] || 'add') : 'add';
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    text: generated.text,
    answer: generated.answer,
    operation: operation as any,
    targetTimeMs: variant.targetTimeMs,
    dp: variant.dp
  };
};
