import { PROGRESSION_CONFIG as CFG } from '../config/progression';

export const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const computeMAD = (values: number[]): number => {
  if (values.length === 0) return 0;
  const median = computeMedian(values);
  const absoluteDeviations = values.map(v => Math.abs(v - median));
  return computeMedian(absoluteDeviations);
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const computeFluencyComponents = (
  correct: number,
  total: number,
  responseTimes: number[],
  durationSeconds: number
) => {
  const accuracy = total > 0 ? correct / total : 0;
  
  const medianMs = computeMedian(responseTimes);
  const speedScore = medianMs > 0 ? clamp(CFG.targetTimeMs / medianMs, 0, 1) : 0;
  
  const variabilityMs = computeMAD(responseTimes);
  const consistencyScore = clamp(1 - (variabilityMs / CFG.referenceVarMs), 0, 1);
  
  const qps = total / durationSeconds;
  const throughputScore = clamp(qps / CFG.targetQps, 0, 1);
  
  return { accuracy, speedScore, consistencyScore, throughputScore, medianMs, variabilityMs, qps };
};

export const computeFluencyScore = (components: ReturnType<typeof computeFluencyComponents>) => {
  const { accuracy, speedScore, consistencyScore, throughputScore } = components;
  
  let score = 100 * (
    accuracy * CFG.weights.accuracy +
    speedScore * CFG.weights.speed +
    throughputScore * CFG.weights.throughput +
    consistencyScore * CFG.weights.consistency
  );
  
  // Accuracy floor safeguard
  if (accuracy < 0.55) {
    score = Math.min(score, 45);
  }
  
  return Math.round(score);
};

export const computeSessionXP = (
  fluencyScore: number,
  totalQuestions: number,
  components: ReturnType<typeof computeFluencyComponents>,
  isValid: boolean
) => {
  if (!isValid && totalQuestions === 0) return CFG.baseXP;
  
  const effortScore = clamp(totalQuestions / CFG.effortTargetQuestions, 0, 1);
  
  const performanceXP = Math.round(CFG.maxPerformanceXP * (fluencyScore / 100));
  const effortXP = Math.round(CFG.maxEffortXP * effortScore);
  
  let totalXP = CFG.baseXP + performanceXP + effortXP;
  
  // Excellence Bonus
  const { accuracy, medianMs, consistencyScore, throughputScore } = components;
  const metBonus = accuracy >= CFG.bonusThresholds.accuracy &&
                   medianMs <= CFG.bonusThresholds.medianMs &&
                   consistencyScore >= CFG.bonusThresholds.consistency &&
                   throughputScore >= CFG.bonusThresholds.throughput;
                   
  if (metBonus) {
    const multiplier = accuracy >= 0.95 ? CFG.eliteBonusMultiplier : CFG.bonusMultiplier;
    totalXP = Math.round(totalXP * multiplier);
  }
  
  return { totalXP, metBonus };
};

export const getRequiredXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  // requiredXP(L) = round( 150 * (L-1) ^ 1.25 + 50*(L-1) )
  return Math.round(150 * Math.pow(level - 1, 1.25) + 50 * (level - 1));
};

export const getFluencyLabel = (score: number): string => {
  if (score <= 25) return "Building";
  if (score <= 50) return "Improving";
  if (score <= 75) return "Strong";
  if (score <= 90) return "Fluent";
  return "Elite";
};
