export interface TemplateVariant {
  index: number;
  description: string;
  generate: () => { text: string; answer: number; features?: string[] };
  dp: number; // Difficulty Points
  targetTimeMs: number;
}

export interface TemplateFamily {
  id: string;
  name: string;
  variants: TemplateVariant[];
}

export const BAND_DEFINITIONS = [
  // Band 0 (1-10): Non-trivial 1-digit
  { minLevel: 1, description: "Non-trivial 1-digit add/sub" },
  // Band 1 (11-20): 2-digit add/sub
  { minLevel: 11, description: "2-digit add/sub (carry/borrow ramps)" },
  // Band 2 (21-30): 3-digit add/sub common
  { minLevel: 21, description: "3-digit add/sub common" },
  // Band 3 (31-40): 3-digit x 1-digit meaningfully
  { minLevel: 31, description: "3-digit x 1-digit meaningfully" },
  // Band 4 (41-50): 4-digit / 2-digit
  { minLevel: 41, description: "4-digit / 2-digit" },
  // Band 5 (51-60): 4-digit + 4-digit common
  { minLevel: 51, description: "4-digit + 4-digit common" },
  // Band 6 (61-70): 4-digit - 4-digit common
  { minLevel: 61, description: "4-digit - 4-digit common" },
  // Band 7 (71-80): 2-3 digit x 2-digit common
  { minLevel: 71, description: "2-3 digit x 2-digit common" },
  // Band 8 (81-90): 5-digit / 2-digit common
  { minLevel: 81, description: "5-digit / 2-digit common" },
  // Band 9 (91-100): Expressions
  { minLevel: 91, description: "Expressions" },
];

export const getBandInfo = (bandIndex: number) => {
  if (bandIndex >= BAND_DEFINITIONS.length) {
    // Infinite scaling rule: "Maintain strict trivial filter forever"
    return { 
      minLevel: BAND_DEFINITIONS[BAND_DEFINITIONS.length - 1].minLevel + (bandIndex - 9) * 10,
      description: `Infinite Scale Band ${bandIndex}`
    };
  }
  return BAND_DEFINITIONS[bandIndex];
};
