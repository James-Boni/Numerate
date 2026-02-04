export interface DifficultyProfile {
  level: number;
  band: number;
  
  opWeights: {
    add: number;
    sub: number;
    mul: number;
    div: number;
    percent: number;
  };
  
  addSub: {
    min: number;
    max: number;
    allowNegatives: boolean;
    requireCarryBorrow: boolean;
    decimals: 0 | 1 | 2;
  };
  
  mul: {
    enabled: boolean;
    aMin: number;
    aMax: number;
    bMin: number;
    bMax: number;
  };
  
  div: {
    enabled: boolean;
    dividendMin: number;
    dividendMax: number;
    divisorMin: number;
    divisorMax: number;
    allowRemainder: boolean;
  };
  
  percent: {
    enabled: boolean;
    baseMin: number;
    baseMax: number;
    percentValues: number[];
    allowChange: boolean;
  };
  
  fractions: {
    enabled: boolean;
    denominators: number[];
    addSubOnly: boolean;
  };
  
  multiStep: {
    enabled: boolean;
    maxSteps: number;
    probability: number;
  };
  
  minComplexityScore: number;
  description: string;
}

export function getDifficultyProfile(level: number): DifficultyProfile {
  const clampedLevel = Math.max(1, Math.min(100, level));
  
  if (clampedLevel <= 4) return getFoundationAllOpsProfile(clampedLevel);
  if (clampedLevel <= 8) return getEarlyNegativesProfile(clampedLevel);
  if (clampedLevel <= 15) return getPercentFractionsProfile(clampedLevel);
  if (clampedLevel <= 25) return getMagnitudeRampProfile(clampedLevel);
  if (clampedLevel <= 35) return getDecimal1dpIntroProfile(clampedLevel);
  if (clampedLevel <= 45) return getDecimal1dpNormalProfile(clampedLevel);
  if (clampedLevel <= 60) return getDecimal2dpProfile(clampedLevel);
  if (clampedLevel <= 80) return getAdvancedDecimalProfile(clampedLevel);
  return getMasteryProfile(clampedLevel);
}

function getFoundationProfile(level: number): DifficultyProfile {
  const t = (level - 1) / 4;
  return {
    level,
    band: 0,
    opWeights: { add: 0.75 - t * 0.05, sub: 0.25 + t * 0.05, mul: 0, div: 0, percent: 0 },
    addSub: {
      min: 2 + level,
      max: 10 + level * 3,
      allowNegatives: false,
      requireCarryBorrow: false,
      decimals: 0
    },
    mul: { enabled: false, aMin: 0, aMax: 0, bMin: 0, bMax: 0 },
    div: { enabled: false, dividendMin: 0, dividendMax: 0, divisorMin: 0, divisorMax: 0, allowRemainder: false },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 2 + Math.floor(level / 2),
    description: `L${level}: Foundation - Simple add/sub ${2 + level}-${10 + level * 3}`
  };
}

function getCarryBorrowProfile(level: number): DifficultyProfile {
  const t = (level - 6) / 4;
  const mulWeight = level >= 9 ? 0.10 + (level - 9) * 0.05 : 0;
  return {
    level,
    band: 0,
    opWeights: { 
      add: 0.55 - mulWeight / 2, 
      sub: 0.45 - mulWeight / 2, 
      mul: mulWeight, 
      div: 0, 
      percent: 0 
    },
    addSub: {
      min: 10 + (level - 6) * 5,
      max: 30 + (level - 6) * 10,
      allowNegatives: false,
      requireCarryBorrow: level >= 7,
      decimals: 0
    },
    mul: { 
      enabled: level >= 9, 
      aMin: 2, 
      aMax: 9, 
      bMin: 2, 
      bMax: 9 
    },
    div: { enabled: false, dividendMin: 0, dividendMax: 0, divisorMin: 0, divisorMax: 0, allowRemainder: false },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 4 + Math.floor(t * 2),
    description: `L${level}: Carry/Borrow - add/sub ${10 + (level - 6) * 5}-${30 + (level - 6) * 10}${level >= 9 ? ', tables begin' : ''}`
  };
}

