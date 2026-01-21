import { PROGRESSION_CONFIG as CFG } from '@/config/progression';

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
  const speedScore = medianMs > 0 ? clamp(CFG.TARGET_TIME_MS / medianMs, 0, 1) : 0;
  
  const variabilityMs = computeMAD(responseTimes);
  const consistencyScore = clamp(1 - (variabilityMs / CFG.REFERENCE_VARIABILITY_MS), 0, 1);
  
  const qps = total / durationSeconds;
  const throughputScore = clamp(qps / CFG.TARGET_QPS, 0, 1);
  
  return { accuracy, speedScore, consistencyScore, throughputScore, medianMs, variabilityMs, qps };
};

export const computeFluencyScore = (components: ReturnType<typeof computeFluencyComponents>) => {
  const { accuracy, speedScore, consistencyScore, throughputScore } = components;
  
  let score = 100 * (
    accuracy * CFG.WEIGHTS.ACCURACY +
    speedScore * CFG.WEIGHTS.SPEED +
    throughputScore * CFG.WEIGHTS.THROUGHPUT +
    consistencyScore * CFG.WEIGHTS.CONSISTENCY
  );
  
  // Accuracy floor safeguard
  if (accuracy < CFG.ACCURACY_FLOOR) {
    score = Math.min(score, CFG.FLUENCY_CAP_BELOW_ACCURACY_FLOOR);
  }
  
  return Math.round(score);
};

export const computeSessionXP = (
  fluencyScore: number,
  totalQuestions: number,
  components: ReturnType<typeof computeFluencyComponents>,
  isValid: boolean
) => {
  if (!isValid && totalQuestions === 0) return { totalXP: CFG.BASE_XP, metBonus: false };
  
  const effortScore = clamp(totalQuestions / CFG.EFFORT_TARGET_QUESTIONS, 0, 1);
  
  const performanceXP = Math.round(CFG.MAX_PERFORMANCE_XP * (fluencyScore / 100));
  const effortXP = Math.round(CFG.MAX_EFFORT_XP * effortScore);
  
  let totalXP = CFG.BASE_XP + performanceXP + effortXP;
  
  // Excellence Bonus
  const { accuracy, medianMs, consistencyScore, throughputScore } = components;
  const metBonus = accuracy >= CFG.BONUS_THRESHOLDS.ACCURACY &&
                   medianMs <= (CFG.TARGET_TIME_MS * (1 / CFG.BONUS_THRESHOLDS.SPEED_SCORE)) && // Derived from speed score threshold
                   consistencyScore >= CFG.BONUS_THRESHOLDS.CONSISTENCY &&
                   throughputScore >= CFG.BONUS_THRESHOLDS.THROUGHPUT;
                   
  if (metBonus) {
    const multiplier = accuracy >= 0.95 ? CFG.ELITE_BONUS_MULTIPLIER : CFG.BONUS_MULTIPLIER;
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
