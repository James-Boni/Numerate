export interface LevelCapabilities {
  level: number;
  band: string;
  
  allowNegativeAnswers: boolean;
  negativeMagnitudeLimit?: number;
  
  allowDecimals: boolean;
  decimalDpMax: 0 | 1 | 2;
  divisionMode: 'integerOnly' | 'round1dp' | 'round2dp';
  
  percentEnabled: boolean;
  percentValues: number[];
  
  fractionsEnabled: boolean;
  fractionDenominators: number[];
  
  operations: {
    add: boolean;
    sub: boolean;
    mul: boolean;
    div: boolean;
  };
  
  operandRanges: {
    addSub: { min: number; max: number };
    mulA: { min: number; max: number };
    mulB: { min: number; max: number };
    divDivisor: { min: number; max: number };
    divDividend: { min: number; max: number };
  };
  
  requireCarryBorrow: boolean;
  
  conceptsUnlocked: string[];
  description: string;
}

export function getLevelCapabilities(level: number): LevelCapabilities {
  const clampedLevel = Math.max(1, Math.min(100, level));
  
  if (clampedLevel <= 4) return getFoundationCapabilities(clampedLevel);
  if (clampedLevel <= 8) return getEarlyNegativesCapabilities(clampedLevel);
  if (clampedLevel <= 15) return getPercentFractionsCapabilities(clampedLevel);
  if (clampedLevel <= 25) return getMagnitudeRampCapabilities(clampedLevel);
  if (clampedLevel <= 35) return getDecimal1dpCapabilities(clampedLevel);
  if (clampedLevel <= 45) return getDecimal1dpNormalCapabilities(clampedLevel);
  return getDecimal2dpCapabilities(clampedLevel);
}

function getFoundationCapabilities(level: number): LevelCapabilities {
  const t = (level - 1) / 3;
  
  return {
    level,
    band: 'L1-4: Foundation',
    
    allowNegativeAnswers: false,
    allowDecimals: false,
    decimalDpMax: 0,
    divisionMode: 'integerOnly',
    
    percentEnabled: false,
    percentValues: [],
    
    fractionsEnabled: false,
    fractionDenominators: [],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 1, max: 10 + level * 2 },
      mulA: { min: 1, max: 5 },
      mulB: { min: 1, max: 5 },
      divDivisor: { min: 2, max: 5 },
      divDividend: { min: 4, max: 25 }
    },
    
    requireCarryBorrow: false,
    
    conceptsUnlocked: ['basic_add', 'basic_sub', 'basic_mul', 'basic_div'],
    description: `L${level}: Foundation - All ops with small numbers (1-${10 + level * 2}), integer answers only`
  };
}

function getEarlyNegativesCapabilities(level: number): LevelCapabilities {
  const t = (level - 5) / 3;
  
  return {
    level,
    band: 'L5-8: Early Negatives',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 20 + (level - 5) * 10,
    
    allowDecimals: false,
    decimalDpMax: 0,
    divisionMode: 'integerOnly',
    
    percentEnabled: false,
    percentValues: [],
    
    fractionsEnabled: false,
    fractionDenominators: [],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 10, max: 50 + level * 5 },
      mulA: { min: 2, max: 9 },
      mulB: { min: 2, max: 9 },
      divDivisor: { min: 2, max: 9 },
      divDividend: { min: 10, max: 81 }
    },
    
    requireCarryBorrow: level >= 7,
    
    conceptsUnlocked: ['negative_answers'],
    description: `L${level}: Bigger integers (10-${50 + level * 5}), negatives allowed (limit -${20 + (level - 5) * 10})`
  };
}

function getPercentFractionsCapabilities(level: number): LevelCapabilities {
  const t = (level - 9) / 6;
  
  const percentValues = level <= 11 
    ? [10, 25, 50] 
    : level <= 13 
    ? [10, 20, 25, 50, 75]
    : [5, 10, 15, 20, 25, 50, 75];
    
  const fractionDenoms = level <= 11
    ? [2, 4]
    : level <= 13
    ? [2, 3, 4]
    : [2, 3, 4, 5];
  
  return {
    level,
    band: 'L9-15: Percent & Fractions',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 50 + (level - 9) * 10,
    
    allowDecimals: false,
    decimalDpMax: 0,
    divisionMode: 'integerOnly',
    
    percentEnabled: true,
    percentValues,
    
    fractionsEnabled: true,
    fractionDenominators: fractionDenoms,
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 20, max: 100 + level * 10 },
      mulA: { min: 2, max: 12 },
      mulB: { min: 2, max: 12 },
      divDivisor: { min: 2, max: 12 },
      divDividend: { min: 20, max: 144 }
    },
    
    requireCarryBorrow: true,
    
    conceptsUnlocked: ['percent_basic', 'fractions_basic'],
    description: `L${level}: Percent (${percentValues.join(',')}%) and fractions (1/${fractionDenoms.join(',1/')}) introduced, still integer answers`
  };
}

