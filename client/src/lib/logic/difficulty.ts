import { PROGRESSION_CONFIG } from '@/config/progression';

export interface ProgressionState {
  level: number;
  // Band 0 = Levels 1-10, Band 1 = Levels 11-20, etc.
  band: number;
  
  // Skill Rating (0-100)
  srGlobal: number;
  
  // Adaptive Difficulty within a plateau (0-4)
  difficultyStep: number;
  
  // Streak counters for anti-whiplash
  goodStreak: number;
  poorStreak: number;
  
  // Rolling stats (last 20)
  history: {
    correct: boolean;
    timeMs: number;
    templateId?: string;
    dp?: number;
    ps?: number; // Performance Score
  }[];
}

export const INITIAL_PROGRESSION_STATE: ProgressionState = {
  level: 1,
  band: 0,
  srGlobal: 50, // Start in middle? Or 0? Prompt doesn't specify initial, assume 50 or 0. Let's start neutral 50.
  difficultyStep: 0,
  goodStreak: 0,
  poorStreak: 0,
  history: []
};

// Configuration for Adaptive Tuning
const ADAPTIVE_CONFIG = {
  TARGET_TIME_MS: 3000, // Default target time, should be dynamic later
  EXPECTED_PERFORMANCE: 0.75,
  WINDOW_SIZE: 20
};

export const computePerformanceScore = (correct: boolean, timeMs: number, targetTimeMs: number = ADAPTIVE_CONFIG.TARGET_TIME_MS) => {
  const accuracy = correct ? 1 : 0;
  // speedScore = clamp(1.2 - timeMs / targetTimeMs, 0, 1)
  const speedRatio = timeMs / targetTimeMs;
  const speedScore = Math.min(Math.max(1.2 - speedRatio, 0), 1);
  
  // PS = accuracy * (0.65 + 0.35 * speedScore)
  return accuracy * (0.65 + 0.35 * speedScore);
};

export const updateSkillRating = (
  currentSR: number, 
  ps: number, 
  difficultyTier: number // approx band index or DP bucket
) => {
  const expected = ADAPTIVE_CONFIG.EXPECTED_PERFORMANCE;
  const K = 6 + difficultyTier;
  
  // SR = clamp(SR + K * (PS - expected), 0, 100)
  const delta = K * (ps - expected);
  return Math.min(Math.max(currentSR + delta, 0), 100);
};

export const updateAntiWhiplash = (
  currentStep: number,
  goodStreak: number,
  poorStreak: number,
  correct: boolean,
  timeMs: number,
  targetTimeMs: number = ADAPTIVE_CONFIG.TARGET_TIME_MS
) => {
  let newGood = goodStreak;
  let newPoor = poorStreak;
  let newStep = currentStep;

  // Good: correct AND timeMs <= 1.25 * targetTimeMs
  const isGood = correct && timeMs <= 1.25 * targetTimeMs;
  
  // Poor: incorrect OR timeMs >= 2.0 * targetTimeMs
  const isPoor = !correct || timeMs >= 2.0 * targetTimeMs;

  if (isGood) {
    newGood++;
    newPoor = 0;
    if (newGood >= 3) {
      newStep = Math.min(currentStep + 1, 4);
      newGood = 0; // Reset after step change? "increase ... only after 3 Good in a row". Usually implies reset.
    }
  } else if (isPoor) {
    newPoor++;
    newGood = 0;
    if (newPoor >= 2) {
      newStep = Math.max(currentStep - 1, 0);
      newPoor = 0;
    }
  } else {
    // Neutral outcome - reset streaks? Or keep? 
    // "in a row" implies they must be consecutive. 
    // If neither good nor poor (e.g. correct but slowish), it breaks the "Good in a row".
    newGood = 0;
    newPoor = 0;
  }

  return { newStep, newGood, newPoor };
};

export const getBandFromLevel = (level: number) => {
  // Band 0 = 1-10, Band 1 = 11-20
  return Math.floor((level - 1) / 10);
};
