// Session validity (anti-cheese)
export const MIN_QUESTIONS_FOR_XP = 8;
export const MIN_DURATION_FOR_XP_SEC = 20;

// Fluency normalization
export const TARGET_TIME_MS = 1600;
export const REFERENCE_VARIABILITY_MS = 600;
export const TARGET_QPS = 0.28;

// Fluency weights
export const WEIGHTS = {
  ACCURACY: 0.35,
  SPEED: 0.25,
  THROUGHPUT: 0.25,
  CONSISTENCY: 0.15,
};

// Fluency safeguard
export const ACCURACY_FLOOR = 0.55;
export const FLUENCY_CAP_BELOW_ACCURACY_FLOOR = 45;

// Base XP formula
export const BASE_XP = 10;
export const MAX_PERFORMANCE_XP = 220;
export const MAX_EFFORT_XP = 80;
export const EFFORT_TARGET_QUESTIONS = 35;

// Mode multipliers (future-proof)
// Assessment mode returns 0 XP - assessments should not award XP
export const MODE_MULTIPLIERS: Record<string, number> = {
  daily: 1.0,
  quick_fire: 0.55,
  practice: 0.7,
  unlimited: 0.4,
  assessment: 0, // Assessment gives NO XP
};

// Excellence thresholds (must meet ALL)
export const EXCELLENCE_THRESHOLDS = {
  ACCURACY: 0.90,
  SPEED_SCORE: 0.95,
  CONSISTENCY: 0.75,
  THROUGHPUT: 0.85,
};
export const EXCELLENCE_MULTIPLIER = 1.25;
export const ELITE_ACCURACY_MULTIPLIER = 1.35; // if accuracy >= 0.95 and all excellence thresholds met

// Elite Accelerator (applies across ALL non-assessment modes, must meet ALL)
export const ELITE_THRESHOLDS = {
  ACCURACY: 0.98,
  SPEED_SCORE: 0.97,
  CONSISTENCY: 0.80,
  THROUGHPUT_SCORE: 1.00,
  MIN_QUESTIONS: 45,
  MIN_DURATION_SEC: 60,
};
export const ELITE_MULTIPLIER = 2.0;

// Level XP requirements
export const LEVEL_REQ_L1_TO_L4 = 500;
export const LEVEL_REQ_L5 = 1000;
export const INC_START_L6 = 120;
export const INC_GROWTH_STAGE1 = 15; // applies for levels 6..14
export const INC_GROWTH_STAGE2 = 25; // applies for levels >=15

// Legacy PROGRESSION_CONFIG for backward compatibility
export const PROGRESSION_CONFIG = {
  MIN_QUESTIONS_FOR_VALID_SESSION: MIN_QUESTIONS_FOR_XP,
  MIN_DURATION_FOR_VALID_SESSION_SEC: MIN_DURATION_FOR_XP_SEC,
  TARGET_TIME_MS,
  REFERENCE_VARIABILITY_MS,
  TARGET_QPS,
  BASE_XP,
  MAX_PERFORMANCE_XP,
  MAX_EFFORT_XP,
  EFFORT_TARGET_QUESTIONS,
  WEIGHTS,
  ACCURACY_FLOOR,
  FLUENCY_CAP_BELOW_ACCURACY_FLOOR,
  BONUS_THRESHOLDS: EXCELLENCE_THRESHOLDS,
  BONUS_MULTIPLIER: EXCELLENCE_MULTIPLIER,
  ELITE_BONUS_MULTIPLIER: ELITE_ACCURACY_MULTIPLIER,
};

// Placement config (from assessment)
export const PLACEMENT_CONFIG = {
  ASSESSMENT_DURATION_MINUTES: 3,
  MIN_ANSWERS_FOR_PLACEMENT: 12,
  MAX_START_LEVEL: 30,

  CPM_BANDS: [4, 6, 8, 10, 12, 14, 16, 18, 20] as const,

  ACCURACY_CAPS: {
    BELOW_55: 3,
    BELOW_65: 5,
    BELOW_75: 7,
    DEFAULT: 10,
  },

  SPEED_NUDGE: {
    FAST_THRESHOLD_MS: 1300,
    FAST_ACCURACY_MIN: 0.80,
    SLOW_THRESHOLD_MS: 2600,
  },

  GROUP_TO_LEVEL: {
    1: 1,
    2: 2,
    3: 4,
    4: 6,
    5: 8,
    6: 10,
    7: 12,
    8: 16,
    9: 22,
    10: 30,
  } as Record<number, number>,
};
