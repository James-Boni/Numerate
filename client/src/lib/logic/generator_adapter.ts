import { TemplateFamily } from './curriculum';
import { ADD_FAMILIES, SUB_FAMILIES } from './generators/arithmetic';
import { Question } from '../game-logic';

export const getTemplateFamilyForBand = (band: number): TemplateFamily => {
  // Simple mapping for MVP bands 0 and 1
  if (band === 0) {
    // Mostly ADD_1D_1D
    return ADD_FAMILIES.ADD_1D_1D;
  }
  if (band === 1) {
    // ADD_2D_2D or SUB_1D_1D
    return Math.random() > 0.5 ? ADD_FAMILIES.ADD_2D_2D : SUB_FAMILIES.SUB_1D_1D;
  }
  
  // Default fallback for higher bands in MVP
  return ADD_FAMILIES.ADD_2D_2D;
};

export const generateQuestionForProgression = (
  band: number, 
  difficultyStep: number,
  history: { templateId?: string, text?: string }[] = [] // Repetition guard
): Question & { targetTimeMs: number; dp: number } => {
  const family = getTemplateFamilyForBand(band);
  
  // Select variant based on difficultyStep (clamp to available variants)
  const variantIndex = Math.min(difficultyStep, family.variants.length - 1);
  const variant = family.variants[variantIndex];
  
  // Try up to 5 times to generate a non-repeated question
  let generated: { text: string; answer: number; };
  let attempts = 0;
  
  do {
    generated = variant.generate();
    attempts++;
    
    // Check against last 3 questions
    const isRepeated = history.slice(0, 3).some(h => h.text === generated.text);
    if (!isRepeated) break;
    
  } while (attempts < 5);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    text: generated.text,
    answer: generated.answer,
    operation: 'add', // Placeholder, should come from family metadata really
    targetTimeMs: variant.targetTimeMs,
    dp: variant.dp
  };
};
