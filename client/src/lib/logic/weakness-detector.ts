export type Operation = 'add' | 'sub' | 'mul' | 'div';

export interface QuestionResult {
  operation: Operation;
  operandA: number;
  operandB: number;
  isCorrect: boolean;
  responseTimeMs: number;
}

export interface WeaknessPattern {
  strategyId: string;
  operation: Operation;
  description: string;
  accuracy: number;
  totalAttempts: number;
  incorrectCount: number;
}

export interface Strategy {
  id: string;
  name: string;
  operation: Operation;
  applies: (result: QuestionResult) => boolean;
  minAttempts: number;
  maxAccuracyThreshold: number;
}

const STRATEGIES: Strategy[] = [
  {
    id: 'add_place_value',
    name: 'Place Value Split',
    operation: 'add',
    applies: (r) => r.operation === 'add' && (r.operandA >= 10 || r.operandB >= 10),
    minAttempts: 5,
    maxAccuracyThreshold: 0.7,
  },
  {
    id: 'add_make_tens',
    name: 'Make Tens',
    operation: 'add',
    applies: (r) => r.operation === 'add' && r.operandA <= 20 && r.operandB <= 20,
    minAttempts: 5,
    maxAccuracyThreshold: 0.7,
  },
  {
    id: 'sub_count_up',
    name: 'Count Up Method',
    operation: 'sub',
    applies: (r) => r.operation === 'sub' && (r.operandA - r.operandB) <= 15,
    minAttempts: 5,
    maxAccuracyThreshold: 0.7,
  },
  {
    id: 'sub_compensation',
    name: 'Compensation',
    operation: 'sub',
    applies: (r) => r.operation === 'sub' && (r.operandB % 10 >= 7 || r.operandB % 10 <= 3),
    minAttempts: 5,
    maxAccuracyThreshold: 0.7,
  },
  {
    id: 'mul_distributive',
    name: 'Distributive Split',
    operation: 'mul',
    applies: (r) => r.operation === 'mul' && (r.operandA >= 6 || r.operandB >= 6),
    minAttempts: 4,
    maxAccuracyThreshold: 0.65,
  },
  {
    id: 'mul_nines',
    name: 'Nines Trick',
    operation: 'mul',
    applies: (r) => r.operation === 'mul' && (r.operandA === 9 || r.operandB === 9),
    minAttempts: 3,
    maxAccuracyThreshold: 0.7,
  },
];

export function detectWeakness(results: QuestionResult[], seenStrategies: string[] = []): WeaknessPattern | null {
  if (results.length < 5) return null;

  const strategyStats = new Map<string, { correct: number; total: number; strategy: Strategy }>();

  for (const strategy of STRATEGIES) {
    strategyStats.set(strategy.id, { correct: 0, total: 0, strategy });
  }

  for (const result of results) {
    for (const strategy of STRATEGIES) {
      if (strategy.applies(result)) {
        const stats = strategyStats.get(strategy.id)!;
        stats.total++;
        if (result.isCorrect) stats.correct++;
      }
    }
  }

  let weakest: WeaknessPattern | null = null;
  let lowestAccuracy = 1.0;

  strategyStats.forEach((stats, strategyId) => {
    // Skip already-seen strategies
    if (seenStrategies.includes(strategyId)) return;
    if (stats.total < stats.strategy.minAttempts) return;

    const accuracy = stats.total > 0 ? stats.correct / stats.total : 1.0;
    
    if (accuracy <= stats.strategy.maxAccuracyThreshold && accuracy < lowestAccuracy) {
      lowestAccuracy = accuracy;
      weakest = {
        strategyId,
        operation: stats.strategy.operation,
        description: stats.strategy.name,
        accuracy,
        totalAttempts: stats.total,
        incorrectCount: stats.total - stats.correct,
      };
    }
  });

  return weakest;
}

export function getStrategyById(id: string): Strategy | undefined {
  return STRATEGIES.find(s => s.id === id);
}

export function getAllStrategies(): Strategy[] {
  return [...STRATEGIES];
}
