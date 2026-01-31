import {
  TARGET_TIME_MS,
  REFERENCE_VARIABILITY_MS,
  TARGET_QPS,
  WEIGHTS,
  ACCURACY_FLOOR,
  FLUENCY_CAP_BELOW_ACCURACY_FLOOR,
  BASE_XP,
  MAX_PERFORMANCE_XP,
  MAX_EFFORT_XP,
  EFFORT_TARGET_QUESTIONS,
  MODE_MULTIPLIERS,
  EXCELLENCE_THRESHOLDS,
  EXCELLENCE_MULTIPLIER,
  ELITE_ACCURACY_MULTIPLIER,
  ELITE_THRESHOLDS,
  ELITE_MULTIPLIER,
  MIN_QUESTIONS_FOR_XP,
  MIN_DURATION_FOR_XP_SEC,
  LEVEL_REQ_L1_TO_L4,
  LEVEL_REQ_L5,
  INC_START_L6,
  INC_GROWTH_STAGE1,
  INC_GROWTH_STAGE2,
} from '@/config/progression';

// --- Types ---

export interface FluencyMetrics {
  accuracy: number; // A (0-1)
  speedScore: number; // S (0-1)
  consistencyScore: number; // Cns (0-1)
  throughputScore: number; // T (0-1)
  fluencyScore: number; // F (0-100)
  medianMs: number;
  variabilityMs: number;
  qps: number;
}

export interface SessionXPResult {
  baseSessionXP: number;
  modeMultiplier: number;
  xpAfterMode: number;
  excellenceMultiplierApplied: number;
  xpAfterExcellence: number;
  eliteMultiplierApplied: number;
  finalSessionXP: number;
  isValid: boolean;
}

export interface LevelUpResult {
  levelBefore: number;
  levelAfter: number;
  xpIntoLevelBefore: number;
  xpIntoLevelAfter: number;
  levelUpCount: number;
}

// --- Helper Functions ---

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 99999;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mad(arr: number[]): number {
  if (arr.length === 0) return 0;
  const med = median(arr);
  const deviations = arr.map((v) => Math.abs(v - med));
  return median(deviations);
}

// --- Fluency Computation ---

export function computeFluency(
  totalAnswers: number,
  correctAnswers: number,
  durationSeconds: number,
  responseTimesMs: number[]
): FluencyMetrics {
  const N = totalAnswers;
  const C = correctAnswers;
  const D = Math.max(durationSeconds, 1);

  // Accuracy
  const accuracy = C / Math.max(N, 1);

  // Median response time
  const medianMs = median(responseTimesMs);

  // Speed Score
  const speedScore = clamp(0, 1, TARGET_TIME_MS / medianMs);

  // Consistency (using MAD)
  const variabilityMs = mad(responseTimesMs);
  const consistencyScore = clamp(0, 1, 1 - variabilityMs / REFERENCE_VARIABILITY_MS);

  // Throughput
  const qps = N / D;
  const throughputScore = clamp(0, 1, qps / TARGET_QPS);

  // Fluency Score (0-100)
  let fluencyScore =
    100 *
    (WEIGHTS.ACCURACY * accuracy +
      WEIGHTS.SPEED * speedScore +
      WEIGHTS.THROUGHPUT * throughputScore +
      WEIGHTS.CONSISTENCY * consistencyScore);

  // Safeguard: cap fluency if accuracy below floor
  if (accuracy < ACCURACY_FLOOR) {
    fluencyScore = Math.min(fluencyScore, FLUENCY_CAP_BELOW_ACCURACY_FLOOR);
  }

  return {
    accuracy,
    speedScore,
    consistencyScore,
    throughputScore,
    fluencyScore,
    medianMs,
    variabilityMs,
    qps,
  };
}

// --- Base Session XP ---

export function computeBaseSessionXP(
  fluencyScore: number,
  totalAnswers: number,
  durationSeconds: number
): { baseXP: number; isValid: boolean } {
  const N = totalAnswers;
  const D = durationSeconds;
  const F = fluencyScore;

  // Effort score
  const effortScore = clamp(0, 1, N / EFFORT_TARGET_QUESTIONS);

  // Check validity
  const isValid = N >= MIN_QUESTIONS_FOR_XP && D >= MIN_DURATION_FOR_XP_SEC;

  let baseXP: number;
  if (isValid) {
    baseXP =
      BASE_XP +
      Math.round(MAX_PERFORMANCE_XP * (F / 100)) +
      Math.round(MAX_EFFORT_XP * effortScore);
  } else {
    // Invalid session: grant minimal XP
    baseXP =
      BASE_XP +
      Math.round(0.25 * Math.round(MAX_EFFORT_XP * effortScore)) +
      Math.round(0.25 * Math.round(MAX_PERFORMANCE_XP * (F / 100)));
  }

  return { baseXP, isValid };
}