function getMagnitudeRampCapabilities(level: number): LevelCapabilities {
  const t = (level - 16) / 9;
  const maxAddSub = 200 + (level - 16) * 50;
  
  return {
    level,
    band: 'L16-25: Magnitude Ramp',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 200 + (level - 16) * 20,
    
    allowDecimals: false,
    decimalDpMax: 0,
    divisionMode: 'integerOnly',
    
    percentEnabled: true,
    percentValues: [5, 10, 12.5, 15, 20, 25, 30, 50, 75],
    
    fractionsEnabled: true,
    fractionDenominators: [2, 3, 4, 5, 8, 10],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 50, max: maxAddSub },
      mulA: { min: 5, max: 20 + level - 16 },
      mulB: { min: 5, max: 15 + Math.floor((level - 16) / 2) },
      divDivisor: { min: 3, max: 15 },
      divDividend: { min: 50, max: 500 + (level - 16) * 50 }
    },
    
    requireCarryBorrow: true,
    
    conceptsUnlocked: ['large_numbers', '2digit_mul'],
    description: `L${level}: Large numbers (up to ${maxAddSub}), 2-digit multiplication, still integer answers`
  };
}

function getDecimal1dpCapabilities(level: number): LevelCapabilities {
  const t = (level - 26) / 9;
  
  return {
    level,
    band: 'L26-35: 1dp Decimals',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 500,
    
    allowDecimals: true,
    decimalDpMax: 1,
    divisionMode: 'round1dp',
    
    percentEnabled: true,
    percentValues: [5, 10, 12.5, 15, 20, 25, 30, 33, 50, 66, 75],
    
    fractionsEnabled: true,
    fractionDenominators: [2, 3, 4, 5, 6, 8, 10],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 100, max: 500 + (level - 26) * 50 },
      mulA: { min: 10, max: 30 + level - 26 },
      mulB: { min: 5, max: 20 },
      divDivisor: { min: 2, max: 20 },
      divDividend: { min: 100, max: 1000 }
    },
    
    requireCarryBorrow: true,
    
    conceptsUnlocked: ['decimal_1dp', 'div_round_1dp'],
    description: `L${level}: Decimal answers (1dp) introduced, division rounds to 1 decimal place`
  };
}

function getDecimal1dpNormalCapabilities(level: number): LevelCapabilities {
  return {
    level,
    band: 'L36-45: 1dp Normal',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 1000,
    
    allowDecimals: true,
    decimalDpMax: 1,
    divisionMode: 'round1dp',
    
    percentEnabled: true,
    percentValues: [5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90],
    
    fractionsEnabled: true,
    fractionDenominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 200, max: 1000 + (level - 36) * 100 },
      mulA: { min: 15, max: 50 },
      mulB: { min: 10, max: 30 },
      divDivisor: { min: 3, max: 25 },
      divDividend: { min: 200, max: 2000 }
    },
    
    requireCarryBorrow: true,
    
    conceptsUnlocked: [],
    description: `L${level}: 1dp decimals are normal, larger numbers, more complex percent/fractions`
  };
}

function getDecimal2dpCapabilities(level: number): LevelCapabilities {
  return {
    level,
    band: 'L46+: 2dp Decimals',
    
    allowNegativeAnswers: true,
    negativeMagnitudeLimit: 2000,
    
    allowDecimals: true,
    decimalDpMax: 2,
    divisionMode: 'round2dp',
    
    percentEnabled: true,
    percentValues: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 33, 40, 50, 60, 66, 75, 80, 90],
    
    fractionsEnabled: true,
    fractionDenominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20],
    
    operations: { add: true, sub: true, mul: true, div: true },
    
    operandRanges: {
      addSub: { min: 500, max: 2000 + (level - 46) * 200 },
      mulA: { min: 20, max: 100 },
      mulB: { min: 10, max: 50 },
      divDivisor: { min: 3, max: 50 },
      divDividend: { min: 500, max: 5000 }
    },
    
    requireCarryBorrow: true,
    
    conceptsUnlocked: ['decimal_2dp', 'div_round_2dp'],
    description: `L${level}: 2dp decimals, division rounds to 2 decimal places, advanced arithmetic`
  };
}

export function getConceptsForLevel(level: number): string[] {
  const allConcepts: string[] = [];
  
  for (let l = 1; l <= level; l++) {
    const caps = getLevelCapabilities(l);
    for (const concept of caps.conceptsUnlocked) {
      if (!allConcepts.includes(concept)) {
        allConcepts.push(concept);
      }
    }
  }
  
  return allConcepts;
}

export function isConceptNewAtLevel(level: number, concept: string): boolean {
  const caps = getLevelCapabilities(level);
  return caps.conceptsUnlocked.includes(concept);
}

export function getNewConceptsAtLevel(level: number): string[] {
  return getLevelCapabilities(level).conceptsUnlocked;
}
