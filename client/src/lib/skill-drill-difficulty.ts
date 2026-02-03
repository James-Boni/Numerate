// Tier-based difficulty system for skill drills
// Tier advances every 3 correct answers - endless scaling

export interface RoundingQuestion {
  id: string;
  number: number;
  roundTo: string;
  answer: number;
  text: string;
}

export interface DoublingQuestion {
  id: string;
  number: number;
  answer: number;
}

export interface HalvingQuestion {
  id: string;
  number: number;
  answer: number;
}

// Calculate tier from correct count (tier 0 at start, advances every 3 correct)
export function getTier(correctCount: number): number {
  return Math.floor(correctCount / 3);
}

// ROUNDING: Tier-based generation with endless scaling
export function generateRoundingQuestion(tier: number): RoundingQuestion {
  // Tier 0-1: Round to 10, 2-3 digit numbers
  // Tier 2-3: Round to 10 or 100, 3-4 digit numbers
  // Tier 4-5: Add decimals, round to 0.1
  // Tier 6-7: Round to 1000, 4-5 digit numbers
  // Tier 8-9: Round to 0.01, complex decimals
  // Tier 10+: All types, 5+ digit numbers, endless scaling

  type RoundingType = { target: string; divisor: number; isDecimal: boolean };
  const roundingTypes: RoundingType[] = [];
  
  // Build available rounding types based on tier
  roundingTypes.push({ target: '10', divisor: 10, isDecimal: false });
  
  if (tier >= 2) {
    roundingTypes.push({ target: '100', divisor: 100, isDecimal: false });
  }
  if (tier >= 4) {
    roundingTypes.push({ target: '1 decimal place', divisor: 0.1, isDecimal: true });
  }
  if (tier >= 6) {
    roundingTypes.push({ target: '1000', divisor: 1000, isDecimal: false });
  }
  if (tier >= 8) {
    roundingTypes.push({ target: '2 decimal places', divisor: 0.01, isDecimal: true });
  }
  if (tier >= 10) {
    roundingTypes.push({ target: '10000', divisor: 10000, isDecimal: false });
  }
  
  const selectedType = roundingTypes[Math.floor(Math.random() * roundingTypes.length)];
  
  // Number magnitude scales with tier
  const magnitudeMultiplier = 1 + tier * 0.5;
  let number: number;
  let answer: number;
  
  if (!selectedType.isDecimal) {
    // Rounding to nearest 10, 100, 1000, 10000
    const baseMin = selectedType.divisor;
    const baseMax = Math.min(selectedType.divisor * 20 * magnitudeMultiplier, 1000000);
    number = Math.floor(Math.random() * (baseMax - baseMin) + baseMin);
    
    // Add decimals at higher tiers for extra complexity
    if (tier >= 4 && Math.random() < 0.4) {
      number = number + Math.round(Math.random() * 99) / 100;
    }
    
    answer = Math.round(number / selectedType.divisor) * selectedType.divisor;
  } else {
    // Rounding to decimal places
    const decimalPlaces = selectedType.divisor === 0.1 ? 1 : 2;
    const maxBase = Math.min(50 + tier * 30, 5000);
    
    // Generate number with more decimal places than we're rounding to
    const extraDecimals = decimalPlaces + 1 + Math.floor(Math.random() * 2);
    const wholePart = Math.floor(Math.random() * maxBase);
    const decimalPart = Math.round(Math.random() * Math.pow(10, extraDecimals)) / Math.pow(10, extraDecimals);
    number = wholePart + decimalPart;
    
    answer = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
  }
  
  // Format display number
  const displayNumber = number % 1 !== 0 
    ? number.toFixed(Math.max(2, (number.toString().split('.')[1]?.length || 0)))
    : number.toString();
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    number: parseFloat(displayNumber),
    roundTo: selectedType.target,
    answer,
    text: `Round ${displayNumber} to the nearest ${selectedType.target}`
  };
}