function getIntermediateProfile(level: number): DifficultyProfile {
  const t = (level - 11) / 9;
  const mulWeight = 0.15 + t * 0.15;
  const divWeight = level >= 15 ? 0.05 + (level - 15) * 0.02 : 0;
  return {
    level,
    band: 1,
    opWeights: { 
      add: 0.40 - divWeight / 2, 
      sub: 0.35 - divWeight / 2, 
      mul: mulWeight, 
      div: divWeight, 
      percent: 0 
    },
    addSub: {
      min: 25 + (level - 11) * 6,
      max: 80 + (level - 11) * 10,
      allowNegatives: false,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { 
      enabled: true, 
      aMin: 6, 
      aMax: 12 + (level - 11) * 2,
      bMin: 2, 
      bMax: 9 + Math.floor((level - 11) / 2)
    },
    div: { 
      enabled: level >= 15, 
      dividendMin: 10, 
      dividendMax: 50 + (level - 15) * 10,
      divisorMin: 2, 
      divisorMax: 9,
      allowRemainder: level >= 18
    },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 5 + Math.floor(t * 3),
    description: `L${level}: Intermediate - 2-digit ops, mul ${12 + (level - 11) * 2}x${9 + Math.floor((level - 11) / 2)}`
  };
}

function getTwoDigitMulProfile(level: number): DifficultyProfile {
  const t = (level - 21) / 9;
  return {
    level,
    band: 2,
    opWeights: { add: 0.25, sub: 0.25, mul: 0.30, div: 0.20, percent: 0 },
    addSub: {
      min: 50 + (level - 21) * 10,
      max: 150 + (level - 21) * 18,
      allowNegatives: false,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { 
      enabled: true, 
      aMin: 11, 
      aMax: 25 + (level - 21) * 5,
      bMin: 3 + Math.floor((level - 21) / 3), 
      bMax: 12 + (level - 21)
    },
    div: { 
      enabled: true, 
      dividendMin: 50, 
      dividendMax: 200 + (level - 21) * 30,
      divisorMin: 3, 
      divisorMax: 12 + Math.floor((level - 21) / 2),
      allowRemainder: true
    },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 7 + Math.floor(t * 3),
    description: `L${level}: Two-digit mul - ${25 + (level - 21) * 5}x${12 + (level - 21)}, div to ${12 + Math.floor((level - 21) / 2)}`
  };
}

function getAdvancedProfile(level: number): DifficultyProfile {
  const t = (level - 31) / 9;
  return {
    level,
    band: 3,
    opWeights: { add: 0.20, sub: 0.20, mul: 0.35, div: 0.25, percent: 0 },
    addSub: {
      min: 80 + (level - 31) * 12,
      max: 250 + (level - 31) * 25,
      allowNegatives: level >= 35,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { 
      enabled: true, 
      aMin: 15, 
      aMax: 50 + (level - 31) * 5,
      bMin: 11, 
      bMax: 25 + (level - 31) * 3
    },
    div: { 
      enabled: true, 
      dividendMin: 100, 
      dividendMax: 500 + (level - 31) * 50,
      divisorMin: 5, 
      divisorMax: 20 + (level - 31),
      allowRemainder: true
    },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 9 + Math.floor(t * 3),
    description: `L${level}: Advanced - 2x2 digit mul, negatives${level >= 35 ? ' enabled' : ' soon'}`
  };
}

function getHardProfile(level: number): DifficultyProfile {
  const t = (level - 41) / 9;
  const percentWeight = level >= 48 ? 0.05 + (level - 48) * 0.02 : 0;
  return {
    level,
    band: 4,
    opWeights: { 
      add: 0.15 - percentWeight / 2, 
      sub: 0.15 - percentWeight / 2, 
      mul: 0.35, 
      div: 0.30, 
      percent: percentWeight 
    },
    addSub: {
      min: 80 + (level - 41) * 15,
      max: 300 + (level - 41) * 30,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { 
      enabled: true, 
      aMin: 25, 
      aMax: 100 + (level - 41) * 10,
      bMin: 11, 
      bMax: 50 + (level - 41) * 5
    },
    div: { 
      enabled: true, 
      dividendMin: 200, 
      dividendMax: 2000 + (level - 41) * 200,
      divisorMin: 10, 
      divisorMax: 30 + (level - 41) * 2,
      allowRemainder: true
    },
    percent: { 
      enabled: level >= 48, 
      baseMin: 40, 
      baseMax: 200,
      percentValues: [10, 15, 20, 25, 50],
      allowChange: false
    },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 9 + t * 2,
    description: `L${level}: Hard - 3x1/2x2 digit, div 4-digit, percent${level >= 48 ? ' enabled' : ' soon'}`
  };
}

function getVeryHardProfile(level: number): DifficultyProfile {
  const t = (level - 51) / 9;
  return {
    level,
    band: 5,
    opWeights: { add: 0.12, sub: 0.12, mul: 0.35, div: 0.33, percent: 0.08 },
    addSub: {
      min: 100 + (level - 51) * 20,
      max: 500 + (level - 51) * 50,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: level >= 55 ? 1 : 0
    },
    mul: { 
      enabled: true, 
      aMin: 50, 
      aMax: 200 + (level - 51) * 20,
      bMin: 15, 
      bMax: 70 + (level - 51) * 5
    },
    div: { 
      enabled: true, 
      dividendMin: 500, 
      dividendMax: 5000 + (level - 51) * 500,
      divisorMin: 15, 
      divisorMax: 50 + (level - 51) * 3,
      allowRemainder: true
    },
    percent: { 
      enabled: true, 
      baseMin: 50, 
      baseMax: 500,
      percentValues: [5, 10, 12, 15, 20, 25, 30, 50, 75],
      allowChange: false
    },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 11 + t * 2,
    description: `L${level}: Very Hard - 3x2 digit, 5-digit div, decimals${level >= 55 ? ' enabled' : ' soon'}`
  };
}

function getEliteEntryProfile(level: number): DifficultyProfile {
  const t = (level - 61) / 9;
  return {
    level,
    band: 6,
    opWeights: { add: 0.10, sub: 0.10, mul: 0.35, div: 0.35, percent: 0.10 },
    addSub: {
      min: 150 + (level - 61) * 30,
      max: 800 + (level - 61) * 80,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 1
    },
    mul: { 
      enabled: true, 
      aMin: 100, 
      aMax: 400 + (level - 61) * 30,
      bMin: 20, 
      bMax: 90 + (level - 61) * 5
    },
    div: { 
      enabled: true, 
      dividendMin: 1000, 
      dividendMax: 10000 + (level - 61) * 1000,
      divisorMin: 20, 
      divisorMax: 80 + (level - 61) * 5,
      allowRemainder: true
    },
    percent: { 
      enabled: true, 
      baseMin: 80, 
      baseMax: 800,
      percentValues: [5, 8, 10, 12, 15, 18, 20, 25, 30, 40, 50, 75],
      allowChange: false
    },
    fractions: { 
      enabled: level >= 68, 
      denominators: [2, 4],
      addSubOnly: true
    },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 13 + t * 2,
    description: `L${level}: Elite Entry - Large operands, fractions${level >= 68 ? ' begin' : ' soon'}`
  };
}

function getEliteProfile(level: number): DifficultyProfile {
  const t = (level - 71) / 9;
  return {
    level,
    band: 7,
    opWeights: { add: 0.08, sub: 0.08, mul: 0.38, div: 0.36, percent: 0.10 },
    addSub: {
      min: 200 + (level - 71) * 40,
      max: 1000 + (level - 71) * 100,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: level >= 75 ? 2 : 1
    },
    mul: { 
      enabled: true, 
      aMin: 150, 
      aMax: 600 + (level - 71) * 40,
      bMin: 30, 
      bMax: 120 + (level - 71) * 8
    },
    div: { 
      enabled: true, 
      dividendMin: 2000, 
      dividendMax: 20000 + (level - 71) * 2000,
      divisorMin: 30, 
      divisorMax: 120 + (level - 71) * 10,
      allowRemainder: true
    },
    percent: { 
      enabled: true, 
      baseMin: 100, 
      baseMax: 1000,
      percentValues: [3, 5, 7, 8, 10, 12, 15, 17, 20, 25, 30, 33, 40, 50, 60, 75],
      allowChange: level >= 76
    },
    fractions: { 
      enabled: true, 
      denominators: [2, 3, 4, 5, 8],
      addSubOnly: true
    },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 15 + t * 2,
    description: `L${level}: Elite - 2 decimal places, percent change${level >= 76 ? ' enabled' : ' soon'}`
  };
}

function getVeryEliteProfile(level: number): DifficultyProfile {
  const t = (level - 81) / 9;
  const multiStepProb = level >= 85 ? 0.15 + (level - 85) * 0.03 : 0;
  return {
    level,
    band: 8,
    opWeights: { add: 0.06, sub: 0.06, mul: 0.40, div: 0.38, percent: 0.10 },
    addSub: {
      min: 300 + (level - 81) * 50,
      max: 1500 + (level - 81) * 150,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 2
    },
    mul: { 
      enabled: true, 
      aMin: 200, 
      aMax: 1000 + (level - 81) * 80,
      bMin: 40, 
      bMax: 200 + (level - 81) * 15
    },
    div: { 
      enabled: true, 
      dividendMin: 5000, 
      dividendMax: 50000 + (level - 81) * 5000,
      divisorMin: 50, 
      divisorMax: 200 + (level - 81) * 15,
      allowRemainder: true
    },
    percent: { 
      enabled: true, 
      baseMin: 150, 
      baseMax: 2000,
      percentValues: [2, 3, 5, 7, 8, 10, 12, 15, 17, 20, 22, 25, 30, 33, 40, 45, 50, 60, 75, 80],
      allowChange: true
    },
    fractions: { 
      enabled: true, 
      denominators: [2, 3, 4, 5, 6, 8, 10],
      addSubOnly: false
    },
    multiStep: { 
      enabled: level >= 85, 
      maxSteps: 2, 
      probability: multiStepProb 
    },
    minComplexityScore: 17 + t * 2,
    description: `L${level}: Very Elite - Multi-step${level >= 85 ? ` (${Math.round(multiStepProb * 100)}%)` : ' soon'}, 4x1 mul`
  };
}

function getPeakProfile(level: number): DifficultyProfile {
  const t = (level - 91) / 9;
  const multiStepProb = 0.30 + t * 0.20;
  return {
    level,
    band: 9,
    opWeights: { add: 0.05, sub: 0.05, mul: 0.42, div: 0.38, percent: 0.10 },
    addSub: {
      min: 500 + (level - 91) * 80,
      max: 2500 + (level - 91) * 250,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 2
    },
    mul: { 
      enabled: true, 
      aMin: 300, 
      aMax: 2000 + (level - 91) * 150,
      bMin: 60, 
      bMax: 300 + (level - 91) * 20
    },
    div: { 
      enabled: true, 
      dividendMin: 10000, 
      dividendMax: 100000 + (level - 91) * 10000,
      divisorMin: 80, 
      divisorMax: 400 + (level - 91) * 30,
      allowRemainder: true
    },
    percent: { 
      enabled: true, 
      baseMin: 200, 
      baseMax: 5000,
      percentValues: [1, 2, 3, 5, 7, 8, 10, 11, 12, 15, 17, 18, 20, 22, 25, 27, 30, 33, 35, 40, 45, 50, 55, 60, 66, 75, 80, 90],
      allowChange: true
    },
    fractions: { 
      enabled: true, 
      denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
      addSubOnly: false
    },
    multiStep: { 
      enabled: true, 
      maxSteps: level >= 100 ? 3 : 2, 
      probability: multiStepProb 
    },
    minComplexityScore: 19 + t * 2,
    description: `L${level}: Peak - Multi-step ${Math.round(multiStepProb * 100)}%, 3x3/4x2 mul, 6-digit div`
  };
}

function getFoundationAllOpsProfile(level: number): DifficultyProfile {
  return {
    level,
    band: 0,
    opWeights: { add: 0.30, sub: 0.30, mul: 0.20, div: 0.20, percent: 0 },
    addSub: {
      min: 1,
      max: 10 + level * 2,
      allowNegatives: false,
      requireCarryBorrow: false,
      decimals: 0
    },
    mul: { enabled: true, aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
    div: { enabled: true, dividendMin: 4, dividendMax: 25, divisorMin: 2, divisorMax: 5, allowRemainder: false },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 2,
    description: `L${level}: Foundation - All ops (1-${10 + level * 2}), integer answers`
  };
}

function getEarlyNegativesProfile(level: number): DifficultyProfile {
  const t = (level - 5) / 3;
  return {
    level,
    band: 1,
    opWeights: { add: 0.28, sub: 0.28, mul: 0.22, div: 0.22, percent: 0 },
    addSub: {
      min: 10,
      max: 50 + level * 5,
      allowNegatives: true,
      requireCarryBorrow: level >= 7,
      decimals: 0
    },
    mul: { enabled: true, aMin: 2, aMax: 9, bMin: 2, bMax: 9 },
    div: { enabled: true, dividendMin: 10, dividendMax: 81, divisorMin: 2, divisorMax: 9, allowRemainder: false },
    percent: { enabled: false, baseMin: 0, baseMax: 0, percentValues: [], allowChange: false },
    fractions: { enabled: false, denominators: [], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 4 + Math.floor(t * 2),
    description: `L${level}: Early Negatives - Bigger numbers (10-${50 + level * 5}), negatives introduced`
  };
}

function getPercentFractionsProfile(level: number): DifficultyProfile {
  const t = (level - 9) / 6;
  const percentValues = level <= 11 ? [10, 25, 50] : level <= 13 ? [10, 20, 25, 50, 75] : [5, 10, 15, 20, 25, 50, 75];
  return {
    level,
    band: 2,
    opWeights: { add: 0.22, sub: 0.22, mul: 0.20, div: 0.20, percent: 0.16 },
    addSub: {
      min: 20,
      max: 100 + level * 10,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { enabled: true, aMin: 2, aMax: 12, bMin: 2, bMax: 12 },
    div: { enabled: true, dividendMin: 20, dividendMax: 144, divisorMin: 2, divisorMax: 12, allowRemainder: false },
    percent: { enabled: true, baseMin: 20, baseMax: 200, percentValues, allowChange: level >= 13 },
    fractions: { enabled: true, denominators: level <= 11 ? [2, 4] : [2, 3, 4, 5], addSubOnly: true },
    multiStep: { enabled: false, maxSteps: 1, probability: 0 },
    minComplexityScore: 5 + Math.floor(t * 2),
    description: `L${level}: Percent & Fractions - Still integer answers`
  };
}

function getMagnitudeRampProfile(level: number): DifficultyProfile {
  const t = (level - 16) / 9;
  const maxAddSub = 200 + (level - 16) * 50;
  return {
    level,
    band: 3,
    opWeights: { add: 0.20, sub: 0.20, mul: 0.22, div: 0.22, percent: 0.16 },
    addSub: {
      min: 50,
      max: maxAddSub,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 0
    },
    mul: { enabled: true, aMin: 5, aMax: 20 + level - 16, bMin: 5, bMax: 15 + Math.floor((level - 16) / 2) },
    div: { enabled: true, dividendMin: 50, dividendMax: 500 + (level - 16) * 50, divisorMin: 3, divisorMax: 15, allowRemainder: false },
    percent: { enabled: true, baseMin: 50, baseMax: 500, percentValues: [5, 10, 12.5, 15, 20, 25, 30, 50, 75], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 8, 10], addSubOnly: false },
    multiStep: { enabled: level >= 20, maxSteps: 2, probability: 0.1 },
    minComplexityScore: 7 + Math.floor(t * 2),
    description: `L${level}: Magnitude Ramp - Large numbers (up to ${maxAddSub}), 2-digit mul`
  };
}

function getDecimal1dpIntroProfile(level: number): DifficultyProfile {
  const t = (level - 26) / 9;
  return {
    level,
    band: 4,
    opWeights: { add: 0.18, sub: 0.18, mul: 0.22, div: 0.25, percent: 0.17 },
    addSub: {
      min: 100,
      max: 500 + (level - 26) * 50,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 1
    },
    mul: { enabled: true, aMin: 10, aMax: 30 + level - 26, bMin: 5, bMax: 20 },
    div: { enabled: true, dividendMin: 100, dividendMax: 1000, divisorMin: 2, divisorMax: 20, allowRemainder: true },
    percent: { enabled: true, baseMin: 100, baseMax: 1000, percentValues: [5, 10, 12.5, 15, 20, 25, 30, 33, 50, 66, 75], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 6, 8, 10], addSubOnly: false },
    multiStep: { enabled: true, maxSteps: 2, probability: 0.15 },
    minComplexityScore: 9 + Math.floor(t * 2),
    description: `L${level}: 1dp Decimals Intro - Division rounds to 1 decimal place`
  };
}

function getDecimal1dpNormalProfile(level: number): DifficultyProfile {
  const t = (level - 36) / 9;
  return {
    level,
    band: 5,
    opWeights: { add: 0.16, sub: 0.16, mul: 0.24, div: 0.26, percent: 0.18 },
    addSub: {
      min: 200,
      max: 1000 + (level - 36) * 100,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 1
    },
    mul: { enabled: true, aMin: 15, aMax: 50, bMin: 10, bMax: 30 },
    div: { enabled: true, dividendMin: 200, dividendMax: 2000, divisorMin: 3, divisorMax: 25, allowRemainder: true },
    percent: { enabled: true, baseMin: 200, baseMax: 2000, percentValues: [5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], addSubOnly: false },
    multiStep: { enabled: true, maxSteps: 2, probability: 0.20 },
    minComplexityScore: 11 + Math.floor(t * 2),
    description: `L${level}: 1dp Normal - Decimals are standard`
  };
}

function getDecimal2dpProfile(level: number): DifficultyProfile {
  const t = (level - 46) / 14;
  return {
    level,
    band: 6,
    opWeights: { add: 0.14, sub: 0.14, mul: 0.26, div: 0.28, percent: 0.18 },
    addSub: {
      min: 500,
      max: 2000 + (level - 46) * 200,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 2
    },
    mul: { enabled: true, aMin: 20, aMax: 100, bMin: 10, bMax: 50 },
    div: { enabled: true, dividendMin: 500, dividendMax: 5000, divisorMin: 3, divisorMax: 50, allowRemainder: true },
    percent: { enabled: true, baseMin: 500, baseMax: 5000, percentValues: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20], addSubOnly: false },
    multiStep: { enabled: true, maxSteps: 3, probability: 0.25 },
    minComplexityScore: 13 + Math.floor(t * 2),
    description: `L${level}: 2dp Decimals - Division rounds to 2 decimal places`
  };
}

function getAdvancedDecimalProfile(level: number): DifficultyProfile {
  const t = (level - 61) / 19;
  return {
    level,
    band: 7,
    opWeights: { add: 0.12, sub: 0.12, mul: 0.28, div: 0.30, percent: 0.18 },
    addSub: {
      min: 1000,
      max: 5000 + (level - 61) * 500,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 2
    },
    mul: { enabled: true, aMin: 50, aMax: 200, bMin: 20, bMax: 100 },
    div: { enabled: true, dividendMin: 1000, dividendMax: 10000, divisorMin: 5, divisorMax: 100, allowRemainder: true },
    percent: { enabled: true, baseMin: 1000, baseMax: 10000, percentValues: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 20, 25], addSubOnly: false },
    multiStep: { enabled: true, maxSteps: 3, probability: 0.30 },
    minComplexityScore: 16 + Math.floor(t * 2),
    description: `L${level}: Advanced - Large numbers, complex operations`
  };
}

function getMasteryProfile(level: number): DifficultyProfile {
  const t = (level - 81) / 19;
  return {
    level,
    band: 8,
    opWeights: { add: 0.10, sub: 0.10, mul: 0.30, div: 0.32, percent: 0.18 },
    addSub: {
      min: 2000,
      max: 10000 + (level - 81) * 1000,
      allowNegatives: true,
      requireCarryBorrow: true,
      decimals: 2
    },
    mul: { enabled: true, aMin: 100, aMax: 500, bMin: 50, bMax: 200 },
    div: { enabled: true, dividendMin: 5000, dividendMax: 50000, divisorMin: 10, divisorMax: 200, allowRemainder: true },
    percent: { enabled: true, baseMin: 5000, baseMax: 50000, percentValues: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90], allowChange: true },
    fractions: { enabled: true, denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 20, 25, 50], addSubOnly: false },
    multiStep: { enabled: true, maxSteps: 4, probability: 0.35 },
    minComplexityScore: 18 + Math.floor(t * 2),
    description: `L${level}: Mastery - Expert-level arithmetic`
  };
}

export function computeQuestionComplexity(
  operation: string,
  operandA: number,
  operandB: number,
  hasCarryBorrow: boolean,
  hasDecimals: boolean,
  hasNegatives: boolean,
  isMultiStep: boolean,
  stepCount: number = 1
): number {
  let score = 0;
  
  const digitCountA = Math.max(1, Math.floor(Math.log10(Math.abs(operandA) || 1)) + 1);
  const digitCountB = Math.max(1, Math.floor(Math.log10(Math.abs(operandB) || 1)) + 1);
  
  if (operation === 'add' || operation === 'sub') {
    score = digitCountA + digitCountB;
    if (hasCarryBorrow) score += 2;
  } else if (operation === 'mul') {
    score = digitCountA * digitCountB + 2;
  } else if (operation === 'div') {
    score = digitCountA + digitCountB * 2 + 3;
  } else if (operation === 'percent') {
    score = 6 + digitCountA;
  }
  
  if (hasDecimals) score += 3;
  if (hasNegatives) score += 2;
  if (isMultiStep) score += stepCount * 4;
  
  return score;
}