// --- XP with Multipliers ---

export function computeSessionXPWithMultipliers(
  baseSessionXP: number,
  sessionType: string,
  fluencyMetrics: FluencyMetrics,
  totalAnswers: number,
  durationSeconds: number,
  isValid: boolean
): SessionXPResult {
  const { accuracy, speedScore, consistencyScore, throughputScore } = fluencyMetrics;

  // Mode multiplier
  const modeMultiplier = MODE_MULTIPLIERS[sessionType] ?? 1.0;
  const xpAfterMode = Math.round(baseSessionXP * modeMultiplier);

  // Excellence multiplier (only for valid sessions)
  let excellenceMultiplierApplied = 1.0;
  let xpAfterExcellence = xpAfterMode;

  if (isValid) {
    const meetsExcellence =
      accuracy >= EXCELLENCE_THRESHOLDS.ACCURACY &&
      speedScore >= EXCELLENCE_THRESHOLDS.SPEED_SCORE &&
      consistencyScore >= EXCELLENCE_THRESHOLDS.CONSISTENCY &&
      throughputScore >= EXCELLENCE_THRESHOLDS.THROUGHPUT;

    if (meetsExcellence) {
      excellenceMultiplierApplied =
        accuracy >= 0.95 ? ELITE_ACCURACY_MULTIPLIER : EXCELLENCE_MULTIPLIER;
      xpAfterExcellence = Math.round(xpAfterMode * excellenceMultiplierApplied);
    }
  }

  // Elite accelerator (only for valid sessions)
  let eliteMultiplierApplied = 1.0;
  let finalSessionXP = xpAfterExcellence;

  if (isValid) {
    const meetsElite =
      accuracy >= ELITE_THRESHOLDS.ACCURACY &&
      speedScore >= ELITE_THRESHOLDS.SPEED_SCORE &&
      consistencyScore >= ELITE_THRESHOLDS.CONSISTENCY &&
      throughputScore >= ELITE_THRESHOLDS.THROUGHPUT_SCORE &&
      totalAnswers >= ELITE_THRESHOLDS.MIN_QUESTIONS &&
      durationSeconds >= ELITE_THRESHOLDS.MIN_DURATION_SEC;

    if (meetsElite) {
      eliteMultiplierApplied = ELITE_MULTIPLIER;
      finalSessionXP = Math.round(xpAfterExcellence * ELITE_MULTIPLIER);
    }
  }

  return {
    baseSessionXP,
    modeMultiplier,
    xpAfterMode,
    excellenceMultiplierApplied,
    xpAfterExcellence,
    eliteMultiplierApplied,
    finalSessionXP,
    isValid,
  };
}

// --- Level XP Requirements (Infinite, Piecewise) ---

export function xpRequiredToAdvance(level: number): number {
  if (level <= 4) return LEVEL_REQ_L1_TO_L4;
  if (level === 5) return LEVEL_REQ_L5;

  // For level >= 6, compute iteratively
  let req = LEVEL_REQ_L5;
  let inc = INC_START_L6;

  for (let x = 6; x <= level; x++) {
    req = req + inc;
    if (x < 15) {
      inc = inc + INC_GROWTH_STAGE1;
    } else {
      inc = inc + INC_GROWTH_STAGE2;
    }
  }

  return req;
}

// --- Apply XP and Level Up (with carryover) ---

export function applyXPAndLevelUp(
  currentLevel: number,
  currentXpIntoLevel: number,
  finalSessionXP: number
): LevelUpResult {
  const levelBefore = currentLevel;
  const xpIntoLevelBefore = currentXpIntoLevel;

  let level = currentLevel;
  let xpIntoLevel = currentXpIntoLevel + finalSessionXP;
  let levelUpCount = 0;

  while (xpIntoLevel >= xpRequiredToAdvance(level)) {
    xpIntoLevel -= xpRequiredToAdvance(level);
    level += 1;
    levelUpCount += 1;
  }

  return {
    levelBefore,
    levelAfter: level,
    xpIntoLevelBefore,
    xpIntoLevelAfter: xpIntoLevel,
    levelUpCount,
  };
}

// --- Bonus XP Calculation (post-session bonuses based on performance thresholds) ---

export interface BonusXPResult {
  bonusXP: number;
  excellenceBonus: number;
  eliteBonus: number;
  meetsExcellence: boolean;
  meetsElite: boolean;
}

