export const PROGRESSION_CONFIG = {
  // Fluency Normalization
  targetTimeMs: 1600,
  referenceVarMs: 600,
  targetQps: 0.28, // ~17 questions/min
  
  // Weights (Sum = 1)
  weights: {
    accuracy: 0.35,
    speed: 0.25,
    throughput: 0.25,
    consistency: 0.15,
  },
  
  // XP Rewards
  baseXP: 10,
  maxPerformanceXP: 220,
  maxEffortXP: 80,
  effortTargetQuestions: 35,
  
  // Excellence Bonus Thresholds
  bonusThresholds: {
    accuracy: 0.90,
    medianMs: 1400,
    consistency: 0.75,
    throughput: 0.85,
  },
  bonusMultiplier: 1.25,
  eliteBonusMultiplier: 1.35, // For Accuracy >= 0.95
  
  // Validity Rules
  minQuestionsForValid: 12,
  minDurationSeconds: 30,
};
