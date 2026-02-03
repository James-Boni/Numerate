export interface StrategyStep {
  text: string;
  highlight?: string;
  equation?: string;
  result?: string;
}

export interface StrategyContent {
  id: string;
  title: string;
  tagline: string;
  example: {
    problem: string;
    operandA: number;
    operandB: number;
    answer: number;
  };
  steps: StrategyStep[];
  tip: string;
}

export const STRATEGY_CONTENT: Record<string, StrategyContent> = {
  add_place_value: {
    id: 'add_place_value',
    title: 'Place Value Split',
    tagline: 'Break numbers into tens and ones, then add separately',
    example: {
      problem: '47 + 35',
      operandA: 47,
      operandB: 35,
      answer: 82,
    },
    steps: [
      { text: 'Split both numbers into tens and ones', equation: '47 = 40 + 7', highlight: '47' },
      { text: 'Split the second number too', equation: '35 = 30 + 5', highlight: '35' },
      { text: 'Add the tens together', equation: '40 + 30 = 70', result: '70' },
      { text: 'Add the ones together', equation: '7 + 5 = 12', result: '12' },
      { text: 'Combine both results', equation: '70 + 12 = 82', result: '82' },
    ],
    tip: 'This works great for any two-digit addition!',
  },

  add_make_tens: {
    id: 'add_make_tens',
    title: 'Make Tens',
    tagline: 'Round one number to 10, then adjust',
    example: {
      problem: '8 + 7',
      operandA: 8,
      operandB: 7,
      answer: 15,
    },
    steps: [
      { text: 'Look at the larger number', equation: '8', highlight: '8' },
      { text: 'How many more to reach 10?', equation: '8 + 2 = 10', result: 'need 2' },
      { text: 'Borrow 2 from the other number', equation: '7 - 2 = 5', highlight: '7' },
      { text: 'Now add 10 + 5', equation: '10 + 5 = 15', result: '15' },
    ],
    tip: 'Making 10 first makes the final addition easy!',
  },

  sub_count_up: {
    id: 'sub_count_up',
    title: 'Count Up Method',
    tagline: 'Count up from the smaller number to find the difference',
    example: {
      problem: '52 - 38',
      operandA: 52,
      operandB: 38,
      answer: 14,
    },
    steps: [
      { text: 'Start from the smaller number', equation: 'Start at 38', highlight: '38' },
      { text: 'Count up to the nearest ten', equation: '38 + 2 = 40', result: '+2' },
      { text: 'Count up to the target', equation: '40 + 12 = 52', result: '+12' },
      { text: 'Add your jumps together', equation: '2 + 12 = 14', result: '14' },
    ],
    tip: 'Think of it like counting change!',
  },

  sub_compensation: {
    id: 'sub_compensation',
    title: 'Compensation',
    tagline: 'Round to an easy number, then adjust',
    example: {
      problem: '82 - 39',
      operandA: 82,
      operandB: 39,
      answer: 43,
    },
    steps: [
      { text: '39 is close to 40 - round up!', equation: '39 → 40', highlight: '39' },
      { text: 'Subtract the round number', equation: '82 - 40 = 42', result: '42' },
      { text: 'We subtracted 1 too many', equation: 'Adjust: +1', highlight: 'adjust' },
      { text: 'Add back the extra 1', equation: '42 + 1 = 43', result: '43' },
    ],
    tip: 'Round to make the subtraction easy, then fix it!',
  },

  mul_distributive: {
    id: 'mul_distributive',
    title: 'Distributive Split',
    tagline: 'Break one number into friendly parts',
    example: {
      problem: '7 × 8',
      operandA: 7,
      operandB: 8,
      answer: 56,
    },
    steps: [
      { text: 'Split one number into parts you know', equation: '7 = 5 + 2', highlight: '7' },
      { text: 'Multiply each part by 8', equation: '5 × 8 = 40', result: '40' },
      { text: 'Multiply the other part', equation: '2 × 8 = 16', result: '16' },
      { text: 'Add both results', equation: '40 + 16 = 56', result: '56' },
    ],
    tip: 'Use facts you already know to build harder ones!',
  },

  mul_nines: {
    id: 'mul_nines',
    title: 'Nines Trick',
    tagline: 'Multiply by 10, then subtract once',
    example: {
      problem: '9 × 7',
      operandA: 9,
      operandB: 7,
      answer: 63,
    },
    steps: [
      { text: '9 is almost 10 - use that!', equation: '9 = 10 - 1', highlight: '9' },
      { text: 'Multiply by 10 instead', equation: '10 × 7 = 70', result: '70' },
      { text: 'Subtract one group of 7', equation: '70 - 7 = 63', result: '63' },
    ],
    tip: '9 times anything = 10 times minus itself!',
  },
};

export function getStrategyContent(id: string): StrategyContent | undefined {
  return STRATEGY_CONTENT[id];
}