export function computeBonusXP(
  fluencyMetrics: FluencyMetrics,
  totalAnswers: number,
  durationSeconds: number,
  isValid: boolean
): BonusXPResult {
  const { accuracy, speedScore, consistencyScore, throughputScore } = fluencyMetrics;
  
  let bonusXP = 0;
  let excellenceBonus = 0;
  let eliteBonus = 0;
  let meetsExcellence = false;
  let meetsElite = false;
  
  if (!isValid) {
    return { bonusXP: 0, excellenceBonus: 0, eliteBonus: 0, meetsExcellence: false, meetsElite: false };
  }
  
  // Excellence bonus: flat bonus for meeting all excellence thresholds
  meetsExcellence =
    accuracy >= EXCELLENCE_THRESHOLDS.ACCURACY &&
    speedScore >= EXCELLENCE_THRESHOLDS.SPEED_SCORE &&
    consistencyScore >= EXCELLENCE_THRESHOLDS.CONSISTENCY &&
    throughputScore >= EXCELLENCE_THRESHOLDS.THROUGHPUT;
  
  if (meetsExcellence) {
    // Award bonus based on accuracy tier
    excellenceBonus = accuracy >= 0.95 ? 100 : 50; // Higher bonus for 95%+ accuracy
    bonusXP += excellenceBonus;
  }
  
  // Elite bonus: additional bonus for exceptional performance
  meetsElite =
    accuracy >= ELITE_THRESHOLDS.ACCURACY &&
    speedScore >= ELITE_THRESHOLDS.SPEED_SCORE &&
    consistencyScore >= ELITE_THRESHOLDS.CONSISTENCY &&
    throughputScore >= ELITE_THRESHOLDS.THROUGHPUT_SCORE &&
    totalAnswers >= ELITE_THRESHOLDS.MIN_QUESTIONS &&
    durationSeconds >= ELITE_THRESHOLDS.MIN_DURATION_SEC;
  
  if (meetsElite) {
    eliteBonus = 150; // Flat elite bonus
    bonusXP += eliteBonus;
  }
  
  return { bonusXP, excellenceBonus, eliteBonus, meetsExcellence, meetsElite };
}

// --- Combined XP Calculation (in-game XP + bonus XP) ---

export interface CombinedXPResult {
  inGameXP: number;
  bonusXP: number;
  finalSessionXP: number;
  excellenceBonus: number;
  eliteBonus: number;
  meetsExcellence: boolean;
  meetsElite: boolean;
  modeMultiplier: number;
  isValid: boolean;
}

export function calculateCombinedSessionXP(
  sessionType: string,
  inGameXP: number,
  totalAnswers: number,
  correctAnswers: number,
  durationSeconds: number,
  responseTimesMs: number[]
): { fluencyMetrics: FluencyMetrics; xpResult: CombinedXPResult } {
  const fluencyMetrics = computeFluency(
    totalAnswers,
    correctAnswers,
    durationSeconds,
    responseTimesMs
  );
  
  // Check session validity
  const isValid = totalAnswers >= MIN_QUESTIONS_FOR_XP && durationSeconds >= MIN_DURATION_FOR_XP_SEC;
  
  // Get mode multiplier (assessment = 0)
  const modeMultiplier = MODE_MULTIPLIERS[sessionType] ?? 1.0;
  
  // For assessment, return 0 XP
  if (modeMultiplier === 0) {
    return {
      fluencyMetrics,
      xpResult: {
        inGameXP: 0,
        bonusXP: 0,
        finalSessionXP: 0,
        excellenceBonus: 0,
        eliteBonus: 0,
        meetsExcellence: false,
        meetsElite: false,
        modeMultiplier: 0,
        isValid
      }
    };
  }
  
  // Compute bonus XP
  const bonusResult = computeBonusXP(fluencyMetrics, totalAnswers, durationSeconds, isValid);
  
  // Final XP = In-game XP + Bonus XP (no double-counting)
  const finalSessionXP = inGameXP + bonusResult.bonusXP;
  
  return {
    fluencyMetrics,
    xpResult: {
      inGameXP,
      bonusXP: bonusResult.bonusXP,
      finalSessionXP,
      excellenceBonus: bonusResult.excellenceBonus,
      eliteBonus: bonusResult.eliteBonus,
      meetsExcellence: bonusResult.meetsExcellence,
      meetsElite: bonusResult.meetsElite,
      modeMultiplier,
      isValid
    }
  };
}

// --- Legacy function for backward compatibility ---

export function calculateFullSessionXP(
  sessionType: string,
  totalAnswers: number,
  correctAnswers: number,
  durationSeconds: number,
  responseTimesMs: number[]
): { fluencyMetrics: FluencyMetrics; xpResult: SessionXPResult } {
  const fluencyMetrics = computeFluency(
    totalAnswers,
    correctAnswers,
    durationSeconds,
    responseTimesMs
  );

  const { baseXP, isValid } = computeBaseSessionXP(
    fluencyMetrics.fluencyScore,
    totalAnswers,
    durationSeconds
  );

  const xpResult = computeSessionXPWithMultipliers(
    baseXP,
    sessionType,
    fluencyMetrics,
    totalAnswers,
    durationSeconds,
    isValid
  );

  return { fluencyMetrics, xpResult };
}