// DOUBLING: Tier-based generation with endless scaling
export function generateDoublingQuestion(tier: number): DoublingQuestion {
  // Tier 0-1: Simple 2-50
  // Tier 2-3: 20-150, some .5 decimals
  // Tier 4-5: 50-300, .25 and .5 decimals
  // Tier 6-7: 100-500, unfriendly numbers
  // Tier 8+: 200-2000+, complex decimals, endless scaling

  let number: number;
  
  if (tier <= 1) {
    // Simple whole numbers
    number = Math.floor(Math.random() * 48) + 2; // 2-50
  } else if (tier <= 3) {
    // Medium range, introduce .5 decimals
    if (Math.random() < 0.3) {
      number = Math.floor(Math.random() * 130) + 20 + 0.5; // 20.5-150.5
    } else {
      number = Math.floor(Math.random() * 130) + 20; // 20-150
    }
  } else if (tier <= 5) {
    // Larger, more decimal variety
    const base = Math.floor(Math.random() * 250) + 50; // 50-300
    if (Math.random() < 0.4) {
      const decimal = Math.random() < 0.5 ? 0.5 : 0.25;
      number = base + decimal;
    } else {
      number = base;
    }
  } else if (tier <= 7) {
    // Unfriendly numbers, larger range
    const base = Math.floor(Math.random() * 400) + 100; // 100-500
    if (Math.random() < 0.4) {
      number = base + (Math.random() < 0.5 ? 0.5 : 0.75);
    } else {
      // Force unfriendly numbers (not multiples of 5 or 10)
      number = base + (base % 10 === 0 ? 3 : 0);
    }
  } else {
    // Endless scaling - magnitude increases with tier
    const scaleFactor = 1 + (tier - 8) * 0.3;
    const baseMax = Math.floor(500 * scaleFactor);
    const base = Math.floor(Math.random() * baseMax) + 200;
    
    if (Math.random() < 0.5) {
      // Complex decimals
      const decimalOptions = [0.25, 0.5, 0.75, 0.125, 0.375];
      number = base + decimalOptions[Math.floor(Math.random() * decimalOptions.length)];
    } else {
      number = base;
    }
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    number,
    answer: number * 2
  };
}

// HALVING: Tier-based generation with endless scaling
export function generateHalvingQuestion(tier: number): HalvingQuestion {
  // Tier 0-1: Even numbers 10-100 (clean halves)
  // Tier 2-3: Include odd numbers (creates .5)
  // Tier 4-5: Larger even/odd numbers
  // Tier 6-7: Decimals that create .25, .75
  // Tier 8+: Complex numbers, endless scaling

  let number: number;
  
  if (tier <= 1) {
    // Even numbers only - clean halves
    number = (Math.floor(Math.random() * 45) + 5) * 2; // 10-100, even
  } else if (tier <= 3) {
    // Include odd numbers (results in .5)
    if (Math.random() < 0.4) {
      // Odd number
      number = Math.floor(Math.random() * 90) + 11;
      if (number % 2 === 0) number++;
    } else {
      // Even, slightly larger
      number = (Math.floor(Math.random() * 75) + 10) * 2; // 20-170, even
    }
  } else if (tier <= 5) {
    // Larger range
    if (Math.random() < 0.5) {
      // Odd - creates .5
      number = Math.floor(Math.random() * 195) + 5;
      if (number % 2 === 0) number++;
    } else {
      number = (Math.floor(Math.random() * 150) + 25) * 2; // 50-350, even
    }
  } else if (tier <= 7) {
    // Introduce decimals that create .25, .75
    if (Math.random() < 0.3) {
      // Number that halves to .25 or .75
      const base = Math.floor(Math.random() * 200) + 50;
      number = base + 0.5; // Halving gives .25
    } else if (Math.random() < 0.5) {
      // Odd number
      number = Math.floor(Math.random() * 295) + 5;
      if (number % 2 === 0) number++;
    } else {
      number = (Math.floor(Math.random() * 200) + 50) * 2; // 100-500, even
    }
  } else {
    // Endless scaling
    const scaleFactor = 1 + (tier - 8) * 0.25;
    const baseMax = Math.floor(500 * scaleFactor);
    
    const rand = Math.random();
    if (rand < 0.25) {
      // Decimal - creates complex halves
      const base = Math.floor(Math.random() * baseMax) + 100;
      const decimalOptions = [0.5, 1.5, 2.5, 0.25, 0.75];
      number = base + decimalOptions[Math.floor(Math.random() * decimalOptions.length)];
    } else if (rand < 0.5) {
      // Odd number
      number = Math.floor(Math.random() * baseMax) + 101;
      if (number % 2 === 0) number++;
    } else {
      // Large even
      number = (Math.floor(Math.random() * (baseMax / 2)) + 100) * 2;
    }
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    number,
    answer: number / 2
  };
}
